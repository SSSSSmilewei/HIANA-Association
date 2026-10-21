import { useEffect, useState } from "react";
import { api } from "./api";
import { BrandMark, Shell } from "./components/Shell";
import { AdminMembersPage, AdminNoticesPage, AdminSettingsPage, AdminTodayPage } from "./pages/Admin";
import { AttendancePage } from "./pages/Attendance";
import { CoursePage } from "./pages/Course";
import { CoursesPage } from "./pages/Courses";
import { HomePage } from "./pages/Home";
import { AdminLogin, LoginPage, PasswordPage } from "./pages/Login";
import { NoticesPage } from "./pages/Notices";
import { ProfilePage } from "./pages/Profile";
import { matchPath, navigate, useLocation } from "./router";
import type { Me } from "./types";
import { Empty } from "./ui";

function Boot() {
  return (
    <div className="boot" aria-busy="true" aria-label="正在打开">
      <BrandMark />
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

export function App() {
  const { path } = useLocation();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe({ role: null }));
  }, []);

  const k = matchPath("/k/:code", path);
  if (k) return <LoginPage initialCode={k.code} onLogin={setMe} />;
  if (!me) return <Boot />;

  const loggedOut = () => {
    setMe({ role: null });
    navigate("/login", { replace: true });
  };

  if (path === "/admin/login") return <AdminLogin onLogin={setMe} />;
  if (!me.role) return path === "/login" ? <LoginPage onLogin={setMe} /> : <Redirect to="/login" />;
  if (path === "/login") return <Redirect to={me.role === "admin" ? "/admin" : "/"} />;

  // 刚用口令激活：先设密码，别的页面都进不去
  if (me.role === "member" && me.needsPassword) return <PasswordPage me={me} onDone={() => setMe({ ...me, needsPassword: false })} />;
  if (path === "/password" && me.role === "member") return <PasswordPage me={me} onDone={() => {}} />;

  const isAdmin = !!me.isAdmin;
  if (me.role === "admin" && !path.startsWith("/admin")) return <Redirect to="/admin" />;

  let page: React.ReactNode;
  const course = matchPath("/courses/:slug", path);
  if (path.startsWith("/admin")) {
    if (!isAdmin) page = <Empty title="这里需要管理员账号">请会长在后台把你设为管理员。</Empty>;
    else if (path === "/admin") page = <AdminTodayPage />;
    else if (path === "/admin/members") page = <AdminMembersPage selfId={me.member?.id ?? null} />;
    else if (path === "/admin/notices") page = <AdminNoticesPage />;
    else if (path === "/admin/settings") page = <AdminSettingsPage />;
    else page = <Redirect to="/admin" />;
  } else if (path === "/") page = <HomePage me={me} />;
  else if (path === "/courses") page = <CoursesPage />;
  else if (course) page = <CoursePage key={course.slug} slug={course.slug} />;
  else if (path === "/checkin") page = <AttendancePage />;
  else if (path === "/notices") page = <NoticesPage />;
  else if (path === "/me") page = <ProfilePage me={me} onLogout={loggedOut} />;
  else page = <Empty title="没有这个页面">可能链接写错了。</Empty>;

  return (
    <Shell me={me}>
      <div key={path} className="page-wrap">
        {page}
      </div>
    </Shell>
  );
}
