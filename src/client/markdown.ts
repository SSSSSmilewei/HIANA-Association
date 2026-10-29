import hljs from "highlight.js/lib/common";
import { Marked } from "marked";

/**
 * Markdown → HTML（讲义、介绍、练手题）。这个模块按需加载（import("./markdown")），不进首屏。
 * 内容来自仓库、管理员发布的课程包或自己导入的课程包；原始 HTML 一律转义，不执行。
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 标题锚点：保留中文，去掉标点 */
export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  );
}

/** Markdown 里夹的 HTML：只留排版用的标签和少数属性，其余标签当文字显示 */
const TAGS = new Set("strong b em i u s del code kbd sub sup br hr p div span ul ol li table thead tbody tr td th details summary blockquote img a center small".split(" "));
const ATTRS = new Set(["href", "src", "alt", "title", "open", "colspan", "rowspan", "width", "height", "align"]);

function cleanHtml(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|[<>]/g, (m, close: string, tag: string, rest: string) => {
    if (!tag) return esc(m);
    const t = tag.toLowerCase();
    if (!TAGS.has(t)) return esc(m);
    if (close) return `</${t}>`;
    const attrs: string[] = [];
    for (const a of rest.matchAll(/([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      const name = a[1].toLowerCase();
      if (!ATTRS.has(name)) continue;
      const v = a[2] ?? a[3] ?? a[4] ?? "";
      attrs.push(`${name}="${esc(name === "href" || name === "src" ? safeUrl(v) : v)}"`);
    }
    if (t === "a" && attrs.some((x) => x.startsWith('href="http'))) attrs.push('target="_blank" rel="noreferrer"');
    if (t === "img") attrs.push('loading="lazy"');
    return `<${t}${attrs.length ? ` ${attrs.join(" ")}` : ""}${/\/\s*$/.test(rest) ? " /" : ""}>`;
  });
}

const safeUrl =(href: string) => (/^(https?:|mailto:|\/|#|\.)/i.test(href) || !/^[a-z][a-z0-9+.-]*:/i.test(href) ? href : "#");

/**
 * 中文里的 **加粗**：CommonMark 规定 ** 两边是标点、外侧紧挨汉字时不算强调（“**“引号”**的”这种），
 * 中文资料里很常见。先把成对的 ** 换成占位符，渲染后再换回 <strong>。
 */
function cjkStrong(md: string): string {
  return md.replace(/\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g, (m, inner: string) => (/[　-〿＀-￯“”‘’（）《》]/.test(m) ? `\u0001${inner}\u0002` : m));
}

function makeMarked() {
  const ids = new Map<string, number>();
  const m = new Marked({ gfm: true });
  m.use({
    hooks: {
      preprocess(md) {
        ids.clear();
        return cjkStrong(md);
      },
      postprocess(html) {
        return html
          .replace(/\u0001/g, "<strong>")
          .replace(/\u0002/g, "</strong>")
          .replace(/<table>/g, '<div class="table-wrap"><table>')
          .replace(/<\/table>/g, "</table></div>");
      },
    },
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        let id = headingId(html);
        const n = ids.get(id) ?? 0;
        ids.set(id, n + 1);
        if (n) id += `-${n}`;
        return `<h${depth} id="${esc(id)}"><a class="anchor" href="#${esc(id)}" aria-hidden="true">#</a>${html}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const l = (lang ?? "").split(/\s/)[0].toLowerCase();
        const body = l && l !== "mermaid" && hljs.getLanguage(l) ? hljs.highlight(text, { language: l, ignoreIllegals: true }).value : esc(text);
        return `<pre class="code"${l ? ` data-lang="${esc(l)}"` : ""}><code>${body}</code></pre>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const ext = /^https?:/.test(href);
        return `<a href="${esc(safeUrl(href))}"${title ? ` title="${esc(title)}"` : ""}${ext ? ' target="_blank" rel="noreferrer"' : ""}>${text}</a>`;
      },
      image({ href, title, text }) {
        return `<img src="${esc(safeUrl(href))}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
      },
      html({ text }) {
        return cleanHtml(text);
      },
    },
  });
  return m;
}

const marked = makeMarked();

/** 视频注释换成链接条；CS50 译文里紧跟着的“▶ 视频”链接去掉 */
function videos(md: string): string {
  return md.replace(/<!-- video: ([\w-]+) -->\s*(?:\[▶ 视频\]\([^)]*\)\s*)?/g, (_, id) => `[▶ YouTube 视频](https://www.youtube.com/watch?v=${id})\n\n`);
}

export function renderMarkdown(md: string): string {
  return marked.parse(videos(md), { async: false }) as string;
}

/** 行内（选项、短提示），不包 <p> */
export function renderInline(md: string): string {
  return marked.parseInline(cjkStrong(md), { async: false }) as string;
}
