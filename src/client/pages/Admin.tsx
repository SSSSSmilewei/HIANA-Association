import { useMemo, useState } from "react";
import { addDays } from "../../shared/heatmap";
import { api, clock, cnToday, invalidate, longDay, useApi } from "../api";
import { KIND_LABEL } from "../attendance";
import { Icon } from "../icons";
import type { AdminMember, AdminToday, ImportResult, Notice } from "../types";
import { Dialog, Empty, ErrorBox, Seg, Skeleton, Spinner, useConfirm, useDialogClose, useTitle, useToast } from "../ui";

const WD = ["一", "二", "三", "四", "五", "六", "日"];

function Head({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="h1">{title}</h1>
      </div>
      {children}
    </header>
  );
}

/* ---------- 今日签到 ---------- */

export function AdminTodayPage() {
  useTitle("今日签到");
  const toast = useToast();
  const { data, error, reload } = useApi<AdminToday>("/api/admin/attendance/today", { refreshMs: 30_000 });
  const idle = useApi<AdminMember[]>("/api/admin/idle?days=14");
  const [photo, setPhoto] = useState<{ key: string; label: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const evening = data?.records.filter((r) => r.kind === "evening") ?? [];
  const venueNow = data?.records.filter((r) => r.kind === "venue" && r.status === "open") ?? [];

  const flipCode = async () => {
    if (!data) return;
    const next = !data.rule.requireCode;
    try {
      await api("/api/admin/attendance/settings", { method: "PUT", body: { days: data.rule.days.join(","), window: data.rule.window.join("-"), requireCode: next } });
      toast(next ? "现场口令已开启" : "现场口令已关闭，学员拍照就能签到");
      void reload();
      invalidate("/api/attendance");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="page">
      <Head eyebrow={data ? `${longDay(data.today)} · ${data.isEveningDay ? `晚自习 ${data.rule.window[0]} – ${data.rule.window[1]}` : "今天没有晚自习"}` : " "} title="今日签到">
        <button type="button" className="btn btn-ghost" onClick={() => setExporting(true)}>
          <Icon name="download" size={18} />
          导出给学校（CSV）
        </button>
      </Head>

      {error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton h={140} r={22} />
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 14 }}>
          <div className="card stack" style={{ gap: 10 }}>
            <span className="small sub">晚自习已签到</span>
            <span className="row" style={{ alignItems: "baseline", gap: 6 }}>
              <span className="big-num">{evening.length}</span>
              <span className="sub">/ {data.members} 人</span>
            </span>
            <div className="bar" aria-hidden="true">
              <i style={{ width: `${data.members ? Math.min(100, (evening.length / data.members) * 100) : 0}%` }} />
            </div>
          </div>
          <div className="card stack" style={{ gap: 10 }}>
            <span className="small sub">大创场地在场</span>
            <span className="row" style={{ alignItems: "baseline", gap: 6 }}>
              <span className="big-num">{venueNow.length}</span>
              <span className="sub">人</span>
            </span>
            <span className="small sub">23:59 自动结束</span>
          </div>
          <div className="night-card" style={{ gap: 10 }}>
            <span className="row" style={{ justifyContent: "space-between" }}>
              <span id="code-l" className="small night-sub">
                现场口令
              </span>
              <button type="button" role="switch" className="switch" aria-checked={data.rule.requireCode} aria-labelledby="code-l" onClick={flipCode} />
            </span>
            {data.rule.requireCode ? (
              <span className="row" aria-label={`今天的口令 ${data.code}`} style={{ gap: 8 }}>
                {data.code.split("").map((d, i) => (
                  <span
                    key={i}
                    className="mono rise"
                    style={{ "--i": i, width: 40, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600, color: "var(--night-accent)" } as React.CSSProperties}
                  >
                    {d}
                  </span>
                ))}
              </span>
            ) : null}
            <span className="xsmall night-sub" style={{ lineHeight: "18px" }}>
              {data.rule.requireCode ? "投到屏幕上，每天自动换。学员晚自习签到时要输入。" : "已关闭：学员拍照就能签到，不用输口令。"}
            </span>
          </div>
        </div>
      )}

      <div className="split">
        <section className="split-main card card-flush" aria-labelledby="rec-h" style={{ padding: "8px 8px 4px" }}>
          <div className="section-head" style={{ padding: "12px 12px 8px" }}>
            <h2 id="rec-h" className="h3">
              签到记录
            </h2>
            <span className="xsmall sub">点照片看大图 · 只有管理员和本人看得到</span>
          </div>
          {!data ? (
            <Skeleton h={240} />
          ) : data.records.length === 0 ? (
            <Empty title="今天还没有人签到" />
          ) : (
            <div className="table-box">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">姓名 · 学号</th>
                    <th scope="col">场景</th>
                    <th scope="col">签到</th>
                    <th scope="col">签退</th>
                    <th scope="col">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="stack" style={{ gap: 0 }}>
                          <span style={{ fontWeight: 500 }}>{r.name}</span>
                          <span className="mono xsmall sub">{r.studentNo}</span>
                        </span>
                      </td>
                      <td className="sub">{KIND_LABEL[r.kind]}</td>
                      <td>
                        <span className="row">
                          {r.inPhoto && <Thumb k={r.inPhoto} label={`${r.name} 的签到照片`} onOpen={setPhoto} />}
                          <span className="num">{clock(r.inAt)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="row">
                          {r.outPhoto && <Thumb k={r.outPhoto} label={`${r.name} 的签退照片`} onOpen={setPhoto} />}
                          <span className="num sub">{r.outAt ? clock(r.outAt) : "—"}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${r.status === "open" ? "tag-accent" : r.status === "closed" ? "tag-muted" : "tag-bad"}`}>
                          {r.status === "open" ? "学习中" : r.status === "closed" ? "已签退" : "未签退"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="split-side card stack" aria-labelledby="idle-h" style={{ gap: 6 }}>
          <h2 id="idle-h" className="h3">
            两周没动静
          </h2>
          <p className="small sub" style={{ marginBottom: 6 }}>
            没签到、没学单元、站外也没记录。可能只是忙，私下问一句就好。
          </p>
          {!idle.data ? (
            <Skeleton h={120} />
          ) : idle.data.length === 0 ? (
            <span className="small sub">大家都有在学。</span>
          ) : (
            idle.data.map((m) => (
              <div key={m.id} className="list-row">
                <span className="avatar" aria-hidden="true" style={{ width: 32, height: 32, fontSize: 13, background: "var(--well)", color: "var(--sub)" }}>
                  {m.name.slice(0, 1)}
                </span>
                <span className="grow stack" style={{ gap: 0 }}>
                  <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: 500 }}>{m.name}</span>
                  <span className="xsmall sub">{m.lastActiveDay ? `最后一次：${longDay(m.lastActiveDay, false)}` : m.hasPassword ? "还没有记录" : "还没激活账号"}</span>
                </span>
              </div>
            ))
          )}
        </section>
      </div>

      {photo && (
        <Dialog title={photo.label} onClose={() => setPhoto(null)} wide>
          <img src={`/api/files/${photo.key}`} alt={photo.label} style={{ width: "100%", borderRadius: 16, background: "var(--well)" }} />
        </Dialog>
      )}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  );
}

function Thumb({ k, label, onOpen }: { k: string; label: string; onOpen: (p: { key: string; label: string }) => void }) {
  return (
    <button type="button" className="photo-thumb" aria-label={label} onClick={() => onOpen({ key: k, label })}>
      <img src={`/api/files/${k}`} alt="" loading="lazy" />
    </button>
  );
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const today = cnToday();
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  const [kind, setKind] = useState<"" | "evening" | "venue">("");
  const href = `/api/admin/attendance.csv?from=${from}&to=${to}${kind ? `&kind=${kind}` : ""}`;
  return (
    <Dialog title="导出签到记录" sub="带 BOM 的 UTF-8 表格，Excel 直接打开不乱码。" onClose={onClose}>
      <div className="form">
        <div className="row wrap">
          <label className="field grow">
            从
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field grow">
            到
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="small" style={{ fontWeight: 600 }}>
            场景
          </span>
          <Seg
            label="场景"
            flat
            value={kind}
            onChange={setKind}
            options={[
              { value: "" as const, label: "全部" },
              { value: "evening" as const, label: "晚自习" },
              { value: "venue" as const, label: "大创场地" },
            ]}
          />
        </div>
        <div className="dialog-actions">
          <a className="btn btn-primary" href={href} download>
            <Icon name="download" size={18} />
            下载 CSV
          </a>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- 成员 ---------- */

export function AdminMembersPage({ selfId }: { selfId: string | null }) {
  useTitle("成员");
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, reload } = useApi<AdminMember[]>("/api/admin/members");
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"active" | "archived">("active");
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState<{ name: string; passcode: string } | null>(null);

  const list = useMemo(
    () => (data ?? []).filter((m) => m.status === show && (!q.trim() || `${m.name}${m.studentNo}${m.className ?? ""}`.includes(q.trim()))),
    [data, q, show],
  );

  const act = async (m: AdminMember, what: "reset" | "admin" | "member" | "archive" | "restore") => {
    const texts = {
      reset: { title: `重置 ${m.name} 的密码？`, body: "旧密码马上失效，会生成一个新口令。把口令发给 TA，用它重新激活账号并设置新密码。", ok: "重置" },
      admin: { title: `把 ${m.name} 设为管理员？`, body: "管理员能看所有人的签到照片、管理成员和发公告。适合会长和指导老师。", ok: "设为管理员" },
      member: { title: `取消 ${m.name} 的管理员？`, body: "TA 还能正常学习，只是进不了后台。", ok: "取消管理员" },
      archive: { title: `停用 ${m.name} 的账号？`, body: "停用后不能登录，也不再出现在统计里。记录都会保留，随时可以恢复。", ok: "停用", danger: true },
      restore: { title: `恢复 ${m.name} 的账号？`, body: "恢复后 TA 可以用原来的学号和密码登录。", ok: "恢复" },
    }[what];
    if (!(await confirm(texts))) return;
    try {
      if (what === "reset") {
        const r = await api<{ passcode: string }>(`/api/admin/members/${m.id}/reset`, { method: "POST" });
        setCode({ name: m.name, passcode: r.passcode });
      } else if (what === "admin" || what === "member") {
        await api(`/api/admin/members/${m.id}/role`, { body: { role: what } });
        toast(what === "admin" ? `${m.name} 现在是管理员` : `已取消 ${m.name} 的管理员`);
      } else {
        await api(`/api/admin/members/${m.id}/status`, { body: { status: what === "archive" ? "archived" : "active" } });
        toast(what === "archive" ? `已停用 ${m.name}` : `已恢复 ${m.name}`);
      }
      void reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const counts = { active: data?.filter((m) => m.status === "active").length ?? 0, archived: data?.filter((m) => m.status === "archived").length ?? 0 };

  return (
    <div className="page">
      <Head eyebrow={data ? `${counts.active} 人在用 · ${data.filter((m) => m.status === "active" && !m.hasPassword).length} 人还没激活` : " "} title="成员">
        <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>
          <Icon name="plus" size={18} stroke={2} />
          导入名单
        </button>
      </Head>
      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        <label className="row" style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <span className="sr-only">搜索成员</span>
          <Icon name="search" size={18} style={{ position: "absolute", left: 14, color: "var(--sub)" }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="姓名、学号或班级" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Seg
          label="状态"
          value={show}
          onChange={setShow}
          options={[
            { value: "active" as const, label: `在用 ${counts.active}` },
            { value: "archived" as const, label: `已停用 ${counts.archived}` },
          ]}
        />
      </div>
      <section className="card card-flush" aria-label="成员列表" style={{ padding: "4px 8px" }}>
        {error && !data ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : !data ? (
          <Skeleton h={300} />
        ) : list.length === 0 ? (
          <Empty title={q ? "没有找到" : show === "active" ? "还没有成员" : "没有停用的账号"}>{!q && show === "active" ? "点右上角“导入名单”，从 Excel 复制学号、姓名、班级三列粘贴进来。" : undefined}</Empty>
        ) : (
          <div className="table-box">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">姓名</th>
                  <th scope="col">学号</th>
                  <th scope="col">班级</th>
                  <th scope="col">状态</th>
                  <th scope="col">最近</th>
                  <th scope="col">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>
                      {m.name}
                      {m.role === "admin" && (
                        <span className="tag tag-accent" style={{ marginLeft: 8 }}>
                          管理员
                        </span>
                      )}
                    </td>
                    <td className="mono small">{m.studentNo}</td>
                    <td className="sub">{m.className ?? "—"}</td>
                    <td>{m.hasPassword ? <span className="tag tag-ok">已激活</span> : <span className="tag tag-muted">未激活</span>}</td>
                    <td className="small sub">{m.lastActiveDay ? longDay(m.lastActiveDay, false) : "—"}</td>
                    <td>
                      <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        {m.status === "active" ? (
                          <>
                            <button type="button" className="btn btn-quiet btn-sm" onClick={() => act(m, "reset")}>
                              重置密码
                            </button>
                            {m.id !== selfId && (
                              <button type="button" className="btn btn-quiet btn-sm" onClick={() => act(m, m.role === "admin" ? "member" : "admin")}>
                                {m.role === "admin" ? "取消管理员" : "设为管理员"}
                              </button>
                            )}
                            {m.id !== selfId && (
                              <button type="button" className="btn btn-quiet btn-sm" onClick={() => act(m, "archive")}>
                                停用
                              </button>
                            )}
                          </>
                        ) : (
                          <button type="button" className="btn btn-soft btn-sm" onClick={() => act(m, "restore")}>
                            恢复
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={reload} />}
      {code && (
        <Dialog title={`${code.name} 的新口令`} sub="只显示这一次。发给 TA，用它在登录页“第一次使用”里激活。" onClose={() => setCode(null)}>
          <PasscodeBox code={code.passcode} />
        </Dialog>
      )}
    </div>
  );
}

function PasscodeBox({ code }: { code: string }) {
  const toast = useToast();
  return (
    <div className="row" style={{ padding: 16, borderRadius: 16, background: "var(--well)", justifyContent: "space-between" }}>
      <span className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1 }}>
        {code}
      </span>
      <button
        type="button"
        className="btn btn-soft btn-sm"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => toast("复制好了"));
        }}
      >
        复制
      </button>
    </div>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  return (
    <Dialog title="导入名单" sub="每行一个人：学号 姓名 班级（班级可以不写）。直接从 Excel 复制几列粘贴进来就行。" onClose={onClose} wide>
      <ImportForm onDone={onDone} />
    </Dialog>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const close = useDialogClose();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const toast = useToast();
  if (result)
    return (
      <div className="form">
        <p className="small">
          新建 {result.created.length} 人，更新 {result.updated} 人。{result.errors.length ? `有 ${result.errors.length} 行没识别：${result.errors.slice(0, 3).join("；")}` : ""}
        </p>
        {result.created.length > 0 && (
          <>
            <p className="small sub">下面的口令只显示这一次。复制下来发给每个人，用它在登录页“第一次使用”里激活。</p>
            <textarea className="input mono" readOnly rows={Math.min(10, result.created.length + 1)} value={result.created.map((c) => `${c.studentNo}\t${c.name}\t${c.passcode}`).join("\n")} />
          </>
        )}
        <div className="dialog-actions">
          {result.created.length > 0 && (
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => void navigator.clipboard?.writeText(result.created.map((c) => `${c.studentNo}\t${c.name}\t${c.passcode}`).join("\n")).then(() => toast("复制好了，可以粘贴进 Excel"))}
            >
              全部复制
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={close}>
            完成
          </button>
        </div>
      </div>
    );
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api<ImportResult>("/api/admin/members/import", { body: { text } });
          setResult(r);
          onDone();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        名单
        <textarea className="input mono" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"2025010101\t林同学\t计科2501\n2025010102\t陈同学\t计科2501"} />
      </label>
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={close}>
          取消
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? <Spinner /> : "导入"}
        </button>
      </div>
    </form>
  );
}

/* ---------- 公告 ---------- */

export function AdminNoticesPage() {
  useTitle("发公告");
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, reload } = useApi<Notice[]>("/api/notices");
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const remove = async (n: Notice) => {
    if (!(await confirm({ title: `删除「${n.title}」？`, body: n.kind === "competition" ? "登记名单也会一起不显示。" : undefined, ok: "删除", danger: true }))) return;
    try {
      await api(`/api/admin/notices/${n.id}`, { method: "DELETE" });
      toast("已删除");
      invalidate("/api/notices");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <div className="page">
      <Head eyebrow="公告 · 比赛卡" title="发公告">
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Icon name="plus" size={18} stroke={2} />
          新建
        </button>
      </Head>
      <section className="card card-flush" style={{ padding: "4px 16px" }}>
        {error && !data ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : !data ? (
          <Skeleton h={240} />
        ) : data.length === 0 ? (
          <Empty title="还没有公告" action={<button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>写第一条</button>} />
        ) : (
          data.map((n) => (
            <div key={n.id} className="list-row" style={{ flexWrap: "wrap" }}>
              <span className={`tag ${n.kind === "competition" ? "tag-accent" : ""}`}>{n.kind === "competition" ? "比赛" : "公告"}</span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span style={{ fontWeight: 500 }}>
                  {n.pinned && "【置顶】"}
                  {n.title}
                </span>
                <span className="xsmall sub">
                  {[n.author, n.deadline ? `截止 ${n.deadline}` : null, n.kind === "competition" ? `${n.entries.length} 人登记` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(n)}>
                编辑
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(n)}>
                删除
              </button>
            </div>
          ))
        )}
      </section>
      {editing && (
        <Dialog title={editing === "new" ? "新建公告" : "编辑公告"} onClose={() => setEditing(null)} wide>
          <NoticeForm initial={editing === "new" ? null : editing} />
        </Dialog>
      )}
    </div>
  );
}

function NoticeForm({ initial }: { initial: Notice | null }) {
  const close = useDialogClose();
  const toast = useToast();
  const [kind, setKind] = useState<"notice" | "competition">(initial?.kind ?? "notice");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [docUrl, setDocUrl] = useState(initial?.docUrl ?? "");
  const [groupInfo, setGroupInfo] = useState(initial?.groupInfo ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join("，"));
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const payload = {
          kind,
          title,
          body,
          docUrl: docUrl.trim(),
          groupInfo: groupInfo.trim() || undefined,
          deadline,
          tags: tags
            .split(/[,，、\s]+/)
            .map((t) => t.trim())
            .filter(Boolean),
          pinned,
        };
        try {
          if (initial) await api(`/api/admin/notices/${initial.id}`, { method: "PUT", body: payload });
          else await api("/api/admin/notices", { body: payload });
          toast(initial ? "已保存" : kind === "competition" ? "比赛已发布，会推送到群里" : "已发布");
          invalidate("/api/notices");
          close();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <Seg
        label="类型"
        flat
        value={kind}
        onChange={setKind}
        options={[
          { value: "notice" as const, label: "公告" },
          { value: "competition" as const, label: "比赛卡" },
        ]}
      />
      <label className="field">
        标题
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
      </label>
      <label className="field">
        正文
        <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
      </label>
      {kind === "competition" && (
        <>
          <div className="row wrap">
            <label className="field grow">
              截止日期
              <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <label className="field grow">
              群号或联系方式
              <input className="input" value={groupInfo} onChange={(e) => setGroupInfo(e.target.value)} maxLength={200} placeholder="QQ 群 123456" />
            </label>
          </div>
          <label className="field">
            标签<span className="hint">用逗号隔开，例如：AI，视觉，团队赛</span>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        </>
      )}
      <label className="field">
        {kind === "competition" ? "官方文档链接" : "相关链接（可以不填）"}
        <input className="input" type="url" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://" />
      </label>
      <label className="row" style={{ gap: 12, fontSize: 14, cursor: "pointer" }}>
        <button type="button" role="switch" className="switch" aria-checked={pinned} onClick={() => setPinned(!pinned)} aria-label="置顶" />
        置顶
      </label>
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={close}>
          取消
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
          {busy ? <Spinner /> : initial ? "保存" : "发布"}
        </button>
      </div>
    </form>
  );
}

/* ---------- 设置 ---------- */

export function AdminSettingsPage() {
  useTitle("设置");
  const toast = useToast();
  const today = useApi<AdminToday>("/api/admin/attendance/today");
  const settings = useApi<Record<string, string | null>>("/api/admin/settings");
  return (
    <div className="page">
      <Head eyebrow="晚自习 · 学期 · App" title="设置" />
      {today.data ? <EveningForm rule={today.data.rule} onSaved={() => (void today.reload(), invalidate("/api/attendance"), toast("晚自习设置已保存"))} /> : <Skeleton h={260} r={22} />}
      {settings.data ? <OtherSettings s={settings.data} onSaved={() => (void settings.reload(), invalidate("/api/calendar"), toast("已保存"))} /> : <Skeleton h={260} r={22} />}
    </div>
  );
}

function EveningForm({ rule, onSaved }: { rule: AdminToday["rule"]; onSaved: () => void }) {
  const [days, setDays] = useState<number[]>(rule.days);
  const [start, setStart] = useState(rule.window[0]);
  const [end, setEnd] = useState(rule.window[1]);
  const [code, setCode] = useState(rule.requireCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastErr = useToast();
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/admin/attendance/settings", { method: "PUT", body: { days: [...days].sort().join(","), window: `${start}-${end}`, requireCode: code } });
          onSaved();
        } catch (err) {
          setError((err as Error).message);
          toastErr((err as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="h3">晚自习</h2>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small" style={{ fontWeight: 600 }}>
          每周哪几天
        </span>
        <div className="row wrap" role="group" aria-label="每周哪几天" style={{ gap: 6 }}>
          {WD.map((w, i) => (
            <button
              key={w}
              type="button"
              className="chip"
              aria-pressed={days.includes(i + 1)}
              style={{ "--c": "var(--accent)", minWidth: 52, justifyContent: "center" } as React.CSSProperties}
              onClick={() => setDays(days.includes(i + 1) ? days.filter((d) => d !== i + 1) : [...days, i + 1])}
            >
              周{w}
            </button>
          ))}
        </div>
      </div>
      <div className="row wrap">
        <label className="field grow">
          开始
          <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="field grow">
          结束（自动结束签到）
          <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
      </div>
      <label className="row" style={{ gap: 12, fontSize: 14, cursor: "pointer" }}>
        <button type="button" role="switch" className="switch" aria-checked={code} onClick={() => setCode(!code)} aria-label="晚自习签到要输现场口令" />
        <span className="stack" style={{ gap: 0 }}>
          <span>晚自习签到要输现场口令</span>
          <span className="xsmall sub">口令每天自动换，在“今日签到”页显示，投到屏幕上。</span>
        </span>
      </label>
      {error && <span className="error-text">{error}</span>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || days.length === 0}>
          {busy ? <Spinner /> : "保存"}
        </button>
        <span className="xsmall sub">提前 15 分钟开放签到。</span>
      </div>
    </form>
  );
}

function OtherSettings({ s, onSaved }: { s: Record<string, string | null>; onSaved: () => void }) {
  const [semester, setSemester] = useState(s.semester_start ?? "");
  const [latest, setLatest] = useState(s.app_latest_version ?? "");
  const [min, setMin] = useState(s.app_min_version ?? "");
  const [apk, setApk] = useState(s.app_apk_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const body: Record<string, string> = {};
        if (semester) body.semester_start = semester;
        if (latest) body.app_latest_version = latest;
        if (min) body.app_min_version = min;
        if (apk) body.app_apk_url = apk;
        try {
          await api("/api/admin/settings", { method: "PUT", body });
          onSaved();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="h3">学期与 App</h2>
      <label className="field">
        开学日期<span className="hint">第 1 周的周一。首页会显示“第 N 周”。</span>
        <input className="input" type="date" value={semester} onChange={(e) => setSemester(e.target.value)} style={{ maxWidth: 240 }} />
      </label>
      <div className="row wrap">
        <label className="field grow">
          App 最新版本
          <input className="input mono" value={latest} onChange={(e) => setLatest(e.target.value)} placeholder="1.0.1" />
        </label>
        <label className="field grow">
          最低可用版本<span className="hint">低于它会要求更新</span>
          <input className="input mono" value={min} onChange={(e) => setMin(e.target.value)} placeholder="1.0.0" />
        </label>
      </div>
      <label className="field">
        APK 下载地址
        <input className="input" type="url" value={apk} onChange={(e) => setApk(e.target.value)} placeholder="https://" />
      </label>
      {error && <span className="error-text">{error}</span>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Spinner /> : "保存"}
        </button>
      </div>
    </form>
  );
}
