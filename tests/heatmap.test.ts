import { describe, expect, test } from "bun:test";
import {
  addDays,
  buildGrid,
  cnDate,
  cnDateFromSeconds,
  countBySecond,
  idleFor,
  levelScale,
  overview,
  weekdayMon0,
} from "../src/shared/heatmap";
import { type Fetch, type ProviderContext, atcoder, codeforces, github, gitee, leetcode, leetcodeCn, parseSubmissionCalendar } from "../src/worker/heatmap/providers";
import { sanitize, syncBindings } from "../src/worker/heatmap/sync";

const SINCE = Date.parse("2026-01-01T00:00:00+08:00") / 1000;

function fakeFetch(handler: (url: string, init?: RequestInit) => unknown, status = 200): Fetch & { calls: { url: string; body?: unknown }[] } {
  const calls: { url: string; body?: unknown }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const payload = handler(url, init);
    return new Response(typeof payload === "string" ? payload : JSON.stringify(payload), { status });
  }) as Fetch & { calls: typeof calls };
  f.calls = calls;
  return f;
}

const ctx = (fetch: Fetch, secrets: ProviderContext["secrets"] = {}): ProviderContext => ({ fetch, sinceSeconds: SINCE, secrets });

describe("日期", () => {
  test("北京时间跨日：UTC 16:00 已经是第二天", () => {
    expect(cnDate(Date.parse("2026-10-20T15:59:59Z"))).toBe("2026-10-20");
    expect(cnDate(Date.parse("2026-10-20T16:00:00Z"))).toBe("2026-10-21");
  });
  test("周一为一周第一天", () => {
    expect(weekdayMon0("2026-10-19")).toBe(0); // 周一
    expect(weekdayMon0("2026-10-25")).toBe(6); // 周日
  });
  test("加减天数跨月跨年", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  test("按秒计数", () => {
    const t = Date.parse("2026-10-21T10:00:00+08:00") / 1000;
    expect(countBySecond([t, t + 60, t + 86400])).toEqual({ "2026-10-21": 2, "2026-10-22": 1 });
  });
});

describe("网格与分档", () => {
  test("没有活动全是 0 档", () => {
    expect(levelScale({})(5)).toBe(0);
  });
  test("按四分位分 1–4 档", () => {
    const s = levelScale({ a: 1, b: 2, c: 3, d: 10 });
    expect(s(0)).toBe(0);
    expect(s(1)).toBe(1);
    expect(s(10)).toBe(4);
  });
  test("53 周、周一开头、最后一天之后的格子不算", () => {
    const g = buildGrid({ "2026-10-21": 3, "2026-10-20": 1 }, "2026-10-21");
    expect(g.weeks).toHaveLength(53);
    expect(g.weeks[0][0].date).toBe(g.from);
    expect(weekdayMon0(g.from)).toBe(0);
    const last = g.weeks.at(-1)!;
    expect(last[2].date).toBe("2026-10-21"); // 周三
    expect(last[2].count).toBe(3);
    expect(last[3].inRange).toBe(false);
    expect(g.activeDays).toBe(2);
    expect(g.total).toBe(4);
  });
  test("总览：取最深一档，count 是活跃来源数，失败来源不参与", () => {
    const g = overview(
      [
        { source: "a", label: "A", unit: "", days: { "2026-10-21": 1, "2026-10-01": 9 } },
        { source: "b", label: "B", unit: "", days: { "2026-10-21": 5 } },
        { source: "c", label: "C", unit: "", days: { "2026-10-21": 99 }, error: "挂了" },
      ],
      "2026-10-21",
    );
    const cell = g.weeks.at(-1)![2];
    expect(cell.count).toBe(2);
    expect(cell.level).toBe(4); // B 只有一天，那天是它的最高档
  });
  test("最近 7 天没动静", () => {
    const s = [{ source: "a", label: "A", unit: "", days: { "2026-10-10": 1 } }];
    expect(idleFor(s, "2026-10-21", 7)).toBe(true);
    expect(idleFor(s, "2026-10-15", 7)).toBe(false);
  });
});

describe("GitHub", () => {
  test("解析 contributionCalendar 并带上 token", async () => {
    const f = fakeFetch(() => ({
      data: {
        user: {
          contributionsCollection: {
            contributionCalendar: {
              weeks: [{ contributionDays: [{ date: "2026-10-20", contributionCount: 0 }, { date: "2026-10-21", contributionCount: 4 }] }],
            },
          },
        },
      },
    }));
    expect(await github.fetchDaily("octocat", ctx(f, { GITHUB_TOKEN: "t" }))).toEqual({ "2026-10-21": 4 });
    expect((f.calls[0].body as { variables: { login: string } }).variables.login).toBe("octocat");
  });
  test("没有 token 时报清楚的错", async () => {
    await expect(github.fetchDaily("octocat", ctx(fakeFetch(() => ({}))))).rejects.toThrow("GITHUB_TOKEN");
  });
  test("用户不存在", async () => {
    await expect(github.fetchDaily("nobody", ctx(fakeFetch(() => ({ data: { user: null } })), { GITHUB_TOKEN: "t" }))).rejects.toThrow("找不到");
  });
  test("非法用户名不发请求", async () => {
    const f = fakeFetch(() => ({}));
    await expect(github.fetchDaily("a b", ctx(f, { GITHUB_TOKEN: "t" }))).rejects.toThrow("格式");
    expect(f.calls).toHaveLength(0);
  });
});

describe("力扣 / LeetCode", () => {
  const day = Date.parse("2026-10-21T00:00:00Z") / 1000; // 站点用 UTC 0 点作为键
  test("submissionCalendar 是 JSON 字符串", () => {
    expect(parseSubmissionCalendar(JSON.stringify({ [day]: 3, [day - 86400]: 0 }))).toEqual({ "2026-10-21": 3 });
    expect(parseSubmissionCalendar(null)).toEqual({});
    expect(() => parseSubmissionCalendar("{oops")).toThrow();
  });
  test("力扣：按年份请求 noj-go 端点", async () => {
    const f = fakeFetch(() => ({ data: { userCalendar: { submissionCalendar: JSON.stringify({ [day]: 2 }) } } }));
    const out = await leetcodeCn.fetchDaily("some-slug", ctx(f));
    expect(out["2026-10-21"]).toBe(2);
    expect(f.calls[0].url).toBe("https://leetcode.cn/graphql/noj-go/");
  });
  test("LeetCode 国际站：用户不存在", async () => {
    await expect(leetcode.fetchDaily("nobody", ctx(fakeFetch(() => ({ data: { matchedUser: null } }))))).rejects.toThrow("找不到");
  });
});

describe("Codeforces", () => {
  test("按提交时间计数，过滤掉范围之前的", async () => {
    const t = Date.parse("2026-10-21T20:00:00+08:00") / 1000;
    const f = fakeFetch(() => ({ status: "OK", result: [{ creationTimeSeconds: t }, { creationTimeSeconds: t + 10 }, { creationTimeSeconds: SINCE - 100 }] }));
    expect(await codeforces.fetchDaily("tourist", ctx(f))).toEqual({ "2026-10-21": 2 });
  });
  test("API 返回 FAILED", async () => {
    const f = fakeFetch(() => ({ status: "FAILED", comment: "handle: User with handle x not found" }));
    await expect(codeforces.fetchDaily("x", ctx(f))).rejects.toThrow("not found");
  });
});

describe("AtCoder", () => {
  test("满 500 条时翻页", async () => {
    const base = Date.parse("2026-10-01T12:00:00+08:00") / 1000;
    let page = 0;
    const f = fakeFetch(() => {
      page++;
      if (page === 1) return Array.from({ length: 500 }, (_, i) => ({ epoch_second: base + i }));
      return [{ epoch_second: base + 86400 }];
    });
    const out = await atcoder.fetchDaily("chokudai", ctx(f));
    expect(out).toEqual({ "2026-10-01": 500, "2026-10-02": 1 });
    expect(f.calls).toHaveLength(2);
    expect(f.calls[1].url).toContain(`from_second=${base + 500}`);
  });
});

describe("同步", () => {
  test("一个平台失败不影响其他平台", async () => {
    const t = Date.parse("2026-10-21T20:00:00+08:00") / 1000;
    const f = fakeFetch((url) => (url.includes("codeforces") ? { status: "OK", result: [{ creationTimeSeconds: t }] } : "boom"));
    const now = Date.parse("2026-10-21T22:00:00+08:00");
    const out = await syncBindings(
      [
        { source: "codeforces", handle: "tourist" },
        { source: "gitee", handle: "someone" },
        { source: "nope", handle: "x" },
      ],
      ctx(f),
      now,
    );
    expect(out[0].error).toBeUndefined();
    expect(out[0].days).toEqual({ "2026-10-21": 1 });
    expect(out[1].error).toContain("暂不支持");
    expect(out[2].error).toBe("未知的平台");
  });
  test("清洗：去掉未来、太早、非法的值", () => {
    expect(sanitize({ "2026-10-21": 2, "2027-01-01": 3, "2020-01-01": 1, bad: 1, "2026-10-20": -1 }, "2026-10-21")).toEqual({ "2026-10-21": 2 });
  });
  test("gitee 现在明确标为暂不支持", async () => {
    await expect(gitee.fetchDaily("x", ctx(fakeFetch(() => ({}))))).rejects.toThrow("暂不支持");
  });
  test("cnDateFromSeconds 与 cnDate 一致", () => {
    const ms = Date.parse("2026-10-21T23:30:00+08:00");
    expect(cnDateFromSeconds(ms / 1000)).toBe(cnDate(ms));
  });
});
