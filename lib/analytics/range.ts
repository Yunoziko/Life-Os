import { addCalendarDays, calendarDate, utcMidnightFromCalendarDate, zonedDateTime, zonedDayRange } from "@/lib/utils/date";
import { weekdayFromYmd } from "@/lib/habits/stats";

export const ANALYTICS_RANGES = [
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "last-30", label: "Last 30 days" },
  { id: "last-90", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
] as const;

export type AnalyticsRangeId = (typeof ANALYTICS_RANGES)[number]["id"];

export type AnalyticsRange = {
  id: AnalyticsRangeId;
  label: string;
  startYmd: string;
  endYmd: string;
  start: Date;
  end: Date;
  dayCount: number;
  fromParam?: string;
  toParam?: string;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isAnalyticsRangeId(value: string | undefined): value is AnalyticsRangeId {
  return ANALYTICS_RANGES.some((item) => item.id === value);
}

export function startOfWeekYmd(ymd: string, weekStartsOn = 1) {
  const weekday = weekdayFromYmd(ymd);
  const start = ((weekStartsOn % 7) + 7) % 7;
  const offset = (weekday - start + 7) % 7;
  return addCalendarDays(ymd, -offset);
}

function enumerateLength(startYmd: string, endYmd: string) {
  const start = Date.parse(`${startYmd}T00:00:00.000Z`);
  const end = Date.parse(`${endYmd}T00:00:00.000Z`);
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export function eachCalendarDay(startYmd: string, endYmd: string) {
  const days: string[] = [];
  let cursor = startYmd;
  while (cursor <= endYmd) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export function resolveAnalyticsRange(
  timeZone: string,
  input: { range?: string; from?: string; to?: string },
  weekStartsOn = 1
): AnalyticsRange {
  const today = zonedDayRange(timeZone);
  const id = isAnalyticsRangeId(input.range) ? input.range : "this-week";

  if (id === "custom") {
    const from = input.from && YMD.test(input.from) ? input.from : addCalendarDays(today.ymd, -29);
    let to = input.to && YMD.test(input.to) ? input.to : today.ymd;
    if (to > today.ymd) to = today.ymd;
    let startYmd = from <= to ? from : to;
    const endYmd = from <= to ? to : from;
    if (enumerateLength(startYmd, endYmd) > 180) {
      startYmd = addCalendarDays(endYmd, -179);
    }
    return {
      id: "custom",
      label: `${startYmd} → ${endYmd}`,
      startYmd,
      endYmd,
      start: zonedDateTime(startYmd, "00:00", timeZone),
      end: zonedDayRange(timeZone, utcMidnightFromCalendarDate(endYmd)).end,
      dayCount: enumerateLength(startYmd, endYmd),
      fromParam: startYmd,
      toParam: endYmd,
    };
  }

  if (id === "last-week") {
    const thisWeekStart = startOfWeekYmd(today.ymd, weekStartsOn);
    const startYmd = addCalendarDays(thisWeekStart, -7);
    const endYmd = addCalendarDays(thisWeekStart, -1);
    return {
      id,
      label: "Last week",
      startYmd,
      endYmd,
      start: zonedDateTime(startYmd, "00:00", timeZone),
      end: zonedDayRange(timeZone, utcMidnightFromCalendarDate(endYmd)).end,
      dayCount: enumerateLength(startYmd, endYmd),
    };
  }

  if (id === "last-30") {
    const startYmd = addCalendarDays(today.ymd, -29);
    return {
      id,
      label: "Last 30 days",
      startYmd,
      endYmd: today.ymd,
      start: zonedDateTime(startYmd, "00:00", timeZone),
      end: today.end,
      dayCount: 30,
    };
  }

  if (id === "last-90") {
    const startYmd = addCalendarDays(today.ymd, -89);
    return {
      id,
      label: "Last 90 days",
      startYmd,
      endYmd: today.ymd,
      start: zonedDateTime(startYmd, "00:00", timeZone),
      end: today.end,
      dayCount: 90,
    };
  }

  const startYmd = startOfWeekYmd(today.ymd, weekStartsOn);
  return {
    id: "this-week",
    label: "This week",
    startYmd,
    endYmd: today.ymd,
    start: zonedDateTime(startYmd, "00:00", timeZone),
    end: today.end,
    dayCount: enumerateLength(startYmd, today.ymd),
  };
}

export function previousAnalyticsRange(range: AnalyticsRange, timeZone: string): AnalyticsRange {
  const startYmd = addCalendarDays(range.startYmd, -range.dayCount);
  const endYmd = addCalendarDays(range.startYmd, -1);
  return {
    id: "custom",
    label: "Previous period",
    startYmd,
    endYmd,
    start: zonedDateTime(startYmd, "00:00", timeZone),
    end: zonedDayRange(timeZone, utcMidnightFromCalendarDate(endYmd)).end,
    dayCount: enumerateLength(startYmd, endYmd),
  };
}

export function lookbackStart(timeZone: string, days: number) {
  const today = calendarDate(timeZone);
  const startYmd = addCalendarDays(today, -(days - 1));
  return {
    today,
    startYmd,
    start: zonedDateTime(startYmd, "00:00", timeZone),
    end: zonedDayRange(timeZone).end,
    midnight: utcMidnightFromCalendarDate(startYmd),
    todayMidnight: utcMidnightFromCalendarDate(today),
  };
}
