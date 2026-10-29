import { useCallback, useEffect, useState } from "react";
import type { CourseMeta } from "../shared/courses";
import type { CoursePackage } from "../shared/package";
import { api, mutate, useApi } from "./api";
import { refreshLearning } from "./courseMeta";
import { isLocalSlug, loadPackage, localMeta, localState, onLocalChange, writeLocalState } from "./library";
import { useMe, useRequireLogin } from "./session";
import type { CourseDetail, EnrollStatus } from "./types";
import { useConfirm, useToast } from "./ui";

/**
 * 课程页、讲义页共用的数据：轻量目录（进度用）+ 完整课程包（介绍、练手题）+ 我的进度。
 * 站内的课进度存服务器；本机导入的课（local-）进度存这台设备。
 */

export interface CourseState {
  done: Record<string, number>;
  solved: Record<string, string[]>;
  enrollment: CourseDetail["enrollment"];
  peers: string[];
}

export function usePackage(slug: string) {
  const [pkg, setPkg] = useState<CoursePackage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setError(null);
    loadPackage(slug).then(
      (p) => live && setPkg(p),
      (e: Error) => live && setError(e),
    );
    return () => {
      live = false;
    };
  }, [slug, n]);
  return { pkg, error, reload: () => setN((x) => x + 1) };
}

export function useCourse(slug: string) {
  const local = isLocalSlug(slug);
  const { me } = useMe();
  const key = `/api/courses/${slug}`;
  // 游客也能看课程详情（没有进度）
  const remote = useApi<CourseDetail>(local ? null : key);
  const { pkg, error: pkgError, reload: reloadPkg } = usePackage(slug);
  const [localTick, setLocalTick] = useState(0);
  useEffect(() => (local ? onLocalChange(() => setLocalTick((x) => x + 1)) : undefined), [local]);

  const toast = useToast();
  const needLogin = useRequireLogin();
  const confirm = useConfirm();

  let meta: CourseMeta | null = null;
  let state: CourseState | null = null;
  if (local) {
    if (pkg) {
      meta = localMeta(pkg);
      void localTick;
      const s = localState(pkg.slug);
      state = { ...s, enrollment: null, peers: [] };
    }
  } else if (remote.data) {
    meta = remote.data.course;
    state = { done: remote.data.done, solved: remote.data.solved ?? {}, enrollment: remote.data.enrollment, peers: remote.data.peers };
  }

  const bumpLocal = () => setLocalTick((x) => x + 1);

  const toggle = useCallback(
    async (itemId: string, done: boolean) => {
      if (local) {
        if (!pkg) return;
        writeLocalState(pkg.slug, (s) => {
          const d = { ...s.done };
          if (done) d[itemId] = Date.now();
          else delete d[itemId];
          return { ...s, done: d };
        });
        bumpLocal();
        return;
      }
      if (needLogin()) return;
      // 乐观更新：先在本地打勾，失败再撤回
      mutate<CourseDetail>(key, (old) => {
        if (!old) return old;
        const d = { ...old.done };
        if (done) d[itemId] = Date.now();
        else delete d[itemId];
        return { ...old, done: d, enrollment: old.enrollment ?? { status: "active", startedAt: Date.now() } };
      });
      try {
        const r = await api<{ next: { title: string } | null }>(`${key}/items/${itemId}`, { method: "PUT", body: { done } });
        if (done && !r.next) toast("全部学完了");
        refreshLearning();
      } catch (e) {
        toast((e as Error).message, "error");
        void remote.reload();
      }
    },
    [local, pkg, key, needLogin, toast, remote.reload],
  );

  /** 练手题做对了。没登录也能做题，只是不记录。 */
  const solve = useCallback(
    async (itemId: string, qid: string) => {
      if (local) {
        if (!pkg) return;
        writeLocalState(pkg.slug, (s) => ({ ...s, solved: { ...s.solved, [itemId]: [...new Set([...(s.solved[itemId] ?? []), qid])] } }));
        bumpLocal();
        return;
      }
      if (!me.role) return;
      mutate<CourseDetail>(key, (old) => (old ? { ...old, solved: { ...old.solved, [itemId]: [...new Set([...(old.solved?.[itemId] ?? []), qid])] } } : old));
      try {
        await api(`${key}/practice/${itemId}/${qid}`, { method: "PUT", body: {} });
        refreshLearning();
      } catch {
        /* 记录失败不打扰做题 */
      }
    },
    [local, pkg, key, me.role],
  );

  const setStatus = useCallback(
    async (status: EnrollStatus, current?: EnrollStatus) => {
      if (needLogin()) return;
      if (status === "paused" && !(await confirm({ title: "暂停这门课？", body: "进度会保留。", ok: "暂停" }))) return;
      if (status === "dropped" && !(await confirm({ title: "移出我的课程？", ok: "移出" }))) return;
      try {
        await api(`${key}/enrollment`, { method: "PUT", body: { status } });
        toast(status === "active" ? (current === "paused" ? "继续学" : "已加入") : status === "done" ? "已标记学完" : status === "paused" ? "已暂停" : "已移出");
        refreshLearning();
      } catch (e) {
        toast((e as Error).message, "error");
      }
    },
    [key, needLogin, confirm, toast],
  );

  const error = local ? pkgError : remote.error;
  return {
    local,
    meta,
    pkg,
    pkgError,
    state,
    error,
    reload: () => {
      reloadPkg();
      void remote.reload();
    },
    toggle,
    solve,
    setStatus,
  };
}
