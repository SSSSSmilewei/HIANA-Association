import { afterAll, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { parsePackage } from "../src/shared/package";

// 使用真实 DOM 解析器，覆盖浏览器会还原的字符实体和畸形 HTML。
const dom = new JSDOM("");
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
const { renderMarkdown, renderInline } = await import("../src/client/markdown");
afterAll(() => {
  dom.window.close();
  if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function fragment(html: string) {
  return JSDOM.fragment(html);
}

describe("课程内容安全过滤", () => {
  test("整篇和行内渲染均移除脚本、事件、样式、表单和嵌入内容", () => {
    const payload = '<script>alert(1)</script><img src="/valid.png" onerror="alert(1)" style="position:fixed"><iframe src="https://evil.example"></iframe><svg onload="alert(1)"></svg><math><mtext>x</mtext></math><form action="/api/auth/login"><input type="submit" formaction="https://evil.example"></form><a href="/ok" onclick="alert(1)">正常链接</a>';
    for (const render of [renderMarkdown, renderInline]) {
      const doc = fragment(render(payload));
      expect(doc.querySelector("script, iframe, svg, math, form, style")).toBeNull();
      expect(doc.querySelector("[onerror], [onload], [onclick], [style], [formaction]")).toBeNull();
      expect(doc.querySelector("img")?.getAttribute("src")).toBe("/valid.png");
      expect(doc.querySelector("a")?.getAttribute("href")).toBe("/ok");
      for (const input of doc.querySelectorAll("input")) {
        expect(input.type).toBe("checkbox");
        expect(input.disabled).toBe(true);
      }
    }
  });

  test("拦截控制字符、字符实体和危险协议链接及图片", () => {
    for (const render of [renderMarkdown, renderInline]) {
      for (const href of ["javascript:alert(1)", "java\tscript:alert(1)", "java\nscript:alert(1)", "&#106;avascript:alert(1)", "jav&#x09;ascript:alert(1)", "data:text/html,evil", "vbscript:msgbox(1)", "//evil.example", "/\\evil.example"]) {
        const doc = fragment(render(`<a href="${href}">链接</a><img src="${href}">`));
        expect({ href, a: doc.querySelector("a")?.hasAttribute("href"), img: doc.querySelector("img")?.hasAttribute("src") }).toEqual({ href, a: false, img: false });
      }
      const doc = fragment(render('[坏链接](javascript:alert%281%29) ![图片](data:image/svg+xml,evil)'));
      for (const el of doc.querySelectorAll("[href], [src]")) {
        expect(el.getAttribute("href") ?? el.getAttribute("src")).toBe("#");
      }
    }
  });

  test("保留标题锚点、中文加粗、代码高亮、表格、折叠块和正常链接", () => {
    const doc = fragment(renderMarkdown('# 中文标题\n\n**“引号”**的说明\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<details open><summary>展开</summary>正文</details>\n\n[官网](https://example.edu/) [讲义](/courses/demo) [邮件](mailto:teacher@example.edu)\n\n- [x] 已完成'));
    expect(doc.querySelector("h1")?.id).toBe("中文标题");
    expect(doc.querySelector("h1 a")?.getAttribute("href")).toBe("#中文标题");
    expect(doc.querySelector("strong")?.textContent).toBe("“引号”");
    expect(doc.querySelector("pre[data-lang='js'] code .hljs-keyword")).not.toBeNull();
    expect(doc.querySelector(".table-wrap table td")?.textContent).toBe("1");
    expect(doc.querySelector("details[open] summary")?.textContent).toBe("展开");
    const external = doc.querySelector('a[href="https://example.edu/"]');
    expect(external?.getAttribute("target")).toBe("_blank");
    expect(external?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(doc.querySelector('a[href="/courses/demo"]')).not.toBeNull();
    expect(doc.querySelector('a[href="mailto:teacher@example.edu"]')).not.toBeNull();
    expect(doc.querySelector("input:checked:disabled")).not.toBeNull();
  });

  test("课程包结构化链接拒绝危险协议、协议相对地址、反斜杠和控制字符", () => {
    const pkg = (url: string) => ({ format: "hiana-course@1", slug: "safe-course", title: "安全课程", links: [{ label: "链接", url }] });
    for (const url of ["javascript:alert(1)", "data:text/html,evil", "//evil.example", "/\\evil.example", "https://example.edu/\u0000"]) {
      expect({ url, ok: parsePackage(pkg(url)).ok }).toEqual({ url, ok: false });
    }
    for (const url of ["http://example.edu", "https://example.edu/course?a=1#b", "/courses/demo", "/"]) expect(parsePackage(pkg(url)).ok).toBe(true);
  });
});
