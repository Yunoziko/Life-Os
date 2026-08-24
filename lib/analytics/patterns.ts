import { formatWeekday } from "@/lib/utils/date";
import type { AnalyticsPattern, CalendarAnalytics, GoalAnalyticsItem, HabitAnalytics, ProjectAnalyticsItem, TaskTrendPoint } from "@/lib/analytics/types";
import { weekdayFromYmd } from "@/lib/habits/stats";

export function deriveAnalyticsPatterns(input: {
  timeZone: string;
  completedHours: number[];
  overdue: number;
  habits: HabitAnalytics;
  goals: GoalAnalyticsItem[];
  projects: ProjectAnalyticsItem[];
  calendar: CalendarAnalytics;
  trend: TaskTrendPoint[];
}): AnalyticsPattern[] {
  const patterns: AnalyticsPattern[] = [];

  if (input.completedHours.length >= 8) {
    const buckets = { morning: 0, afternoon: 0, evening: 0 };
    for (const hour of input.completedHours) {
      if (hour < 12) buckets.morning += 1;
      else if (hour < 17) buckets.afternoon += 1;
      else buckets.evening += 1;
    }
    const total = input.completedHours.length;
    const winner = (Object.entries(buckets) as [keyof typeof buckets, number][]).sort((a, b) => b[1] - a[1])[0];
    if (winner && winner[1] / total >= 0.5) {
      patterns.push({
        body: `You complete more tasks in the ${winner[0]} (${winner[1]} of ${total} completions with a timestamp).`,
      });
    }
  }

  if (input.habits.streakHabit) {
    const streak = input.habits.streakHabit.streak;
    patterns.push({
      body: `You’ve been consistent with ${input.habits.streakHabit.name} — current streak ${streak} day${streak === 1 ? "" : "s"}.`,
    });
  }

  const dueSoon = input.projects.filter((project) => project.attention && project.dueDate);
  if (dueSoon.length >= 2) {
    patterns.push({
      body: `${dueSoon.length} projects need attention, including upcoming or missed deadlines.`,
    });
  } else if (input.projects.filter((project) => project.dueDate).length >= 3) {
    const soon = input.projects.filter((project) => {
      if (!project.dueDate) return false;
      const days = Math.round(
        (Date.parse(project.dueDate) - Date.parse(`${input.trend.at(-1)?.date ?? ""}T00:00:00.000Z`)) / 86_400_000
      );
      return days >= 0 && days <= 14;
    });
    if (soon.length >= 2) {
      patterns.push({ body: `${soon.length} projects have deadlines within 14 days.` });
    }
  }

  if (input.calendar.busiestWeekday && input.calendar.timedEvents + input.calendar.allDayEvents >= 5) {
    patterns.push({
      body: `Your calendar is heaviest on ${input.calendar.busiestWeekday.label}s (${input.calendar.busiestWeekday.events} events in this range).`,
    });
  }

  const behind = input.goals.filter((goal) => goal.status === "behind");
  if (behind.length > 0) {
    patterns.push({
      body:
        behind.length === 1
          ? `“${behind[0].title}” is behind its linear pace to the target.`
          : `${behind.length} goals are behind their linear pace to the target.`,
    });
  }

  if (input.overdue > 0) {
    patterns.push({
      body:
        input.overdue === 1
          ? "You have 1 overdue task sitting outside this period’s completed work."
          : `You have ${input.overdue} overdue tasks sitting outside this period’s completed work.`,
    });
  }

  const weekdayCounts = new Array(7).fill(0);
  for (const point of input.trend) {
    if (point.completed === 0) continue;
    weekdayCounts[weekdayFromYmd(point.date)] += point.completed;
  }
  const peak = Math.max(...weekdayCounts);
  const peakIndex = weekdayCounts.findIndex((count) => count === peak);
  const trendTotal = weekdayCounts.reduce((sum, count) => sum + count, 0);
  if (trendTotal >= 10 && peak >= trendTotal * 0.3) {
    patterns.push({
      body: `Task completions cluster on ${formatWeekday(new Date(Date.UTC(2024, 0, 7 + peakIndex)), "UTC", "long")}s.`,
    });
  }

  return patterns.slice(0, 5);
}
