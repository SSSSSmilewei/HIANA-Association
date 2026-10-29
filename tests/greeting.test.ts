import { describe, expect, test } from "bun:test";
import { COPY, SLOTS, WEEKDAYS, formatGreeting, pickGreeting, slotOf, stateOf } from "../src/client/greeting/pick";
import { safeNext } from "../src/client/session";

/** 固定的“随机数”：依次返回给定的值 */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe("首页欢迎语", () => {
  test("时段边界", () => {
    expect(slotOf(4, 59)).toBe("深夜");
    expect(slotOf(5, 0)).toBe("清晨");
    expect(slotOf(7, 59)).toBe("清晨");
    expect(slotOf(8, 0)).toBe("上午");
    expect(slotOf(11, 29)).toBe("上午");
    expect(slotOf(11, 30)).toBe("中午");
    expect(slotOf(14, 0)).toBe("下午");
    expect(slotOf(17, 30)).toBe("傍晚");
    expect(slotOf(19, 30)).toBe("夜晚");
    expect(slotOf(22, 59)).toBe("夜晚");
    expect(slotOf(23, 0)).toBe("深夜");
    expect(slotOf(0, 0)).toBe("深夜");
  });

  test("状态：久别 > 初来 > 其余；游客没有久别和初来", () => {
    const now = Date.parse("2026-10-27T12:00:00Z");
    expect(stateOf(true, undefined, now)).toBe("guest");
    expect(stateOf(false, null, now)).toBe("first");
    expect(stateOf(false, now - 8 * 86_400_000, now)).toBe("away");
    expect(stateOf(false, now - 7 * 86_400_000, now)).toBe("normal");
    expect(stateOf(false, now - 3_600_000, now)).toBe("normal");
  });

  test("久别、初来只从各自的文案里选，不走周几", () => {
    for (let i = 0; i < 20; i++) {
      expect(COPY.久别).toContain(pickGreeting({ state: "away", slot: "深夜", weekday: "周一", last: null }));
      expect(COPY.初来).toContain(pickGreeting({ state: "first", slot: "深夜", weekday: "周一", last: null }));
    }
  });

  test("其余：约 25% 取当天那句，否则取时段文案", () => {
    expect(pickGreeting({ state: "normal", slot: "深夜", weekday: "周六", last: null, rand: seq(0.1, 0) })).toBe("周末愉快");
    expect(pickGreeting({ state: "guest", slot: "深夜", weekday: "周日", last: null, rand: seq(0.2, 0) })).toBe("周日，慢一点");
    expect(COPY.时段.深夜).toContain(pickGreeting({ state: "normal", slot: "深夜", weekday: "周六", last: null, rand: seq(0.3, 0.5) }));
    // 大量抽样，比例接近 25%
    let day = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (pickGreeting({ state: "normal", slot: "上午", weekday: "周一", last: null }) === "周一快乐") day++;
    expect(day / n).toBeGreaterThan(0.2);
    expect(day / n).toBeLessThan(0.3);
  });

  test("不连续出现同一句", () => {
    for (const slot of SLOTS)
      for (const last of COPY.时段[slot])
        for (let i = 0; i < 10; i++) expect(pickGreeting({ state: "normal", slot, weekday: "周三", last, rand: Math.random })).not.toBe(last);
    // 当天那句刚出现过：退回时段文案
    expect(pickGreeting({ state: "normal", slot: "中午", weekday: "周三", last: "周三，过半了", forceWeekday: true })).not.toBe("周三，过半了");
    for (const last of COPY.久别) expect(pickGreeting({ state: "away", slot: "中午", weekday: "周三", last })).not.toBe(last);
  });

  test("文案文件完整，格式是“文案，名字”", () => {
    expect(Object.keys(COPY.时段).sort()).toEqual([...SLOTS].sort());
    expect(Object.keys(COPY.周几).sort()).toEqual([...WEEKDAYS].sort());
    expect(formatGreeting("夜猫子来了", "小明")).toBe("夜猫子来了，小明");
    expect(formatGreeting("周一快乐", "新朋友")).toBe("周一快乐，新朋友");
  });
});

describe("登录后跳回", () => {
  test("只接受站内路径", () => {
    expect(safeNext("/courses/git")).toBe("/courses/git");
    expect(safeNext("/notices?x=1")).toBe("/notices?x=1");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("/login?next=/x")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
});
