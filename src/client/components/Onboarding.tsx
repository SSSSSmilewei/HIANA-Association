import { useState } from "react";
import { api } from "../api";
import { useMe } from "../session";
import { Spinner } from "../ui";
import { PalettePicker, StylePickers } from "./Appearance";
import { BrandMark } from "./Shell";

/** 注册成功后的个性化引导：风格与深浅 → 配色 → 昵称。外观改动即时生效，保存在本机。 */
const KEY = "hiana-onboarding";

export function markOnboarding(uid: string) {
  try {
    localStorage.setItem(KEY, uid);
  } catch {
    /* 存不了就不引导 */
  }
}

export function needsOnboarding(uid: string | undefined) {
  try {
    return !!uid && localStorage.getItem(KEY) === uid;
  } catch {
    return false;
  }
}

function finish() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}

const STEPS = ["风格", "配色", "昵称"] as const;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { me, setMe } = useMe();
  const [step, setStep] = useState(0);
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const real = me.member?.name ?? "";
  const last = step === STEPS.length - 1;

  const done = () => {
    finish();
    onDone();
  };
  const saveNick = async () => {
    const v = nick.trim();
    if (!v) return done();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ displayName: string | null }>("/api/me/display-name", { method: "PUT", body: { displayName: v } });
      if (me.member) setMe({ ...me, member: { ...me.member, displayName: r.displayName } });
      done();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label="个性化设置">
      <div className="onb-card glass">
        <div className="row" style={{ gap: 12 }}>
          <BrandMark />
          <span className="stack" style={{ gap: 0 }}>
            <span className="brand-name">个性化设置</span>
            <span className="brand-sub">
              第 {step + 1} 步，共 {STEPS.length} 步 · {STEPS[step]}
            </span>
          </span>
        </div>
        <div className="onb-bar" aria-hidden="true">
          <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div key={step} className="onb-step stack" style={{ gap: 16 }}>
          {step === 0 && <StylePickers />}
          {step === 1 && <PalettePicker />}
          {step === 2 && (
            <label className="field">
              昵称
              <input className="input" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={20} placeholder={real} autoComplete="nickname" autoFocus />
              <span className="hint xsmall">留空用真实姓名</span>
            </label>
          )}
          {error && (
            <span className="error-text xsmall" role="alert">
              {error}
            </span>
          )}
        </div>
        <div className="dialog-actions" style={{ justifyContent: "space-between" }}>
          {step > 0 ? (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setStep(step - 1)}>
              上一步
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={done}>
              跳过
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={last ? saveNick : () => setStep(step + 1)}>
            {busy ? <Spinner /> : last ? "完成" : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}
