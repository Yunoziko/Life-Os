import { addCalendarDays, calendarDate, zonedDateTime } from "@/lib/utils/date";

export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type AutomationSchedule = {
  frequency: ScheduleFrequency;
  time: string;
  weekday?: number;
  monthDay?: number;
  timeZone: string;
};

export function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function nextScheduledAt(schedule: AutomationSchedule, from = new Date()): Date {
  const time = isValidTime(schedule.time) ? schedule.time : "08:00";
  const timeZone = schedule.timeZone || "UTC";
  const today = calendarDate(timeZone, from);
  let candidate = zonedDateTime(today, time, timeZone);

  const weekday = ((schedule.weekday ?? 1) % 7 + 7) % 7;
  const monthDay = Math.min(28, Math.max(1, schedule.monthDay ?? 1));

  for (let i = 0; i < 62; i += 1) {
    const ymd = calendarDate(timeZone, candidate);
    const day = zonedDateTime(ymd, time, timeZone);
    if (day.getTime() <= from.getTime()) {
      candidate = zonedDateTime(addCalendarDays(ymd, 1), time, timeZone);
      continue;
    }
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      day: "numeric",
    }).formatToParts(day);
    const weekdayLabel = parts.find((part) => part.type === "weekday")?.value;
    const dayNumber = Number(parts.find((part) => part.type === "day")?.value);
    const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayLabel ?? "Mon");

    if (schedule.frequency === "DAILY") return day;
    if (schedule.frequency === "WEEKLY" && weekdayIndex === weekday) return day;
    if (schedule.frequency === "MONTHLY" && dayNumber === monthDay) return day;
    candidate = zonedDateTime(addCalendarDays(ymd, 1), time, timeZone);
  }

  return zonedDateTime(addCalendarDays(today, 1), time, timeZone);
}

export function scheduleIdempotencyKey(automationId: string, schedule: AutomationSchedule, at = new Date()) {
  const ymd = calendarDate(schedule.timeZone || "UTC", at);
  if (schedule.frequency === "WEEKLY") {
    const week = weekStamp(at, schedule.timeZone || "UTC");
    return `${automationId}:schedule:${week}`;
  }
  if (schedule.frequency === "MONTHLY") {
    return `${automationId}:schedule:${ymd.slice(0, 7)}`;
  }
  return `${automationId}:schedule:${ymd}`;
}

function weekStamp(date: Date, timeZone: string) {
  const ymd = calendarDate(timeZone, date);
  const utc = Date.parse(`${ymd}T00:00:00.000Z`);
  const week = Math.floor(utc / (7 * 86_400_000));
  return `W${week}`;
}
