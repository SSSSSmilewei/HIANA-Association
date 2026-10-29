// 课程包 → 构建产物。课程源文件在 content/courses/<slug>/：course.json（hiana-course@1，正文留空）+ <页 id>.md。
//
//   content/catalog.json              轻量目录（不含介绍、正文和练习），网页和 Worker 打包用
//   <out>/learn/<slug>/course.json    去掉正文的完整课程（介绍、练习都在），课程页按需取
//   <out>/learn/<slug>/<页 id>.md      讲义正文
//   <out>/packages/<slug>.json         自包含的课程包（正文写进 body），“导出课程包”下载的就是它
//   <out>/schema/course-v1.json        课程包的 JSON Schema（content/schema/course-v1.json，测试会检查它是否过期）
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { light } from "../src/shared/light.ts";

export function readCourses(root) {
  const dir = join(root, "content/courses");
  const order = JSON.parse(readFileSync(join(dir, "order.json"), "utf8"));
  const all = readdirSync(dir).filter((s) => existsSync(join(dir, s, "course.json")));
  for (const s of all) if (!order.includes(s)) order.push(s);
  return order.filter((s) => all.includes(s)).map((s) => JSON.parse(readFileSync(join(dir, s, "course.json"), "utf8")));
}

export function writeCatalog(root, courses = readCourses(root)) {
  const json = JSON.stringify(courses.map(light)) + "\n";
  const p = join(root, "content/catalog.json");
  if (!existsSync(p) || readFileSync(p, "utf8") !== json) writeFileSync(p, json);
  return courses;
}

export function buildCourses(root, out, courses = readCourses(root)) {
  let pages = 0;
  for (const c of courses) {
    const src = join(root, "content/courses", c.slug);
    const dst = join(out, "learn", c.slug);
    mkdirSync(dst, { recursive: true });
    for (const f of readdirSync(src)) if (f.endsWith(".md")) cpSync(join(src, f), join(dst, f));
    writeFileSync(join(dst, "course.json"), JSON.stringify(c));
    const full = structuredClone(c);
    for (const m of full.modules ?? [])
      for (const it of m.items ?? [])
        for (const p of it.pages ?? []) {
          const f = join(src, `${p.id}.md`);
          if (existsSync(f)) p.body = readFileSync(f, "utf8");
          pages++;
        }
    mkdirSync(join(out, "packages"), { recursive: true });
    writeFileSync(join(out, "packages", `${c.slug}.json`), JSON.stringify(full, null, 1));
  }
  mkdirSync(join(out, "schema"), { recursive: true });
  cpSync(join(root, "content/schema/course-v1.json"), join(out, "schema/course-v1.json"));
  return pages;
}
