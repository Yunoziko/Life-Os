import type { LifeAnalytics } from "@/lib/analytics/types";

export function buildLifeAnalyticsContext(analytics: LifeAnalytics) {
  return JSON.stringify(
    {
      range: {
        label: analytics.range.label,
        start: analytics.range.startYmd,
        end: analytics.range.endYmd,
      },
      overview: analytics.overview,
      momentum: {
        score: analytics.momentum.score,
        delta: analytics.momentum.delta,
        pillars: analytics.momentum.pillars.map((pillar) => ({
          label: pillar.label,
          score: pillar.score,
          note: pillar.note,
        })),
      },
      goals: analytics.goals.map((goal) => ({
        title: goal.title,
        progress: goal.progress,
        status: goal.status,
        velocityPerWeek: goal.velocity,
        targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : null,
      })),
      projects: analytics.projects.map((project) => ({
        name: project.name,
        percent: project.percent,
        remaining: project.remaining,
        attention: project.attention,
        dueDate: project.dueDate ? project.dueDate.slice(0, 10) : null,
      })),
      habits: {
        overallRate: analytics.habits.overallRate,
        currentStreak: analytics.habits.currentStreak,
        bestStreak: analytics.habits.bestStreak,
        mostConsistent: analytics.habits.mostConsistent?.name ?? null,
        leastConsistent: analytics.habits.leastConsistent?.name ?? null,
        streakHabit: analytics.habits.streakHabit
          ? { name: analytics.habits.streakHabit.name, streak: analytics.habits.streakHabit.streak }
          : null,
        leastConsistent: analytics.habits.leastConsistent?.name ?? null,
      },
      calendar: {
        using: analytics.calendar.using,
        scheduledHours: analytics.calendar.scheduledHours,
        focusHours: analytics.calendar.focusHours,
        meetingHours: analytics.calendar.meetingHours,
        events: analytics.calendar.timedEvents + analytics.calendar.allDayEvents,
        busiestWeekday: analytics.calendar.busiestWeekday?.label ?? null,
      },
      github: analytics.github.connected
        ? {
            commits: analytics.github.commits,
            pullRequests: analytics.github.pullRequests,
            issues: analytics.github.issues,
            repos: analytics.github.repos.map((repo) => repo.name),
          }
        : { connected: false },
      email: analytics.email.connected
        ? {
            found: analytics.email.found,
            categories: analytics.email.categories,
            importantSubjects: analytics.email.important.map((item) => item.subject),
          }
        : { connected: false },
      patterns: analytics.patterns.map((pattern) => pattern.body),
    },
    null,
    0
  );
}

export function weeklyReviewPrompt() {
  return `Write a weekly review from the authorized LifeOS analytics snapshot only.

Cover, in short markdown:
- What went well
- What was difficult
- Goals that progressed
- Goals at risk or behind (use the provided status, do not relabel)
- Habit consistency
- Important upcoming deadlines
- Recommended focus for next week

Rules:
- Do not invent records, numbers, emails, or GitHub activity.
- If a source is disconnected or empty, say so briefly.
- Never mention IDs, APIs, or internal formulas.
- Keep it under 250 words.`;
}

export function dailyBriefPrompt() {
  return `Write a daily brief from the authorized LifeOS snapshot only.

Summarize today's tasks, calendar, habits, and any goal that is at risk or behind.
If external sources are connected, mention them only when the snapshot includes them.

Rules:
- Do not invent records or times.
- Prefer one concrete next action.
- Keep it under 120 words.`;
}
