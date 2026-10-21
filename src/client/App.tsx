import { useEffect, useState } from "react";
import type { Me } from "../shared/api";
import { api } from "./api";
import { AdminHeader, Loading, MemberHeader } from "./components/Layout";
import { AdminHome } from "./pages/Admin";
import { CheckinPage } from "./pages/Checkin";
import { HomePage } from "./pages/Home";
import { AdminLogin, StudentLogin } from "./pages/Login";
import { ProfilePage } from "./pages/Profile";
import { matchPath, navigate, useLocation } from "./router";

export function App() {
  const { path } = useLocation();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe({ role: null }));
  }, []);

  useEffect(() => {
    document.title = path.startsWith("/admin") ? "会长后台 · 智慧网络算法协会" : "智慧网络算法协会 · 学习平台";
  }, [path]);

  const k = matchPath("/k/:code", path);
  if (k) return <StudentLogin initialCode={k.code} onLogin={setMe} />;
  if (!me) return <Loading />;

  if (path.startsWith("/admin")) {
    if (path === "/admin/login") return <AdminLogin onLogin={setMe} />;
    if (me.role !== "admin") {
      queueMicrotask(() => navigate("/admin/login", { replace: true }));
      return null;
    }
    return (
      <>
        <AdminHeader />
        <AdminHome />
      </>
    );
  }

  if (path === "/login" || me.role !== "member") {
    if (me.role === "admin" && path !== "/login") {
      queueMicrotask(() => navigate("/admin", { replace: true }));
      return null;
    }
    return <StudentLogin onLogin={setMe} />;
  }

  let page: React.ReactNode;
  if (path === "/heatmap") page = <ProfilePage />;
  else if (path === "/checkin") page = <CheckinPage />;
  else page = <HomePage me={me} />;
  return (
    <>
      <MemberHeader me={me} />
      {page}
    </>
  );
}
