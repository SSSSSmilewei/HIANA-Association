import { cnToday, weekday } from "./api";
import type { AttendanceKind, AttendanceState } from "./types";

/** 把签到接口的状态归成几种情况，首页卡片和签到页共用。 */
export type Phase =
  | { kind: "in"; scene: AttendanceKind; inAt: number; minutes: number; endsAt: number }
  | { kind: "evening-open"; remaining: number }
  | { kind: "evening-done"; inAt: number; outAt: number | null; auto: boolean }
  | { kind: "evening-later"; opensAt: number }
  | { kind: "no-evening"; next: string | null };

const DAY_NAMES = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function venueEnd(day: string) {
  return Date.parse(`${day}T23:59:59+08:00`);
}

/** 下一次晚自习是星期几（不含今天已经结束的那次）。 */
export function nextEvening(days: number[], today: string, laterToday: boolean): string | null {
  if (!days.length) return null;
  const wd = ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // 1 = 周一
  if (laterToday && days.includes(wd)) return "今天";
  for (let i = 1; i <= 7; i++) {
    const d = ((wd - 1 + i) % 7) + 1;
    if (days.includes(d)) return i === 1 ? "明天" : DAY_NAMES[d];
  }
  return null;
}

export function phaseOf(s: AttendanceState, now: number): Phase {
  if (s.current) {
    const endsAt = s.current.kind === "evening" ? s.evening.endsAt : venueEnd(s.today);
    return { kind: "in", scene: s.current.kind, inAt: s.current.inAt, minutes: Math.max(0, Math.floor((now - s.current.inAt) / 60000)), endsAt };
  }
  const ev = s.evening;
  if (ev.isDay && ev.record) return { kind: "evening-done", inAt: ev.record.in_at, outAt: ev.record.out_at, auto: ev.record.status === "auto_closed" };
  if (ev.isDay && now < ev.opensAt) return { kind: "evening-later", opensAt: ev.opensAt };
  if (ev.isDay && now <= ev.endsAt) return { kind: "evening-open", remaining: Math.max(0, Math.round((ev.endsAt - now) / 60000)) };
  return { kind: "no-evening", next: nextEvening(ev.days, s.today, false) };
}

export function daysText(days: number[]): string {
  return days.map((d) => DAY_NAMES[d]).join("、");
}

export const KIND_LABEL: Record<AttendanceKind, string> = { evening: "晚自习", venue: "大创场地" };

export function todayLabel(day = cnToday()) {
  return weekday(day);
}
