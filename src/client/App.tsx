import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { BrandMark, Shell } from "./components/Shell";
import { AdminMembersPage, AdminNoticesPage, AdminSettingsPage, AdminTodayPage } from "./pages/Admin";
import { AboutPage } from "./pages/About";
import { AdminPinsPage } from "./pages/AdminPins";
import { AttendancePage } from "./pages/Attendance";
import { BlockPage } from "./pages/Blocks";
import { CoursePage } from "./pages/Course";
import { CoursesPage } from "./pages/Courses";
import { FormatPage } from "./pages/Format";
import { LessonPage } from "./pages/Lesson";
import { HomePage } from "./pages/Home";
import { LoginPage, PasswordPage } from "./pages/Login";
import { Onboarding, needsOnboarding } from "./components/Onboarding";
import { NoticeGate } from "./components/NoticeGate";
import { NoticesPage } from "./pages/Notices";
import { ProfilePage } from "./pages/Profile";
import { ReportPage } from "./pages/Report";
import { matchPath, navigate, useLocation } from "./router";
import { MeContext, loginHref, safeNext } from "./session";
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

/** 游客也能看的页面；其余页面要登录。 */
function guestCanSee(path: string): boolean {
  return path === "/" || path === "/about" || path === "/honors" || path.startsWith("/courses") || path.startsWith("/blocks/") || path === "/notices";
}

export function App() {
  const { path, search } = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [onboardingDone, setOnboarding] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe({ role: null }));
  }, []);

  const onboarding = !onboardingDone && needsOnboarding(me?.member?.id);

  const ctx = useMemo(() => ({ me: me ?? { role: null }, setMe: (m: Me) => setMe(m) }), [me]);

  // 以前发出去的激活链接 /k/口令：旧口令现在当重置码用
  const k = matchPath("/k/:code", path);
  if (k) return <Redirect to={`/login?mode=reset&code=${encodeURIComponent(k.code)}`} />;
  if (!me) return <Boot />;

  const loggedOut = () => {
    setMe({ role: null });
    navigate("/", { replace: true });
  };
  const next = safeNext(new URLSearchParams(search).get("next"));

  if (path === "/admin/login") return <Redirect to={me.role ? "/admin" : loginHref("/admin")} />;
  if (path === "/honors") return <Redirect to="/about#honors" />;
  if (path === "/login") {
    if (me.role) return <Redirect to={next} />;
    return <LoginPage onLogin={(m) => (setMe(m), navigate(next, { replace: true }))} />;
  }

  // 游客：只能看首页、协会、课程、公告；其余页面先去登录，登录完回来
  if (!me.role && !guestCanSee(path)) return <Redirect to={loginHref(path + search)} />;
  if (path === "/password" && me.role) return <PasswordPage me={me} />;

  const isAdmin = !!me.isAdmin;
  let page: React.ReactNode;
  const course = matchPath("/courses/:slug", path);
  const lesson = matchPath("/courses/:slug/learn/:page", path);
  const block = matchPath("/blocks/:slug", path);
  if (path.startsWith("/admin")) {
    if (!isAdmin) page = <Empty title="这里需要管理员账号" />;
    else if (path === "/admin") page = <AdminTodayPage />;
    else if (path === "/admin/members") page = <AdminMembersPage selfId={me.member?.id ?? null} />;
    else if (path === "/admin/notices") page = <AdminNoticesPage />;
    else if (path === "/admin/settings") page = <AdminSettingsPage />;
    else if (path === "/admin/report") page = <ReportPage />;
    else if (path === "/admin/pins") page = <AdminPinsPage />;
    else page = <Redirect to="/admin" />;
  } else if (path === "/") page = <HomePage />;
  else if (path === "/about") page = <AboutPage />;
  else if (path === "/courses") page = <CoursesPage />;
  else if (path === "/courses/format") page = <FormatPage />;
  else if (block) page = <BlockPage key={block.slug} slug={block.slug} />;
  else if (course) page = <CoursePage key={course.slug} slug={course.slug} />;
  else if (lesson) page = <LessonPage key={lesson.slug} slug={lesson.slug} page={lesson.page} />;
  else if (path === "/checkin") page = me.member?.kind === "external" ? <Empty title="校外账号不用签到" /> : <AttendancePage />;
  else if (path === "/notices") page = <NoticesPage />;
  else if (path === "/me") page = <ProfilePage me={me} onLogout={loggedOut} />;
  else page = <Empty title="没有这个页面" />;

  return (
    <MeContext.Provider value={ctx}>
      {me.role && (onboarding ? <Onboarding onDone={() => setOnboarding(false)} /> : <NoticeGate />)}
      <Shell me={me}>
        <div key={path} className="page-wrap">
          {page}
        </div>
      </Shell>
    </MeContext.Provider>
  );
}
