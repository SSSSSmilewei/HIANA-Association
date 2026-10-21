import type { Course, Unit } from "../shared/courses";
import type { SourceSeries } from "../shared/heatmap";

/** 网页用到的接口返回类型（和 src/worker/api/* 对应）。 */

export interface Me {
  role: "member" | "admin" | null;
  isAdmin?: boolean;
  bootstrap?: boolean; // 用 ADMIN_PASSWORD 登录的初始化会话，没有成员账号
  needsPassword?: boolean;
  member?: { id: string; studentNo: string; name: string; className?: string | null };
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

export interface Progress {
  doneUnits: number;
  units: number;
  donePeriods: number;
  totalPeriods: number;
  ratio: number;
}

export type EnrollStatus = "active" | "paused" | "done" | "dropped";

export type CourseSummary = Omit<Course, "units"> & {
  unitCount: number;
  learners: number;
  enrollment: { status: EnrollStatus; startedAt: number } | null;
  progress: Progress;
};

export interface CourseDetail {
  course: Course;
  enrollment: { status: EnrollStatus; startedAt: number } | null;
  done: Record<string, number>;
  progress: Progress;
  peers: string[];
}

export interface NextItem {
  slug: string;
  title: string;
  area: string;
  next: Unit | null;
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
  entries: { name: string; team: string | null; contact: string | null }[];
  joined: boolean;
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
  studentNo: string;
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

export interface ImportResult {
  created: { studentNo: string; name: string; passcode: string }[];
  updated: number;
  errors: string[];
}
