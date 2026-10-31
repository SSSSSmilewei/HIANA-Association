import { useState } from "react";
import { FORMAT, ITEM_KIND_LABEL, ITEM_KINDS, LINK_KIND_LABEL, LINK_KINDS } from "../../shared/light";
import { ImportCourse } from "../components/ImportCourse";
import { Icon } from "../icons";
import { downloadJson } from "../library";
import { Link } from "../router";
import { useTitle, useToast } from "../ui";

/**
 * 课程包格式说明：自己出一门课，或者让 AI 把一门公开课整理成课程包，导入就能学。
 * 常量从 shared/light 取（不带 zod）；校验器在导入时才加载。
 */

const EXAMPLE = {
  format: FORMAT,
  slug: "my-first-course",
  title: "我的第一门课",
  titleEn: "My First Course",
  category: "编程入门",
  provider: "某某大学",
  instructors: ["张老师"],
  language: "Python",
  prerequisites: "无",
  difficulty: 1,
  hours: "20 小时",
  summary: "一句话说清楚这门课学什么。",
  tags: ["python"],
  license: "讲义 CC BY-NC-SA 4.0",
  intro: {
    community: "## 为什么推荐\n\n爱好者写的中文介绍（Markdown）。",
    communitySource: { kind: "website", label: "某某笔记", url: "https://example.com/" },
    official: "官方课程介绍的中文翻译。",
    officialSource: { kind: "website", label: "课程官网", url: "https://example.edu/course" },
  },
  links: [
    { kind: "website", label: "课程官网", url: "https://example.edu/course" },
    { kind: "video", label: "B 站中文字幕", url: "https://www.bilibili.com/" },
  ],
  modules: [
    {
      id: "week-1",
      title: "第 1 周：起步",
      items: [
        {
          id: "w1-lecture",
          kind: "lecture",
          title: "第 1 讲：变量和输出",
          periods: 2,
          pages: [{ id: "w1-notes", title: "讲义", body: "# 变量\n\n正文用 Markdown。" }],
          videos: [{ kind: "video", label: "讲座视频", url: "https://www.youtube.com/" }],
          practice: [
            { id: "q1", type: "choice", prompt: "`print(1 + 1)` 输出什么？", options: ["11", "2", "1 + 1"], answer: 1, explain: "整数相加。" },
            { id: "q2", type: "text", prompt: "Python 里输出用哪个函数？", answer: ["print", "print()"] },
          ],
        },
        {
          id: "w1-hw",
          kind: "assignment",
          title: "作业 1：Hello",
          periods: 2,
          submit: { kind: "assignments", label: "GitHub Classroom", url: "https://classroom.github.com/" },
          practice: [
            {
              id: "hello",
              type: "code",
              lang: "python",
              title: "Hello, 名字",
              prompt: "读一行名字，输出 `hello, 名字`。",
              starter: "name = input()\n",
              tests: [
                { name: "英文名", stdin: "Alice\n", stdout: "hello, Alice\n" },
                { name: "中文名", stdin: "小明\n", stdout: "hello, 小明\n" },
              ],
              solution: 'print(f"hello, {input()}")',
            },
          ],
        },
      ],
    },
  ],
};

const PROMPT = `你是课程整理助手。把我给你的公开课资料整理成一个 hiana-course@1 格式的 JSON 课程包。只输出 JSON，不要解释。

规则：
1. 顶层字段：format 固定为 "hiana-course@1"；slug 用小写字母、数字、连字符（2–48 个字符）；title 用中文名，titleEn 写原名；category 写分类（如“编程入门”“系统”“人工智能”）；provider 写学校或机构；language、prerequisites、hours、summary（一句话，不超过 300 字）、license（原课程的许可，例如“© MIT，CC BY-NC-SA 4.0”）。difficulty 是 0–5 的整数。
2. intro.community：中文爱好者写的介绍（有现成的就引用，并在 communitySource 写出处）；intro.official：官方介绍的忠实中文翻译，officialSource 写官方页面。正文都是 Markdown。
3. links：课程级的链接，每个是 {kind, label, url}。kind 只能是：${LINK_KINDS.join("、")}。
4. modules：按周 / 章 / 主题分模块；课程有“单元 → 部分”两层时（例如 MIT 18.01），模块写 group（单元名），相邻模块写同一个 group。每个模块的 items 是条目，kind 只能是：${ITEM_KINDS.join("、")}（section 是讨论课 / 习题课）。periods 是预计课时（45 分钟一节）；官方标明“推荐 / 可选”的条目写 "optional": true。
   练手题尽量从官方作业、习题改编（注明出处），官方没有的再出复习题。
5. 条目的 pages 是站内正文（Markdown，写在 body 里）；videos 是视频链接；links 是参考链接；作业和实验写 submit（正式提交的地址，例如 GitHub Classroom、Gradescope、submit50）。
6. practice 是练手题，浏览器里自动判：
   - 选择：{"id","type":"choice","prompt","options":[...],"answer":下标或下标数组,"explain"}
   - 填空：{"id","type":"text","prompt","answer":["所有可接受的写法"]}（比较时忽略大小写和首尾空白）
   - 代码（Python / JavaScript）：{"id","type":"code","lang":"python","prompt","starter","tests":[{"name","stdin","stdout"}],"solution"}，程序从标准输入读、向标准输出写，至少 4 个测试。JavaScript 用 readLine() 读一行、console.log 输出。
   - SQL（SQLite）：{"id","type":"code","lang":"sql","prompt","setup":"建表和数据","starter","solution":"参考查询","ordered":是否要求顺序}
   - 每道题写 origin："official"（从官方作业、习题改编，优先）或 "review"（官方没有时自己出的复习题）。
7. 所有 id 用小写字母、数字、连字符；同一门课里条目 id、页面 id 不能重复。
8. 不要编造链接；不确定的字段留空字符串或省略。

资料：
（把课程官网的大纲、介绍、讲义文本贴在这里）`;

const FIELDS: [string, string][] = [
  ["intro.community", "中文介绍：爱好者写的推荐和学习建议（例如 csdiy.wiki 的介绍）"],
  ["intro.official", "官方介绍的中文翻译"],
  ["links", "课程级资源：官网、视频、讲义、教材、作业、实验、论坛、代码仓库、中文资料"],
  ["modules[].group", "可选：模块上面再分一层（例如 MIT 18.01 的“单元 1：求导”）"],
  ["modules[].items[]", "条目：讲义、讨论课、阅读、视频、作业、实验、项目、测验、考试；optional 表示选学"],
  ["items[].pages", "站内正文（Markdown），一个条目可以有多页（讲义、笔记、题面）"],
  ["items[].submit", "作业 / 实验的正式提交地址（GitHub、Gradescope、submit50……）"],
  ["items[].practice", "练手题：选择、填空、代码（Python / JavaScript / SQL），在浏览器里判"],
];

export function FormatPage() {
  useTitle("课程包格式");
  const toast = useToast();
  const [importing, setImporting] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      toast("已复制");
    } catch {
      toast("复制失败，手动选中复制吧", "error");
    }
  };
  return (
    <div className="page doc-page">
      <Link to="/courses" className="back-link">
        <Icon name="arrowLeft" size={16} stroke={2} />
        课程
      </Link>
      <header className="stack" style={{ gap: 8 }}>
        <h1 className="h1">课程包格式</h1>
        <p className="lead pretty">一门课的全部内容放进一个 JSON 文件：介绍、资源、讲义、作业、练手题。自己写，或者让 AI 帮你整理，导入就能学。</p>
        <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>
            <Icon name="plus" size={16} />
            导入课程包
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => downloadJson("example.hiana-course.json", EXAMPLE)}>
            <Icon name="download" size={16} />
            示例
          </button>
          <a className="btn btn-ghost" href="/schema/course-v1.json" download>
            <Icon name="download" size={16} />
            JSON Schema
          </a>
        </div>
      </header>

      <section className="section" aria-labelledby="f-struct">
        <h2 id="f-struct" className="h2">
          结构
        </h2>
        <pre className="code tree">
          <code>{`课程
├─ 基本信息   标题、原名、分类、学校、先修、语言、难度、学时、许可
├─ 介绍       中文介绍（爱好者）· 官方介绍（中文翻译）
├─ 资源       官网、视频、教材、作业、实验……
└─ 模块       周 / 章 / 主题（可以再按单元分组）
   └─ 条目    讲义 · 讨论课 · 阅读 · 视频 · 作业 · 实验 · 项目 · 测验 · 考试
      ├─ 正文      Markdown，可以多页
      ├─ 视频、链接、正式提交地址
      └─ 练手题    选择 · 填空 · 代码`}</code>
        </pre>
        <dl className="field-table">
          {FIELDS.map(([k, v]) => (
            <div key={k}>
              <dt className="mono">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="grid-2">
          <div className="stack" style={{ gap: 8 }}>
            <h3 className="h3">条目类型</h3>
            <p className="small">
              {ITEM_KINDS.map((k) => (
                <span key={k} className="kv">
                  <code>{k}</code> {ITEM_KIND_LABEL[k]}
                </span>
              ))}
            </p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <h3 className="h3">链接类型</h3>
            <p className="small">
              {LINK_KINDS.map((k) => (
                <span key={k} className="kv">
                  <code>{k}</code> {LINK_KIND_LABEL[k]}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="f-ai">
        <div className="section-head">
          <h2 id="f-ai" className="h2">
            让 AI 整理一门课
          </h2>
          <button type="button" className="btn btn-quiet btn-sm" onClick={copy}>
            复制提示词
          </button>
        </div>
        <p className="pretty">把下面的提示词和课程资料（官网大纲、介绍、讲义）一起发给 AI，把它输出的 JSON 导入进来。格式不对的地方导入时会逐条列出，贴回给 AI 让它改。</p>
        <pre className="code prompt">
          <code>{PROMPT}</code>
        </pre>
      </section>

      <section className="section" aria-labelledby="f-where">
        <h2 id="f-where" className="h2">
          导入之后
        </h2>
        <ul className="plain-list">
          <li>
            <strong>存到这台设备：</strong>谁都可以，进度存在浏览器里，换设备就没了。
          </li>
          <li>
            <strong>发布给所有人：</strong>管理员可以把课程包发布到站内，所有人都能选课、记进度。
          </li>
          <li>
            <strong>导出：</strong>每门课的页面底部都能导出课程包，改完再导入。
          </li>
        </ul>
      </section>

      <section className="section" aria-labelledby="f-block">
        <div className="section-head">
          <h2 id="f-block" className="h2">
            知识块
          </h2>
          <a className="btn btn-quiet btn-sm" href="/schema/block-v1.json" download>
            JSON Schema
          </a>
        </div>
        <p className="pretty">知识块（hiana-block@1）是一个方向的路线图，只引用课程，不复制内容。目前放在仓库的 content/blocks/ 里。</p>
        <pre className="code tree">
          <code>{`知识块
├─ 基本信息   标题、一句话、适合谁、介绍
├─ 节点
│  ├─ 分组    标题 + 子节点；pick: N 表示几门里选 N 门，optional 表示选学
│  ├─ 课程    course: 课程 slug；items: 只看其中几个条目；note: 一句话
│  └─ 链接    书、网站
└─ next       学完以后去哪个知识块`}</code>
        </pre>
      </section>
      {importing && <ImportCourse onClose={() => setImporting(false)} />}
    </div>
  );
}
