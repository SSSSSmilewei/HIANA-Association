import type { Week } from "./content";
import type { Daily, SourceSeries } from "./heatmap";

/** 前后端共用的接口返回类型。 */

export interface Me {
  role: "member" | "admin" | null;
  needsPassword?: boolean; // 刚用口令激活，还没设置自己的密码
  member?: { id: string; studentNo: string; name: string; className?: string | null };
}

export interface ProviderInfo {
  id: string;
  label: string;
  unit: string;
  category: "code" | "algo" | "english";
  status: "official" | "unofficial" | "pending";
  coverage: "history" | "snapshot";
  handleHint: string;
  needsUserSecret: string | null;
}

export interface BindingInfo {
  source: string;
  handle: string;
  hasSecret: boolean;
  syncedAt: number | null;
  lastError: string | null;
}

export interface HeatmapPayload {
  today: string;
  series: SourceSeries[];
  bindings: BindingInfo[];
  providers: ProviderInfo[];
}

export interface CheckinState {
  today: string;
  window: string;
  requireCode: boolean;
  checkedAt: number | null;
  total: number;
}

export type CheckinResponse = { ok: true; day: string; at: number } | { ok: false; reason: "already"; day: string; at: number };

export interface AdminMember {
  id: string;
  studentNo: string;
  name: string;
  className: string | null;
  status: "active" | "archived";
  hasPassword: boolean;
  lastActiveDay: string | null;
}

export interface AdminCheckinToday {
  today: string;
  window: string;
  requireCode: boolean;
  code: string;
  count: number;
  total: number;
}

export interface ImportResult {
  created: { studentNo: string; name: string; passcode: string }[];
  updated: number;
  errors: string[];
}

/** 登录、激活接口的返回；只有请求头带 `X-Hiana-Client: app` 时才有 token。 */
export interface LoginResponse extends Me {
  token?: string;
}

export interface CourseResponse {
  track: { name: string; weeks: Week[] };
  currentWeek: number;
}

export interface AppVersion {
  latest: string;
  min: string;
  apkUrl: string | null;
}

export type { Daily, SourceSeries, Week };
