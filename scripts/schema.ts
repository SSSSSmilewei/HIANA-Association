// 生成课程包的 JSON Schema：npx tsx scripts/schema.ts（改了 src/shared/package.ts 之后跑一次）
import { writeFileSync } from "node:fs";
import { packageJsonSchema } from "../src/shared/package";

writeFileSync("content/schema/course-v1.json", JSON.stringify(packageJsonSchema(), null, 1) + "\n");
