import { Fragment } from "react";

/** 正文里单独占一行的 ![说明](https://…) 显示成图片，其余按纯文本。 */
const IMG_LINE = /^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/;

export function NoticeBody({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const parts: { img?: { alt: string; src: string }; text?: string }[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) parts.push({ text: buf.join("\n") });
    buf = [];
  };
  for (const line of text.split("\n")) {
    const m = IMG_LINE.exec(line.trim());
    if (m) {
      flush();
      parts.push({ img: { alt: m[1], src: m[2] } });
    } else buf.push(line);
  }
  flush();
  return (
    <div className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.img ? <img className="notice-img" src={p.img.src} alt={p.img.alt} loading="lazy" /> : p.text}
        </Fragment>
      ))}
    </div>
  );
}

/** 不含图片的纯文字摘要，用于折叠预览。 */
export function plainBody(text: string) {
  return text
    .split("\n")
    .filter((l) => !IMG_LINE.test(l.trim()))
    .join("\n");
}

/** 压缩到长边 ≤ 1600px 的 JPEG（PNG 透明图保持 PNG），返回 base64。 */
export async function compressImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  if (!blob) throw new Error("无法处理这张图片");
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
