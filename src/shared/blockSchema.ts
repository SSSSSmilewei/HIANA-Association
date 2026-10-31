import { z } from "zod/v4";
import { BLOCK_FORMAT, type BlockNode as BlockNodeType } from "./blocks";

/** 知识块 hiana-block@1 的校验（格式说明见 ./blocks.ts） */

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{1,47}$/, "只能用小写字母、数字和连字符，2–48 个字符");
const courseSlug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/, "要写课程的 slug");

export const BlockNode: z.ZodType<BlockNodeType> = z.lazy(() =>
  z
    .object({
      title: z.string().min(1).max(80).optional(),
      note: z.string().max(400).optional(),
      course: courseSlug.optional(),
      items: z.array(courseSlug).max(40).optional(),
      link: z.object({ label: z.string().min(1).max(80), url: z.string().regex(/^(https?:\/\/|\/)\S+$/, "要是 https:// 开头的网址或站内路径") }).optional(),
      children: z.array(BlockNode).min(1).max(40).optional(),
      pick: z.number().int().min(1).optional(),
      optional: z.boolean().optional(),
    })
    .superRefine((n, ctx) => {
      const kinds = [n.course, n.link, n.children].filter(Boolean).length;
      if (kinds !== 1) ctx.addIssue({ code: "custom", message: "每个节点只能是一种：分组（children）、课程（course）或链接（link）" });
      if (n.children && !n.title) ctx.addIssue({ code: "custom", message: "分组要有 title" });
      if (n.pick && !(n.children && n.pick <= n.children.length)) ctx.addIssue({ code: "custom", message: "pick 只能用在分组上，而且不能比子节点多" });
      if (n.items && !n.course) ctx.addIssue({ code: "custom", message: "items 只能用在课程节点上" });
    }),
);

export const Block = z.object({
  format: z.literal(BLOCK_FORMAT),
  slug,
  title: z.string().min(1).max(40),
  summary: z.string().max(120).default(""),
  audience: z.string().max(80).optional(),
  intro: z.string().max(20_000).optional(),
  nodes: z.array(BlockNode).min(1).max(40),
  next: z.array(slug).default([]),
});

export function parseBlock(raw: unknown): { ok: true; block: z.infer<typeof Block> } | { ok: false; errors: string[] } {
  const r = Block.safeParse(raw);
  if (r.success) return { ok: true, block: r.data };
  return { ok: false, errors: r.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "知识块"}：${i.message}`) };
}

export function blockJsonSchema() {
  return { $id: "https://study.shanmoew-denied.win/schema/block-v1.json", title: "hiana-block@1 知识块", ...z.toJSONSchema(Block, { io: "input" }) };
}
