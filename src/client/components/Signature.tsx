import { useEffect, useRef, useState } from "react";
import { Dialog, Spinner } from "../ui";

/**
 * 手写签名：在框里用手指或鼠标签名，导出白底黑字的 PNG（base64，不带 data: 前缀）。
 * 签到时拍完照接着签；签名和照片一起挂在这条签到记录上，导出给学校的表格里能看到。
 */
export function SignatureSheet({ title, onSubmit, onClose }: { title: string; onSubmit: (png: string) => Promise<void>; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [ink, setInk] = useState(0); // 已经画了多长，太短的不算签名
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画布按设备像素比放大，线条不糊
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#1b1a19";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    const from = last.current;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    setInk((n) => n + d);
    last.current = p;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const { width, height } = c.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setInk(0);
    setError(null);
  };

  const submit = async () => {
    const c = canvas.current;
    if (!c) return;
    if (ink < 40) {
      setError("签名太短了，写一下你的名字");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSubmit(c.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""));
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  return (
    <Dialog title={title} sub="在框里写下你的名字。签名会和照片一起出现在给学校的签到表里。" onClose={onClose}>
      <div className="stack" style={{ gap: 12 }}>
        <canvas
          ref={canvas}
          className="signature-pad"
          aria-label="签名区域"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        {error && (
          <p className="small" role="alert" style={{ color: "var(--bad-ink)" }}>
            {error}
          </p>
        )}
        <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={clear} disabled={sending}>
            重写
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={sending}>
            {sending ? <Spinner /> : "签好了，签到"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
