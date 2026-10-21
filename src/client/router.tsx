import { type AnchorHTMLAttributes, type MouseEvent, createContext, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/** 很小的路由：history API + 路径匹配。浏览器支持时用 View Transitions 做页面切换。 */

interface Loc {
  path: string;
  search: string;
}
const LocationContext = createContext<Loc>({ path: "/", search: "" });
let setGlobal: ((l: Loc) => void) | null = null;
const read = (): Loc => ({ path: location.pathname, search: location.search });

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

function withTransition(update: () => void) {
  const doc = document as VTDoc;
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  const t = doc.startViewTransition(() => flushSync(update));
  t.finished.finally(() => {
    for (const el of document.querySelectorAll<HTMLElement>("[data-vt-temp]")) {
      el.style.viewTransitionName = "";
      el.removeAttribute("data-vt-temp");
    }
  });
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
  withTransition(() => setGlobal?.(read()));
  if (!to.includes("#")) window.scrollTo({ top: 0 });
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    setGlobal = setLoc;
    const onPop = () => withTransition(() => setLoc(read()));
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      setGlobal = null;
    };
  }, []);
  return <LocationContext.Provider value={loc}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  return useContext(LocationContext);
}

export function useQuery(name: string): string | null {
  const { search } = useLocation();
  return new URLSearchParams(search).get(name);
}

/** "/courses/:slug" → 匹配结果；结尾带 ? 的段可省略。 */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  for (let i = 0; i < Math.max(p.length, s.length); i++) {
    const seg = p[i];
    if (seg === undefined) return null;
    const optional = seg.endsWith("?");
    const name = seg.replace(/^:/, "").replace(/\?$/, "");
    if (seg.startsWith(":")) {
      if (s[i] === undefined) {
        if (optional) continue;
        return null;
      }
      params[name] = decodeURIComponent(s[i]);
    } else if (seg !== s[i]) return null;
  }
  return params;
}

/**
 * 站内链接。vt 给一个共享元素名：点击时把带 data-vt 的子元素命名，
 * 目标页同名元素就会从这里“长”过去（课程卡片 → 课程页标题）。
 */
export function Link({ to, onClick, vt, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; vt?: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (vt) {
      const host = e.currentTarget.closest("[data-vt-host]") ?? e.currentTarget;
      const el = (host.querySelector("[data-vt]") as HTMLElement | null) ?? (e.currentTarget as HTMLElement);
      el.style.viewTransitionName = vt;
      el.setAttribute("data-vt-temp", "");
    }
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
