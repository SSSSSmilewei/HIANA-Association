import { useMemo, useState } from "react";
import { type CourseMeta, type MetaItem, nextItem, periodsToHours, planCards, progress, weeksToFinish } from "../../shared/courses";
import { ITEM_KIND_LABEL, LINK_KINDS, LINK_KIND_LABEL } from "../../shared/light";
import type { Link as PkgLink } from "../../shared/package";
import { Prose } from "../components/Prose";
import { type CourseState, useCourse } from "../courseData";
import { Icon } from "../icons";
import { downloadJson, exportPackage, forgetPackage, itemHref, removeLocal } from "../library";
import { Link, navigate, useQuery } from "../router";
import { useMe } from "../session";
import { api } from "../api";
import { refreshLearning } from "../courseMeta";
import { Dialog, Empty, ErrorBox, Ring, Seg, Skeleton, useConfirm, useTitle, useToast } from "../ui";
import { Stars } from "./Courses";

const PACE_KEY = "hiana-pace";
function readPace(slug: string): number {
  try {
    const v = Number(JSON.parse(localStorage.getItem(PACE_KEY) ?? "{}")[slug]);
    return [4, 6, 8, 10].includes(v) ? v : 6;
  } catch {
    return 6;
  }
}
function savePace(slug: string, v: number) {
  try {
    const all = JSON.parse(localStorage.getItem(PACE_KEY) ?? "{}");
    all[slug] = v;
    localStorage.setItem(PACE_KEY, JSON.stringify(all));
  } catch {
    /* 存不了也没关系 */
  }
}

type Tab = "intro" | "content";

export function CoursePage({ slug }: { slug: string }) {
  const { local, meta, pkg, state, error, reload, toggle, setStatus } = useCourse(slug);
  const q = useQuery("tab");
  const [pace, setPace] = useState(() => readPace(slug));
  useTitle(meta?.title ?? "课程");

  if (error && !meta)
    return (
      <div className="page">
        <BackLink />
        {(error as { status?: number }).status === 404 || /没有/.test(error.message) ? <Empty title="没有这门课" /> : <ErrorBox error={error} onRetry={reload} />}
      </div>
    );
  if (!meta || !state)
    return (
      <div className="page" aria-busy="true">
        <BackLink />
        <Skeleton h={36} w={420} />
        <Skeleton h={120} />
        <Skeleton h={420} />
      </div>
    );

  const items = meta.modules.flatMap((m) => m.items);
  const hosted = items.length > 0;
  const tab: Tab = q === "intro" || !hosted ? "intro" : q === "content" ? "content" : state.enrollment || Object.keys(state.done).length ? "content" : "intro";
  const setTab = (t: Tab) => navigate(`/courses/${slug}?tab=${t}`, { replace: true });

  const doneSet = new Set(Object.keys(state.done));
  const p = progress(meta, doneSet);
  const next = nextItem(meta, doneSet);
  const weeks = weeksToFinish(p.totalPeriods - p.donePeriods, pace);

  return (
    <div className="page">
      <BackLink />
      <div className="split">
        <header className="split-main course-head">
          <span className="course-kicker">
            {[meta.category, meta.provider].filter(Boolean).join(" / ")}
            {local && <span className="tag tag-muted">本机</span>}
            {meta.origin === "published" && <span className="tag tag-muted">发布的课程包</span>}
          </span>
          <h1 className="h1" style={{ viewTransitionName: "course-title" }}>
            {meta.title}
          </h1>
          {meta.titleEn && meta.titleEn !== meta.title && <p className="course-en">{meta.titleEn}</p>}
          {meta.summary && <p className="lead pretty">{meta.summary}</p>}
          <Facts c={meta} totalPeriods={p.totalPeriods} />
        </header>

        <section className="split-side card stack" aria-label="我的进度" style={{ gap: 16 }}>
          <ProgressPanel slug={slug} meta={meta} state={state} local={local} pace={pace} setPace={(v) => { setPace(v); savePace(slug, v); }} weeks={weeks} next={next} setStatus={setStatus} />
        </section>
      </div>

      {hosted && (
        <div className="tabs" role="tablist" aria-label="课程">
          <button type="button" role="tab" aria-selected={tab === "intro"} onClick={() => setTab("intro")}>
            介绍与资源
          </button>
          <button type="button" role="tab" aria-selected={tab === "content"} onClick={() => setTab("content")}>
            课程内容 <span className="num tab-count">{items.length}</span>
          </button>
        </div>
      )}

      {tab === "intro" ? (
        <Intro pkg={pkg} meta={meta} />
      ) : (
        <Contents slug={slug} meta={meta} state={state} next={next} toggle={toggle} />
      )}

      <CourseFoot slug={slug} meta={meta} local={local} />
    </div>
  );
}

function Facts({ c, totalPeriods }: { c: CourseMeta; totalPeriods: number }) {
  const rows: [string, React.ReactNode][] = [];
  if (c.prerequisites) rows.push(["先修", c.prerequisites]);
  if (c.language) rows.push(["语言", c.language]);
  if (totalPeriods) rows.push(["学时", `${totalPeriods} 课时，约 ${periodsToHours(totalPeriods)} 小时`]);
  else if (c.hours) rows.push(["学时", c.hours]);
  if (c.difficulty > 0) rows.push(["难度", <Stars key="s" n={c.difficulty} />]);
  if (!rows.length) return null;
  return (
    <dl className="facts">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProgressPanel({
  slug,
  meta,
  state,
  local,
  pace,
  setPace,
  weeks,
  next,
  setStatus,
}: {
  slug: string;
  meta: CourseMeta;
  state: CourseState;
  local: boolean;
  pace: number;
  setPace: (v: number) => void;
  weeks: number | null;
  next: MetaItem | null;
  setStatus: ReturnType<typeof useCourse>["setStatus"];
}) {
  const hosted = meta.modules.some((m) => m.items.length);
  const p = progress(meta, new Set(Object.keys(state.done)));
  const st = state.enrollment?.status;
  const enrolled = st === "active" || st === "paused" || st === "done";
  return (
    <>
      {hosted ? (
        <>
          <div className="row" style={{ gap: 16 }}>
            <Ring ratio={p.ratio} size={80} stroke={8} label={`已完成 ${Math.round(p.ratio * 100)}%`}>
              <text x="40" y="46" textAnchor="middle" className="ring-text">
                {Math.round(p.ratio * 100)}%
              </text>
            </Ring>
            <span className="stack" style={{ gap: 2 }}>
              <span className="stat-big num">
                {p.doneItems} / {p.items}
              </span>
              <span className="small sub num">
                已学 {p.donePeriods} / {p.totalPeriods} 课时
              </span>
            </span>
          </div>
          {next && (
            <Link to={itemHref(slug, next)} className="btn btn-primary btn-lg next-btn" title={next.title}>
              <span>{p.doneItems ? "继续学" : "开始学"}</span>
              <span className="ellipsis next-btn-title">{next.title}</span>
            </Link>
          )}
          {st !== "done" && p.totalPeriods > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="small sub">每周课时</span>
              <Seg label="每周课时" flat value={pace} onChange={setPace} options={[4, 6, 8, 10].map((v) => ({ value: v, label: <span className="num">{v}</span> }))} />
              {weeks !== null && <span className="small num">按这个节奏还要 {weeks} 周</span>}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="small sub">这门课在原网站学习，这里记录进度。</p>
          {st === "done" && (
            <span className="tag tag-ok" style={{ alignSelf: "flex-start" }}>
              <Icon name="check" size={14} stroke={2.2} />
              学完了
            </span>
          )}
        </>
      )}
      {!local && <Peers names={state.peers} />}
      {local ? (
        <p className="small sub">本机导入的课，进度只存在这台设备上。</p>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          {!enrolled ? (
            <button type="button" className={`btn ${hosted ? "btn-ghost" : "btn-primary"}`} onClick={() => setStatus("active")}>
              加入我的课程
            </button>
          ) : st === "paused" ? (
            <button type="button" className="btn btn-primary" onClick={() => setStatus("active", st)}>
              继续学
            </button>
          ) : (
            <>
              {!hosted && st === "active" && (
                <button type="button" className="btn btn-primary" onClick={() => setStatus("done")}>
                  <Icon name="check" size={16} stroke={2.2} />
                  标记学完
                </button>
              )}
              {st === "active" && hosted && (
                <button type="button" className="btn btn-quiet" onClick={() => setStatus("paused")}>
                  暂停
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={() => setStatus("dropped")}>
                移出
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** 介绍与资源：中文介绍（爱好者写的）→ 官方介绍（翻译）→ 按类型分组的链接 */
function Intro({ pkg, meta }: { pkg: ReturnType<typeof useCourse>["pkg"]; meta: CourseMeta }) {
  const groups = useMemo(() => {
    const by = new Map<string, PkgLink[]>();
    for (const l of meta.links) {
      const k = (LINK_KINDS as readonly string[]).includes(l.kind) ? l.kind : "other";
      by.set(k, [...(by.get(k) ?? []), l as PkgLink]);
    }
    return LINK_KINDS.filter((k) => by.has(k)).map((k) => ({ kind: k, links: by.get(k) ?? [] }));
  }, [meta.links]);

  return (
    <div className="intro-grid">
      <div className="stack intro-main" style={{ gap: 32 }}>
        {!pkg ? (
          <div className="stack" aria-busy="true">
            <Skeleton h={22} w="40%" />
            <Skeleton h={16} />
            <Skeleton h={16} />
            <Skeleton h={16} w="70%" />
          </div>
        ) : (
          <>
            {pkg.intro.community && (
              <section aria-labelledby="intro-community">
                <SectionTitle id="intro-community" title="课程介绍" source={pkg.intro.communitySource} />
                <Prose source={pkg.intro.community} />
              </section>
            )}
            {pkg.intro.official && (
              <section aria-labelledby="intro-official">
                <SectionTitle id="intro-official" title="官方介绍" note="中文翻译" source={pkg.intro.officialSource} />
                <Prose source={pkg.intro.official} />
              </section>
            )}
            {!pkg.intro.community && !pkg.intro.official && <p className="sub">这门课还没有介绍。</p>}
          </>
        )}
      </div>
      {groups.length > 0 && (
        <aside className="intro-side" aria-labelledby="links-h">
          <h2 id="links-h" className="h3">
            课程资源
          </h2>
          {groups.map((g) => (
            <div key={g.kind} className="link-group">
              <span className="link-group-label">{LINK_KIND_LABEL[g.kind]}</span>
              <ul>
                {g.links.map((l) => (
                  <li key={l.url + l.label}>
                    <a href={l.url} target="_blank" rel="noreferrer" className="res-link">
                      <span className="ellipsis">{l.label}</span>
                      <Icon name="external" size={12} stroke={2.2} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}

function SectionTitle({ id, title, note, source }: { id: string; title: string; note?: string; source?: PkgLink }) {
  return (
    <div className="intro-title">
      <h2 id={id} className="h2">
        {title}
      </h2>
      {(note || source) && (
        <span className="small sub">
          {note}
          {note && source && "，"}
          {source && (
            <>
              来自{" "}
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </>
          )}
        </span>
      )}
    </div>
  );
}

/** 课程内容：模块 → 条目。可以按类型筛选（讲义 / 作业 / 实验……） */
function Contents({
  slug,
  meta,
  state,
  next,
  toggle,
}: { slug: string; meta: CourseMeta; state: CourseState; next: MetaItem | null; toggle: (id: string, done: boolean) => void }) {
  const kinds = useMemo(() => [...new Set(meta.modules.flatMap((m) => m.items.map((it) => it.kind)))], [meta]);
  const [kind, setKind] = useState<string>("all");
  const doneSet = new Set(Object.keys(state.done));
  const modules = meta.modules.map((m) => ({ ...m, items: m.items.filter((it) => kind === "all" || it.kind === kind) })).filter((m) => m.items.length);
  const single = meta.modules.length === 1;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PlanButton meta={meta} done={doneSet} />
      {kinds.length > 1 && (
        <div className="row wrap" style={{ gap: 8 }} role="group" aria-label="按类型筛选">
          <button type="button" className="chip" aria-pressed={kind === "all"} onClick={() => setKind("all")}>
            全部
          </button>
          {kinds.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {ITEM_KIND_LABEL[k as keyof typeof ITEM_KIND_LABEL] ?? k}
            </button>
          ))}
        </div>
      )}
      {modules.map((m, mi) => {
        const doneN = m.items.filter((it) => doneSet.has(it.id)).length;
        const groupStart = m.group && m.group !== modules[mi - 1]?.group;
        return (
          <section key={m.id} className="module" aria-label={m.group ? `${m.group} · ${m.title}` : m.title}>
            {groupStart && <h3 className="module-group h2">{m.group}</h3>}
            {!single && (
              <header className="module-head">
                <h3 className="h3">{m.title}</h3>
                <span className="small sub num">
                  {doneN} / {m.items.length}
                </span>
              </header>
            )}
            <ol className="card card-flush unit-list">
              {m.items.map((it) => {
                const done = doneSet.has(it.id);
                const isNext = next?.id === it.id;
                const solved = state.solved[it.id]?.length ?? 0;
                return (
                  <li key={it.id} className={`unit${done ? " is-done" : ""}${isNext ? " is-next" : ""}`}>
                    <button
                      type="button"
                      className={`check-btn${isNext ? " next" : ""}`}
                      aria-pressed={done}
                      aria-label={`${done ? "取消完成" : "标记完成"}：${it.title}`}
                      onClick={() => toggle(it.id, !done)}
                    >
                      {done && <Icon name="check" size={16} stroke={2.4} />}
                    </button>
                    <span className="unit-body">
                      <Link to={itemHref(slug, it)} className="unit-title">
                        {it.title}
                      </Link>
                      <span className="unit-meta small sub">
                        <span className={`kind kind-${it.kind}`}>{ITEM_KIND_LABEL[it.kind as keyof typeof ITEM_KIND_LABEL] ?? it.kind}</span>
                        <span className="num">{it.periods} 课时</span>
                        {it.optional && <span>选学</span>}
                        {it.practice > 0 && (
                          <span className="num">
                            练手 {solved} / {it.practice}
                          </span>
                        )}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** 复制到 CourseTable 的里课表：没学完的条目一行一张卡片 */
function PlanButton({ meta, done }: { meta: CourseMeta; done: Set<string> }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { group, lines } = planCards(meta, done);
  if (!lines.length) return null;
  const text = lines.join("\n");
  const copy = async (v: string, what: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast(`${what}已复制`);
    } catch {
      toast("复制失败，手动选中复制吧", "error");
    }
  };
  return (
    <>
      <div className="row wrap" style={{ gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        <span className="small sub num">
          还有 {lines.length} 项没学完
        </span>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(true)}>
          <Icon name="clipboard" size={16} />
          加到里课表
        </button>
      </div>
      {open && (
        <Dialog title="加到里课表" sub="在 CourseTable 里把这些条目排进你的课表空档" onClose={() => setOpen(false)}>
          <div className="stack" style={{ gap: 12 }}>
            <ol className="plain-list small">
              <li>打开 CourseTable → 里课表 → 右上角“+”。</li>
              <li>
                课程填 <code>{group}</code>{" "}
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => copy(group, "课程名")}>
                  复制
                </button>
              </li>
              <li>把下面 {lines.length} 行整段粘贴进去，每行变成一张卡片，再长按拖进课表的格子。</li>
            </ol>
            <textarea className="input mono" readOnly rows={Math.min(10, lines.length)} value={text} onFocus={(e) => e.currentTarget.select()} />
            <div className="dialog-actions">
              <button type="button" className="btn btn-primary" onClick={() => copy(text, `${lines.length} 张卡片`)}>
                复制卡片
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

function CourseFoot({ slug, meta, local }: { slug: string; meta: CourseMeta; local: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { me } = useMe();
  const exp = async () => {
    try {
      const pkg = await exportPackage(slug);
      downloadJson(`${pkg.slug}.hiana-course.json`, pkg);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const remove = async () => {
    if (local) {
      if (!(await confirm({ title: "从这台设备删除这门课？", body: "进度也会一起删除。", ok: "删除" }))) return;
      await removeLocal(slug.replace(/^local-/, ""));
      forgetPackage(slug);
      navigate("/courses");
      return;
    }
    if (!(await confirm({ title: "撤下这个课程包？", body: "所有人都看不到这门课了，学员的进度记录保留。", ok: "撤下" }))) return;
    try {
      await api(`/api/admin/packages/${slug}`, { method: "DELETE" });
      forgetPackage(slug);
      refreshLearning();
      navigate("/courses");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <footer className="course-page-foot">
      {meta.license && <p className="small sub">{meta.license}</p>}
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn btn-quiet btn-sm" onClick={exp}>
          <Icon name="download" size={16} />
          导出课程包
        </button>
        <Link to="/courses/format" className="btn btn-quiet btn-sm">
          课程包格式
        </Link>
        {(local || (meta.origin === "published" && me.isAdmin)) && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={remove}>
            {local ? "从本机删除" : "撤下"}
          </button>
        )}
      </div>
    </footer>
  );
}

function Peers({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <span className="small sub">
      {names.slice(0, 3).join("、")}
      {names.length > 3 ? ` 等 ${names.length} 人` : ""}也在学
    </span>
  );
}

export function BackLink() {
  return (
    <Link to="/courses" className="back-link">
      <Icon name="arrowLeft" size={16} stroke={2} />
      课程
    </Link>
  );
}
