import hljs from "highlight.js/lib/common";
import { Marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Markdown → HTML（讲义、介绍、练手题）。这个模块按需加载（import("./markdown")），不进首屏。
 * 内容来自仓库、管理员发布的课程包或自己导入的课程包；最终 HTML 统一经过 DOMPurify。
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

/** URL 先按浏览器规则解析，避免 java\tscript: 等混淆写法绕过协议检查。 */
function safeUrl(href: string, image = false): string {
  if (/[\u0000-\u0020\u007f\\]/.test(href) || href.startsWith("//")) return "#";
  try {
    const { protocol } = new URL(href, "https://course.invalid/");
    return protocol === "https:" || protocol === "http:" || (!image && protocol === "mailto:") ? href : "#";
  } catch {
    return "#";
  }
}

// 在完整渲染结果上过滤，覆盖原始 HTML、Markdown 链接、图片以及行内选项。
// 不允许脚本、样式、表单、iframe、SVG/MathML 和事件属性。
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  for (const attr of ["href", "src"]) {
    const value = node.getAttribute(attr);
    if (value !== null && safeUrl(value, attr === "src") === "#" && value !== "#") node.removeAttribute(attr);
  }
  if (node.tagName === "A") {
    node.removeAttribute("target");
    node.removeAttribute("rel");
    if (/^https?:/i.test(node.getAttribute("href") ?? "")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  }
  if (node.tagName === "IMG") node.setAttribute("loading", "lazy");
  // GFM 任务列表只需要不可交互的复选框。
  if (node.tagName === "INPUT") {
    node.setAttribute("type", "checkbox");
    node.setAttribute("disabled", "");
  }
});

function cleanHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: "h1 h2 h3 h4 h5 h6 pre strong b em i u s del code kbd sub sup br hr p div span ul ol li table thead tbody tfoot tr td th details summary blockquote img a center small input".split(" "),
    ALLOWED_ATTR: ["href", "src", "alt", "title", "open", "colspan", "rowspan", "width", "height", "align", "class", "id", "start", "aria-hidden", "data-lang", "type", "checked", "disabled"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}

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
        return `<img src="${esc(safeUrl(href, true))}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
      },
      html({ text }) {
        return text;
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
  return cleanHtml(marked.parse(videos(md), { async: false }) as string);
}

/** 行内（选项、短提示），不包 <p> */
export function renderInline(md: string): string {
  return cleanHtml(marked.parseInline(cjkStrong(md), { async: false }) as string);
}
