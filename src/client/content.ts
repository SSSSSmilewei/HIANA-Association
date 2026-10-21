/**
 * 主线课程的周次安排（临时放在前端；内容管线做好后改为从 content/ 目录生成）。
 * 会长改 CURRENT_WEEK 就能切换首页上的“这周主线”。
 */

export interface Task {
  title: string;
  detail: string;
  href?: string;
}

export interface Week {
  title: string;
  summary: string;
  lectureCn: string; // B 站搜索结果页：国内能打开
  official: string;
  tasks: Task[];
}

const bili = (q: string) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`;
const OFFICIAL = "https://cs50.harvard.edu/x/";

function week(n: number, title: string, summary: string, tasks?: Task[]): Week {
  return {
    title,
    summary,
    lectureCn: bili(`CS50x Lecture ${n} 中文字幕`),
    official: OFFICIAL,
    tasks: tasks ?? [
      { title: `看第 ${n} 周讲座`, detail: "B 站中文字幕版或 YouTube 原版，可以分两次看", href: bili(`CS50x Lecture ${n} 中文字幕`) },
      { title: "读中文导读", detail: "导读还在整理，先跟着讲座和官方讲义学" },
      { title: "做本周作业", detail: "作业要求以官方课程页为准", href: OFFICIAL },
    ],
  };
}

export const MAIN_TRACK = {
  name: "CS50x",
  weeks: [
    week(0, "Scratch", "用积木编程，理解计算机怎么用 0 和 1 表示信息、算法是什么。"),
    week(1, "C 语言", "从 Scratch 的积木换成真正的代码。这周要学会写、编译、运行一个 C 程序，弄懂变量、条件和循环，最后交两个小作业。", [
      { title: "看第 1 周讲座", detail: "B 站中文字幕版或 YouTube 原版，约 2 小时，可以分两次看", href: bili("CS50x Lecture 1 C 中文字幕") },
      { title: "开发者素养：命令行入门", detail: "cd、ls、make 各是什么意思，为什么程序员离不开终端" },
      { title: "读中文导读：C 语言", detail: "编译是什么、printf、变量与类型、条件、循环" },
      { title: "作业 Mario", detail: "用 # 打印金字塔。国内版放在 Gitee，能用 GitHub 的同学也可以交官方版", href: OFFICIAL },
      { title: "作业 Cash", detail: "找零最少用几枚硬币，练习循环和整数运算", href: OFFICIAL },
    ]),
    week(2, "数组", "字符串其实是字符数组；理解编译的几个步骤和调试方法。"),
    week(3, "算法", "查找和排序，用大 O 比较算法快慢，认识递归。"),
    week(4, "内存", "指针、内存地址和文件读写，这是 C 语言最难也最关键的一周。"),
    week(5, "数据结构", "链表、树、哈希表，以及怎么在它们之间取舍。"),
    week(6, "Python", "换一门语言重写之前的程序，体会高级语言省了什么。"),
    week(7, "SQL", "用数据库存储和查询数据。"),
    week(8, "HTML、CSS、JavaScript", "网页是怎么组成和运行的。"),
    week(9, "Flask", "用 Python 写一个能交互的网站。"),
    week(10, "期末项目", "选一个自己想做的东西，从零做出来。"),
  ] as Week[],
};

export const CURRENT_WEEK = 1;
