import { invalidate } from "./api";

/** 学习进度变了以后，相关页面一起刷新。 */
export function refreshLearning() {
  invalidate("/api/learning", "/api/courses", "/api/heatmap");
}
