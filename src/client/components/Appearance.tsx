import { useRef, useState } from "react";
import { PALETTES, resolvedMode, usePrefs } from "../prefs";
import { type CustomFont, type FontSlot, exportPalette, parsePalette, saveFontFile } from "../theme";
import { Dialog, Seg, useDialogClose, useToast } from "../ui";

function Tile({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="pick-tile"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: "var(--r-card)",
        border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "var(--well)" : "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "left",
        transition: "border-color 400ms var(--ease), background 400ms var(--ease)",
      }}
    >
      <span aria-hidden="true" style={{ height: 54, borderRadius: 10, position: "relative", overflow: "hidden", display: "block" }}>
        {children}
      </span>
      <span style={{ fontSize: "var(--fs-sm)", lineHeight: "22px", fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
  );
}

const abs = (css: React.CSSProperties): React.CSSProperties => ({ position: "absolute", ...css });

/** 风格（液态玻璃 / 经典直角）和深浅。 */
export function StylePickers() {
  const [prefs, setPrefs] = usePrefs();
  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small sub">风格</span>
        <div role="group" aria-label="风格" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <Tile label="液态玻璃" active={prefs.skin === "glass"} onClick={() => setPrefs({ skin: "glass" })}>
            <span style={abs({ inset: 0, background: "var(--well)" })} />
            <span style={abs({ right: 8, top: 8, width: 14, height: 14, borderRadius: 4, background: "var(--accent)" })} />
            <span style={abs({ right: 26, top: 8, width: 14, height: 14, borderRadius: 4, background: "var(--tint)" })} />
            <span style={abs({ left: 8, right: 30, bottom: 8, height: 22, borderRadius: 9, background: "var(--glass-strong)", border: "1px solid var(--glass-edge)" })} />
          </Tile>
          <Tile label="经典直角" active={prefs.skin === "classic"} onClick={() => setPrefs({ skin: "classic" })}>
            <span style={abs({ inset: 0, background: "var(--surface)", border: "1px solid var(--line-strong)" })} />
            <span style={abs({ left: 0, top: 0, bottom: 0, width: 6, background: "var(--accent)" })} />
            <span style={abs({ left: 16, top: 12, width: 50, height: 6, background: "var(--ink)" })} />
            <span style={abs({ left: 16, top: 26, width: 72, height: 4, background: "var(--sub)" })} />
          </Tile>
        </div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small sub">深浅</span>
        <Seg
          label="深浅"
          flat
          value={prefs.theme}
          onChange={(t) => setPrefs({ theme: t })}
          options={[
            { value: "light" as const, label: "浅色" },
            { value: "dark" as const, label: "深色" },
            { value: "system" as const, label: "跟随系统" },
          ]}
        />
      </div>
    </>
  );
}

/** 配色方案：内置几套，也可以导入 */
export function PalettePicker() {
  const [prefs, setPrefs] = usePrefs();
  const [importing, setImporting] = useState(false);
  const mode = resolvedMode(prefs);
  const custom = prefs.custom;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="small sub">配色</span>
      <div role="group" aria-label="配色" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", gap: 10 }}>
        {PALETTES.map((x) => {
          const [bg, surface, ink, accent] = x[mode];
          return (
            <Tile key={x.id} label={x.label} active={prefs.palette === x.id} onClick={() => setPrefs({ palette: x.id })}>
              <Swatch bg={bg} surface={surface} ink={ink} accent={accent} />
            </Tile>
          );
        })}
        {custom && (
          <Tile label={custom.name} active={prefs.palette === "custom"} onClick={() => setPrefs({ palette: "custom" })}>
            <Swatch bg={custom[mode].bg} surface={custom[mode].surface} ink={custom[mode].ink} accent={custom[mode].accent} />
          </Tile>
        )}
        <button type="button" className="pick-tile pick-add" onClick={() => setImporting(true)}>
          + 导入配色
        </button>
      </div>
      {importing && <ImportPalette onClose={() => setImporting(false)} />}
    </div>
  );
}

function Swatch({ bg, surface, ink, accent }: { bg: string; surface: string; ink: string; accent: string }) {
  return (
    <>
      <span style={abs({ inset: 0, background: bg })} />
      <span style={abs({ left: 8, right: 8, bottom: 8, height: 20, borderRadius: "var(--r-xs)", background: surface })} />
      <span style={abs({ left: 8, top: 8, width: 30, height: 5, background: ink })} />
      <span style={abs({ right: 8, top: 8, width: 14, height: 14, borderRadius: "var(--r-cell)", background: accent })} />
    </>
  );
}

const PALETTE_EXAMPLE = `{
  "name": "My Theme",
  "light": { "bg": "#fafafa", "surface": "#ffffff", "ink": "#24292f", "accent": "#0969da" },
  "dark":  { "bg": "#0d1117", "surface": "#161b22", "ink": "#e6edf3", "accent": "#58a6ff" }
}`;

function ImportPalette({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = usePrefs();
  const [text, setText] = useState(prefs.custom ? exportPalette(prefs.custom) : "");
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  return (
    <Dialog title="导入配色" sub="海纳 JSON · base16 / base24 YAML · VS Code 主题 JSON · CSS 变量" onClose={onClose} wide>
      <ImportBody text={text} setText={setText} err={err} setErr={setErr} file={file} />
      <ImportActions
        canDelete={!!prefs.custom}
        onDelete={() => setPrefs({ custom: null, palette: prefs.palette === "custom" ? "nord" : prefs.palette })}
        onApply={() => {
          const p = parsePalette(text, file.current?.files?.[0]?.name.replace(/\.\w+$/, "") ?? "自定义");
          if (!p) {
            setErr("认不出这段配色");
            return false;
          }
          setPrefs({ custom: p, palette: "custom" });
          return true;
        }}
      />
    </Dialog>
  );
}

function ImportBody({
  text,
  setText,
  err,
  setErr,
  file,
}: { text: string; setText: (s: string) => void; err: string | null; setErr: (s: string | null) => void; file: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      <textarea
        className="input mono"
        rows={10}
        spellCheck={false}
        placeholder={PALETTE_EXAMPLE}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setErr(null);
        }}
        aria-label="配色文本"
        style={{ fontSize: "var(--fs-xs)", lineHeight: "20px", resize: "vertical" }}
      />
      <div className="row wrap" style={{ gap: 8 }}>
        <label className="btn btn-ghost btn-sm">
          选择文件
          <input
            ref={file}
            type="file"
            accept=".json,.yaml,.yml,.css,.txt,.toml,.jsonc"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
            }}
          />
        </label>
        <a className="btn btn-quiet btn-sm" href="https://github.com/tinted-theming/schemes" target="_blank" rel="noreferrer">
          base16 配色库
        </a>
      </div>
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}

function ImportActions({ canDelete, onDelete, onApply }: { canDelete: boolean; onDelete: () => void; onApply: () => boolean }) {
  const close = useDialogClose();
  return (
    <div className="dialog-actions">
      {canDelete && (
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            onDelete();
            close();
          }}
        >
          删除导入的配色
        </button>
      )}
      <span className="grow" />
      <button type="button" className="btn btn-primary" onClick={() => onApply() && close()}>
        应用
      </button>
    </div>
  );
}

/** 字体：默认更纱黑体 / 系统字体 / 自定义（本机字体名、网址、上传文件） */
export function FontPicker() {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <FontRow slot="sans" label="正文字体" def="更纱黑体" />
      <FontRow slot="mono" label="代码字体" def="更纱等距" />
    </div>
  );
}

function FontRow({ slot, label, def }: { slot: FontSlot; label: string; def: string }) {
  const [prefs, setPrefs] = usePrefs();
  const toast = useToast();
  const cur = prefs.fonts[slot] ?? null;
  const system = slot === "sans" ? "system-ui" : "ui-monospace";
  const kind = !cur ? "default" : cur.family === system && cur.source === "local" ? "system" : "custom";
  const [editing, setEditing] = useState(false);
  const set = (f: CustomFont | null) => setPrefs({ fonts: { ...prefs.fonts, [slot]: f } });
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="small sub">{label}</span>
      <Seg
        label={label}
        flat
        value={kind}
        onChange={(v) => {
          if (v === "default") set(null);
          else if (v === "system") set({ family: system, source: "local" });
          else setEditing(true);
        }}
        options={[
          { value: "default" as const, label: def },
          { value: "system" as const, label: "系统" },
          { value: "custom" as const, label: kind === "custom" && cur ? cur.family : "自定义…" },
        ]}
      />
      {editing && (
        <FontDialog
          label={label}
          initial={kind === "custom" ? cur : null}
          onClose={() => setEditing(false)}
          onSave={async (f, file) => {
            if (file) {
              try {
                await saveFontFile(slot, file);
              } catch {
                toast("这个浏览器存不了字体文件", "error");
                return;
              }
            }
            set(f);
          }}
        />
      )}
    </div>
  );
}

function FontDialog({ label, initial, onClose, onSave }: { label: string; initial: CustomFont | null; onClose: () => void; onSave: (f: CustomFont, file?: File) => Promise<void> }) {
  const [source, setSource] = useState<CustomFont["source"]>(initial?.source ?? "local");
  const [family, setFamily] = useState(initial?.family ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog title={label} onClose={onClose}>
      <FontForm
        {...{ source, setSource, family, setFamily, url, setUrl, setFile, err }}
        onSubmit={async () => {
          const fam = family.trim() || file?.name.replace(/\.\w+$/, "") || "";
          if (!fam) return setErr("填一个字体名"), false;
          if (source === "url" && !/^https:\/\/\S+$/.test(url.trim())) return setErr("网址要以 https:// 开头"), false;
          if (source === "file" && !file && initial?.source !== "file") return setErr("选一个字体文件"), false;
          await onSave({ family: fam, source, url: source === "url" ? url.trim() : undefined }, file ?? undefined);
          return true;
        }}
      />
    </Dialog>
  );
}

function FontForm({
  source,
  setSource,
  family,
  setFamily,
  url,
  setUrl,
  setFile,
  err,
  onSubmit,
}: {
  source: CustomFont["source"];
  setSource: (s: CustomFont["source"]) => void;
  family: string;
  setFamily: (s: string) => void;
  url: string;
  setUrl: (s: string) => void;
  setFile: (f: File | null) => void;
  err: string | null;
  onSubmit: () => Promise<boolean>;
}) {
  const close = useDialogClose();
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSubmit()) close();
      }}
    >
      <Seg
        label="来源"
        flat
        value={source}
        onChange={setSource}
        options={[
          { value: "local" as const, label: "本机字体" },
          { value: "url" as const, label: "网址" },
          { value: "file" as const, label: "上传文件" },
        ]}
      />
      <label className="field">
        <span>字体名</span>
        <input className="input" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="LXGW WenKai" autoComplete="off" />
      </label>
      {source === "url" && (
        <label className="field">
          <span>字体文件或 CSS 网址</span>
          <input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/font.css" inputMode="url" autoComplete="off" />
        </label>
      )}
      {source === "file" && (
        <label className="field">
          <span>字体文件</span>
          <input className="input" type="file" accept=".woff2,.woff,.ttf,.otf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
      {err && <p className="error-text">{err}</p>}
      <div className="dialog-actions">
        <button type="submit" className="btn btn-primary">
          应用
        </button>
      </div>
    </form>
  );
}

export function AppearancePickers() {
  return (
    <>
      <PalettePicker />
      <StylePickers />
      <FontPicker />
    </>
  );
}
