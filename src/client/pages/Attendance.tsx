import { useEffect, useMemo, useRef, useState } from "react";
import { addDays } from "../../shared/heatmap";
import { api, clock, invalidate, longDay, minutesText, shortDay, useApi, weekday } from "../api";
import { KIND_LABEL, daysText, phaseOf, venueEnd } from "../attendance";
import { CameraSheet, DoneOverlay } from "../components/Camera";
import { Icon } from "../icons";
import { navigate, useQuery } from "../router";
import type { AttendanceKind, AttendanceState, HeatmapPayload } from "../types";
import { Empty, ErrorBox, Seg, Skeleton, useNow, useTitle, useToast } from "../ui";

/* ---------- 表盘 ---------- */

const CX = 160;
const R = 132;
const A0 = -135;
const SWEEP = 270;
function pt(f: number, r: number) {
  const a = ((A0 + SWEEP * Math.max(0, Math.min(1, f))) * Math.PI) / 180;
  return [CX + r * Math.sin(a), CX - r * Math.cos(a)];
}
function arc(f0: number, f1: number, r = R) {
  const [x0, y0] = pt(f0, r);
  const [x1, y1] = pt(f1, r);
  const large = SWEEP * (f1 - f0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function Dial({ from, to, start, now, labels, label, children }: { from: number; to: number; start: number | null; now: number; labels: [string, string]; label: string; children: React.ReactNode }) {
  const f = (t: number) => (t - from) / (to - from);
  const fNow = Math.max(0, Math.min(1, f(now)));
  const fIn = start === null ? null : Math.max(0, Math.min(1, f(start)));
  let ticks = "";
  for (let i = 0; i <= 10; i++) {
    const [ax, ay] = pt(i / 10, R - 20);
    const [bx, by] = pt(i / 10, R - (i % 5 === 0 ? 30 : 26));
    ticks += `M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const [nx, ny] = pt(fNow, R);
  const [l0x, l0y] = pt(0, R + 4);
  const [l1x, l1y] = pt(1, R + 4);
  const len = fIn === null ? 0 : ((SWEEP * (fNow - fIn) * Math.PI) / 180) * R;
  return (
    <div className="dial">
      <svg viewBox="0 0 320 320" role="img" aria-label={label}>
        <path d={arc(0, 1)} fill="none" stroke="var(--track)" strokeWidth="14" strokeLinecap="round" />
        <path d={ticks} fill="none" stroke="var(--line-strong)" strokeWidth="1.6" strokeLinecap="round" />
        {fIn !== null && fNow > fIn && (
          <path
            d={arc(fIn, fNow)}
            className="dial-arc"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={len.toFixed(1)}
            style={{ "--len": len.toFixed(1) } as React.CSSProperties}
          />
        )}
        {fIn !== null && <circle cx={pt(fIn, R)[0]} cy={pt(fIn, R)[1]} r="9" fill="var(--surface)" stroke="var(--accent)" strokeWidth="4" />}
        {now >= from && now <= to && <circle cx={nx} cy={ny} r="9" fill="var(--now)" stroke="var(--surface)" strokeWidth="3" />}
        <text x={l0x - 12} y={l0y + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--sub)">
          {labels[0]}
        </text>
        <text x={l1x + 12} y={l1y + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--sub)">
          {labels[1]}
        </text>
      </svg>
      <div className="dial-center">{children}</div>
    </div>
  );
}

/* ---------- 页面 ---------- */

export function AttendancePage() {
  useTitle("签到");
  const toast = useToast();
  const now = useNow(15_000);
  const go = useQuery("go");
  const { data, error, reload } = useApi<AttendanceState>("/api/attendance", { refreshMs: 60_000 });
  const heat = useApi<HeatmapPayload>("/api/heatmap");
  const [kind, setKind] = useState<AttendanceKind>(go === "venue" ? "venue" : "evening");
  const [camera, setCamera] = useState<null | "in" | "out">(null);
  const [code, setCode] = useState("");
  const [done, setDone] = useState<null | { title: string; sub: string }>(null);
  const autoOpened = useRef(false);

  const p = data ? phaseOf(data, now) : null;
  const scene: AttendanceKind = p?.kind === "in" ? p.scene : kind;

  // 从首页点“拍照签到/签退”过来时，直接打开相机
  useEffect(() => {
    if (!data || autoOpened.current || !go) return;
    autoOpened.current = true;
    const ph = phaseOf(data, Date.now());
    if (go === "out" && ph.kind === "in") setCamera("out");
    else if (go === "evening" && ph.kind === "evening-open" && !data.evening.requireCode) setCamera("in");
    else if (go === "venue" && ph.kind !== "in") setCamera("in");
    navigate("/checkin", { replace: true });
  }, [data, go]);

  const week = useMemo(() => {
    const s = heat.data?.series.find((x) => x.source === "site:attendance");
    const today = data?.today;
    if (!today) return [] as (0 | 3 | null)[];
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6);
      return i === 6 ? 3 : s?.days[d] ? 3 : null;
    }) as (0 | 3 | null)[];
  }, [heat.data, data?.today]);

  if (error && !data)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );

  const capture = async (photo: string) => {
    if (camera === "out") {
      const r = await api<{ outAt: number }>("/api/attendance/out", { body: { photo } });
      setDone({ title: "签退成功", sub: `${clock(r.outAt)} · ${KIND_LABEL[scene]}` });
    } else {
      const r = await api<{ inAt: number; kind: AttendanceKind }>("/api/attendance/in", { body: { photo, kind: scene, code: code || undefined } });
      setDone({ title: "签到成功", sub: `${clock(r.inAt)} · ${KIND_LABEL[r.kind]}` });
      setCode("");
    }
    setCamera(null);
    invalidate("/api/attendance", "/api/heatmap");
  };

  const ev = data?.evening;
  const needCode = scene === "evening" && !!ev?.requireCode && p?.kind === "evening-open";

  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{data ? `${longDay(data.today)} · ${ev?.isDay ? "晚自习日" : "没有晚自习"}` : " "}</span>
          <h1 className="h1">签到</h1>
        </div>
        {p?.kind !== "in" && (
          <Seg
            label="场景"
            value={kind}
            onChange={(k) => setKind(k)}
            options={[
              { value: "evening" as const, label: "晚自习" },
              { value: "venue" as const, label: "大创场地" },
            ]}
          />
        )}
      </header>

      <div className="split">
        <section className="split-main card stack" aria-label="现在" style={{ alignItems: "center", gap: 20, padding: 28, borderRadius: 28 }}>
          {!data || !p || !ev ? (
            <>
              <Skeleton h={28} w={160} />
              <Skeleton h={300} w={300} r={150} />
              <Skeleton h={56} w={320} r={18} />
            </>
          ) : (
            <MainPanel
              data={data}
              p={p}
              scene={scene}
              now={now}
              needCode={needCode}
              code={code}
              setCode={setCode}
              open={(m) => {
                if (m === "in" && needCode && code.length !== 4) {
                  toast("先输入屏幕上的 4 位口令", "error");
                  return;
                }
                setCamera(m);
              }}
              switchVenue={() => setKind("venue")}
            />
          )}
        </section>

        <div className="split-side stack" style={{ gap: 20 }}>
          <section className="card stack" aria-labelledby="how-h" style={{ gap: 10 }}>
            <h2 id="how-h" className="h3" style={{ fontSize: 15 }}>
              怎么签
            </h2>
            <ul className="stack small sub" style={{ gap: 8 }}>
              <li className="row" style={{ alignItems: "flex-start" }}>
                <Icon name="camera" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>到了拍一张、走前拍一张，拍桌面或屏幕就行，不用拍脸。只能现场拍，不能从相册选。</span>
              </li>
              {ev && (
                <li className="row" style={{ alignItems: "flex-start" }}>
                  <Icon name="clipboard" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    晚自习是每{daysText(ev.days)} {ev.window[0]}–{ev.window[1]}，提前 15 分钟可以签。到点自动结束，没签退记作“未签退”。
                  </span>
                </li>
              )}
              <li className="row" style={{ alignItems: "flex-start" }}>
                <Icon name="home" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>大创场地随时可以签，当天 23:59 自动结束。不统计连续天数，哪天没来也不会断。</span>
              </li>
            </ul>
          </section>

          <section className="card" aria-labelledby="hist-h" style={{ paddingBottom: 8 }}>
            <div className="section-head" style={{ marginBottom: 6 }}>
              <h2 id="hist-h" className="h3" style={{ fontSize: 15 }}>
                我的记录
              </h2>
              {data && (
                <span className="xsmall sub">
                  晚自习 {data.totals.evening} 次 · 场地 {data.totals.venue} 次
                </span>
              )}
            </div>
            {!data ? (
              <Skeleton h={160} />
            ) : data.recent.length === 0 ? (
              <Empty title="还没有记录">第一次签到之后，这里会列出最近的记录。</Empty>
            ) : (
              <ul>
                {data.recent.map((r) => (
                  <li key={r.id} className="list-row">
                    <span className="stack" style={{ width: 52, flexShrink: 0, gap: 0 }}>
                      <span className="num" style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600 }}>
                        {shortDay(r.day)}
                      </span>
                      <span className="xsmall sub">{weekday(r.day)}</span>
                    </span>
                    <span className="grow stack" style={{ gap: 0 }}>
                      <span style={{ fontSize: 14, lineHeight: "20px" }}>{KIND_LABEL[r.kind]}</span>
                      <span className="xsmall sub num">
                        {clock(r.inAt)} – {r.outAt ? clock(r.outAt) : "进行中"}
                      </span>
                    </span>
                    <span className={`tag ${r.status === "closed" ? "tag-ok" : r.status === "open" ? "tag-accent" : "tag-muted"}`}>
                      {r.status === "closed" ? "已签退" : r.status === "open" ? "进行中" : "未签退"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {camera && (
        <CameraSheet
          title={`${KIND_LABEL[scene]}${camera === "in" ? "签到" : "签退"} · ${clock(Date.now())}`}
          hint="拍到桌面或屏幕就行，不用拍脸。只能现场拍，不能从相册选。"
          onCapture={capture}
          onClose={() => setCamera(null)}
        />
      )}
      {done && <DoneOverlay title={done.title} sub={done.sub} week={week} onClose={() => setDone(null)} />}
    </div>
  );
}

function MainPanel({
  data,
  p,
  scene,
  now,
  needCode,
  code,
  setCode,
  open,
  switchVenue,
}: {
  data: AttendanceState;
  p: ReturnType<typeof phaseOf>;
  scene: AttendanceKind;
  now: number;
  needCode: boolean;
  code: string;
  setCode: (c: string) => void;
  open: (m: "in" | "out") => void;
  switchVenue: () => void;
}) {
  const ev = data.evening;
  const evFrom = Date.parse(`${data.today}T${ev.window[0]}:00+08:00`);
  const evTo = ev.endsAt;
  const dayFrom = Date.parse(`${data.today}T08:00:00+08:00`);
  const dayTo = venueEnd(data.today);

  if (p.kind === "in") {
    const isEv = p.scene === "evening";
    return (
      <>
        <StatusRow tag={<span className="tag tag-accent"><span className="live-dot" style={{ background: "var(--accent)", animation: "breathe 2s ease-in-out infinite" }} />{KIND_LABEL[p.scene]} · 学习中</span>} note={isEv && ev.requireCode ? "现场口令已开启" : "只需拍照"} />
        <Dial
          from={isEv ? evFrom : dayFrom}
          to={isEv ? evTo : dayTo}
          start={p.inAt}
          now={now}
          labels={isEv ? ev.window : ["08:00", "24:00"]}
          label={`${clock(p.inAt)} 签到，已学 ${minutesText(p.minutes)}`}
        >
          <span className="small sub">已学习</span>
          <span className="row" style={{ alignItems: "baseline", gap: 4 }}>
            <span className="dial-num">{p.minutes < 60 ? p.minutes : (p.minutes / 60).toFixed(1)}</span>
            <span className="sub">{p.minutes < 60 ? "分钟" : "小时"}</span>
          </span>
          <span className="small sub num">
            {clock(p.inAt)} 签到 · {clock(p.endsAt)} 自动结束
          </span>
        </Dial>
        <button type="button" className="btn btn-primary btn-xl btn-block" style={{ maxWidth: 360 }} onClick={() => open("out")}>
          <Icon name="camera" size={22} />
          拍照签退
        </button>
        <p className="small sub pretty" style={{ textAlign: "center", maxWidth: 420 }}>
          离开前拍一张。忘了也没关系，到点会自动结束，记作“未签退”。时间以服务器为准。
        </p>
      </>
    );
  }

  if (scene === "venue") {
    return (
      <>
        <StatusRow tag={<span className="tag">大创场地</span>} note="随时可以签" />
        <Dial from={dayFrom} to={dayTo} start={null} now={now} labels={["08:00", "24:00"]} label={`现在 ${clock(now)}`}>
          <span className="small sub">现在</span>
          <span className="dial-num">{clock(now)}</span>
          <span className="small sub">23:59 自动结束</span>
        </Dial>
        <button type="button" className="btn btn-primary btn-xl btn-block" style={{ maxWidth: 360 }} onClick={() => open("in")}>
          <Icon name="camera" size={22} />
          拍照签到
        </button>
        <p className="small sub pretty" style={{ textAlign: "center", maxWidth: 420 }}>
          进场拍一张，离开再拍一张签退。
        </p>
      </>
    );
  }

  if (p.kind === "evening-open")
    return (
      <>
        <StatusRow tag={<span className="tag tag-accent"><span className="live-dot" />晚自习进行中</span>} note={ev.requireCode ? "要输现场口令" : "只需拍照"} />
        <Dial from={evFrom} to={evTo} start={null} now={now} labels={ev.window} label={`晚自习 ${ev.window[0]} 到 ${ev.window[1]}，现在 ${clock(now)}`}>
          <span className="small sub">还剩</span>
          <span className="row" style={{ alignItems: "baseline", gap: 4 }}>
            <span className="dial-num">{p.remaining}</span>
            <span className="sub">分钟</span>
          </span>
          <span className="small sub num">
            {ev.window[0]} – {ev.window[1]}
          </span>
        </Dial>
        {needCode && <CodeBoxes value={code} onChange={setCode} />}
        <button type="button" className="btn btn-primary btn-xl btn-block" style={{ maxWidth: 360 }} onClick={() => open("in")} disabled={needCode && code.length !== 4}>
          <Icon name="camera" size={22} />
          拍照签到
        </button>
        <p className="small sub pretty" style={{ textAlign: "center", maxWidth: 420 }}>
          {needCode ? "先输入屏幕上今天的 4 位数，再拍一张现场照片。" : "到教室后拍一张现场照片。不统计连续天数，哪天没来也不会断。"}
        </p>
      </>
    );

  if (p.kind === "evening-done")
    return (
      <>
        <StatusRow tag={<span className="tag tag-ok"><Icon name="check" size={14} stroke={2.2} />今晚签到了</span>} note={p.auto ? "这次没签退" : "已签退"} />
        <Dial from={evFrom} to={evTo} start={p.inAt} now={p.outAt ?? evTo} labels={ev.window} label={`今晚 ${clock(p.inAt)} 到 ${p.outAt ? clock(p.outAt) : ev.window[1]}`}>
          <span className="small sub">今晚学了</span>
          <span className="row" style={{ alignItems: "baseline", gap: 4 }}>
            <span className="dial-num">{Math.max(0, Math.round(((p.outAt ?? evTo) - p.inAt) / 60000))}</span>
            <span className="sub">分钟</span>
          </span>
          <span className="small sub num">
            {clock(p.inAt)} – {p.outAt ? clock(p.outAt) : ev.window[1]}
          </span>
        </Dial>
        <button type="button" className="btn btn-ghost btn-lg" onClick={switchVenue}>
          去大创场地继续学
        </button>
      </>
    );

  if (p.kind === "evening-later")
    return (
      <>
        <StatusRow tag={<span className="tag">今晚有晚自习</span>} note={`${clock(p.opensAt)} 起可以签`} />
        <Dial from={evFrom} to={evTo} start={null} now={now} labels={ev.window} label={`晚自习 ${ev.window[0]} 开始`}>
          <span className="small sub">今晚</span>
          <span className="dial-num">{ev.window[0]}</span>
          <span className="small sub">{clock(p.opensAt)} 起可以签到</span>
        </Dial>
        <button type="button" className="btn btn-primary btn-xl btn-block" style={{ maxWidth: 360 }} disabled>
          还没到签到时间
        </button>
        <button type="button" className="btn btn-quiet" onClick={switchVenue}>
          现在在大创场地？签场地
        </button>
      </>
    );

  return (
    <>
      <StatusRow tag={<span className="tag">今天没有晚自习</span>} note={p.next ? `下次：${p.next} ${ev.window[0]}` : ""} />
      <Empty title="今天没有晚自习" action={<button type="button" className="btn btn-primary btn-lg" onClick={switchVenue}><Icon name="camera" />去大创场地签到</button>}>
        晚自习是每{daysText(ev.days)} {ev.window[0]}–{ev.window[1]}。在大创场地学习的话，可以签场地。
      </Empty>
    </>
  );
}

function StatusRow({ tag, note }: { tag: React.ReactNode; note: string }) {
  return (
    <span className="row wrap" style={{ alignSelf: "stretch", justifyContent: "space-between" }}>
      {tag}
      {note && <span className="small sub">{note}</span>}
    </span>
  );
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, " ").slice(0, 4).split("");
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="small sub" style={{ textAlign: "center", width: "100%", marginBottom: 8 }}>
        屏幕上今天的口令
      </legend>
      <div className="code-boxes">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`口令第 ${i + 1} 位`}
            maxLength={1}
            value={d.trim()}
            onChange={(e) => {
              const ch = e.target.value.replace(/\D/g, "").slice(-1);
              const arr = value.padEnd(4, " ").slice(0, 4).split("");
              arr[i] = ch || " ";
              onChange(arr.join("").replace(/\s+$/, "").replace(/ /g, ""));
              if (ch && i < 3) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus();
            }}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
              if (t) {
                e.preventDefault();
                onChange(t);
                refs.current[Math.min(3, t.length)]?.focus();
              }
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
