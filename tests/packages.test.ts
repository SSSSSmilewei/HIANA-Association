import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { withDefaults } from "../src/client/library";
import type { CoursePackage } from "../src/shared/package";

/** 源文件可以省略空数组；网页加载后要补齐，否则讲义页读 practice.length 会白屏（csdiy 前言就是这样） */
describe("课程包补默认值", () => {
  test("省略的 pages、videos、links、practice 补成空数组", () => {
    const raw = { format: "hiana-course@1", slug: "x", title: "X", modules: [{ id: "m", title: "M", items: [{ id: "a", kind: "reading", title: "A", periods: 1 }] }] };
    const pkg = withDefaults(raw as unknown as CoursePackage);
    const it = pkg.modules[0].items[0];
    expect(it.practice).toEqual([]);
    expect(it.pages).toEqual([]);
    expect(it.videos).toEqual([]);
    expect(it.links).toEqual([]);
    expect(pkg.links).toEqual([]);
  });

  test("仓库里所有课补齐后每个条目都有 practice", () => {
    for (const slug of readdirSync("content/courses")) {
      let raw: CoursePackage;
      try {
        raw = JSON.parse(readFileSync(`content/courses/${slug}/course.json`, "utf8"));
      } catch {
        continue;
      }
      for (const m of withDefaults(raw).modules) for (const it of m.items) expect(Array.isArray(it.practice)).toBe(true);
    }
  });
});
