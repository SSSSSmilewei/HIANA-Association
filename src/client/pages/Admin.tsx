import { useMemo, useRef, useState } from "react";
import { addDays } from "../../shared/heatmap";
import { api, clock, cnToday, invalidate, longDay, relativeTime, useApi } from "../api";
import { KIND_LABEL } from "../attendance";
import { compressImage } from "../components/NoticeBody";
import { Icon } from "../icons";
import { Link } from "../router";
import type { AdminMember, AdminToday, Invite, Notice } from "../types";
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
          导出给学校
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
              {data.rule.requireCode ? "每天自动换" : "已关闭"}
            </span>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 20 }}>
        <section className="card card-flush" aria-labelledby="rec-h" style={{ padding: "8px 8px 4px" }}>
          <div className="section-head" style={{ padding: "12px 12px 8px" }}>
            <h2 id="rec-h" className="h3">
              签到记录
            </h2>
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

        <section className="card stack" aria-labelledby="idle-h" style={{ gap: 6, maxWidth: 560 }}>
          <h2 id="idle-h" className="h3">
            两周没动静
          </h2>
          {!idle.data ? (
            <Skeleton h={120} />
          ) : idle.data.length === 0 ? (
            <span className="small sub">大家都有在学。</span>
          ) : (
            idle.data.map((m) => (
              <div key={m.id} className="list-row">
                <span className="avatar" aria-hidden="true" style={{ width: 32, height: 32, fontSize: "var(--fs-xs)", background: "var(--well)", color: "var(--sub)" }}>
                  {m.name.slice(0, 1)}
                </span>
                <span className="grow stack" style={{ gap: 0 }}>
                  <span style={{ fontSize: "var(--fs-sm)", lineHeight: "22px", fontWeight: 500 }}>{m.name}</span>
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
  const qs = `from=${from}&to=${to}${kind ? `&kind=${kind}` : ""}`;
  const href = `/api/admin/attendance.csv?${qs}`;
  return (
    <Dialog title="导出签到记录" onClose={onClose}>
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
        <p className="small sub pretty">签到表带照片和手写签名，可以直接打印或存成 PDF 交给学校（最多两个月）；CSV 只有文字，适合用 Excel 再加工。</p>
        <div className="dialog-actions">
          <a className="btn btn-ghost" href={href} download>
            <Icon name="download" size={18} />
            下载 CSV
          </a>
          <Link className="btn btn-primary" to={`/admin/report?${qs}`}>
            打开签到表
          </Link>
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
  const [inviting, setInviting] = useState(false);
  const [code, setCode] = useState<{ name: string; account: string; code: string } | null>(null);

  const list = useMemo(
    () => (data ?? []).filter((m) => m.status === show && (!q.trim() || `${m.name}${m.studentNo}${m.username ?? ""}${m.email ?? ""}${m.org ?? ""}${m.className ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [data, q, show],
  );

  const act = async (m: AdminMember, what: "reset" | "admin" | "member" | "archive" | "restore") => {
    const texts = {
      reset: { title: `重置 ${m.name} 的密码？`, body: "旧密码失效，已登录的设备会退出。生成的重置码在登录页“忘记密码”里用。", ok: "重置" },
      admin: { title: `把 ${m.name} 设为管理员？`, body: "可以看所有签到照片、管理成员、发公告。", ok: "设为管理员" },
      member: { title: `取消 ${m.name} 的管理员？`, body: undefined, ok: "取消管理员" },
      archive: { title: `停用 ${m.name} 的账号？`, body: "不能登录，不计入统计，记录保留。", ok: "停用", danger: true },
      restore: { title: `恢复 ${m.name} 的账号？`, body: undefined, ok: "恢复" },
    }[what];
    if (!(await confirm(texts))) return;
    try {
      if (what === "reset") {
        const r = await api<{ code: string }>(`/api/admin/members/${m.id}/reset`, { method: "POST" });
        setCode({ name: m.name, account: m.kind === "external" ? (m.username ?? "") : m.studentNo, code: r.code });
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
      <Head eyebrow={data ? `${counts.active} 人在用 · ${data.filter((m) => m.status === "active" && !m.hasPassword).length} 人待设密码` : " "} title="成员">
        <button type="button" className="btn btn-primary" onClick={() => setInviting(true)}>
          <Icon name="plus" size={18} stroke={2} />
          邀请码
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
          <Empty title={q ? "没有找到" : show === "active" ? "还没有成员" : "没有停用的账号"}>{undefined}</Empty>
        ) : (
          <div className="table-box">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">姓名 / 昵称</th>
                  <th scope="col">账号</th>
                  <th scope="col">班级 / 单位</th>
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
                    <td className="small">
                      {m.kind === "external" ? (
                        <span className="stack" style={{ gap: 0 }}>
                          <span>
                            <span className="tag tag-muted" style={{ marginRight: 6 }}>
                              校外
                            </span>
                            <span className="mono">{m.username}</span>
                          </span>
                          {m.email && <span className="sub mono">{m.email}</span>}
                        </span>
                      ) : (
                        <span className="mono">{m.studentNo}</span>
                      )}
                    </td>
                    <td className="sub">{(m.kind === "external" ? m.org : m.className) ?? "—"}</td>
                    <td>{m.hasPassword ? <span className="tag tag-ok">正常</span> : <span className="tag tag-muted">待设密码</span>}</td>
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
      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
      {code && (
        <Dialog title={`${code.name} 的重置码`} sub={`只显示这一次。发给 TA，在登录页“忘记密码”里填账号 ${code.account} 和这个重置码，设一个新密码。`} onClose={() => setCode(null)}>
          <PasscodeBox code={code.code} />
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

const INVITE_STATE: Record<Invite["state"], { label: string; cls: string }> = {
  unused: { label: "未使用", cls: "tag-accent" },
  used: { label: "已使用", cls: "tag-ok" },
  expired: { label: "已过期", cls: "tag-muted" },
  revoked: { label: "已作废", cls: "tag-muted" },
};

function InviteDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="邀请码" sub="一码一号，只在生成时显示一次" onClose={onClose} wide>
      <InvitePanel />
    </Dialog>
  );
}

function InvitePanel() {
  const toast = useToast();
  const list = useApi<Invite[]>("/api/admin/invites");
  const [count, setCount] = useState(5);
  const [days, setDays] = useState<number | "none">(14);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<Invite["kind"]>("campus");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ codes: string[]; kind: Invite["kind"] } | null>(null);
  const link = (code: string, k: Invite["kind"]) => `${location.origin}/login?invite=${encodeURIComponent(code)}${k === "external" ? "&kind=external" : ""}`;
  const copy = (text: string, msg: string) => void navigator.clipboard?.writeText(text).then(() => toast(msg));

  const revoke = async (inv: Invite) => {
    try {
      await api(`/api/admin/invites/${inv.id}`, { method: "DELETE" });
      toast(`已作废 …${inv.hint}`);
      void list.reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="form">
      <form
        className="stack"
        style={{ gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const r = await api<{ codes: string[] }>("/api/admin/invites", { body: { count, days: days === "none" ? null : days, note: note.trim() || undefined, kind } });
            setFresh({ codes: r.codes, kind });
            void list.reload();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="row wrap" style={{ alignItems: "flex-end" }}>
          <div className="field">
            账号类型
            <Seg
              label="账号类型"
              value={kind}
              onChange={setKind}
              options={[
                { value: "campus" as const, label: "校内" },
                { value: "external" as const, label: "校外" },
              ]}
            />
          </div>
          <label className="field" style={{ width: 120 }}>
            生成几个
            <input className="input num" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </label>
          <div className="field">
            有效期
            <Seg
              label="有效期"
              value={days}
              onChange={setDays}
              options={[
                { value: 7, label: "7 天" },
                { value: 14, label: "14 天" },
                { value: 30, label: "30 天" },
                { value: "none" as const, label: "不过期" },
              ]}
            />
          </div>
          <label className="field grow" style={{ minWidth: 160 }}>
            备注（可以不填）
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={40} placeholder="例如 2026 秋招新" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner /> : "生成"}
          </button>
        </div>
        {error && (
          <span className="error-text" role="alert">
            {error}
          </span>
        )}
      </form>

      {fresh && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="small sub">
            新生成的 {fresh.codes.length} 个{fresh.kind === "external" ? "校外" : "校内"}邀请码，关掉后就看不到了。可以直接发码，也可以发注册链接（打开就是注册页，码已经填好）。
          </p>
          <textarea className="input mono" readOnly rows={Math.min(8, fresh.codes.length + 1)} value={fresh.codes.join("\n")} />
          <div className="row wrap">
            <button type="button" className="btn btn-soft btn-sm" onClick={() => copy(fresh.codes.join("\n"), "邀请码复制好了")}>
              复制邀请码
            </button>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => copy(fresh.codes.map((c) => link(c, fresh.kind)).join("\n"), "注册链接复制好了")}>
              复制注册链接
            </button>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 4 }}>
        <span className="small sub">最近生成的</span>
        {list.error && !list.data ? (
          <ErrorBox error={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <Skeleton h={120} />
        ) : list.data.length === 0 ? (
          <span className="small sub">还没有生成过。</span>
        ) : (
          <div className="table-box">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">码</th>
                  <th scope="col">状态</th>
                  <th scope="col">备注</th>
                  <th scope="col">生成</th>
                  <th scope="col">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((inv) => (
                  <tr key={inv.id}>
                    <td className="small">
                      <span className="mono">…{inv.hint}</span>
                      {inv.kind === "external" && (
                        <span className="tag tag-muted" style={{ marginLeft: 6 }}>
                          校外
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`tag ${INVITE_STATE[inv.state].cls}`}>{INVITE_STATE[inv.state].label}</span>
                      {inv.usedBy && (
                        <span className="small sub" style={{ marginLeft: 8 }}>
                          {inv.usedBy.name} {inv.usedBy.studentNo}
                        </span>
                      )}
                    </td>
                    <td className="small sub">{inv.note ?? "—"}</td>
                    <td className="small sub">
                      {relativeTime(inv.createdAt)}
                      {inv.state === "unused" && inv.expiresAt ? ` · ${longDay(cnToday(inv.expiresAt), false)} 到期` : ""}
                    </td>
                    <td>
                      {inv.state === "unused" && (
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => revoke(inv)}>
                          作废
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/admin/notices/image", { body: { data: await compressImage(file) } });
      const at = bodyRef.current?.selectionStart ?? body.length;
      const before = body.slice(0, at);
      const after = body.slice(at);
      const md = `${before && !before.endsWith("\n") ? "\n" : ""}![](${url})\n`;
      setBody(before + md + after);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };
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
        <textarea ref={bodyRef} className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
        <span className="row wrap" style={{ gap: 10 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Spinner /> : <Icon name="plus" size={14} stroke={2} />}
            插入图片
          </button>
          <span className="hint xsmall">图片以 ![](地址) 单独成行的形式写入正文。</span>
        </span>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickImage} />
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
      <label className="row" style={{ gap: 12, fontSize: "var(--fs-sm)", cursor: "pointer" }}>
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
      <label className="row" style={{ gap: 12, fontSize: "var(--fs-sm)", cursor: "pointer" }}>
        <button type="button" role="switch" className="switch" aria-checked={code} onClick={() => setCode(!code)} aria-label="晚自习签到要输现场口令" />
        <span className="stack" style={{ gap: 0 }}>
          <span>晚自习签到要输现场口令</span>
        </span>
      </label>
      {error && <span className="error-text">{error}</span>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || days.length === 0}>
          {busy ? <Spinner /> : "保存"}
        </button>
      </div>
    </form>
  );
}

function OtherSettings({ s, onSaved }: { s: Record<string, string | null>; onSaved: () => void }) {
  const [semester, setSemester] = useState(s.semester_start ?? "");
  const [latest, setLatest] = useState(s.app_latest_version ?? "");
  const [min, setMin] = useState(s.app_min_version ?? "");
  const [apk, setApk] = useState(s.app_apk_url ?? "");
  const [regOpen, setRegOpen] = useState<"1" | "0">(s.registration_open === "0" ? "0" : "1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const body: Record<string, string> = { registration_open: regOpen };
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
      <h2 className="h3">学期、注册与 App</h2>
      <label className="field">
        开学日期<span className="hint">第 1 周的周一</span>
        <input className="input" type="date" value={semester} onChange={(e) => setSemester(e.target.value)} style={{ maxWidth: 240 }} />
      </label>
      <div className="field">
        注册
        <Seg
          label="注册"
          value={regOpen}
          onChange={setRegOpen}
          options={[
            { value: "1" as const, label: "开放（需要邀请码）" },
            { value: "0" as const, label: "关闭" },
          ]}
        />
      </div>
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
