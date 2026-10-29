import { useRef, useState } from "react";
import type { CoursePackage } from "../../shared/package";
import { api } from "../api";
import { refreshLearning } from "../courseMeta";
import { Icon } from "../icons";
import { LOCAL_PREFIX, forgetPackage, saveLocal } from "../library";
import { Link, navigate } from "../router";
import { useMe } from "../session";
import { Dialog, Spinner, useToast } from "../ui";

/**
 * 导入课程包（hiana-course@1 的 JSON）：先在浏览器里校验，
 * 然后存到这台设备（谁都可以），或者发布给所有人（管理员）。
 */
export function ImportCourse({ onClose }: { onClose: () => void }) {
  const { me } = useMe();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[] | null>(null);
  const [pkg, setPkg] = useState<CoursePackage | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async (raw: string) => {
    setPkg(null);
    setErrors(null);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      setErrors([`不是有效的 JSON：${(e as Error).message}`]);
      return;
    }
    // 校验器（zod）只在这里用到，按需加载
    const { parsePackage } = await import("../../shared/package");
    const r = parsePackage(data);
    if (r.ok) setPkg(r.pkg);
    else setErrors(r.errors);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8_000_000) {
      setErrors(["文件太大（超过 8MB）"]);
      return;
    }
    const t = await f.text();
    setText(t);
    void check(t);
  };

  const keep = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      await saveLocal(pkg);
      forgetPackage(LOCAL_PREFIX + pkg.slug);
      onClose();
      navigate(`/courses/${LOCAL_PREFIX}${pkg.slug}`);
    } catch (e) {
      toast(`存不进这台设备：${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      await api("/api/admin/packages", { method: "PUT", body: pkg });
      forgetPackage(pkg.slug);
      refreshLearning();
      toast("已发布");
      onClose();
      navigate(`/courses/${pkg.slug}`);
    } catch (e) {
      const errs = ((e as { data?: { errors?: string[] } }).data?.errors) ?? [(e as Error).message];
      setErrors(errs);
    } finally {
      setBusy(false);
    }
  };

  const items = pkg ? pkg.modules.flatMap((m) => m.items) : [];
  const practice = items.reduce((n, it) => n + it.practice.length, 0);

  return (
    <Dialog title="导入课程包" onClose={onClose} wide sub={<>hiana-course@1 格式的 JSON。<Link to="/courses/format" onClick={onClose}>格式说明</Link></>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => file.current?.click()}>
            <Icon name="download" size={16} />
            选择文件
          </button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <span className="small sub">或者把 JSON 粘贴到下面</span>
        </div>
        <textarea
          className="input mono"
          rows={8}
          value={text}
          placeholder='{"format": "hiana-course@1", "slug": "...", ...}'
          onChange={(e) => {
            setText(e.target.value);
            setPkg(null);
            setErrors(null);
          }}
          spellCheck={false}
          aria-label="课程包 JSON"
        />
        {!pkg && (
          <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={!text.trim()} onClick={() => check(text)}>
            检查格式
          </button>
        )}
        {errors && (
          <div className="verdict is-bad" role="alert">
            <strong>格式不对</strong>
            <ul className="error-list small">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {pkg && (
          <div className="verdict is-ok">
            <strong>{pkg.title}</strong>
            <span className="small num">
              {pkg.modules.length} 个模块，{items.length} 个条目，{practice} 道练手题
              {pkg.intro.community || pkg.intro.official ? "，有介绍" : ""}
            </span>
          </div>
        )}
        {pkg && (
          <div className="row wrap" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={keep} disabled={busy}>
              {busy && <Spinner />}
              存到这台设备
            </button>
            {me.isAdmin && (
              <button type="button" className="btn btn-ghost" onClick={publish} disabled={busy}>
                发布给所有人
              </button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
