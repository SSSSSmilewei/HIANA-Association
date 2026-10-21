import { useState } from "react";
import type { AdminCheckinToday, AdminMember, ImportResult } from "../../shared/api";
import { addDays, cnDate } from "../../shared/heatmap";
import { api, useApi } from "../api";
import { ErrorView, Loading } from "../components/Layout";

export function AdminHome() {
  const today = useApi<AdminCheckinToday>("/api/admin/checkin/today");
  const idle = useApi<AdminMember[]>("/api/admin/idle?days=7");
  const members = useApi<AdminMember[]>("/api/admin/members");

  if (today.error) return <ErrorView message={today.error.message} />;
  if (!today.data) return <Loading />;
  const t = today.data;

  return (
    <main className="wrap-wide page-pad stack-xl">
      <section className="two-col">
        <div className="panel panel-strong stack-s">
          <div className="row-between">
            <h2 className="h3">今晚的现场口令</h2>
            <span className="xsmall muted">
              {t.today}，{t.window.replace("-", " 到 ")}
            </span>
          </div>
          {t.requireCode ? (
            <div className="big-code" aria-label={`口令 ${t.code}`}>
              {t.code.split("").map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          ) : (
            <p className="small">现在不需要口令，学员点“打卡”即可。可以在下面打开口令防代签。</p>
          )}
          <p className="small">
            已到 <b>{t.count}</b> 人，在籍 {t.total} 人。
          </p>
          <CheckinSettings window={t.window} requireCode={t.requireCode} onDone={today.reload} />
        </div>

        <div className="stack-s">
          <div className="row-between">
            <h2 className="h3">最近 7 天没有任何记录</h2>
            <span className="xsmall muted">站内学习和绑定平台都算</span>
          </div>
          {idle.data?.length === 0 && <p className="muted small">所有在籍成员最近 7 天都有记录。</p>}
          {idle.data?.map((m) => (
            <div className="list-row" key={m.id}>
              <div>
                <b>{m.name}</b> <span className="muted xsmall">{m.studentNo}</span>
                <div className="muted xsmall">{m.className ?? ""}</div>
              </div>
              <span className="bad-text xsmall">{m.lastActiveDay ? `最后记录 ${m.lastActiveDay}` : "还没有任何记录"}</span>
            </div>
          ))}
          <p className="xsmall muted">这份名单只给会长看，用来线下问问是不是卡住了。</p>
        </div>
      </section>

      <section className="two-col">
        <ExportForm />
        <ImportForm onDone={() => {
          members.reload();
          idle.reload();
          today.reload();
        }} />
      </section>

      <section className="stack-s">
        <h2 className="h2">成员（{members.data?.filter((m) => m.status === "active").length ?? 0} 人在籍）</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>学号</th>
                <th>姓名</th>
                <th>班级</th>
                <th>账号</th>
                <th>最近记录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.data?.map((m) => (
                <MemberRow key={m.id} m={m} onDone={members.reload} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function MemberRow({ m, onDone }: { m: AdminMember; onDone: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  return (
    <tr className={m.status === "archived" ? "muted" : undefined}>
      <td>{m.studentNo}</td>
      <td>{m.name}</td>
      <td>{m.className ?? ""}</td>
      <td>{m.hasPassword ? "已设密码" : <span className="muted">待激活</span>}</td>
      <td>{m.lastActiveDay ?? "无"}</td>
      <td className="row-wrap">
        {code ? (
          <span>
            新口令 <b className="mono">{code}</b>（只显示这一次，旧密码已作废）
          </span>
        ) : (
          <button className="link-btn" type="button" onClick={async () => setCode((await api<{ passcode: string }>(`/api/admin/members/${m.id}/reset`, { body: {} })).passcode)}>
            {m.hasPassword ? "忘记密码，重置" : "重新生成口令"}
          </button>
        )}
        <button
          className="link-btn muted"
          type="button"
          onClick={async () => {
            await api(`/api/admin/members/${m.id}/status`, { body: { status: m.status === "active" ? "archived" : "active" } });
            onDone();
          }}
        >
          {m.status === "active" ? "停用" : "恢复"}
        </button>
      </td>
    </tr>
  );
}

function CheckinSettings({ window, requireCode, onDone }: { window: string; requireCode: boolean; onDone: () => void }) {
  const [w, setW] = useState(window);
  const [code, setCode] = useState(requireCode);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="row-wrap settings-row"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/api/admin/checkin/settings", { method: "PUT", body: { window: w, requireCode: code } });
          setMsg("已保存");
          onDone();
        } catch (err) {
          setMsg((err as Error).message);
        }
      }}
    >
      <label className="field inline" htmlFor="ck-window">
        打卡时间段
        <input id="ck-window" value={w} onChange={(e) => setW(e.target.value)} placeholder="18:30-22:30" />
      </label>
      <label className="check" htmlFor="ck-code">
        <input id="ck-code" type="checkbox" checked={code} onChange={(e) => setCode(e.target.checked)} /> 需要现场口令
      </label>
      <button className="btn btn-outline btn-sm" type="submit">
        保存
      </button>
      {msg && <span className="xsmall muted">{msg}</span>}
    </form>
  );
}

function ExportForm() {
  const today = cnDate(Date.now());
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  return (
    <div className="stack-s">
      <h2 className="h2">打卡记录导出</h2>
      <div className="row-wrap">
        <label className="field" htmlFor="ex-from">
          从<input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field" htmlFor="ex-to">
          到<input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <a className="btn btn-red" href={`/api/admin/checkins.csv?from=${from}&to=${to}`}>
        导出 Excel 表格
      </a>
      <p className="xsmall muted">表格列：学号、姓名、班级、日期、打卡时间。用 Excel 直接打开不乱码。</p>
    </div>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="stack-s"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          setResult(await api<ImportResult>("/api/admin/members/import", { body: { text } }));
          setText("");
          onDone();
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <h2 className="h2">导入成员</h2>
      <label className="field" htmlFor="roster">
        从 Excel 复制“学号、姓名、班级”三列，粘贴到这里
        <textarea id="roster" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"2025010131\t周同学\t计科2502"} />
      </label>
      <button className="btn btn-ink" type="submit" disabled={!text.trim()}>
        导入并生成口令
      </button>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="panel stack-s small">
          <p>
            新增 {result.created.length} 人，更新 {result.updated} 人。口令只显示这一次，请现在发给大家。每人第一次用口令激活，然后自己设密码：
          </p>
          <ul className="plain">
            {result.created.map((c) => (
              <li key={c.studentNo}>
                {c.studentNo} {c.name}：<b className="mono">{c.passcode}</b>
              </li>
            ))}
          </ul>
          {result.errors.length > 0 && <p className="error-text">{result.errors.join("；")}</p>}
        </div>
      )}
    </form>
  );
}
