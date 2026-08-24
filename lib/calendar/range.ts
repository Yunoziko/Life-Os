import { addCalendarDays, calendarDate, zonedDateTime } from "@/lib/utils/date";

export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export function weekdayIndex(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function startOfWeek(ymd: string, weekStartsOn = 1) {
  const diff = (weekdayIndex(ymd) - weekStartsOn + 7) % 7;
  return addCalendarDays(ymd, -diff);
}

export function firstOfMonth(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

export function lastOfMonth(ymd: string) {
  const [year, month] = ymd.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${ymd.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function daysBetween(start: string, end: string) {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export function visibleCalendarRange(
  view: CalendarView,
  ymd: string,
  timeZone = "UTC",
  weekStartsOn = 1
) {
  void timeZone;
  if (view === "day") {
    return { startYmd: ymd, endYmd: ymd, days: [ymd] };
  }

  if (view === "week") {
    const startYmd = startOfWeek(ymd, weekStartsOn);
    const endYmd = addCalendarDays(startYmd, 6);
    return { startYmd, endYmd, days: daysBetween(startYmd, endYmd) };
  }

  if (view === "agenda") {
    const endYmd = addCalendarDays(ymd, 13);
    return { startYmd: ymd, endYmd, days: daysBetween(ymd, endYmd) };
  }

  const monthStart = firstOfMonth(ymd);
  const monthEnd = lastOfMonth(ymd);
  const startYmd = startOfWeek(monthStart, weekStartsOn);
  let endYmd = startOfWeek(monthEnd, weekStartsOn);
  endYmd = addCalendarDays(endYmd, 6);
  return { startYmd, endYmd, days: daysBetween(startYmd, endYmd) };
}

export function rangeBounds(startYmd: string, endYmd: string, timeZone = "UTC") {
  const start = zonedDateTime(startYmd, "00:00", timeZone);
  const end = zonedDateTime(addCalendarDays(endYmd, 1), "00:00", timeZone);
  return { start, end };
}

export function parseCalendarView(value?: string): CalendarView | null {
  return CALENDAR_VIEWS.includes(value as CalendarView) ? (value as CalendarView) : null;
}

export function parseCalendarDate(value?: string, timeZone = "UTC") {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return calendarDate(timeZone);
}

export function timeBand(hour: number) {
  if (hour < 12) return "morning" as const;
  if (hour < 17) return "afternoon" as const;
  return "evening" as const;
}
