// 知识块 → 构建产物。源文件在 content/blocks/<slug>.json（hiana-block@1，见 src/shared/blocks.ts），顺序在 order.json。
//
//   <out>/data/blocks/index.json     列表（BlockSummary[]）
//   <out>/data/blocks/<slug>.json    补上课程名、条目名、课时的知识块
//   <out>/schema/block-v1.json       JSON Schema（content/schema/block-v1.json）
//
// 引用了不存在的课或条目时直接报错，构建失败。
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blockCourses, blockPeriods, hoursOf, periodsFromHours } from "../src/shared/blocks.ts";

export function readBlocks(root) {
  const dir = join(root, "content/blocks");
  if (!existsSync(dir)) return [];
  const order = JSON.parse(readFileSync(join(dir, "order.json"), "utf8"));
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "order.json")
    .map((f) => f.slice(0, -5));
  for (const s of all) if (!order.includes(s)) order.push(s);
  return order.filter((s) => all.includes(s)).map((s) => JSON.parse(readFileSync(join(dir, `${s}.json`), "utf8")));
}

/** 给课程节点补上 courseTitle、itemTitles、periods。courses 是 light() 之后的目录。 */
export function enrichBlock(block, courses) {
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const problems = [];
  const walk = (nodes, path) =>
    nodes.map((n, i) => {
      const here = `${path}.${i}`;
      if (n.children) return { ...n, children: walk(n.children, `${here}.children`) };
      if (!n.course) return n;
      const c = bySlug.get(n.course);
      if (!c) {
        problems.push(`${block.slug}${here}：没有这门课 ${n.course}`);
        return n;
      }
      const items = c.modules.flatMap((m) => m.items);
      let periods = items.reduce((a, it) => a + it.periods, 0);
      let itemTitles;
      if (n.items) {
        const picked = n.items.map((id) => items.find((it) => it.id === id));
        n.items.forEach((id, k) => picked[k] || problems.push(`${block.slug}${here}：${n.course} 里没有条目 ${id}`));
        itemTitles = picked.filter(Boolean).map((it) => it.title);
        periods = picked.filter(Boolean).reduce((a, it) => a + it.periods, 0);
      }
      if (!periods) periods = periodsFromHours(hoursOf(c.hours));
      return { ...n, courseTitle: c.title, ...(itemTitles ? { itemTitles } : {}), periods };
    });
  const nodes = walk(block.nodes, ".nodes");
  return { block: { ...block, nodes }, problems };
}

export function buildBlocks(root, out, courses) {
  const blocks = readBlocks(root);
  const slugs = new Set(blocks.map((b) => b.slug));
  const problems = [];
  const built = blocks.map((b) => {
    const r = enrichBlock(b, courses);
    problems.push(...r.problems);
    for (const s of b.next ?? []) if (!slugs.has(s)) problems.push(`${b.slug}.next：没有这个知识块 ${s}`);
    return r.block;
  });
  if (problems.length) throw new Error(`知识块有问题：\n${problems.join("\n")}`);
  const dir = join(out, "data/blocks");
  mkdirSync(dir, { recursive: true });
  for (const b of built) writeFileSync(join(dir, `${b.slug}.json`), JSON.stringify(b));
  const index = built.map((b) => ({ slug: b.slug, title: b.title, summary: b.summary ?? "", audience: b.audience, courses: blockCourses(b.nodes), periods: blockPeriods(b) }));
  writeFileSync(join(dir, "index.json"), JSON.stringify(index));
  const schema = join(root, "content/schema/block-v1.json");
  if (existsSync(schema)) {
    mkdirSync(join(out, "schema"), { recursive: true });
    cpSync(schema, join(out, "schema/block-v1.json"));
  }
  return built.length;
}
