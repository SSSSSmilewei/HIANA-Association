import { useApi } from "../api";
import { Icon, type IconName } from "../icons";
import { Link, useLocation } from "../router";
import type { AttendanceState, Me } from "../types";

interface NavItem {
  to: string;
  label: string;
  short?: string;
  icon: IconName;
  match: (p: string) => boolean;
  dot?: boolean;
}

const MEMBER_NAV: NavItem[] = [
  { to: "/", label: "首页", icon: "home", match: (p) => p === "/" },
  { to: "/courses", label: "课程", icon: "book", match: (p) => p.startsWith("/courses") },
  { to: "/checkin", label: "签到", icon: "camera", match: (p) => p.startsWith("/checkin") },
  { to: "/notices", label: "公告与比赛", short: "公告", icon: "megaphone", match: (p) => p.startsWith("/notices") },
  { to: "/me", label: "我的", icon: "user", match: (p) => p.startsWith("/me") || p === "/password" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "今日签到", short: "签到", icon: "clipboard", match: (p) => p === "/admin" },
  { to: "/admin/members", label: "成员", icon: "users", match: (p) => p.startsWith("/admin/members") },
  { to: "/admin/notices", label: "发公告", short: "公告", icon: "edit", match: (p) => p.startsWith("/admin/notices") },
  { to: "/admin/settings", label: "设置", icon: "sliders", match: (p) => p.startsWith("/admin/settings") },
];

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i style={{ background: "var(--l2)" }} />
      <i style={{ background: "var(--l4)" }} />
      <i style={{ background: "var(--l3)" }} />
      <i style={{ background: "var(--l1)" }} />
    </span>
  );
}

function NavList({ items, path, label, small }: { items: NavItem[]; path: string; label: string; small?: boolean }) {
  const i = items.findIndex((n) => n.match(path));
  return (
    <nav className="nav" aria-label={label}>
      {small && <span className="nav-label">{label}</span>}
      <div className="nav-items">
        <span className="nav-pill" aria-hidden="true" hidden={i < 0} style={{ "--i": i } as React.CSSProperties} />
        {items.map((n) => (
          <Link key={n.to} to={n.to} className="nav-item" aria-current={n.match(path) ? "page" : undefined}>
            <Icon name={n.icon} />
            {n.label}
            {n.dot && <span className="nav-dot" aria-label="晚自习进行中" />}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const { path } = useLocation();
  const isMember = me.role === "member";
  const isAdmin = !!me.isAdmin;
  const inAdmin = path.startsWith("/admin");
  const att = useApi<AttendanceState>(isMember ? "/api/attendance" : null, { refreshMs: 120_000 });
  const live = !!att.data && att.data.evening.open && !att.data.evening.record && !att.data.current;

  const member = MEMBER_NAV.map((n) => (n.to === "/checkin" ? { ...n, dot: live } : n));
  const tabs = !isMember ? ADMIN_NAV : inAdmin && isAdmin ? [{ ...MEMBER_NAV[0], label: "学习", match: () => false }, ...ADMIN_NAV] : member;
  const tabIndex = tabs.findIndex((n) => n.match(path));
  const name = me.member?.name ?? "管理员";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <Link to={isMember ? "/" : "/admin"} className="brand">
            <BrandMark />
            <span className="stack" style={{ gap: 1 }}>
              <span className="brand-name">HIANA</span>
              <span className="brand-sub">智慧网络算法协会</span>
            </span>
          </Link>
          {isMember && <NavList items={member} path={path} label="主导航" />}
          {isAdmin && <NavList items={ADMIN_NAV} path={path} label="管理" small />}
          <div className="me-card">
            <span className="avatar" aria-hidden="true">
              {name.slice(0, 1)}
            </span>
            <span className="grow stack" style={{ gap: 0 }}>
              <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600 }} className="ellipsis">
                {name}
              </span>
              <span className="xsmall sub ellipsis">
                {[me.member?.className, isAdmin ? "管理员" : null].filter(Boolean).join(" · ") || me.member?.studentNo}
              </span>
            </span>
            {isMember && (
              <Link to="/me#settings" className="icon-btn" aria-label="外观与设置" style={{ border: 0, background: "transparent" }}>
                <Icon name="sun" size={18} />
              </Link>
            )}
          </div>
        </div>
      </aside>
      <main className="main" id="main">
        {children}
      </main>
      <nav className="tabbar" aria-label="主导航" style={{ "--n": tabs.length, "--i": tabIndex } as React.CSSProperties}>
        <span className="tab-pill" aria-hidden="true" hidden={tabIndex < 0} />
        {tabs.map((n) => (
          <Link key={n.to + n.label} to={n.to} className="tab" aria-current={n.match(path) ? "page" : undefined}>
            <Icon name={n.icon} size={22} />
            {n.short ?? n.label}
            {n.dot && <span className="nav-dot" aria-hidden="true" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}
