import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { Spinner } from "../ui";

/**
 * 现场拍照：网页里直接开摄像头取景，拍完压成 JPEG（最长边 1280，尽量不超过 250KB）。
 * 不提供相册入口。浏览器不给摄像头时，退回到系统相机（input capture），手机上会直接打开相机。
 */

const MAX_EDGE = 1280;
const TARGET_BYTES = 250_000;

async function compress(source: CanvasImageSource, w: number, h: number): Promise<string> {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  let cw = Math.round(w * scale);
  let ch = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  for (let attempt = 0; attempt < 5; attempt++) {
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器不支持处理照片");
    ctx.drawImage(source, 0, 0, cw, ch);
    const quality = [0.82, 0.72, 0.62, 0.55, 0.5][attempt];
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (b64.length * 0.75 <= TARGET_BYTES || attempt === 4) return b64;
    cw = Math.round(cw * 0.82);
    ch = Math.round(ch * 0.82);
  }
  throw new Error("照片处理失败");
}

export function CameraSheet({
  title,
  hint,
  onCapture,
  onClose,
}: {
  title: string;
  hint: string;
  onCapture: (b64: string) => Promise<void>;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [state, setState] = useState<"starting" | "live" | "fallback" | "review" | "sending">("starting");
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    for (const t of stream.current?.getTracks() ?? []) t.stop();
    stream.current = null;
  }, []);

  useEffect(() => {
    let alive = true;
    if (state !== "starting") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("fallback");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (!alive) {
          for (const t of s.getTracks()) t.stop();
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => {});
        }
        setState("live");
      })
      .catch((e: DOMException) => {
        if (!alive) return;
        setError(e?.name === "NotAllowedError" ? "没有拿到摄像头权限。可以在浏览器地址栏里允许使用摄像头，或者用下面的系统相机拍。" : "打不开摄像头，用下面的系统相机拍。");
        setState("fallback");
      });
    return () => {
      alive = false;
    };
  }, [state, facing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    stop();
    onClose();
  };

  const take = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    try {
      const b64 = await compress(v, v.videoWidth, v.videoHeight);
      setShot(b64);
      setState("review");
      v.pause();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const fromFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        setShot(await compress(img, img.naturalWidth, img.naturalHeight));
        setState("review");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  const send = async () => {
    if (!shot) return;
    setState("sending");
    setError(null);
    try {
      await onCapture(shot);
      stop();
    } catch (e) {
      setError((e as Error).message);
      setState("review");
    }
  };

  const retake = () => {
    setShot(null);
    setError(null);
    if (stream.current && video.current) {
      void video.current.play();
      setState("live");
    } else setState(stream.current ? "live" : "starting");
  };

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label={title}>
      <video ref={video} playsInline muted autoPlay style={{ transform: facing === "user" ? "scaleX(-1)" : undefined, opacity: state === "live" ? 1 : 0 }} />
      {shot && <img className="shot" src={`data:image/jpeg;base64,${shot}`} alt="刚拍的照片" />}
      {state === "live" && (
        <div className="camera-frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="camera-top">
        <button type="button" className="cam-close cam-glass" aria-label="关闭相机" onClick={close}>
          <Icon name="close" size={16} stroke={2.2} />
        </button>
        <span className="cam-pill cam-glass">
          <span className="live-dot" />
          {title}
        </span>
        <span style={{ width: 44 }} />
      </div>
      <div className="camera-bottom">
        {error ? (
          <p className="cam-text" role="alert" style={{ color: "#FFB4A8" }}>
            {error}
          </p>
        ) : (
          <p className="cam-text">{state === "review" || state === "sending" ? "看一下拍得清不清楚。" : hint}</p>
        )}
        {state === "review" || state === "sending" ? (
          <div className="row" style={{ gap: 12 }}>
            <button type="button" className="cam-btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }} onClick={retake} disabled={state === "sending"}>
              重拍
            </button>
            <button type="button" className="cam-btn" style={{ background: "#F26B1D", color: "#fff", minWidth: 140 }} onClick={send} disabled={state === "sending"}>
              {state === "sending" ? <Spinner /> : "用这张"}
            </button>
          </div>
        ) : state === "fallback" ? (
          <label className="cam-btn" style={{ background: "#F26B1D", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="camera" />
            用系统相机拍
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => fromFile(e.target.files?.[0])} />
          </label>
        ) : (
          <div className="camera-controls">
            <span />
            <button type="button" className="shutter" aria-label="拍照" onClick={take} disabled={state !== "live"}>
              <span />
            </button>
            <button
              type="button"
              className="cam-side"
              aria-label="切换前后摄像头"
              onClick={() => {
                stop();
                setFacing(facing === "environment" ? "user" : "environment");
                setState("starting");
              }}
            >
              <Icon name="flip" size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 签到成功：圆盘弹出、对勾画出来、今天的格子亮起。 */
export function DoneOverlay({ title, sub, week, onClose }: { title: string; sub: string; week: (0 | 1 | 2 | 3 | 4 | null)[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="done" role="dialog" aria-modal="true" aria-labelledby="done-h">
      <div className="done-inner">
        <div className="done-badge">
          <span className="ring" aria-hidden="true" />
          <svg className="track" width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="86" fill="none" stroke="var(--track)" strokeWidth="6" />
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="541"
              transform="rotate(-90 100 100)"
              style={{ "--len": 541, animation: "draw 700ms var(--ease) 100ms both" } as React.CSSProperties}
            />
          </svg>
          <span className="done-disk">
            <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="24"
                style={{ "--len": 24, animation: "draw 420ms var(--ease) 380ms both" } as React.CSSProperties}
              />
            </svg>
          </span>
        </div>
        <div className="stack rise" style={{ alignItems: "center", gap: 6, "--i": 12 } as React.CSSProperties}>
          <h1 id="done-h" className="h1" style={{ fontSize: 30, lineHeight: "38px" }}>
            {title}
          </h1>
          <p className="sub num">{sub}</p>
        </div>
        <div className="card row rise" style={{ width: "100%", gap: 14, padding: 16, "--i": 14 } as React.CSSProperties}>
          <span className="grow stack" style={{ gap: 8 }}>
            <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: 500 }}>这周的签到</span>
            <span className="done-week" aria-hidden="true">
              {week.map((lv, i) => (
                <i key={i} className={`${lv === null ? "l0" : `l${lv}`}${i === week.length - 1 ? " today" : ""}`} />
              ))}
            </span>
          </span>
        </div>
        <button type="button" className="btn btn-ink btn-xl btn-block" style={{ marginTop: "auto" }} onClick={onClose} autoFocus>
          好的
        </button>
      </div>
    </div>
  );
}
