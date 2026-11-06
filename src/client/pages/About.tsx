import { useEffect } from "react";
import { ASSOCIATION, DEPARTMENTS, DIRECTIONS, HONORS, type Honor, JOIN_STEPS, SCHOOL_AWARDS, honorStats, schoolAwardsText } from "../../shared/association";
import type { CourseSummary } from "../types";
import { useApi } from "../api";
import { Icon } from "../icons";
import { Link } from "../router";
import { useMe } from "../session";
import { useTitle } from "../ui";
import "../styles/about.css";

/** 开场动画的地图（看过一遍之后的状态），看完“回到平台”回这一页 */
export const INTRO_MAP_HREF = "/intro/?view=map&from=/about";
/** 从头播开场动画，结尾是报名表（只给校内新生）；看完回这一页 */
export const INTRO_PLAY_HREF = "/intro/?from=/about";

/** 站内练手题的道数（CS50x、Missing Semester 两版）。加了题记得改 */
const EXERCISES = 342;

/**
 * 协会页：照「海纳协会新生介绍书」排成一张长海报。游客也能看。
 * 协会的基本信息、部门、成就在 association.ts；这里是介绍书的文案。
 * 报名入口都是“播放协会介绍”：报名表在开场动画的结尾。
 */
export function AboutPage() {
  useTitle("协会");
  const { me } = useMe();
  const courses = useApi<CourseSummary[]>("/api/courses");
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
    // 整页深色：滚过头露出来的底色也要是深海蓝，离开这一页再还原
    const root = document.documentElement, old = root.style.background;
    root.style.background = "#061a33";
    return () => {
      root.style.background = old;
    };
  }, []);
  // 已登录的成员不用报名，按钮只写“播放协会介绍”
  const playLabel = me.role ? "播放协会介绍" : "播放协会介绍 · 报名";

  return (
    <div className="hn">
      <header className="hn-bar">
        <Link to="/" className="hn-logo" aria-label="回到平台首页">
          <span className="hina">HI·NA</span>
          <span className="nm">智慧算法网络协会 · 海纳协会</span>
        </Link>
        <nav className="hn-bar-nav" aria-label="协会页">
          <Link to="/" className="hn-bar-link">
            <Icon name="arrowRight" size={16} stroke={2} className="back" />
            回到平台
          </Link>
          <a className="hn-btn sm" href={INTRO_PLAY_HREF}>
            <Icon name="play" size={16} />
            协会介绍
          </a>
        </nav>
      </header>
      <section className="hn-hero" aria-labelledby="hn-title">
        <div className="hn-top">
          <div style={{ minWidth: 0 }}>
            <div className="hn-ep">
              <span className="a">INAA · 2026</span>
              <span className="b">新生介绍书</span>
            </div>
            <h1 id="hn-title">
              <span className="hn-tilt">嘿，新同学，</span>
              <span className="hn-big">
                <span>来这里，</span>
                <span>
                  成为开发者<em>!?</em>
                </span>
              </span>
            </h1>
            <p className="hn-lede">
              我们是<b>{ASSOCIATION.name}</b>，大家叫我们“海纳协会”。
              <br />
              精进于项目的比赛，用 AI 去赋能，培养出真正的开发者。
            </p>
            <div className="hn-cta">
              {/* 开场动画是单独的静态页（public/intro/），整页跳过去，不走前端路由 */}
              <a className="hn-btn" href={INTRO_PLAY_HREF}>
                <Icon name="play" size={18} />
                {playLabel}
              </a>
              <Link className="hn-btn ghost" to="/courses">
                逛逛课程
              </Link>
            </div>
          </div>
          <Streams />
        </div>
        <p className="hn-statnote">学校学生竞赛统计 · 2020.10—2026.6</p>
        <div className="hn-stats">
          <Stat k="NATIONAL" v={SCHOOL_AWARDS.national} unit="项" d="国家级奖项" />
          <Stat k="PROVINCIAL" v={SCHOOL_AWARDS.provincial} unit="项" d="省级奖项" />
          <Stat k="COURSES" v={courses.data?.length ?? 118} unit="门" d="开源公开课" />
          <Stat k="EXERCISES" v={EXERCISES} unit="道" d="在线练手题" />
        </div>
      </section>

      <div className="hn-tape" aria-hidden="true">
        <span>{"海纳百川 ▶ 有容乃大 ▶ 学 ▶ 讲 ▶ 赛 ▶ HI·NA ▶ 拒绝空谈 行动至上 ▶ ".repeat(4)}</span>
      </div>

      <Section id="hn-about" eyebrow="ABOUT US · 关于我们" title="这里是海纳协会" dots={1}>
        <p className="hn-sub">
          {ASSOCIATION.name}（INAA）隶属{ASSOCIATION.school}，{ASSOCIATION.founded}成立。指导老师：{ASSOCIATION.teachers.join("、")}。
        </p>
        <div className="hn-grid2">
          <div className="hn-panel">
            <span className="hn-tag">名字的由来</span>
            <p className="hn-name">
              <span>HI</span>EU <i>+</i> IN<span>A</span>A <i>=</i> <span>HI·NA</span>
            </p>
            <p>湖南涉外经济学院简称 HIEU，智慧算法网络协会简称 INAA，各取 HI 与 NA，合为 HI·NA，读作「海纳」。</p>
            <p className="hn-note">海纳百川，有容乃大。不论专业，不论院系，甚至不论学校，都可以汇入这片海。</p>
          </div>
          <div className="hn-panel">
            <span className="hn-tag">宗旨 · 口号</span>
            <p className="hn-motto">{ASSOCIATION.motto}</p>
            <p>{ASSOCIATION.slogan}。</p>
            <p className="hn-note">没有官僚作风：不搞层层审批，不论资排辈，人人平等，一切只为学习。</p>
          </div>
        </div>
        <h3 className="hn-h3">四个技术方向</h3>
        <div className="hn-grid4">
          {DIRECTIONS.map((d, i) => (
            <div key={d.title} className="hn-panel">
              <span className="hn-lvl">0{i + 1}</span>
              <h4>{d.title}</h4>
              <p className="hn-small">{d.body}</p>
            </div>
          ))}
        </div>
        <h3 className="hn-h3">四个部门</h3>
        <div className="hn-depts">
          {DEPARTMENTS.map((d) => (
            <div key={d.name} className="hn-dept">
              <h4>{d.name}</h4>
              <p className="hn-small">{d.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="hn-pain" eyebrow="SOUND FAMILIAR? · 你是不是也" title="有这些烦恼？" dots={2}>
        <p className="hn-sub">这些问题我们都经历过。协会就是为了解决它们而存在的。</p>
        <div className="hn-grid3">
          <Pain q="自学总是" hl="学不下去" body="网上好课很多，收藏了一堆，打开两节就放下了。" ans="固定时间、固定地点、一群人一起学，还有学长现场答疑。" />
          <Pain q="不知道该" hl="打什么比赛" body="什么比赛都报，最后发现和自己想做的方向不沾边。" ans="主攻项目类比赛：做出一个完整的作品，这才是将来工作真正要用的能力。" />
          <Pain q="一个人学" hl="太孤单" body="身边没人一起学，遇到问题没人问，越学越没劲。" ans="“一个人点燃一群人”。在这里，你会遇到和你一样喜欢计算机的人。" />
        </div>
      </Section>

      <Section id="hn-loop" eyebrow="HOW IT WORKS · 我们的玩法" title="学 → 讲 → 赛，转起来" dots={3}>
        <p className="hn-sub">我们管这叫“以赛促学”。三个环节连成一个圈，每转一圈，你就离真正的开发者更近一步。</p>
        <div className="hn-loop">
          <Step n="01" w="学" sub="共学平台" body="线上自学开源公开课，线下晚自习一起学。打基础，养兴趣。" />
          <Step n="02" w="讲" sub="分享交流" body="学了就上台讲出来。能讲清楚，才算真的学会了。" />
          <Step n="03" w="赛" sub="黑客松" body="把学到的东西做成一个完整的项目，检验你的真实水平。" />
        </div>
        <p className="hn-back">
          <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
            <path d="M36 4 V20 H6" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M12 13 L4 20 L12 27" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <span>比赛会暴露短板，带着问题回到“学”，开始下一圈。</span>
        </p>
        <p className="hn-aiband">
          <span className="hn-mono">AI ×</span>
          <span>AI 贯穿全程：不只是“用上 AI”，而是高效地用 AI，一步步学会使用并理解 Agent 工具。</span>
        </p>
      </Section>

      <Section id="hn-learn" eyebrow="01 · LEARN · 学" title="一条走得下去的路" dots={3}>
        <p className="hn-sub">零基础也没关系。线上负责“学什么”，线下负责“坚持下去”。</p>
        <div className="hn-grid2">
          <div className="hn-panel">
            <span className="hn-tag">线上 · 共学平台</span>
            <h4>世界一流的公开课，搬到你手边</h4>
            <ul>
              <li>
                精选 CSDIY（北大学长维护的计算机自学指南）收录的开源课程，如 <b>Harvard CS50x</b>、<b>MIT Missing Semester</b>，全文在站内，配导学和思维导图。
              </li>
              <li>这些课本来就是为零基础设计的。我们学校的同学完全学得懂，关键是动手去学。</li>
              <li>
                作业用自己的 <b>GitHub 账号</b>提交，由评测程序自动批改。不用等人改，提交完马上知道对不对。
              </li>
            </ul>
            <div className="hn-chips" aria-label="四条学习路线">
              {["新手", "人工智能", "嵌入式", "考研"].map((t) => (
                <span key={t} className="hn-chip">
                  {t}
                </span>
              ))}
            </div>
            <div className="hn-flow" aria-label="作业流程">
              <span>写代码</span>
              <b>→</b>
              <span>GitHub 提交</span>
              <b>→</b>
              <span>自动评测</span>
              <b>→</b>
              <span>记录进度</span>
            </div>
            <Link to="/courses" className="hn-more">
              去看看课程 <Icon name="arrowRight" size={16} stroke={2} />
            </Link>
          </div>
          <div className="hn-panel">
            <span className="hn-tag">线下 · 晚自习共学</span>
            <h4>推开 6 教 513 的门，一起学</h4>
            <ul>
              <li>
                <b>固定场地：</b>6 教 513（六教五楼）。网络、咖啡、学习设备一应俱全，比普通晚自习更适合写代码。
              </li>
              <li>
                <b>晚自习：</b>每周一、二、四 19:00–20:40 开放。大一同学每周一、周二晚自习可以来 513 一起学，已得到熊芳老师的同意。
              </li>
              <li>
                <b>学长手把手：</b>学长在现场一对一答疑，不会再因为一个小问题卡上一整晚。
              </li>
              <li>签到和学习时长都记在平台上，还能和 GitHub、力扣、Codeforces 的记录合成一张热力图，一学期的努力一眼看清。</li>
            </ul>
            <p className="hn-note">具体安排以协会群内通知为准。</p>
          </div>
        </div>
      </Section>

      <Section id="hn-talk" eyebrow="02 · TALK · 讲" title="海纳百川，有容乃大" dots={4}>
        <p className="hn-sub">借鉴清华 TUNA 协会的“金枪鱼之夜”：气氛轻松，主题开放，只要和计算机科学有关，讲什么都可以。</p>
        <div className="hn-grid2">
          <div className="hn-panel">
            <span className="hn-who">WHO · 嘉宾来讲</span>
            <span className="hn-big2">海纳百川</span>
            <p>邀请同学、老师，甚至校外的开发者来分享：带你一步步学会小程序和基础操作，讲比赛答辩的经验，聊维护一个项目的心得……</p>
            <p className="hn-note">每位同学都可以像溪流一样汇入计算机科学这片大海，不管你以前成绩怎样、水平如何。</p>
          </div>
          <div className="hn-panel">
            <span className="hn-who">WHO · 你来讲</span>
            <span className="hn-big2">有容乃大</span>
            <p>舞台留给协会的同学：讲你最近学的一门课、做的一个小项目、踩过的一个坑。</p>
            <p className="hn-note">讲是最好的复习，也是比赛答辩前最好的练习。谁都可以上来讲。</p>
          </div>
        </div>
        <div className="hn-where">
          <div className="first">
            <span className="k">WHERE · 地点</span>
            <span className="v">六教 513</span>
          </div>
          <div>
            <span className="k">WHEN · 时间</span>
            <span>每期时间在协会群里通知</span>
          </div>
          <div>
            <span className="k">WHO · 主讲</span>
            <span>嘉宾、老师，或者你</span>
          </div>
        </div>
      </Section>

      <Section id="hn-build" eyebrow="03 · BUILD · 赛" title="一起来搓黑客松" dots={3} row>
        <p className="hn-def">
          黑客松（Hackathon）：在<b>固定的场地、固定的时间</b>里，每个人提出自己的点子，用 AI 工具把它做成能跑起来的作品，最后大家互相展示、互相评选。
        </p>
        <div className="hn-panel hn-why">
          <h4>为什么是黑客松？</h4>
          <ul>
            <li>
              <b>它就是做项目。</b>考的正是开发者每天在做的事，评什么就学什么。
            </li>
            <li>
              <b>形式很新，很有未来感。</b>用 AI 在有限时间里把想法变成产品，这就是今天开发者真实的工作方式。
            </li>
            <li>
              <b>不只比算法。</b>选题、产品思维、写代码、团队协作、用 AI、上台展示，一场下来全都练到了。
            </li>
            <li>
              <b>能看见自己的成长。</b>做项目没法像考试一样打分，定期办黑客松，你就知道自己进步了多少。
            </li>
          </ul>
          <p className="hn-note">评审初步从完整度、创意与价值、技术实现、展示与答辩四个维度打分。做得好的项目可以组队继续打磨，参加正式赛事。</p>
        </div>
        <div className="hn-nocode">
          <h4>不会写代码也能来？</h4>
          <p>
            能。AI 降低了门槛，<b>文科生和其他院系的同学</b>也欢迎参加。很多好点子来自真正懂场景的人，跨专业组队本身就很有意思。
          </p>
          <span className="hn-tag">由学生自己组织运行</span>
        </div>
        <div className="hn-grid3">
          <Level lv="STEP 1" title="协会内部" body="先在协会里办几次。能完整做出一个项目，说明你已经有了程序设计的大局观。" />
          <Level lv="STEP 2" title="全校范围" body="扩展到全校，计划在八教找几间教室作场地，所有院系的同学都能报名。" />
          <Level lv="STEP 3" title="走出校园" body="办得好就邀请校外同学参加，请校外开发者来当评委。细节还在筹划中。" />
        </div>
      </Section>

      <Section id="hn-ai" eyebrow="AI · LEVEL UP" title="高效地用 AI，而不是“有 AI”" dots={3} diag>
        <p className="hn-sub">把题目丢给 AI、复制答案，你什么也学不到。我们想带你一级一级往上走，成为能驾驭 AI 的开发者。</p>
        <div className="hn-stair">
          <Level lv="LV.1" title="会用 AI" body="用 AI 答疑、解释代码，让它帮你学得更快。这是起点。" />
          <Level lv="LV.2" title="用好 Agent" body="用 Agent 工具拆解需求、写代码、跑测试、改错，完成真实的开发任务。" />
          <Level lv="LV.3" title="理解 Agent" body="弄懂工具调用、上下文、规划这些核心概念，知道 Agent 为什么能工作。" />
        </div>
        <div className="hn-grid2" style={{ marginTop: 18 }}>
          <div className="hn-panel">
            <span className="hn-tag">为什么是 AI</span>
            <p>校内的算法队和项目组已经很成熟；AI 赛道正在快速扩容，校内却还没有人系统耕耘。</p>
            <p className="hn-note">协会也不是从零起步：成员已在睿抗机器人开发者大赛 AI 视觉赛道获省三等奖，指导老师在华为 ICT 大赛方向有成熟的培养经验。</p>
          </div>
          <div className="hn-panel">
            <span className="hn-tag">学什么</span>
            <p>从公开课入门，了解什么是大模型、智能体、计算机视觉、机器人，以及怎样用 AI 编程助手辅助学习与开发。</p>
            <p className="hn-note">鼓励用 AI 答疑，但作业要自己写出来、通过自动评测。</p>
          </div>
        </div>
      </Section>

      <HonorsSection />

      <Section id="hn-path" eyebrow="YOUR YEAR · 你的第一年" title="从新生到参赛选手" dots={5}>
        <p className="hn-sub">这学期先把学习的氛围带起来。AI 类比赛集中在明年年初以后，到时候我们一起组队冲。</p>
        <div className="hn-path">
          <PathStep s="STAGE 1" title="进群认识我们" body="扫码进招新咨询群，了解各部门在做什么。" />
          <PathStep s="STAGE 2" title="听新生公开课" body="学长从学生视角讲大学四年计算机可以怎么学。" />
          <PathStep s="STAGE 3" title="开始共学" body="线上平台加线下晚自习，打卡、分享、答疑，养成习惯。" />
          <PathStep s="STAGE 4" title="找到方向" body="按兴趣走向算法、网络、项目、AI，组队备赛。" />
        </div>
        <div className="hn-cups">
          <span className="hn-mono">2027 · 瞄准</span>
          {["睿抗机器人开发者大赛", "华为 ICT 大赛", "中国高校计算机大赛", "阿里天池", "Kaggle"].map((t) => (
            <span key={t} className="hn-chip">
              {t}
            </span>
          ))}
        </div>
      </Section>

      <section className="hn-join" id="join" aria-labelledby="hn-join-h">
        <div>
          <div className="hn-mono">JOIN US · 加入我们</div>
          <h2 id="hn-join-h">
            不管零基础，
            <br />
            还是刷过几百道题
          </h2>
          <p className="hn-join-lede">只要愿意动手，这里都欢迎你。报名表就在协会介绍动画的结尾。</p>
          <div className="hn-cta">
            <a className="hn-btn" href={INTRO_PLAY_HREF}>
              <Icon name="play" size={18} />
              {playLabel}
            </a>
            <a className="hn-btn ghost" href={INTRO_MAP_HREF}>
              直接看地图
            </a>
          </div>
        </div>
        <ol aria-label="入会流程">
          {JOIN_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <footer className="hn-foot">
        <p className="hn-motto">
          拒绝空谈，行动至上；
          <br />
          专注实战，唯实惟先。
        </p>
        <p className="hn-note">
          {ASSOCIATION.name} · 信息与机电工程学院 · 指导老师：{ASSOCIATION.teachers.join("、")}
        </p>
      </footer>
    </div>
  );
}

/** 每一节的标题：方块图标（几个圆点）+ 英文小标 + 标题 */
function Section({ id, eyebrow, title, dots, row, diag, children }: { id: string; eyebrow: string; title: string; dots: number; row?: boolean; diag?: boolean; children: React.ReactNode }) {
  return (
    <section className="hn-s" id={id} aria-labelledby={id + "-h"}>
      <div className="hn-head">
        <Dots n={dots} row={row} diag={diag} />
        <div style={{ minWidth: 0 }}>
          <div className="hn-eyebrow">{eyebrow}</div>
          <h2 id={id + "-h"}>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

/** 方块图标上的圆点，像骰子：1 中间，2 对角，3 斜线（row 时一排），4 四角，5 四角加中间 */
function Dots({ n, row, diag }: { n: number; row?: boolean; diag?: boolean }) {
  const A = 8, M = 17, Z = 27;
  const at: Record<number, [number, number][]> = {
    1: [[M, M]],
    2: [[A, A], [Z, Z]],
    3: row ? [[A, M], [M, M], [Z, M]] : diag ? [[A, Z], [M, M], [Z, A]] : [[A, A], [M, M], [Z, Z]],
    4: [[A, A], [Z, A], [A, Z], [Z, Z]],
    5: [[A, A], [Z, A], [M, M], [A, Z], [Z, Z]],
  };
  return (
    <span className="hn-ico" aria-hidden="true">
      {at[n].map(([x, y], i) => (
        <i key={i} style={{ left: x, top: y }} />
      ))}
    </span>
  );
}

function Streams() {
  const ys = [30, 70, 110, 150, 190, 230, 270];
  return (
    <div className="hn-streams">
      <svg viewBox="0 0 420 300" role="img" aria-label="百川汇入大海">
        {ys.map((y, i) => (
          <path key={y} d={y === 150 ? "M0 150 L300 150" : `M0 ${y} C160 ${y}, 210 150, 300 150`} fill="none" stroke={y === 150 ? "var(--hn-light)" : i % 3 === 1 ? "var(--hn-accent)" : "var(--hn-mid)"} strokeWidth="5" />
        ))}
        <rect x="300" y="40" width="120" height="220" fill="var(--hn-accent)" />
        <text x="360" y="170" textAnchor="middle" fontWeight="700" fontSize="84" fill="var(--hn-deep)" style={{ fontFamily: "var(--font-sans)" }}>
          海
        </text>
        <text x="360" y="226" textAnchor="middle" fontWeight="700" fontSize="22" fill="var(--hn-deep)" style={{ fontFamily: "var(--font-mono)" }}>
          SEA
        </text>
      </svg>
    </div>
  );
}

function Stat({ k, v, unit, d }: { k: string; v: number; unit: string; d: string }) {
  return (
    <div className="hn-stat">
      <span className="k">{k}</span>
      <span className="v">
        {v}
        <small>{unit}</small>
      </span>
      <span className="d">{d}</span>
    </div>
  );
}

function Pain({ q, hl, body, ans }: { q: string; hl: string; body: string; ans: string }) {
  return (
    <div className="hn-panel hn-pain">
      <p className="q">
        {q}
        <span>{hl}</span>
      </p>
      <p>{body}</p>
      <div className="ans">
        <span className="hn-mono">我们的解法</span>
        {ans}
      </div>
    </div>
  );
}

function Step({ n, w, sub, body }: { n: string; w: string; sub: string; body: string }) {
  return (
    <div className="hn-step">
      <span className="n">{n}</span>
      <span className="w">
        {w}
        <small>{sub}</small>
      </span>
      <p>{body}</p>
    </div>
  );
}

function Level({ lv, title, body }: { lv: string; title: string; body: string }) {
  return (
    <div className="hn-panel">
      <span className="hn-lvl">{lv}</span>
      <h4>{title}</h4>
      <p>{body}</p>
    </div>
  );
}

function PathStep({ s, title, body }: { s: string; title: string; body: string }) {
  return (
    <div className="p">
      <span className="hn-mono">{s}</span>
      <h4>{title}</h4>
      <p>{body}</p>
    </div>
  );
}

/** 学生成就：国家级做成大卡片，其余按含金量列出来。/honors 跳到这里 */
function HonorsSection() {
  const stats = honorStats();
  const national = HONORS.filter((h) => h.level === "national");
  const provincial = HONORS.filter((h) => h.level === "provincial");
  return (
    <section className="hn-s" id="honors" aria-labelledby="honors-h">
      <div className="hn-head">
        <Dots n={4} />
        <div style={{ minWidth: 0 }}>
          <div className="hn-eyebrow">HONORS · 学生成就</div>
          <h2 id="honors-h">走项目路线，是行得通的</h2>
        </div>
      </div>
      <p className="hn-sub">
        {schoolAwardsText()}。下面列出协会在册成员的获奖（国家级 {stats.national} 项、省级 {stats.provincial} 项，{stats.people} 位成员上榜）。「实验室安全监测」项目先后拿下睿抗 AI 视觉应用省三等奖和湖南省大学生程序设计大赛省二等奖。
      </p>
      <div className="hn-grid2">
        {national.map((h, i) => (
          <article key={i} className="hn-nat">
            <span className="hn-tag">全国{h.rank === "国一" ? "一" : h.rank === "国二" ? "二" : "三"}等奖</span>
            <h4>{h.contest}</h4>
            {h.detail && <p className="hn-small">{h.detail}</p>}
            <p className="who">
              <b>{h.people.join("、")}</b>
              {h.team && <span className="hn-small">（团队成员）</span>}
              {h.date && <span className="hn-mono date">{h.date}</span>}
            </p>
          </article>
        ))}
      </div>
      <div className="hn-list">
        {provincial.map((h, i) => (
          <HonorRow key={i} h={h} />
        ))}
      </div>
      <p className="hn-note" style={{ marginTop: 10 }}>
        团队奖项只列协会成员，统计到 2026 年 10 月。
      </p>
    </section>
  );
}

function HonorRow({ h }: { h: Honor }) {
  const top = h.rank.endsWith("一") || h.rank.endsWith("二");
  return (
    <div className="hn-row">
      <span className={`rank${top ? " top" : ""}`}>{h.rank}</span>
      <span className="what">
        <span>{h.contest}</span>
        {h.detail && <span className="hn-small">{h.detail}</span>}
      </span>
      <span className="who">
        <b>{h.people.join("、")}</b>
        <span className="hn-small">{[h.team ? "团队" : null, h.date].filter(Boolean).join(" · ")}</span>
      </span>
    </div>
  );
}
