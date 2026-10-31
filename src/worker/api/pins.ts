import { z } from "zod";
import { itemsOf } from "../../shared/courses";
import { recordActivity } from "../activity";
import { ModelError, complete, modelConfig } from "../ai";
import { getCourse, getPackageJson } from "../catalog";
import { type Ctx, HttpError, type Router, json } from "../http";
import { adminLink, enqueue, flush } from "../notify";
import { isAdmin, requireAdmin, requireUser, seesNames, viewerId } from "./common";

/**
 * 蓝色钉子：在讲义的某一段（或某道练手题）上钉一个问题，大家在下面讨论，Agent 的回答也留在里面。
 * 定位照 Math-Teach-Job：内容块有固定的位置标记 anchor_key，图钉存成“在这个块里的百分比坐标”；
 * 另存这一段开头的文字 snippet，讲义改版后网页按它重新找位置，找不到就收进“原文已变”。
 *
 * 谁能干什么：游客能看；登录后能钉、回复、点“我也想问”；提问的人和管理员能标“已解决”；
 * 没人回复前提问的人能撤回，管理员随时能删。
 */

const PinInput = z.object({
  course: z.string().max(60),
  page: z.string().max(60),
  anchorKey: z.string().min(1).max(160),
  anchorLabel: z.string().max(80).nullable().optional(),
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  snippet: z.string().max(200).nullable().optional(),
  body: z.string().trim().min(1, "写一句你的问题").max(2000),
});
const Body = z.object({ body: z.string().trim().min(1, "写点什么").max(2000) });

interface PinRow {
  id: string;
  user_id: string;
  course: string;
  item: string;
  page: string;
  anchor_key: string;
  anchor_label: string | null;
  x_pct: number;
  y_pct: number;
  snippet: string | null;
  status: "open" | "resolved";
  created_at: number;
  updated_at: number;
}

interface Author {
  id: string;
  name: string;
  display_name: string | null;
  kind: string;
  role: string;
}

/** 发言人怎么显示：能看真名的人看到名字；其余人看到校外成员的昵称，校内成员只显示“协会成员” */
function authorLabel(c: Ctx, a: Author | undefined, agent: boolean): string {
  if (agent) return "AI 助手";
  if (!a) return "已离开的成员";
  if (a.id === viewerId(c)) return "你";
  const nick = a.display_name || a.name;
  const shown = seesNames(c) || a.kind === "external" ? nick : "协会成员";
  return a.role === "admin" ? `${shown}（管理员）` : shown;
}

async function loadPins(c: Ctx, where: string, ...binds: unknown[]) {
  const db = c.env.DB;
  const pins = await db.prepare(`SELECT * FROM pins WHERE ${where} ORDER BY created_at`).bind(...binds).all<PinRow>();
  if (!pins.results.length) return [];
  const ids = pins.results.map((p) => p.id);
  const marks = ids.map(() => "?").join(",");
  const me = viewerId(c);
  const [msgs, votes] = await Promise.all([
    db
      .prepare(`SELECT id, pin_id, user_id, author_kind, body, created_at FROM pin_messages WHERE pin_id IN (${marks}) ORDER BY created_at, id`)
      .bind(...ids)
      .all<{ id: number; pin_id: string; user_id: string | null; author_kind: string; body: string; created_at: number }>(),
    db.prepare(`SELECT pin_id, user_id FROM pin_votes WHERE pin_id IN (${marks})`).bind(...ids).all<{ pin_id: string; user_id: string }>(),
  ]);
  const userIds = [...new Set([...pins.results.map((p) => p.user_id), ...msgs.results.map((m) => m.user_id).filter((x): x is string => !!x)])];
  const users = userIds.length
    ? await db
        .prepare(`SELECT id, name, display_name, kind, role FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`)
        .bind(...userIds)
        .all<Author>()
    : { results: [] as Author[] };
  const byId = new Map(users.results.map((u) => [u.id, u]));
  return pins.results.map((p) => {
    const messages = msgs.results.filter((m) => m.pin_id === p.id);
    const voters = votes.results.filter((v) => v.pin_id === p.id);
    return {
      id: p.id,
      course: p.course,
      item: p.item,
      page: p.page,
      anchorKey: p.anchor_key,
      anchorLabel: p.anchor_label,
      xPct: p.x_pct,
      yPct: p.y_pct,
      snippet: p.snippet,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      author: authorLabel(c, byId.get(p.user_id), false),
      mine: p.user_id === me,
      // 有提问人以外的回复（或 AI 的回答）就算“有人回了”
      answered: messages.some((m) => m.author_kind === "agent" || (m.user_id && m.user_id !== p.user_id)),
      votes: voters.length,
      voted: !!me && voters.some((v) => v.user_id === me),
      messages: messages.map((m) => ({
        id: m.id,
        author: authorLabel(c, m.user_id ? byId.get(m.user_id) : undefined, m.author_kind === "agent"),
        agent: m.author_kind === "agent",
        mine: !!me && m.user_id === me && m.author_kind !== "agent",
        body: m.body,
        createdAt: m.created_at,
      })),
    };
  });
}

async function onePin(c: Ctx, id: string) {
  const [pin] = await loadPins(c, "id = ?", id);
  if (!pin) throw new HttpError(404, "找不到这颗钉子");
  return pin;
}

async function pinRow(c: Ctx, id: string): Promise<PinRow> {
  const row = await c.env.DB.prepare("SELECT * FROM pins WHERE id = ?").bind(id).first<PinRow>();
  if (!row) throw new HttpError(404, "找不到这颗钉子");
  return row;
}

/** 每人每天最多请 AI 回答几次；每颗钉子最多几条 AI 回答 */
export const AI_DAILY_LIMIT = 20;
export const AI_PER_PIN = 3;

const AI_SYSTEM = `你是海纳协会（智慧网络算法协会）学习平台上的助教，回答同学钉在课程讲义上的问题。
要求：
- 用简体中文，口语化，像学长学姐讲题；先直接回答，再用一两句解释为什么。
- 只围绕讲义和这个问题，不扯远；能举一个很小的例子就举。
- 不确定的地方明说“不确定”，不要编造。作业题不要直接给完整答案，给思路和提示。
- 不超过 300 字，可以用 Markdown 的代码块。`;

/** 讲义原文：仓库自带的课是静态文件，发布的课程包在数据库里 */
async function pageText(c: Ctx, course: string, page: string): Promise<string> {
  try {
    const res = await c.env.ASSETS.fetch(new Request(new URL(`/learn/${course}/${page}.md`, c.url).toString()));
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && !type.includes("html")) return await res.text();
  } catch {
    // 落到下面
  }
  const json = await getPackageJson(c.env.DB, course);
  if (!json) return "";
  // biome-ignore lint/suspicious/noExplicitAny: 课程包 JSON
  const pkg = JSON.parse(json) as any;
  for (const m of pkg.modules ?? []) for (const it of m.items ?? []) for (const p of it.pages ?? []) if (p.id === page) return p.body ?? "";
  return "";
}

/** 截取问题附近的一段讲义，控制提示词长度 */
export function excerpt(text: string, snippet: string | null, size = 3000): string {
  if (text.length <= size) return text;
  const head = (snippet ?? "").slice(0, 16);
  const at = head ? text.indexOf(head) : -1;
  const start = at < 0 ? 0 : Math.max(0, at - size / 3);
  return text.slice(start, start + size);
}

export function pinRoutes(api: Router) {
  /** AI 有没有接上（网页和 App 据此显示“请 AI 回答”） */
  api.get("/api/ai/status", async (c) => json({ enabled: !!modelConfig(c.env) }));

  /** 请 AI 回答：回答作为一条消息留在讨论里，标明是 AI */
  api.post("/api/pins/:id/ai", async (c) => {
    const u = requireUser(c);
    const cfg = modelConfig(c.env);
    if (!cfg) throw new HttpError(503, "还没有接 AI。管理员在 Cloudflare 的 Worker 设置里填 AI_API_KEY 后就能用");
    const pin = await pinRow(c, c.params.id);
    const db = c.env.DB;
    const dayStart = Date.parse(`${new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10)}T00:00:00+08:00`);
    const [mine, onPin] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS n FROM pin_messages WHERE author_kind = 'agent' AND user_id = ? AND created_at >= ?").bind(u.id, dayStart).first<{ n: number }>(),
      db.prepare("SELECT COUNT(*) AS n FROM pin_messages WHERE author_kind = 'agent' AND pin_id = ?").bind(pin.id).first<{ n: number }>(),
    ]);
    if ((mine?.n ?? 0) >= AI_DAILY_LIMIT) throw new HttpError(429, `今天请 AI 回答的次数用完了（每天 ${AI_DAILY_LIMIT} 次）`);
    if ((onPin?.n ?? 0) >= AI_PER_PIN) throw new HttpError(429, `这颗钉子 AI 已经回答了 ${AI_PER_PIN} 次，接下来请同学们讨论吧`);

    const meta = await getCourse(db, pin.course);
    const item = meta ? itemsOf(meta).find((it) => it.id === pin.item) : undefined;
    const msgs = await db
      .prepare("SELECT author_kind, user_id, body FROM pin_messages WHERE pin_id = ? ORDER BY created_at, id")
      .bind(pin.id)
      .all<{ author_kind: string; user_id: string | null; body: string }>();
    const lecture = excerpt(await pageText(c, pin.course, pin.page), pin.snippet);
    const talk = msgs.results.map((m, i) => `${i === 0 ? "提问" : m.author_kind === "agent" ? "AI" : m.user_id === pin.user_id ? "提问的同学" : "其他同学"}：${m.body}`).join("\n");
    const user = [
      `课程：${meta?.title ?? pin.course}`,
      `条目：${item?.title ?? pin.item}`,
      `问题钉在：${pin.anchor_label ?? "这一页"}`,
      pin.snippet ? `那一段的开头：${pin.snippet}` : "",
      "",
      "讲义（节选）：",
      lecture || "（没有取到讲义原文）",
      "",
      "讨论：",
      talk,
      "",
      "请回答最后一个还没解决的问题。",
    ]
      .filter((x) => x !== null)
      .join("\n");
    let text: string;
    try {
      text = (await complete(cfg, { system: AI_SYSTEM, user, maxTokens: 800, json: false })).text.trim();
    } catch (err) {
      console.error(JSON.stringify({ msg: "pin ai failed", error: String(err) }));
      throw new HttpError(502, err instanceof ModelError ? "AI 暂时没回应，过一会儿再试" : "AI 出了点问题，过一会儿再试");
    }
    const now = Date.now();
    await db.batch([
      db.prepare("INSERT INTO pin_messages (pin_id, user_id, author_kind, body, created_at) VALUES (?, ?, 'agent', ?, ?)").bind(pin.id, u.id, text.slice(0, 4000), now),
      db.prepare("UPDATE pins SET updated_at = ? WHERE id = ?").bind(now, pin.id),
    ]);
    return json(await onePin(c, pin.id));
  });

  /** 某一页的钉子（游客也能看） */
  api.get("/api/pins", async (c) => {
    const course = c.url.searchParams.get("course") ?? "";
    const page = c.url.searchParams.get("page") ?? "";
    if (!course || !page) throw new HttpError(400, "要指定课程和页面");
    return json(await loadPins(c, "course = ? AND page = ?", course, page));
  });

  api.post("/api/pins", async (c) => {
    const u = requireUser(c);
    const input = PinInput.parse(await c.body());
    if (input.course.startsWith("local-")) throw new HttpError(400, "导入到本机的课只有你自己能看到，不能钉问题");
    const meta = await getCourse(c.env.DB, input.course);
    if (!meta) throw new HttpError(404, "没有这门课");
    const item = itemsOf(meta).find((it) => it.pages.some((p) => p.id === input.page) || it.id === input.page);
    if (!item) throw new HttpError(404, "这门课没有这一页");
    const now = Date.now();
    const id = crypto.randomUUID();
    const db = c.env.DB;
    await db.batch([
      db
        .prepare(
          "INSERT INTO pins (id, user_id, course, item, page, anchor_key, anchor_label, x_pct, y_pct, snippet, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)",
        )
        .bind(id, u.id, input.course, item.id, input.page, input.anchorKey, input.anchorLabel ?? null, input.xPct, input.yPct, input.snippet ?? null, now, now),
      db.prepare("INSERT INTO pin_messages (pin_id, user_id, author_kind, body, created_at) VALUES (?, ?, 'member', ?, ?)").bind(id, u.id, input.body, now),
    ]);
    await recordActivity(db, u.id, "ask", id, now);
    await enqueue(c.env, {
      kind: "pin",
      title: `【蓝色钉子】${meta.title} · ${item.title}${input.anchorLabel ? ` · ${input.anchorLabel}` : ""}`,
      body: input.body.slice(0, 300),
      link: adminLink(c.env, `/courses/${input.course}/learn/${input.page}?pin=${id}`),
    });
    await flush(c.env, { force: false }).catch(() => {});
    return json(await onePin(c, id));
  });

  api.post("/api/pins/:id/messages", async (c) => {
    const u = requireUser(c);
    const pin = await pinRow(c, c.params.id);
    const { body } = Body.parse(await c.body());
    const now = Date.now();
    const db = c.env.DB;
    await db.batch([
      db.prepare("INSERT INTO pin_messages (pin_id, user_id, author_kind, body, created_at) VALUES (?, ?, 'member', ?, ?)").bind(pin.id, u.id, body, now),
      db.prepare("UPDATE pins SET updated_at = ? WHERE id = ?").bind(now, pin.id),
    ]);
    if (pin.user_id !== u.id) await recordActivity(db, u.id, "answer", pin.id, now);
    else {
      await enqueue(c.env, { kind: "followup", title: "【蓝色钉子】有人追问", body: body.slice(0, 300), link: adminLink(c.env, `/courses/${pin.course}/learn/${pin.page}?pin=${pin.id}`) });
      await flush(c.env, { force: false }).catch(() => {});
    }
    return json(await onePin(c, pin.id));
  });

  /** “我也想问”：再点一次取消 */
  api.post("/api/pins/:id/vote", async (c) => {
    const u = requireUser(c);
    const pin = await pinRow(c, c.params.id);
    const db = c.env.DB;
    const had = await db.prepare("SELECT 1 AS x FROM pin_votes WHERE pin_id = ? AND user_id = ?").bind(pin.id, u.id).first();
    if (had) await db.prepare("DELETE FROM pin_votes WHERE pin_id = ? AND user_id = ?").bind(pin.id, u.id).run();
    else await db.prepare("INSERT INTO pin_votes (pin_id, user_id, created_at) VALUES (?, ?, ?)").bind(pin.id, u.id, Date.now()).run();
    return json(await onePin(c, pin.id));
  });

  /** 标记已解决 / 重新打开：提问的人或管理员 */
  api.post("/api/pins/:id/resolve", async (c) => {
    const u = requireUser(c);
    const pin = await pinRow(c, c.params.id);
    if (pin.user_id !== u.id && !isAdmin(c)) throw new HttpError(403, "只有提问的人和管理员能改状态");
    const { resolved } = z.object({ resolved: z.boolean() }).parse(await c.body());
    await c.env.DB.prepare("UPDATE pins SET status = ?, updated_at = ? WHERE id = ?")
      .bind(resolved ? "resolved" : "open", Date.now(), pin.id)
      .run();
    return json(await onePin(c, pin.id));
  });

  /** 撤回：提问的人在别人回复之前；管理员随时 */
  api.delete("/api/pins/:id", async (c) => {
    const u = requireUser(c);
    const pin = await pinRow(c, c.params.id);
    const db = c.env.DB;
    if (!isAdmin(c)) {
      if (pin.user_id !== u.id) throw new HttpError(403, "只能撤回自己的问题");
      const replied = await db
        .prepare("SELECT 1 AS x FROM pin_messages WHERE pin_id = ? AND (author_kind = 'agent' OR user_id != ?) LIMIT 1")
        .bind(pin.id, u.id)
        .first();
      if (replied) throw new HttpError(409, "已经有人回复了，不能撤回；可以标成已解决");
    }
    await db.batch([
      db.prepare("DELETE FROM pin_messages WHERE pin_id = ?").bind(pin.id),
      db.prepare("DELETE FROM pin_votes WHERE pin_id = ?").bind(pin.id),
      db.prepare("DELETE FROM pins WHERE id = ?").bind(pin.id),
    ]);
    return json({ ok: true });
  });

  /** 删除一条回复：自己的，或管理员 */
  api.delete("/api/pins/:id/messages/:mid", async (c) => {
    const u = requireUser(c);
    const pin = await pinRow(c, c.params.id);
    const m = await c.env.DB.prepare("SELECT id, user_id FROM pin_messages WHERE id = ? AND pin_id = ?")
      .bind(Number(c.params.mid), pin.id)
      .first<{ id: number; user_id: string | null }>();
    if (!m) throw new HttpError(404, "找不到这条回复");
    if (m.user_id !== u.id && !isAdmin(c)) throw new HttpError(403, "只能删除自己的回复");
    const first = await c.env.DB.prepare("SELECT MIN(id) AS id FROM pin_messages WHERE pin_id = ?").bind(pin.id).first<{ id: number }>();
    if (first?.id === m.id) throw new HttpError(400, "这是问题本身；要撤回请撤回整颗钉子");
    await c.env.DB.prepare("DELETE FROM pin_messages WHERE id = ?").bind(m.id).run();
    return json(await onePin(c, pin.id));
  });

  /** 管理后台：最近的钉子（没解决的在前） */
  api.get("/api/admin/pins", async (c) => {
    requireAdmin(c);
    const rows = await loadPins(c, "id IN (SELECT id FROM pins ORDER BY (status = 'resolved'), updated_at DESC LIMIT 100)");
    const titles = new Map<string, string>();
    for (const p of rows) {
      if (titles.has(p.course)) continue;
      const meta = await getCourse(c.env.DB, p.course);
      titles.set(p.course, meta?.title ?? p.course);
      if (meta) for (const it of itemsOf(meta)) titles.set(`${p.course}/${it.id}`, it.title);
    }
    rows.sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.updatedAt - a.updatedAt);
    return json(rows.map((p) => ({ ...p, courseTitle: titles.get(p.course) ?? p.course, itemTitle: titles.get(`${p.course}/${p.item}`) ?? p.item })));
  });
}
