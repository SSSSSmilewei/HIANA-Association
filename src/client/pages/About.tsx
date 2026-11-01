import { useEffect } from "react";
import { ASSOCIATION, DEPARTMENTS, DIRECTIONS, HONORS, type Honor, JOIN_STEPS, YEAR, honorStats } from "../../shared/association";
import { Icon } from "../icons";
import { Link } from "../router";
import { loginHref, useMe } from "../session";
import { useTitle } from "../ui";

/** 开场动画的地图（看过一遍之后的状态），看完“回到平台”回这一页 */
export const INTRO_MAP_HREF = "/intro/?view=map&from=/about";

/** 协会介绍和学生成就，同一页。游客也能看。内容在 association.ts。 */
export function AboutPage() {
  useTitle("协会");
  const { me } = useMe();
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return (
    <div className="page">
      <header className="page-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">
            {ASSOCIATION.school} · {ASSOCIATION.founded}成立
          </span>
          <h1 className="h1">{ASSOCIATION.name}</h1>
          <p className="lead">{ASSOCIATION.slogan}</p>
        </div>
        <nav className="row wrap" style={{ gap: 8 }} aria-label="本页">
          {/* 开场动画是单独的静态页（public/intro/），整页跳过去，不走前端路由 */}
          <a href={INTRO_MAP_HREF} className="btn btn-primary btn-sm">
            <Icon name="play" size={16} />
            打开协会介绍
          </a>
          <a href="#honors" className="btn btn-ghost btn-sm">
            学生成就
          </a>
          <a href="#join" className="btn btn-ghost btn-sm">
            加入
          </a>
        </nav>
      </header>

      <section className="card motto-card" aria-label="协会宗旨">
        <span className="eyebrow">宗旨</span>
        <p className="motto">{ASSOCIATION.motto}</p>
      </section>

      <section className="section" aria-labelledby="dir-h">
        <h2 id="dir-h" className="h2">
          四个技术方向
        </h2>
        <div className="grid-cards">
          {DIRECTIONS.map((d, i) => (
            <article key={d.title} className="card stack rise" style={{ "--i": i, gap: 6 } as React.CSSProperties}>
              <span className="dir-num num">0{i + 1}</span>
              <h3 className="h3">{d.title}</h3>
              <p className="small sub pretty">{d.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-2" aria-label="部门和一年的安排">
        <div className="card stack" style={{ gap: 4 }}>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            部门
          </h2>
          {DEPARTMENTS.map((d) => (
            <div key={d.name} className="list-row" style={{ alignItems: "flex-start" }}>
              <span className="tag tag-accent" style={{ marginTop: 2 }}>
                {d.name}
              </span>
              <span className="small pretty grow">{d.body}</span>
            </div>
          ))}
        </div>
        <div className="card stack" style={{ gap: 4 }}>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            一年怎么过
          </h2>
          <ol className="steps">
            {YEAR.map((p) => (
              <li key={p.title}>
                <span style={{ fontWeight: 600 }}>{p.title}</span>
                <span className="small sub pretty">{p.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HonorsSection />

      <section className="card stack join-card" aria-labelledby="join-h" id="join">
        <h2 id="join-h" className="h2">
          加入
        </h2>
        <ol className="steps">
          {JOIN_STEPS.map((s) => (
            <li key={s}>
              <span className="small pretty">{s}</span>
            </li>
          ))}
        </ol>
        <p className="small sub">
          指导老师：{ASSOCIATION.teachers.join("、")}
        </p>
        {!me.role && (
          <div className="row wrap">
            <Link to={loginHref("/", "register")} className="btn btn-primary">
              用邀请码注册
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/** 学生成就：国家级做成大卡片，其余按含金量列出来。 */
function HonorsSection() {
  const stats = honorStats();
  const national = HONORS.filter((h) => h.level === "national");
  const provincial = HONORS.filter((h) => h.level === "provincial");
  return (
    <>
      <h2 id="honors" className="h1" style={{ marginTop: 16 }}>
        学生成就
      </h2>
      <section className="honor-stats" aria-label="概览">
        <Stat n={stats.national} label="项国家级奖项" />
        <Stat n={stats.provincial} label="项省级 / 赛区奖项" />
        <Stat n={stats.people} label="位成员上榜" />
      </section>

      <section className="section" aria-labelledby="nat-h">
        <h2 id="nat-h" className="h2">
          国家级
        </h2>
        <div className="grid-2">
          {national.map((h, i) => (
            <article key={i} className="night-card honor-feature rise" style={{ "--i": i } as React.CSSProperties}>
              <span className="mini-wall" aria-hidden="true">
                {Array.from({ length: 36 }, (_, j) => (
                  <i key={j} style={{ background: `var(--n${(j * 7 + j * j + i * 3) % 5})` }} />
                ))}
              </span>
              <span className="tag" style={{ position: "relative", alignSelf: "flex-start", background: "var(--night-tag)", color: "var(--night-tag-ink)", fontWeight: 600 }}>
                全国{h.rank === "国一" ? "一" : h.rank === "国二" ? "二" : "三"}等奖
              </span>
              <span className="stack" style={{ position: "relative", gap: 4, maxWidth: "78%" }}>
                <span style={{ fontSize: "var(--fs-xl)", lineHeight: "30px", fontWeight: 700 }}>{h.contest}</span>
                {h.detail && <span className="small night-sub">{h.detail}</span>}
              </span>
              <span className="row" style={{ position: "relative", marginTop: "auto", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: "var(--fs-lg)", fontWeight: 600 }}>
                  {h.people.join("、")}
                  {h.team && <span className="small night-sub">（团队成员）</span>}
                </span>
                {h.date && <span className="small night-sub num">{h.date}</span>}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="prov-h">
        <h2 id="prov-h" className="h2">
          省级与赛区
        </h2>
        <div className="card stack" style={{ gap: 0, paddingTop: 8, paddingBottom: 8 }}>
          {provincial.map((h, i) => (
            <HonorRow key={i} h={h} />
          ))}
        </div>
        <p className="xsmall sub">团队奖项只列协会成员，统计到 2026 年 10 月。</p>
      </section>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card stack" style={{ gap: 6 }}>
      <span className="big-num" style={{ color: "var(--accent-text)" }}>
        {n}
      </span>
      <span className="small sub">{label}</span>
    </div>
  );
}

function HonorRow({ h }: { h: Honor }) {
  const top = h.rank.endsWith("一") || h.rank.endsWith("二");
  return (
    <div className="list-row honor-row">
      <span className={`tag honor-rank ${top ? "tag-solid" : "tag-accent"}`}>{h.rank}</span>
      <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: "var(--fs-md)", lineHeight: "22px", fontWeight: 500 }} className="pretty">
          {h.contest}
        </span>
        {h.detail && <span className="small sub pretty">{h.detail}</span>}
      </span>
      <span className="stack honor-who">
        <span style={{ fontSize: "var(--fs-md)", lineHeight: "22px", fontWeight: 600 }}>{h.people.join("、")}</span>
        <span className="xsmall sub num">{[h.team ? "团队" : null, h.date].filter(Boolean).join(" · ")}</span>
      </span>
    </div>
  );
}
