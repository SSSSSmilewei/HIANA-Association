import { type Daily, cnDate, cnDateFromSeconds, countBySecond } from "../../shared/heatmap";

/**
 * 外部平台热力图数据源。每个 provider 只做一件事：
 * 给定用户在该平台的用户名，返回 { "YYYY-MM-DD": 次数 }（北京时间）。
 *
 * status 说明数据来源的可靠程度：
 *  - official：平台公开的官方 API
 *  - unofficial：平台网页自己用的接口或第三方服务，可能随时变化
 *  - pending：还没实测出可用的接口，调用会报错，界面上显示“暂不支持”
 *
 * fetch 由调用方传入，测试时可以换成假的。
 */

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface ProviderContext {
  fetch: Fetch;
  /** 只取这个时间之后的数据（Unix 秒），用来做增量同步和限制一年范围。 */
  sinceSeconds: number;
  /** 协会统一配置的密钥（Worker 设置里填）。 */
  secrets: { GITHUB_TOKEN?: string; WAKATIME_KEY?: string };
  /** 学员自己的令牌（例如墨墨背单词的开放 API 令牌），加密存在数据库里，同步时才解密传进来。 */
  userSecret?: string;
  /** 当前时间（毫秒），测试时可以固定。 */
  now?: number;
}

export interface Provider {
  id: string;
  label: string;
  unit: string;
  status: "official" | "unofficial" | "pending";
  category: "code" | "algo" | "english"; // 分组显示：写代码 / 刷题 / 英语
  handleHint: string; // 让学员填什么
  needsUserSecret?: string; // 需要学员自己提供令牌时，写清楚去哪里拿
  /**
   * history：接口能返回过去一年的完整数据；
   * snapshot：接口只给最近几天（或只有今天），平台每天同步一次自己攒历史，绑定之前的日子没有数据。
   */
  coverage: "history" | "snapshot";
  note: string; // 给会长看的说明
  fetchDaily(handle: string, ctx: ProviderContext): Promise<Daily>;
}

export class ProviderError extends Error {}

const UA = { "user-agent": "HIANA-Association heatmap (+https://github.com/SSSSSmilewei/HIANA-Association)" };

async function json<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new ProviderError(`${label} 返回 ${res.status}：${text.slice(0, 120)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProviderError(`${label} 返回的不是 JSON`);
  }
}

function checkHandle(handle: string, re = /^[A-Za-z0-9_.-]{1,64}$/): string {
  const h = handle.trim();
  if (!re.test(h)) throw new ProviderError("用户名格式不对");
  return h;
}

/* ---------- GitHub：官方 GraphQL，需要一个协会的 token ---------- */
export const github: Provider = {
  id: "github",
  label: "GitHub",
  unit: "次贡献",
  status: "official",
  category: "code",
  coverage: "history",
  handleHint: "GitHub 用户名",
  note: "官方 GraphQL 接口 contributionCalendar。需要在 Worker 设置里填一个 GITHUB_TOKEN（只读公开信息即可），一个 token 查所有人。",
  async fetchDaily(handle, ctx) {
    const login = checkHandle(handle, /^[A-Za-z0-9-]{1,39}$/);
    if (!ctx.secrets.GITHUB_TOKEN) throw new ProviderError("还没有设置 GITHUB_TOKEN");
    const from = new Date(ctx.sinceSeconds * 1000).toISOString();
    const query = `query($login:String!,$from:DateTime!){user(login:$login){contributionsCollection(from:$from){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
    const res = await ctx.fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...UA, authorization: `bearer ${ctx.secrets.GITHUB_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { login, from } }),
    });
    const data = await json<{
      data?: { user: { contributionsCollection: { contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } } } | null };
      errors?: { message: string }[];
    }>(res, "GitHub");
    if (data.errors?.length) throw new ProviderError(`GitHub：${data.errors[0].message}`);
    if (!data.data?.user) throw new ProviderError("GitHub 上找不到这个用户");
    const out: Daily = {};
    for (const w of data.data.user.contributionsCollection.contributionCalendar.weeks)
      for (const d of w.contributionDays) if (d.contributionCount > 0) out[d.date] = d.contributionCount;
    return out;
  },
};

/* ---------- 力扣（leetcode.cn） / LeetCode（leetcode.com） ---------- */
/** 两个站的 submissionCalendar 都是 JSON 字符串：{"<当天 0 点的 Unix 秒>": 次数} */
export function parseSubmissionCalendar(raw: string | null | undefined): Daily {
  if (!raw) return {};
  let obj: Record<string, number>;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new ProviderError("提交日历格式不对");
  }
  const out: Daily = {};
  for (const [ts, n] of Object.entries(obj)) {
    const sec = Number(ts);
    if (!Number.isFinite(sec) || !(n > 0)) continue;
    const k = cnDateFromSeconds(sec);
    out[k] = (out[k] ?? 0) + n;
  }
  return out;
}

function yearsSince(sinceSeconds: number): number[] {
  const start = new Date(sinceSeconds * 1000).getUTCFullYear();
  const end = new Date().getUTCFullYear();
  const ys: number[] = [];
  for (let y = start; y <= end; y++) ys.push(y);
  return ys;
}

export const leetcodeCn: Provider = {
  id: "leetcode-cn",
  label: "力扣",
  unit: "次提交",
  status: "unofficial",
  category: "algo",
  coverage: "history",
  handleHint: "力扣个人主页网址里 /u/ 后面那一段",
  note: "力扣网页自己用的 GraphQL（noj-go 端点的 userCalendar）。非官方，接口改了就会失效，需要上线前实测。",
  async fetchDaily(handle, ctx) {
    const slug = checkHandle(handle);
    const query = `query userProfileCalendar($userSlug:String!,$year:Int){userCalendar(userSlug:$userSlug,year:$year){submissionCalendar}}`;
    let out: Daily = {};
    for (const year of yearsSince(ctx.sinceSeconds)) {
      const res = await ctx.fetch("https://leetcode.cn/graphql/noj-go/", {
        method: "POST",
        headers: { ...UA, "content-type": "application/json", referer: `https://leetcode.cn/u/${slug}/` },
        body: JSON.stringify({ operationName: "userProfileCalendar", query, variables: { userSlug: slug, year } }),
      });
      const data = await json<{ data?: { userCalendar: { submissionCalendar: string } | null }; errors?: { message: string }[] }>(res, "力扣");
      if (data.errors?.length) throw new ProviderError(`力扣：${data.errors[0].message}`);
      if (!data.data?.userCalendar) throw new ProviderError("力扣上找不到这个用户");
      out = { ...out, ...parseSubmissionCalendar(data.data.userCalendar.submissionCalendar) };
    }
    return out;
  },
};

export const leetcode: Provider = {
  id: "leetcode",
  label: "LeetCode",
  unit: "次提交",
  status: "unofficial",
  category: "algo",
  coverage: "history",
  handleHint: "LeetCode（国际站）用户名",
  note: "leetcode.com 网页自己用的 GraphQL（matchedUser.userCalendar）。非官方。",
  async fetchDaily(handle, ctx) {
    const username = checkHandle(handle);
    const query = `query($username:String!,$year:Int){matchedUser(username:$username){userCalendar(year:$year){submissionCalendar}}}`;
    let out: Daily = {};
    for (const year of yearsSince(ctx.sinceSeconds)) {
      const res = await ctx.fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: { ...UA, "content-type": "application/json", referer: "https://leetcode.com/" },
        body: JSON.stringify({ query, variables: { username, year } }),
      });
      const data = await json<{ data?: { matchedUser: { userCalendar: { submissionCalendar: string } | null } | null }; errors?: { message: string }[] }>(res, "LeetCode");
      if (data.errors?.length) throw new ProviderError(`LeetCode：${data.errors[0].message}`);
      if (!data.data?.matchedUser) throw new ProviderError("LeetCode 上找不到这个用户");
      out = { ...out, ...parseSubmissionCalendar(data.data.matchedUser.userCalendar?.submissionCalendar) };
    }
    return out;
  },
};

/* ---------- Codeforces：官方 API user.status ---------- */
export const codeforces: Provider = {
  id: "codeforces",
  label: "Codeforces",
  unit: "次提交",
  status: "official",
  category: "algo",
  coverage: "history",
  handleHint: "Codeforces handle",
  note: "官方公开 API user.status，不需要 key。按提交时间计数（包括没通过的提交）。",
  async fetchDaily(handle, ctx) {
    const h = checkHandle(handle);
    const res = await ctx.fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(h)}&from=1&count=10000`, { headers: UA });
    const data = await json<{ status: string; comment?: string; result?: { creationTimeSeconds: number }[] }>(res, "Codeforces");
    if (data.status !== "OK") throw new ProviderError(`Codeforces：${data.comment ?? "查询失败"}`);
    return countBySecond((data.result ?? []).map((s) => s.creationTimeSeconds).filter((t) => t >= ctx.sinceSeconds));
  },
};

/* ---------- AtCoder：第三方 AtCoder Problems API ---------- */
export const atcoder: Provider = {
  id: "atcoder",
  label: "AtCoder",
  unit: "次提交",
  status: "unofficial",
  category: "algo",
  coverage: "history",
  handleHint: "AtCoder 用户名",
  note: "第三方 AtCoder Problems（kenkoooo.com）的 v3 接口，每次最多 500 条，按时间翻页。",
  async fetchDaily(handle, ctx) {
    const user = checkHandle(handle);
    const stamps: number[] = [];
    let from = ctx.sinceSeconds;
    for (let page = 0; page < 20; page++) {
      const res = await ctx.fetch(
        `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(user)}&from_second=${from}`,
        { headers: UA },
      );
      const batch = await json<{ epoch_second: number }[]>(res, "AtCoder Problems");
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const s of batch) stamps.push(s.epoch_second);
      const last = Math.max(...batch.map((s) => s.epoch_second));
      if (batch.length < 500 || last < from) break;
      from = last + 1;
    }
    return countBySecond(stamps);
  },
};

/* ---------- WakaTime：编辑器里写代码的时长（分钟） ---------- */
export const wakatime: Provider = {
  id: "wakatime",
  label: "WakaTime",
  unit: "分钟编程",
  status: "pending",
  category: "code",
  coverage: "snapshot",
  handleHint: "WakaTime 用户名（需公开统计）",
  note: "官方 API 可以拿每日编程时长，但每个人要在编辑器装插件。先留位置，确定要用再接。",
  async fetchDaily() {
    throw new ProviderError("WakaTime 暂未接入");
  },
};

/* ---------- 英语：墨墨背单词（官方开放 API，学员自己的令牌） ---------- */
export const maimemo: Provider = {
  id: "maimemo",
  label: "墨墨背单词",
  unit: "个单词",
  status: "official",
  category: "english",
  coverage: "snapshot",
  handleHint: "墨墨背单词里的昵称（只用来显示）",
  needsUserSecret: "在墨墨背单词 App：我的 → 更多设置 → 实验功能 → 开放 API，复制令牌",
  note: "官方开放 API 的“今日学习进度”（公测接口）。只能拿到当天的完成单词数和学习时长，平台每晚同步一次自己攒历史；学员要在 App 里开着自动同步。",
  async fetchDaily(_handle, ctx) {
    if (!ctx.userSecret) throw new ProviderError("还没有填墨墨背单词的开放 API 令牌");
    const res = await ctx.fetch("https://open.maimemo.com/open/api/v1/memo/study/get_study_progress", {
      method: "POST",
      headers: { ...UA, authorization: `Bearer ${ctx.userSecret}`, "content-type": "application/json" },
      body: "{}",
    });
    if (res.status === 401 || res.status === 403) throw new ProviderError("墨墨背单词令牌无效或已过期，请重新复制");
    const data = await json<{ success?: boolean; data?: { progress?: { finished?: number; total?: number; study_time?: number } }; errors?: { msg?: string }[] }>(res, "墨墨背单词");
    if (data.success === false) throw new ProviderError(`墨墨背单词：${data.errors?.[0]?.msg ?? "查询失败"}`);
    const finished = data.data?.progress?.finished ?? 0;
    const today = cnDate(ctx.now ?? Date.now());
    return finished > 0 ? { [today]: finished } : {};
  },
};

/* ---------- 英语：不背单词（个人主页公开数据） ---------- */
/**
 * 返回最近一段时间的每日数据，日期写成 "10-21" 或 "今日"，没有年份。
 * 补年份时：比今天晚的月日一定是去年的（跨年时最容易出错）。
 */
export function bbdcDate(raw: string, today: string): string | null {
  if (raw === "今日") return today;
  const m = raw.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const md = `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const year = Number(today.slice(0, 4));
  return md <= today.slice(5) ? `${year}-${md}` : `${year - 1}-${md}`;
}

export const bbdc: Provider = {
  id: "bbdc",
  label: "不背单词",
  unit: "个单词",
  status: "unofficial",
  category: "english",
  coverage: "snapshot",
  handleHint: "不背单词用户 ID（App 个人主页里的数字）",
  note: "不背单词个人主页用的公开接口（learnywhere.cn），返回最近几天的学习和复习单词数。非官方；平台每天同步，自己攒历史。",
  async fetchDaily(handle, ctx) {
    const id = checkHandle(handle, /^\d{1,20}$/);
    const res = await ctx.fetch(`https://learnywhere.cn/bb/dashboard/profile/search?userId=${id}`, { headers: UA });
    const data = await json<{
      result_code?: number;
      data_body?: { learnList?: { date: string; learnNum?: number; reviewNum?: number }[] };
    }>(res, "不背单词");
    if (data.result_code !== 200 || !data.data_body) throw new ProviderError("不背单词上找不到这个用户，或接口变了");
    const today = cnDate(ctx.now ?? Date.now());
    const out: Daily = {};
    for (const it of data.data_body.learnList ?? []) {
      const d = bbdcDate(String(it.date), today);
      const n = (it.learnNum ?? 0) + (it.reviewNum ?? 0);
      if (d && n > 0) out[d] = n;
    }
    return out;
  },
};

/* ---------- 英语：多邻国（网页接口，每日 XP） ---------- */
export const duolingo: Provider = {
  id: "duolingo",
  label: "多邻国",
  unit: "XP",
  status: "unofficial",
  category: "english",
  coverage: "history",
  handleHint: "多邻国用户名（个人主页网址最后一段）",
  note: "多邻国网页用的 xp_summaries 接口，按天返回获得的 XP。非官方，是否需要登录要上线前实测。",
  async fetchDaily(handle, ctx) {
    const username = checkHandle(handle);
    const found = await json<{ users?: { id: number }[] }>(
      await ctx.fetch(`https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`, { headers: UA }),
      "多邻国",
    );
    const id = found.users?.[0]?.id;
    if (!id) throw new ProviderError("多邻国上找不到这个用户");
    const start = cnDateFromSeconds(ctx.sinceSeconds);
    const data = await json<{ summaries?: { date: number; gainedXp?: number | null }[] }>(
      await ctx.fetch(`https://www.duolingo.com/2017-06-30/users/${id}/xp_summaries?startDate=${start}`, { headers: UA }),
      "多邻国",
    );
    const out: Daily = {};
    for (const s of data.summaries ?? []) if ((s.gainedXp ?? 0) > 0) out[cnDateFromSeconds(s.date)] = s.gainedXp as number;
    return out;
  },
};

/* ---------- 还没实测出可用接口的平台 ---------- */
function pending(id: string, label: string, unit: string, category: Provider["category"], handleHint: string, note: string): Provider {
  return {
    id,
    label,
    unit,
    status: "pending",
    category,
    coverage: "snapshot",
    handleHint,
    note,
    async fetchDaily() {
      throw new ProviderError(`${label} 暂不支持，接口还在测试`);
    },
  };
}

export const gitee = pending(
  "gitee",
  "Gitee",
  "次贡献",
  "code",
  "Gitee 个人空间地址（gitee.com/ 后面那一段）",
  "Gitee 个人主页有公开的贡献日历，但没有官方 API；已有开源项目读取它（merge-git-contribution），上线前要实测具体地址。备选：直接用 Gitee API v5 统计学员作业仓库的提交。",
);
export const luogu = pending(
  "luogu",
  "洛谷",
  "道题",
  "algo",
  "洛谷 UID（数字）",
  "社区整理的洛谷 API 文档里，新版 /user/:uid 页面数据疑似包含做题热度图，需要实测。",
);

export const shanbay = pending(
  "shanbay",
  "扇贝单词",
  "个单词",
  "english",
  "扇贝用户 ID",
  "扇贝的接口要登录 cookie，返回内容还经过编码，三个月左右过期一次，不适合让学员绑定。暂不考虑。",
);

export const PROVIDERS: Provider[] = [github, gitee, leetcodeCn, leetcode, codeforces, atcoder, luogu, maimemo, bbdc, duolingo, shanbay, wakatime];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** 站内学习记录（打卡、完成课时、提问、回答）不走 provider，直接从数据库按天汇总。 */
export const SITE_SOURCE = { id: "site", label: "协会平台", unit: "次学习记录" } as const;
