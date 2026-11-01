import { useApi } from "../api";
import { Icon, type IconName } from "../icons";
import { Link, useLocation } from "../router";
import { loginHref } from "../session";
import type { ApplicationList } from "../pages/AdminApplications";
import type { AttendanceState, Me } from "../types";

interface NavItem {
  to: string;
  label: string;
  short?: string;
  icon: IconName;
  match: (p: string) => boolean;
  dot?: boolean;
  /** 右边的数字（比如新报名有几条），0 不显示 */
  count?: number;
}

const MEMBER_NAV: NavItem[] = [
  { to: "/", label: "首页", icon: "home", match: (p) => p === "/" },
  { to: "/courses", label: "课程", icon: "book", match: (p) => p.startsWith("/courses") || p.startsWith("/blocks") },
  { to: "/checkin", label: "签到", icon: "camera", match: (p) => p.startsWith("/checkin") },
  { to: "/notices", label: "公告与比赛", short: "公告", icon: "megaphone", match: (p) => p.startsWith("/notices") },
  { to: "/me", label: "我的", icon: "user", match: (p) => p.startsWith("/me") || p === "/password" },
];

/** 协会介绍（含学生成就）：侧边栏单独一组 */
const ASSOC_NAV: NavItem[] = [{ to: "/about", label: "协会介绍", icon: "flag", match: (p) => p === "/about" }];

/** 游客：只有能看的几页，最后一项是登录 */
const GUEST_NAV: NavItem[] = [
  MEMBER_NAV[0],
  { to: "/about", label: "协会", icon: "flag", match: (p) => p === "/about" },
  MEMBER_NAV[1],
  MEMBER_NAV[3],
  { to: "/login", label: "登录", icon: "user", match: (p) => p === "/login" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "今日签到", short: "签到", icon: "clipboard", match: (p) => p === "/admin" || p === "/admin/report" },
  { to: "/admin/members", label: "成员", icon: "users", match: (p) => p.startsWith("/admin/members") },
  { to: "/admin/applications", label: "新生报名", short: "报名", icon: "inbox", match: (p) => p.startsWith("/admin/applications") },
  { to: "/admin/pins", label: "蓝色钉子", short: "钉子", icon: "pin", match: (p) => p.startsWith("/admin/pins") },
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
            {!!n.count && (
              <span className="nav-count num" aria-label={`${n.count} 条新报名`}>
                {n.count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const { path, search } = useLocation();
  const isMember = me.role === "member";
  const isAdmin = !!me.isAdmin;
  const inAdmin = path.startsWith("/admin");
  // 签到只给校内账号
  const campus = isMember && me.member?.kind !== "external";
  const att = useApi<AttendanceState>(campus ? "/api/attendance" : null, { refreshMs: 120_000 });
  const live = !!att.data && att.data.evening.open && !att.data.evening.record && !att.data.current;
  // 管理员导航上“新生报名”旁边的数字
  const apps = useApi<ApplicationList>(isAdmin ? "/api/admin/applications" : null, { refreshMs: 300_000 });
  const adminNav = ADMIN_NAV.map((n) => (n.to === "/admin/applications" ? { ...n, count: apps.data?.counts.new ?? 0 } : n));

  const member = MEMBER_NAV.filter((n) => campus || n.to !== "/checkin").map((n) => (n.to === "/checkin" ? { ...n, dot: live } : n));
  const guestTabs = GUEST_NAV.map((n) => (n.to === "/login" ? { ...n, to: loginHref(path + search) } : n));
  const tabs = !isMember ? guestTabs : inAdmin && isAdmin ? [{ ...MEMBER_NAV[0], label: "学习", match: () => false }, ...adminNav] : member;
  const tabIndex = tabs.findIndex((n) => n.match(path));
  const name = me.member?.name ?? "";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <Link to="/" className="brand">
            <BrandMark />
            <span className="stack" style={{ gap: 1 }}>
              <span className="brand-name">海纳协会</span>
              <span className="brand-sub">智慧算法网络协会</span>
            </span>
          </Link>
          <NavList items={isMember ? member : [GUEST_NAV[0], GUEST_NAV[2], GUEST_NAV[3]]} path={path} label="主导航" />
          <NavList items={ASSOC_NAV} path={path} label="协会" small />
          {isAdmin && <NavList items={adminNav} path={path} label="管理" small />}
          {isMember ? (
            <div className="me-card">
              <span className="avatar" aria-hidden="true">
                {name.slice(0, 1)}
              </span>
              <span className="grow stack" style={{ gap: 0 }}>
                <span style={{ fontSize: "var(--fs-sm)", lineHeight: "22px", fontWeight: 600 }} className="ellipsis">
                  {name}
                </span>
                <span className="xsmall sub ellipsis">
                  {[me.member?.className, isAdmin ? "管理员" : null].filter(Boolean).join(" · ") || me.member?.studentNo}
                </span>
              </span>
              <Link to="/me#settings" className="icon-btn" aria-label="外观与设置" style={{ border: 0, background: "transparent" }}>
                <Icon name="sun" size={18} />
              </Link>
            </div>
          ) : (
            <div className="me-card guest-card">
              <span className="grow" style={{ fontSize: "var(--fs-sm)", lineHeight: "22px", fontWeight: 600 }}>
                游客
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Link to={loginHref(path + search)} className="btn btn-primary btn-sm">
                  登录
                </Link>
                <Link to={loginHref(path + search, "register")} className="btn btn-ghost btn-sm">
                  注册
                </Link>
              </span>
            </div>
          )}
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
            {!!n.count && (
              <span className="nav-count num" aria-hidden="true">
                {n.count > 99 ? "99+" : n.count}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
