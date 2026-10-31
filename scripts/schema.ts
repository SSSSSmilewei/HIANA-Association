// 生成课程包和知识块的 JSON Schema：npx tsx scripts/schema.ts（改了 src/shared/package.ts 或 blockSchema.ts 之后跑一次）
import { writeFileSync } from "node:fs";
import { blockJsonSchema } from "../src/shared/blockSchema";
import { packageJsonSchema } from "../src/shared/package";

writeFileSync("content/schema/course-v1.json", JSON.stringify(packageJsonSchema(), null, 1) + "\n");
writeFileSync("content/schema/block-v1.json", JSON.stringify(blockJsonSchema(), null, 1) + "\n");
