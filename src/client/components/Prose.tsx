import { useEffect, useRef, useState } from "react";
import { navigate } from "../router";
import { Skeleton } from "../ui";

/** Markdown 正文。渲染器按需加载（marked + highlight.js 不进首屏）。 */

type Md = typeof import("../markdown");
let mdModule: Promise<Md> | null = null;
export function markdown(): Promise<Md> {
  mdModule ??= import("../markdown");
  mdModule.catch(() => {
    mdModule = null;
  });
  return mdModule;
}

/** 短文本（选项、提示）：渲染好之前先显示原文 */
export function InlineMd({ text }: { text: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    markdown().then((m) => live && setHtml(m.renderInline(text)));
    return () => {
      live = false;
    };
  }, [text]);
  // biome-ignore lint/security/noDangerouslySetInnerHtml: 同上
  return html === null ? <span>{text}</span> : <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * source：正文，或者取正文的函数（讲义页按需取 .md）。dropTitle：去掉开头和页面标题重复的一级标题。
 */
export function Prose({
  source,
  onToc,
  dropTitle = false,
  className = "prose",
}: { source: string | (() => Promise<string>); onToc?: (items: TocItem[]) => void; dropTitle?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setHtml(null);
    setError(null);
    Promise.all([typeof source === "string" ? source : source(), markdown()]).then(
      ([md, m]) => {
        if (!live) return;
        const h = m.renderMarkdown(md);
        // 改 HTML 字符串而不是事后删节点：React 重新渲染时会把删掉的节点放回来
        setHtml(dropTitle ? h.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "") : h);
      },
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [source, dropTitle]);

  useEffect(() => {
    const el = ref.current;
    if (!el || html === null) return;
    onToc?.(
      [...el.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id]")].map((h) => ({
        id: h.id,
        text: (h.textContent ?? "").replace(/^#/, ""),
        level: Number(h.tagName[1]),
      })),
    );
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }, [html, onToc]);

  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      e.preventDefault();
      const id = decodeURIComponent(href.slice(1));
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", href);
    } else if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
      const hash = href.split("#")[1];
      if (hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(hash))?.scrollIntoView());
    }
  };

  if (error) return <p className="sub">{error}</p>;
  if (html === null)
    return (
      <div className="stack" aria-busy="true">
        <Skeleton h={28} w="60%" />
        <Skeleton h={16} />
        <Skeleton h={16} />
        <Skeleton h={16} w="80%" />
      </div>
    );
  // biome-ignore lint/security/noDangerouslySetInnerHtml: renderMarkdown 已经过滤了原始 HTML
  return <div ref={ref} className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Toc({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null;
  return (
    <nav className="toc" aria-label="本页目录">
      <span className="toc-label">目录</span>
      {items.map((t) => (
        <a key={t.id} href={`#${t.id}`} className={`toc-${t.level}`} onClick={(e) => {
          e.preventDefault();
          document.getElementById(t.id)?.scrollIntoView({ behavior: "smooth" });
          history.replaceState(null, "", `#${t.id}`);
        }}>
          {t.text}
        </a>
      ))}
    </nav>
  );
}
