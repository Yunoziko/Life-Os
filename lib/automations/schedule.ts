import { addCalendarDays, calendarDate, formatTime, zonedDateTime } from "@/lib/utils/date";

export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type AutomationSchedule = {
  frequency: ScheduleFrequency;
  time: string;
  weekday?: number;
  monthDay?: number;
  timeZone: string;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function parseAutomationSchedule(value: unknown, fallbackTimeZone = "UTC"): AutomationSchedule | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.frequency !== "DAILY" && record.frequency !== "WEEKLY" && record.frequency !== "MONTHLY") {
    return null;
  }
  return {
    frequency: record.frequency,
    time: typeof record.time === "string" && isValidTime(record.time) ? record.time : "08:00",
    weekday: typeof record.weekday === "number" ? record.weekday : undefined,
    monthDay: typeof record.monthDay === "number" ? record.monthDay : undefined,
    timeZone: typeof record.timeZone === "string" && record.timeZone.trim() ? record.timeZone : fallbackTimeZone,
  };
}

export function calculateNextRun(
  schedule: AutomationSchedule,
  from = new Date()
): Date {
  return nextScheduledAt(schedule, from);
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

export function scheduleIdempotencyKey(automationId: string, scheduledFor: Date) {
  return `${automationId}:schedule:${scheduledFor.toISOString()}`;
}

export function formatScheduleLabel(schedule: AutomationSchedule) {
  const clock = formatClockLabel(schedule.time, schedule.timeZone);
  if (schedule.frequency === "DAILY") return `Every day at ${clock}`;
  if (schedule.frequency === "WEEKLY") {
    const day = WEEKDAYS[((schedule.weekday ?? 0) % 7 + 7) % 7];
    return `Every ${day} at ${clock}`;
  }
  const monthDay = Math.min(28, Math.max(1, schedule.monthDay ?? 1));
  return `Every month on the ${ordinal(monthDay)} at ${clock}`;
}

export function formatNextRunLabel(date: Date, timeZone: string, from = new Date()) {
  const today = calendarDate(timeZone, from);
  const target = calendarDate(timeZone, date);
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  if (target === today) return `Today, ${clock}`;
  const tomorrow = addCalendarDays(today, 1);
  if (target === tomorrow) return `Tomorrow, ${clock}`;
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${day}, ${clock}`;
}

function formatClockLabel(time: string, timeZone: string) {
  const today = calendarDate(timeZone);
  const date = zonedDateTime(today, isValidTime(time) ? time : "08:00", timeZone);
  return formatTime(date, timeZone);
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}
