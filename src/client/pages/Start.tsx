import { useState } from "react";
import { nextItem } from "../../shared/courses";
import { api, invalidate, useApi } from "../api";
import { Icon } from "../icons";
import { itemHref } from "../library";
import { Link } from "../router";
import { loginHref, useMe } from "../session";
import type { CourseDetail } from "../types";
import { Bar, ErrorBox, Skeleton, Spinner, useTitle, useToast } from "../ui";

/**
 * 新生任务：协会每位新成员都要完成的三项任务。
 *  1. 阅读前言：CSDIY 前言 + 会长前言（Crossing the Deep Sea 的第一篇）
 *  2. CS50x：取得哈佛大学的课程证书（提交证书链接，管理员确认后才算完成，接口见 worker/api/start.ts）
 *  3. Crossing the Deep Sea：协会自己编写的课程，正在筹备，没有“完成”状态
 * 首页最上方是 StartCard，/start 是完整的页面。
 */

const DEEP_SEA = "crossing-the-deep-sea";
const PREFACES = [
  { course: "csdiy", item: "preface", title: "CSDIY 前言" },
  { course: DEEP_SEA, item: "preface", title: "会长前言" },
] as const;

type CertStatus = "pending" | "approved" | "rejected";
interface Certificate {
  course: string;
  url: string;
  status: CertStatus;
  note: string | null;
  submittedAt: number;
  reviewedAt: number | null;
}

interface StartState {
  loading: boolean;
  error: Error | null;
  reload: () => void;
  guest: boolean;
  prefaceDone: boolean[];
  cs50: CourseDetail | undefined;
  cert: Certificate | null;
  /** 当前进行到第几项（0–2）；前两项都完成后停在第 3 项 */
  current: number;
}

function useStart(): StartState {
  const { me } = useMe();
  const guest = !me.role;
  const csdiy = useApi<CourseDetail>("/api/courses/csdiy");
  const deep = useApi<CourseDetail>(`/api/courses/${DEEP_SEA}`);
  const cs50 = useApi<CourseDetail>("/api/courses/cs50x");
  const mine = useApi<{ certificates: Certificate[] }>(guest ? null : "/api/start");

  const prefaceDone = PREFACES.map((p) => !!(p.course === "csdiy" ? csdiy : deep).data?.done[p.item]);
  const cert = mine.data?.certificates.find((c) => c.course === "cs50x") ?? null;
  const step1 = prefaceDone.every(Boolean);
  const step2 = cert?.status === "approved";
  const all = [csdiy, deep, cs50, ...(guest ? [] : [mine])];
  return {
    loading: all.some((x) => !x.data && !x.error),
    error: all.find((x) => x.error)?.error ?? null,
    reload: () => all.forEach((x) => x.reload()),
    guest,
    prefaceDone,
    cs50: cs50.data,
    cert,
    current: !step1 ? 0 : !step2 ? 1 : 2,
  };
}

const STEP_TITLES = ["阅读前言", "CS50x：哈佛大学计算机科学导论", "Crossing the Deep Sea"];

/** 首页最上方的卡片：当前任务和“继续”按钮。前两项完成后缩成一行。 */
export function StartCard() {
  const s = useStart();
  if (s.error) return null;
  if (s.loading) return <Skeleton h={168} r={24} />;
  if (!s.guest && s.current === 2) {
    return (
      <Link to="/start" className="card start-done">
        <span className="tag tag-ok">
          <Icon name="check" size={14} stroke={2.2} />
          新生任务
        </span>
        <span className="small">前两项任务已完成，下一项：Crossing the Deep Sea</span>
        <Icon name="arrowRight" size={16} stroke={2} />
      </Link>
    );
  }
  const n = s.guest ? 0 : s.current;
  const next = s.cs50 && nextItem(s.cs50.course, new Set(Object.keys(s.cs50.done)));
  const unread = PREFACES.filter((_, i) => !s.prefaceDone[i]).map((p) => p.title);
  const sub = s.guest
    ? "协会新成员的入门任务共三项：阅读前言，完成 CS50x 课程并取得证书，学习协会课程 Crossing the Deep Sea。"
    : n === 0
      ? `尚未阅读：${unread.join("、")}`
      : s.cert?.status === "pending"
        ? "证书已提交，等待管理员确认"
        : next
          ? `下一项：${next.title}`
          : "站内内容已全部完成，请在 cs50.me 领取证书并提交链接";
  return (
    <section className="card start-card" aria-labelledby="start-h">
      <span className="eyebrow">{s.guest ? "智慧算法网络协会" : `新生任务 · 第 ${n + 1} 项，共 3 项`}</span>
      <h2 id="start-h" className="h2">
        {s.guest ? "新生任务" : STEP_TITLES[n]}
      </h2>
      <p className="small sub pretty">{sub}</p>
      {!s.guest && n === 1 && s.cs50 && <Bar ratio={s.cs50.progress.ratio} label={`CS50x 站内进度 ${Math.round(s.cs50.progress.ratio * 100)}%`} />}
      <div className="row wrap">
        <Link to="/start" className="btn btn-primary">
          {s.guest ? "查看新生任务" : "继续"}
          <Icon name="arrowRight" size={16} stroke={2} />
        </Link>
      </div>
    </section>
  );
}

export function StartPage() {
  useTitle("新生任务");
  const s = useStart();
  return (
    <div className="page start-page">
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">智慧算法网络协会</span>
          <h1 className="h1">新生任务</h1>
          <p className="sub pretty">协会每位新成员都需要按顺序完成以下三项任务。</p>
        </div>
      </header>
      {s.error ? (
        <ErrorBox error={s.error} onRetry={s.reload} />
      ) : s.loading ? (
        <Skeleton h={420} r={24} />
      ) : (
        <ol className="start-steps">
          <Step n={0} s={s}>
            <p className="small sub pretty">阅读《CS 自学指南》（csdiy.wiki）的前言和会长前言，了解计算机科学的自学方法和协会的培养思路。</p>
            <ul className="start-reads">
              {PREFACES.map((p, i) => (
                <li key={p.item + p.course}>
                  <Link to={`/courses/${p.course}/learn/${p.item}`} className="start-read">
                    <span className={`start-check${s.prefaceDone[i] ? " is-done" : ""}`} aria-label={s.prefaceDone[i] ? "已读" : "未读"}>
                      {s.prefaceDone[i] && <Icon name="check" size={14} stroke={2.4} />}
                    </span>
                    <span>{p.title}</span>
                    <Icon name="arrowRight" size={16} stroke={2} />
                  </Link>
                </li>
              ))}
            </ul>
            {!s.guest && <p className="xsmall sub">阅读完成后，请在讲义页底部点击“标记完成”。</p>}
          </Step>

          <Step n={1} s={s}>
            <p className="small sub pretty">
              CS50x（CS50's Introduction to Computer Science，哈佛大学计算机科学导论）是协会全体成员的第一门课程。完成全部习题集和期末项目后，可以在{" "}
              <a href="https://cs50.me/cs50x" target="_blank" rel="noreferrer">
                cs50.me
              </a>{" "}
              领取哈佛大学颁发的课程证书。提交证书链接并经管理员确认后，本项任务完成。
            </p>
            {s.cs50 && <Cs50Progress d={s.cs50} guest={s.guest} />}
            {s.guest ? (
              <Link to={loginHref("/start")} className="btn btn-soft btn-sm">
                登录后提交证书
              </Link>
            ) : (
              <CertForm cert={s.cert} />
            )}
          </Step>

          <Step n={2} s={s} preparing>
            <p className="small sub pretty">Crossing the Deep Sea 是协会自行编写的课程，内容包括计算机领域的专题文章和竞赛相关资料。课程正在编写中，内容将陆续发布。</p>
            <Link to={`/courses/${DEEP_SEA}`} className="btn btn-soft btn-sm">
              查看课程
              <Icon name="arrowRight" size={16} stroke={2} />
            </Link>
          </Step>
        </ol>
      )}
    </div>
  );
}

function Step({ n, s, preparing, children }: { n: number; s: StartState; preparing?: boolean; children: React.ReactNode }) {
  const done = !s.guest && n < s.current;
  const now = !s.guest && n === s.current;
  return (
    <li className={`card start-step${done ? " is-done" : ""}${now ? " is-now" : ""}`} aria-current={now ? "step" : undefined}>
      <div className="start-step-head">
        <span className="start-num">{done ? <Icon name="check" size={16} stroke={2.4} /> : n + 1}</span>
        <h2 className="h3">{STEP_TITLES[n]}</h2>
        {done ? <span className="tag tag-ok">已完成</span> : preparing ? <span className="tag tag-muted">筹备中</span> : now ? <span className="tag tag-accent">进行中</span> : null}
      </div>
      <div className="stack start-step-body">{children}</div>
    </li>
  );
}

function Cs50Progress({ d, guest }: { d: CourseDetail; guest: boolean }) {
  const next = nextItem(d.course, new Set(Object.keys(d.done)));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {!guest && <Bar ratio={d.progress.ratio} label={`站内进度 ${d.progress.doneItems} / ${d.progress.items}`} />}
      <Link to={!guest && next ? itemHref("cs50x", next) : "/courses/cs50x"} className="more-link">
        {!guest && next ? `继续学习：${next.title}` : "打开课程"}
        <Icon name="arrowRight" size={16} stroke={2} />
      </Link>
    </div>
  );
}

const CERT_TEXT: Record<CertStatus, string> = { pending: "已提交，等待管理员确认", approved: "已通过确认", rejected: "未通过确认" };

function CertForm({ cert }: { cert: Certificate | null }) {
  const toast = useToast();
  const [url, setUrl] = useState(cert?.status === "rejected" ? cert.url : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cert && cert.status !== "rejected") {
    return (
      <p className="small">
        <span className={`tag ${cert.status === "approved" ? "tag-ok" : "tag-accent"}`}>{CERT_TEXT[cert.status]}</span>{" "}
        <a href={cert.url} target="_blank" rel="noreferrer" className="xsmall">
          查看证书
        </a>
      </p>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/start/certificates/cs50x", { method: "PUT", body: { url: url.trim() } });
      invalidate("/api/start");
      toast("证书已提交，等待管理员确认");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="stack"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {cert?.status === "rejected" && (
        <p className="small" role="status">
          <span className="tag tag-bad">{CERT_TEXT.rejected}</span> {cert.note ? `原因：${cert.note}。请修改后重新提交。` : "请修改后重新提交。"}
        </p>
      )}
      <label className="field">
        <span className="small">证书链接</span>
        <input className="input" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoComplete="off" maxLength={500} />
        <span className="hint xsmall">在 cs50.me 打开课程证书页面，复制该页面的链接。</span>
      </label>
      {error && (
        <span className="error-text xsmall" role="alert">
          {error}
        </span>
      )}
      <div className="row">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !url.trim()}>
          {busy ? <Spinner /> : "提交证书"}
        </button>
      </div>
    </form>
  );
}
