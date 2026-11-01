import { useEffect, useState } from "react";
import {
  APPLICATION_QUESTIONS,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  APPLICATIONS_CLOSED_DEFAULT,
  type ApplicationDetail,
  type ApplicationStatus,
  type ApplicationSummary,
} from "../../shared/applications";
import { api, clock, cnToday, invalidate, longDay, mutate, useApi } from "../api";
import { Icon } from "../icons";
import { Dialog, Empty, ErrorBox, Seg, Skeleton, Spinner, useConfirm, useDialogClose, useTitle, useToast } from "../ui";

/**
 * 管理后台：新生报名。开场动画（/intro/）里的报名表交到这里，只有管理员能看。
 * 宽屏左边列表、右边详情；窄屏点开一行，详情占满整屏。
 */

export interface ApplicationList {
  items: ApplicationSummary[];
  counts: Record<"all" | ApplicationStatus, number>;
  settings: { open: boolean; message: string };
}

const LIST = "/api/admin/applications";

const STATUS_TAG: Record<ApplicationStatus, string> = {
  new: "tag-accent",
  contacted: "",
  interview: "",
  accepted: "tag-ok",
  rejected: "tag-muted",
};

/** "10 月 31 日 14:05"（北京时间） */
function stamp(ms: number): string {
  return `${longDay(cnToday(ms), false)} ${clock(ms)}`;
}

function StatusTag({ status }: { status: ApplicationStatus }) {
  return <span className={`tag ${STATUS_TAG[status]}`}>{APPLICATION_STATUS_LABEL[status]}</span>;
}

export function AdminApplicationsPage() {
  useTitle("新生报名");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ApplicationStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // 搜索框停下来 300 毫秒再查
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const qs = params.toString();
  const key = qs ? `${LIST}?${qs}` : LIST;
  const { data, error, reload } = useApi<ApplicationList>(key);
  // 计数和招新开关以不带筛选的那份为准（导航栏也读它）
  const base = useApi<ApplicationList>(LIST);
  const counts = base.data?.counts ?? data?.counts;
  const settings = base.data?.settings ?? data?.settings;

  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{counts ? `共 ${counts.all} 人报名 · ${counts.new} 条新报名` : " "}</span>
          <h1 className="h1">新生报名</h1>
        </div>
        <a className="btn btn-ghost" href={`${LIST}.csv`} download>
          <Icon name="download" size={18} />
          导出 CSV
        </a>
      </header>

      {settings && (
        <section className="card row wrap app-switch" aria-label="招新开关">
          <span className="row grow" style={{ gap: 12, minWidth: 0 }}>
            {settings.open ? <span className="tag tag-ok">招新进行中</span> : <span className="tag tag-muted">已关闭</span>}
            <span className="small sub pretty">{settings.open ? "开场动画的结尾面板上有「新生报名」按钮。" : `报名表关闭，新生看到：「${settings.message}」`}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            <Icon name="sliders" size={16} />
            {settings.open ? "关闭招新" : "设置"}
          </button>
        </section>
      )}

      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        <label className="row" style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <span className="sr-only">搜索报名</span>
          <Icon name="search" size={18} style={{ position: "absolute", left: 14, color: "var(--sub)" }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="名字、学号或班级" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="seg-scroll">
        <Seg
          label="状态"
          flat
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: "all" as const, label: `全部 ${counts?.all ?? ""}` },
            ...APPLICATION_STATUSES.map((s) => ({ value: s, label: `${APPLICATION_STATUS_LABEL[s]} ${counts?.[s] ?? ""}` })),
          ]}
        />
      </div>

      <div className="split">
        <section className="card card-flush split-main" aria-label="报名列表" style={{ padding: "4px 8px" }}>
          {error && !data ? (
            <ErrorBox error={error} onRetry={reload} />
          ) : !data ? (
            <Skeleton h={300} />
          ) : data.items.length === 0 ? (
            <Empty title={query || status !== "all" ? "没有找到" : "还没有人报名"} />
          ) : (
            <ul className="app-list">
              {data.items.map((a) => (
                <li key={a.id}>
                  <button type="button" className="app-row" aria-current={a.id === openId ? "true" : undefined} onClick={() => setOpenId(a.id)}>
                    <span className="app-row-main">
                      <span className="row" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{a.name}</span>
                        <span className="small sub ellipsis">{a.className}</span>
                      </span>
                      <span className="small sub">
                        <span className="mono">{a.studentId}</span> · {stamp(a.createdAt)}
                        {a.submitCount > 1 && ` · 提交了 ${a.submitCount} 次`}
                      </span>
                    </span>
                    <StatusTag status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className={`split-side app-detail${openId ? " open" : ""}`} aria-label="报名详情">
          {openId ? (
            <Detail key={openId} id={openId} onClose={() => setOpenId(null)} />
          ) : (
            <div className="card app-detail-hint">
              <Empty title="点左边一行，看报名详情" />
            </div>
          )}
        </aside>
      </div>

      {editing && settings && <SettingsDialog settings={settings} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, reload } = useApi<ApplicationDetail>(`${LIST}/${id}`);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && note === null) setNote(data.adminNote ?? "");
  }, [data, note]);

  // 窄屏全屏时，背后的页面不要跟着滚
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 899px)");
    if (narrow.matches) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const save = async (patch: { status?: ApplicationStatus; adminNote?: string }) => {
    setSaving(true);
    try {
      const d = await api<ApplicationDetail>(`${LIST}/${id}`, { method: "PATCH", body: patch });
      mutate<ApplicationDetail>(`${LIST}/${id}`, () => d);
      invalidate(LIST);
      toast(patch.status ? `已改成「${APPLICATION_STATUS_LABEL[patch.status]}」` : "备注存好了");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!data) return;
    const ok = await confirm({ title: `删除 ${data.name} 的报名？`, body: "删除后找不回来。只是不想录取的话，把状态改成「未通过」就行。", ok: "删除", danger: true });
    if (!ok) return;
    try {
      await api(`${LIST}/${id}`, { method: "DELETE" });
      toast(`已删除 ${data.name} 的报名`);
      onClose();
      invalidate(LIST);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const copy = (text: string, label: string) =>
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast(`${label}复制好了`))
      .catch(() => toast("没能复制，长按手动选一下", "error"));

  return (
    <div className="card stack app-detail-card" style={{ gap: 18 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
        <button type="button" className="back-link app-back" onClick={onClose}>
          ‹ 返回列表
        </button>
        <button type="button" className="icon-btn app-close" aria-label="关闭详情" onClick={onClose} style={{ border: 0, background: "var(--well)" }}>
          <Icon name="close" size={16} stroke={2} />
        </button>
      </div>
      {error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton h={320} />
      ) : (
        <>
          <div className="stack" style={{ gap: 4 }}>
            <h2 className="h2">{data.name}</h2>
            <span className="small sub">
              {data.className} · 第一次提交 {stamp(data.createdAt)}
              {data.submitCount > 1 && ` · 提交了 ${data.submitCount} 次，最近一次 ${stamp(data.updatedAt)}`}
            </span>
          </div>

          <dl className="field-table">
            <div>
              <dt className="sub">学号</dt>
              <dd className="mono">{data.studentId}</dd>
            </div>
            <div>
              <dt className="sub">手机号</dt>
              <dd>
                <button type="button" className="copy-chip mono" onClick={() => copy(data.phone, "手机号")} title="点一下复制">
                  {data.phone}
                  <span className="xsmall sub">复制</span>
                </button>
              </dd>
            </div>
            <div>
              <dt className="sub">QQ</dt>
              <dd>
                <button type="button" className="copy-chip mono" onClick={() => copy(data.qq, "QQ 号")} title="点一下复制">
                  {data.qq}
                  <span className="xsmall sub">复制</span>
                </button>
              </dd>
            </div>
          </dl>

          <ol className="app-answers">
            {APPLICATION_QUESTIONS.map((qq, i) => (
              <li key={i}>
                <span className="small" style={{ fontWeight: 600 }}>
                  {String(i + 1).padStart(2, "0")} {qq.title}
                </span>
                {qq.hint && <span className="xsmall sub">{qq.hint}</span>}
                <p className={`pretty${data.answers[i] ? "" : " sub"}`}>{data.answers[i] || "（没写）"}</p>
              </li>
            ))}
          </ol>

          <div className="stack" style={{ gap: 12 }}>
            <label className="field">
              状态
              <select className="input" value={data.status} disabled={saving} onChange={(e) => void save({ status: e.target.value as ApplicationStatus })}>
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {APPLICATION_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                备注 <span className="hint">只有管理员能看到</span>
              </span>
              <textarea className="input" rows={3} maxLength={2000} value={note ?? ""} onChange={(e) => setNote(e.target.value)} placeholder="比如：周三晚上面试，已加 QQ" />
            </label>
            {data.handledBy && data.handledAt && (
              <span className="xsmall sub">
                {data.handledBy} 最后处理于 {stamp(data.handledAt)}
              </span>
            )}
            <div className="row wrap" style={{ justifyContent: "space-between", gap: 8 }}>
              <button type="button" className="btn btn-danger" onClick={remove}>
                删除
              </button>
              <button type="button" className="btn btn-primary" disabled={saving || (note ?? "") === (data.adminNote ?? "")} onClick={() => void save({ adminNote: note ?? "" })}>
                {saving && <Spinner />}
                保存备注
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsDialog({ settings, onClose }: { settings: ApplicationList["settings"]; onClose: () => void }) {
  return (
    <Dialog title="招新开关" sub="关闭后，开场动画里不再显示「新生报名」，已经打开的报名表也交不上来。" onClose={onClose}>
      <SettingsBody settings={settings} />
    </Dialog>
  );
}

function SettingsBody({ settings }: { settings: ApplicationList["settings"] }) {
  const toast = useToast();
  const close = useDialogClose();
  const [open, setOpen] = useState(settings.open);
  const [message, setMessage] = useState(settings.message);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api(`${LIST}/settings`, { method: "PUT", body: { open, message: message.trim() } });
      toast(open ? "招新已打开" : "招新已关闭");
      invalidate(LIST);
      close();
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Seg
        label="招新状态"
        value={open ? "open" : "closed"}
        onChange={(v) => setOpen(v === "open")}
        options={[
          { value: "open", label: "招新进行中" },
          { value: "closed", label: "已关闭" },
        ]}
      />
      <label className="field">
        <span>
          关闭时的提示语 <span className="hint">留空就用「{APPLICATIONS_CLOSED_DEFAULT}」</span>
        </span>
        <input className="input" maxLength={100} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={APPLICATIONS_CLOSED_DEFAULT} />
      </label>
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={close}>
          取消
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy && <Spinner />}
          保存
        </button>
      </div>
    </div>
  );
}
