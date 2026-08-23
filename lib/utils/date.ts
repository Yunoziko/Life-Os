export function calendarDate(timeZone = "UTC", date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatLongDate(date = new Date(), timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime(date: Date, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addCalendarDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function utcMidnightFromCalendarDate(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function zonedDayRange(timeZone = "UTC", date = new Date()) {
  const ymd = calendarDate(timeZone, date);
  const start = zonedDateTime(ymd, "00:00", timeZone);
  const next = addCalendarDays(ymd, 1);
  const end = zonedDateTime(next, "00:00", timeZone);
  return { ymd, start, end };
}

export function zonedDateTime(ymd: string, time: string, timeZone = "UTC") {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 2; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utc));

    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);

    const asUtc = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
      value("second")
    );
    utc += Date.UTC(year, month - 1, day, hour, minute, 0) - asUtc;
  }

  return new Date(utc);
}

export function calendarDaysUntil(date: Date, timeZone = "UTC") {
  const today = calendarDate(timeZone);
  const target = calendarDate(timeZone, date);
  const todayUtc = Date.parse(`${today}T00:00:00.000Z`);
  const targetUtc = Date.parse(`${target}T00:00:00.000Z`);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

export function formatRelativeDeadline(date: Date, timeZone = "UTC") {
  const days = calendarDaysUntil(date, timeZone);
  if (days < 0) return days === -1 ? "Overdue by 1 day" : `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function formatEventDuration(
  startAt: Date,
  endAt: Date | null,
  allDay: boolean
) {
  if (allDay) return "All day";
  if (!endAt) return null;
  const minutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
