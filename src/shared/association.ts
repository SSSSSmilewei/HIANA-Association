/**
 * 协会介绍和学生成就的内容。介绍取自协会社团总章程（2026 年 8 月；全称“智慧算法网络协会”，与章程标题一致，2026-10-31 确认），
 * 成就取自计科系成果统计表（2026.6）和协会成员参赛信息表（2026.5），只收协会在册成员的省级及以上成绩。
 * 改内容只改这里，页面不用动。
 */

export const ASSOCIATION = {
  name: "智慧算法网络协会",
  motto: "拒绝空谈，行动至上；专注实战，唯实惟先。",
  slogan: "用智慧驱动网络，以算法引领未来",
  school: "湖南涉外经济学院 · 信息与机电工程学院",
  founded: "2026 年 3 月",
  teachers: ["熊芳", "余力"],
};

export interface Direction {
  title: string;
  body: string;
}

export const DIRECTIONS: Direction[] = [
  { title: "算法设计", body: "算法基础培训、刷题训练和技术分享，每月一场部门内部算法赛，选拔队伍参加蓝桥杯、天梯赛等算法竞赛。" },
  { title: "网络规划", body: "备战网络类赛事：赛前集训、组队报名、赛后复盘，蓝桥杯 5G 全网规划与建设是协会的传统强项。" },
  { title: "人工智能开发", body: "从公开课入门 AI，做视觉、模型应用类项目，参加睿抗机器人开发者大赛、华为 ICT 大赛等 AI 赛道。" },
  { title: "信息安全实践", body: "网络安全基础与攻防练习，和网络方向一起组织技术交流与技能分享。" },
];

export interface Department {
  name: string;
  body: string;
}

/** 部门：和开场动画（intro/全部文案.md）一致，顺序也一样 */
export const DEPARTMENTS: Department[] = [
  { name: "综合网络部", body: "总揽各种学习和训练：赛事和培训的规划、学习系统的运营维护、每周的「海纳百川」分享，网络类赛事集训和网络安全攻防练习也在这里。" },
  { name: "项目部", body: "科创项目的立项、落地、研发、迭代。软件、机器学习、嵌入式都能做，按项目动态组队，老成员带新人。" },
  { name: "算法部", body: "算法学习与竞赛：从排序、搜索到数据结构、动态规划、图论，培训、刷题，优秀成员组队参加蓝桥杯、程序设计竞赛。" },
  { name: "宣传设计部", body: "文案、设计、新媒体与活动保障：招新海报、网页、活动记录，让协会做的事被更多人看到。" },
];

export interface Phase {
  title: string;
  body: string;
}

/** 一年怎么过：章程第二十条的三个阶段，加上常规活动 */
export const YEAR: Phase[] = [
  { title: "磨合组队，技术筑基", body: "有经验的成员当“技术火种”，带新人补基础、拆案例，定下协会的代码规范和协作流程。" },
  { title: "项目孵化，做出雏形", body: "一名老成员带几名新人组成攻坚小组，选有落地价值的题目，定期展示进度、请老师指导。" },
  { title: "全真模拟，冲刺比赛", body: "校内模拟路演与答辩，互评互测、反复打磨，冲刺各类计算机设计大赛。" },
];

/** 入会流程。报名表在开场动画（/intro/）的结尾 */
export const JOIN_STEPS = ["扫码进招新咨询群，了解各部门", "看完协会介绍动画，在结尾填写报名表", "管理层审核，部分部门需要面试，结果在群里公布", "进协会总群和部门群，登记建档，正式入会"];

/** 奖项等级：national 国家级，provincial 省级 / 赛区 */
export type HonorLevel = "national" | "provincial";

export interface Honor {
  /** 短标签，例如“国三”“省一” */
  rank: string;
  level: HonorLevel;
  contest: string;
  /** 赛道、组别或项目 */
  detail?: string;
  people: string[];
  /** 团队成绩里，这里列的只是协会成员 */
  team?: boolean;
  /** 年月，例如 "2026.04"；不确定就不填 */
  date?: string;
}

/** 按含金量从高到低排，页面按这个顺序展示 */
export const HONORS: Honor[] = [
  { rank: "国三", level: "national", contest: "团体程序设计天梯赛", detail: "团队赛", people: ["柳俊辉"], team: true, date: "2026.04" },
  { rank: "国三", level: "national", contest: "第十六届全国大学生计算机应用能力与数字素养大赛", detail: "信息技术基础赛道 · C 语言赛项", people: ["何文祺"], date: "2026.06" },
  { rank: "省一", level: "provincial", contest: "第十七届蓝桥杯全国软件和信息技术专业人才大赛", detail: "软件类 C/C++ 本科 B 组 · 湖南赛区", people: ["柳俊辉"], date: "2026.04" },
  { rank: "省二", level: "provincial", contest: "湖南省大学生程序设计大赛", detail: "项目：实验室安全监测", people: ["赵治成", "邵祥盛", "谢哲宇"], team: true, date: "2026.10" },
  { rank: "赛区二", level: "provincial", contest: "第 19 届中国大学生计算机设计大赛", detail: "中南地区赛", people: ["赵旭升"], team: true, date: "2026.05" },
  { rank: "省二", level: "provincial", contest: "第十七届蓝桥杯全国软件和信息技术专业人才大赛", detail: "5G 全网规划与建设大学组 · 湖南省赛", people: ["何文祺", "龙浩"], date: "2026.04" },
  { rank: "省二", level: "provincial", contest: "第十七届蓝桥杯全国软件和信息技术专业人才大赛", detail: "湖南赛区", people: ["胡玉鹏"], date: "2026.04" },
  { rank: "省二", level: "provincial", contest: "团体程序设计天梯赛", detail: "个人普及赛", people: ["柳俊辉"], date: "2026.04" },
  { rank: "赛区二", level: "provincial", contest: "第七届全国高校计算机能力挑战赛", detail: "数字媒体创新设计赛", people: ["陈欣仪"], date: "2025.12" },
  { rank: "赛区二", level: "provincial", contest: "第七届全国高校计算机能力挑战赛", detail: "AIGC 赛道 · 华中赛区本科组", people: ["孔熙琳"], team: true, date: "2025.11" },
  { rank: "省三", level: "provincial", contest: "2026 睿抗机器人开发者大赛（RAICOM）", detail: "AI 视觉应用 · 项目：实验室安全监测", people: ["赵治成"], date: "2026.07" },
  { rank: "省三", level: "provincial", contest: "第十七届蓝桥杯全国软件和信息技术专业人才大赛", detail: "5G 全网规划与建设大学组 · 湖南省赛", people: ["冯昱凯"], date: "2026.04" },
  { rank: "省三", level: "provincial", contest: "团体程序设计天梯赛", detail: "个人普及赛", people: ["李逸凡"], date: "2026.04" },
  { rank: "省三", level: "provincial", contest: "第十六届蓝桥杯全国软件和信息技术专业人才大赛", detail: "Java 软件开发大学 B 组 · 湖南赛区", people: ["刘伊萱"], date: "2025.05" },
];

/**
 * 学校整理的学生竞赛统计（全体学生，不只是协会成员）。协会页和开场动画的获奖数字以它为准；
 * 下面的 HONORS 只是协会在册成员的部分获奖，用来列具体奖项。
 */
export const SCHOOL_AWARDS = { period: "2020 年 10 月至 2026 年 6 月", national: 12, provincial: 82, total: 94 } as const;

export const schoolAwardsText = () =>
  `根据学校整理的学生竞赛统计（${SCHOOL_AWARDS.period}），学生共获得 ${SCHOOL_AWARDS.total} 项省级及以上奖项，其中国家级 ${SCHOOL_AWARDS.national} 项、省级 ${SCHOOL_AWARDS.provincial} 项`;

/** 协会在册成员的获奖：国家级几项、省级几项、多少位成员上榜 */
export function honorStats(list: Honor[] = HONORS) {
  return {
    national: list.filter((h) => h.level === "national").length,
    provincial: list.filter((h) => h.level === "provincial").length,
    people: new Set(list.flatMap((h) => h.people)).size,
  };
}
