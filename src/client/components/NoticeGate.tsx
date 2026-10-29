import { useState } from "react";
import { api, invalidate, longDay, useApi } from "../api";
import type { Notice } from "../types";
import { Dialog, useDialogClose } from "../ui";
import { NoticeBody } from "./NoticeBody";

const RECENT_MS = 30 * 86_400_000;
const dayOf = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);

/** 登录后：有未确认的新公告（30 天内）就弹窗，确认后记到账号上，按时间从旧到新逐条显示。 */
export function NoticeGate() {
  const { data } = useApi<Notice[]>("/api/notices");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const pending = (data ?? [])
    .filter((n) => n.kind === "notice" && !n.confirmed && Date.now() - n.createdAt < RECENT_MS && !skipped.has(n.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  const n = pending[0];
  if (!n) return null;
  return (
    <Dialog key={n.id} title={n.title} sub={[longDay(dayOf(n.createdAt), false), n.author].filter(Boolean).join(" · ")} onClose={() => setSkipped((s) => new Set(s).add(n.id))}>
      <ConfirmBody n={n} remaining={pending.length - 1} />
    </Dialog>
  );
}

function ConfirmBody({ n, remaining }: { n: Notice; remaining: number }) {
  const close = useDialogClose();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await api(`/api/notices/${n.id}/confirm`, { method: "POST", body: {} });
      invalidate("/api/notices");
      close();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };
  return (
    <div className="form">
      {n.body && <NoticeBody text={n.body} className="small pretty" />}
      {n.docUrl && (
        <a href={n.docUrl} target="_blank" rel="noreferrer" className="small">
          相关链接
        </a>
      )}
      {failed && (
        <span className="error-text" role="alert">
          确认失败，请重试。
        </span>
      )}
      <div className="dialog-actions">
        {remaining > 0 && <span className="xsmall sub">还有 {remaining} 条未确认</span>}
        <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>
          我已阅读
        </button>
      </div>
    </div>
  );
}
