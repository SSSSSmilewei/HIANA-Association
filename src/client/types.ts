import type { CourseMeta, MetaItem, Progress } from "../shared/courses";
import type { SourceSeries } from "../shared/heatmap";

/** 网页用到的接口返回类型（和 src/worker/api/* 对应）。 */

/** 当前是谁。role 为 null 是游客（没登录）；管理员也是 member，isAdmin 为 true。 */
export interface Me {
  role: "member" | null;
  isAdmin?: boolean;
  /** displayName 只用于首页欢迎语；null 表示用真名 name */
  /** kind：campus 校内（学号登录、能签到）/ external 校外（用户名或邮箱登录）；校外账号 studentNo 是空字符串，name 是昵称 */
  member?: {
    id: string;
    kind?: "campus" | "external";
    studentNo: string;
    username?: string | null;
    email?: string | null;
    org?: string | null;
    name: string;
    displayName?: string | null;
    className?: string | null;
  };
}

export interface Calendar {
  today: string;
  semesterStart: string | null;
  week: number | null;
}

export type AttendanceKind = "evening" | "venue";
export type AttendanceStatus = "open" | "closed" | "auto_closed";

export interface AttendanceState {
  now: number;
  today: string;
  evening: {
    days: number[];
    window: [string, string];
    isDay: boolean;
    open: boolean;
    opensAt: number;
    endsAt: number;
    requireCode: boolean;
    record: { in_at: number; out_at: number | null; status: AttendanceStatus } | null;
  };
  current: { id: string; kind: AttendanceKind; inAt: number } | null;
  recent: { id: string; kind: AttendanceKind; day: string; inAt: number; outAt: number | null; status: AttendanceStatus }[];
  totals: { evening: number; venue: number };
}

export type { Progress };

export type EnrollStatus = "active" | "paused" | "done" | "dropped";

export type CourseSummary = Omit<CourseMeta, "modules" | "links"> & {
  itemCount: number;
  learners: number;
  enrollment: { status: EnrollStatus; startedAt: number } | null;
  progress: Progress;
};

export interface CourseDetail {
  course: CourseMeta;
  enrollment: { status: EnrollStatus; startedAt: number } | null;
  done: Record<string, number>;
  progress: Progress;
  peers: string[];
  /** 条目 id → 做对的练手题 id */
  solved: Record<string, string[]>;
}

export interface NextItem {
  slug: string;
  title: string;
  provider: string;
  next: MetaItem | null;
  progress: Progress;
}

export interface Notice {
  id: string;
  kind: "notice" | "competition";
  title: string;
  body: string;
  docUrl: string | null;
  groupInfo: string | null;
  deadline: string | null;
  tags: string[];
  pinned: boolean;
  author: string | null;
  createdAt: number;
  updatedAt: number;
  /** 报名名单；游客看不到（为空），人数看 entryCount */
  entries: { name: string; team: string | null; contact: string | null }[];
  entryCount: number;
  joined: boolean;
  /** 当前账号是否已确认阅读（游客恒为 false） */
  confirmed: boolean;
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

export interface Binding {
  source: string;
  handle: string;
  hasSecret: boolean;
  syncedAt: number | null;
  lastError: string | null;
}

export interface HeatmapPayload {
  today: string;
  series: SourceSeries[];
  bindings: Binding[];
  providers: ProviderInfo[];
}

export interface AdminMember {
  id: string;
  kind: "campus" | "external";
  /** 校外账号是空字符串 */
  studentNo: string;
  username: string | null;
  email: string | null;
  org: string | null;
  name: string;
  className: string | null;
  status: "active" | "archived";
  role: "member" | "admin";
  hasPassword: boolean;
  lastActiveDay: string | null;
}

export interface AdminToday {
  today: string;
  rule: { days: number[]; window: [string, string]; requireCode: boolean };
  isEveningDay: boolean;
  code: string;
  members: number;
  records: {
    id: string;
    kind: AttendanceKind;
    inAt: number;
    outAt: number | null;
    status: AttendanceStatus;
    inPhoto: string | null;
    outPhoto: string | null;
    name: string;
    studentNo: string;
  }[];
}

export interface Invite {
  id: string;
  kind: "campus" | "external";
  hint: string;
  note: string | null;
  createdAt: number;
  expiresAt: number | null;
  usedAt: number | null;
  /** studentNo：校内是学号，校外是用户名 */
  usedBy: { name: string; studentNo: string } | null;
  revokedAt: number | null;
  state: "unused" | "used" | "expired" | "revoked";
}
