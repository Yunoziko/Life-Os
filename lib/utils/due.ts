import { zonedDateTime } from "@/lib/utils/date";

export function combineDueAt(
  dueDate?: string | null,
  dueTime?: string | null,
  timeZone = "UTC"
) {
  if (!dueDate) return null;
  const time = dueTime && dueTime.trim() ? dueTime : "09:00";
  const value = zonedDateTime(dueDate, time, timeZone);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function splitDueAt(dueAt: Date | null, timeZone = "UTC") {
  if (!dueAt) {
    return { dueDate: "", dueTime: "" };
  }

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dueAt);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(dueAt);

  return { dueDate: date, dueTime: time };
}
