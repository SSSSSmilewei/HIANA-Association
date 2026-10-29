// 打包前端到 dist/client：esbuild 打包 React 和样式，复制 public/，生成 index.html。
// Worker 本身由 wrangler deploy 打包，不在这里处理。
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCourses, writeCatalog } from "./courses.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist/client");
// 只清空目录里的东西，不删目录本身：wrangler dev 在盯着这个目录
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) rmSync(join(out, f), { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });

// 课程目录要先生成，网页和 Worker 都会打包它
const courses = writeCatalog(root);

const result = await build({
  entryPoints: { app: join(root, "src/client/main.tsx") },
  bundle: true,
  format: "esm",
  splitting: true, // 讲义渲染器（marked + highlight.js）单独成块，打开讲义时才加载
  minify: true,
  sourcemap: true,
  target: ["es2022", "safari16"],
  jsx: "automatic",
  outdir: join(out, "assets"),
  entryNames: "[name]-[hash]",
  chunkNames: "chunks/[name]-[hash]",
  assetNames: "[name]-[hash]",
  loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" },
  external: ["/fonts/*"], // public/ 下的字体按原路径提供
  define: { "process.env.NODE_ENV": '"production"' },
  metafile: true,
  logLevel: "warning",
});

if (existsSync(join(root, "public"))) cpSync(join(root, "public"), out, { recursive: true });
const pageCount = buildCourses(root, out, courses);

const outputs = Object.keys(result.metafile.outputs).map((p) => p.replace(/\\/g, "/"));
const js = outputs.find((p) => /assets\/app-[^/]+\.js$/.test(p));
const css = outputs.find((p) => /assets\/app-[^/]+\.css$/.test(p));
const rel = (p) => `/${p.slice(p.indexOf("assets/"))}`;

writeFileSync(
  join(out, "index.html"),
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f6f5f3">
<meta name="color-scheme" content="light dark">
<script>(function(){var r=document.documentElement,s="glass",a="nord",d=false,css=[];try{var p=JSON.parse(localStorage.getItem("hiana-prefs")||"{}");if(p.skin==="classic")s="classic";if(/^[a-z-]+$/.test(p.palette||""))a=p.palette;d=p.theme==="dark"||(p.theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);if(p.customCss)css.push(["hiana-custom",p.customCss]);if(p.fontCss){if(p.fontCss.sans)css.push(["hiana-font-sans",p.fontCss.sans]);if(p.fontCss.mono)css.push(["hiana-font-mono",p.fontCss.mono])}}catch(e){}for(var i=0;i<css.length;i++){var t=document.createElement("style");t.id=css[i][0];t.textContent=css[i][1];document.head.appendChild(t)}r.setAttribute("data-skin",s);r.setAttribute("data-palette",a);r.setAttribute("data-mode",d?"dark":"light");var c=getComputedStyle(r).getPropertyValue("--bg").trim()||(d?"#0e0d0c":"#f6f5f3");document.querySelector('meta[name="theme-color"]').setAttribute("content",c)})()</script>
<meta name="robots" content="noindex">
<title>海纳协会学习平台</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/sarasa/gothic-400.0.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/sarasa/gothic-400.1.woff2" as="font" type="font/woff2" crossorigin>
${css ? `<link rel="stylesheet" href="${rel(css)}">` : ""}
<script type="module" src="${rel(js)}"></script>
</head>
<body>
<div id="root"></div>
<noscript>这个网站需要开启 JavaScript。</noscript>
</body>
</html>
`,
);

const size = (p) => (result.metafile.outputs[p]?.bytes / 1024).toFixed(0);
console.log(`前端已打包：${rel(js)} (${size(js)} KB)${css ? `，${rel(css)} (${size(css)} KB)` : ""}，${courses.length} 门课、${pageCount} 页讲义`);
