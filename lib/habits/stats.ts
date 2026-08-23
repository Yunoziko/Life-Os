import { addCalendarDays, calendarDate } from "@/lib/utils/date";

export type HabitDayState = "completed" | "missed" | "pending" | "none";

export type HabitStats = {
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  completedDays: number;
  scheduledDays: number;
};

function weekKey(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const utcDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - utcDay);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekdayFromYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isHabitScheduled(
  ymd: string,
  frequency: "DAILY" | "WEEKLY",
  weekday: number
) {
  if (frequency === "DAILY") return true;
  return weekdayFromYmd(ymd) === weekday;
}

export function streakFromKeys(keys: string[], today: string) {
  const days = new Set(keys);
  if (days.size === 0) return 0;

  let cursor = today;
  if (!days.has(cursor)) {
    cursor = addCalendarDays(cursor, -1);
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

function weeklyStreak(weeks: string[], current: string) {
  const set = new Set(weeks);
  if (set.size === 0) return 0;

  let cursor = current;
  if (!set.has(cursor)) {
    const [year, week] = current.split("-W").map(Number);
    cursor = week === 1 ? `${year - 1}-W52` : `${year}-W${String(week - 1).padStart(2, "0")}`;
    if (!set.has(cursor)) return 0;
  }

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    const [year, week] = cursor.split("-W").map(Number);
    cursor = week === 1 ? `${year - 1}-W52` : `${year}-W${String(week - 1).padStart(2, "0")}`;
  }
  return streak;
}

export function calculateHabitStats(
  completedDates: string[],
  today: string,
  frequency: "DAILY" | "WEEKLY",
  weekday = 1,
  lookbackDays = 30,
  startYmd?: string
): HabitStats {
  const completed = [...new Set(completedDates)].sort();

  if (frequency === "WEEKLY") {
    const weeks = completed.map(weekKey);
    const current = weeklyStreak(weeks, weekKey(today));
    let best = 0;
    let run = 0;
    let previous: string | null = null;
    for (const week of [...new Set(weeks)].sort()) {
      if (!previous) {
        run = 1;
      } else {
        const [year, number] = week.split("-W").map(Number);
        const [prevYear, prevNumber] = previous.split("-W").map(Number);
        const consecutive =
          (year === prevYear && number === prevNumber + 1) ||
          (year === prevYear + 1 && prevNumber >= 52 && number === 1);
        run = consecutive ? run + 1 : 1;
      }
      best = Math.max(best, run);
      previous = week;
    }

    let scheduledDays = 0;
    let completedDays = 0;
    for (let offset = lookbackDays - 1; offset >= 0; offset -= 1) {
      const day = addCalendarDays(today, -offset);
      if (startYmd && day < startYmd) continue;
      if (!isHabitScheduled(day, "WEEKLY", weekday)) continue;
      scheduledDays += 1;
      if (completed.includes(day)) completedDays += 1;
    }

    return {
      currentStreak: current,
      bestStreak: best,
      completedDays,
      scheduledDays,
      completionRate: scheduledDays === 0 ? 0 : Math.round((completedDays / scheduledDays) * 100),
    };
  }

  const currentStreak = streakFromKeys(completed, today);
  let bestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of completed) {
    if (previous && addCalendarDays(previous, 1) === day) {
      run += 1;
    } else {
      run = 1;
    }
    bestStreak = Math.max(bestStreak, run);
    previous = day;
  }

  let scheduledDays = 0;
  let completedDays = 0;
  for (let offset = lookbackDays - 1; offset >= 0; offset -= 1) {
    const day = addCalendarDays(today, -offset);
    if (startYmd && day < startYmd) continue;
    scheduledDays += 1;
    if (completed.includes(day)) completedDays += 1;
  }

  return {
    currentStreak,
    bestStreak,
    completedDays,
    scheduledDays,
    completionRate: scheduledDays === 0 ? 0 : Math.round((completedDays / scheduledDays) * 100),
  };
}

export function habitHistory(
  completedDates: string[],
  today: string,
  frequency: "DAILY" | "WEEKLY",
  weekday = 1,
  days = 30,
  startYmd?: string
) {
  const completed = new Set(completedDates);
  return Array.from({ length: days }, (_, index) => {
    const date = addCalendarDays(today, -(days - 1 - index));
    const started = !startYmd || date >= startYmd;
    const scheduled = started && isHabitScheduled(date, frequency, weekday);
    let state: HabitDayState = "none";
    if (scheduled && completed.has(date)) state = "completed";
    else if (scheduled && date === today) state = "pending";
    else if (scheduled) state = "missed";
    return { date, state };
  });
}

export function habitWeekday(startDate?: Date | null, createdAt?: Date, timeZone = "UTC") {
  return weekdayFromYmd(calendarDate(timeZone, startDate ?? createdAt ?? new Date()));
}
