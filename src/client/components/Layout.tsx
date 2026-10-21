import type { ReactNode } from "react";
import type { Me } from "../../shared/api";
import { api } from "../api";
import { Link, navigate, useLocation } from "../router";
import { ThemeToggle } from "../theme";

function Brand({ sub }: { sub: string }) {
  return (
    <Link to="/" className="brand">
      <i className="brand-mark" aria-hidden="true" />
      <b>智慧网络算法协会</b>
      <span>{sub}</span>
    </Link>
  );
}

export function MemberHeader({ me }: { me: Me }) {
  const { path } = useLocation();
  const item = (to: string, label: string) => (
    <Link to={to} aria-current={path === to ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <header className="site-header">
      <div className="wrap">
        <Brand sub="学习平台" />
        <nav className="site-nav" aria-label="主导航">
          {item("/", "首页")}
          {item("/heatmap", "我的热力图")}
          {item("/checkin", "晚自习打卡")}
          {me.member && <span className="muted">{me.member.name}</span>}
          <ThemeToggle />
          <button
            className="link-btn muted"
            type="button"
            onClick={async () => {
              await api("/api/auth/logout", { body: {} });
              location.href = "/login";
            }}
          >
            退出
          </button>
        </nav>
      </div>
    </header>
  );
}

export function AdminHeader() {
  return (
    <header className="site-header admin-header">
      <div className="wrap-wide">
        <Brand sub="会长后台" />
        <nav className="site-nav" aria-label="后台导航">
          <Link to="/admin" aria-current="page">
            总览
          </Link>
          <ThemeToggle />
          <button
            className="link-btn"
            type="button"
            onClick={async () => {
              await api("/api/auth/logout", { body: {} });
              navigate("/admin/login");
            }}
          >
            退出
          </button>
        </nav>
      </div>
    </header>
  );
}

export function Loading({ text = "正在加载…" }: { text?: string }) {
  return <div className="wrap page-pad muted">{text}</div>;
}

export function ErrorView({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="wrap page-pad">
      <p className="error-text">{message}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
