import { getAIProvider, isAIConfigured } from "@/lib/ai";
import { assertAIRateLimit } from "@/lib/ai/rate-limit";
import { AIError } from "@/lib/ai/errors";
import { formatNow } from "@/lib/ai/context";
import { aiLog, publicUserRef } from "@/lib/ai/logger";
import { getLifeAnalytics } from "@/lib/db/analytics";
import { getDashboardData } from "@/lib/db/dashboard";
import {
  buildLifeAnalyticsContext,
  dailyBriefPrompt,
  weeklyReviewPrompt,
} from "@/lib/analytics/context";
import { assertAIUsage, assertCanUseFeature } from "@/lib/billing/entitlements";
import { recordAIUsage } from "@/lib/billing/usage";

export async function generateAnalyticsReview(input: {
  userId: string;
  timeZone: string;
  weekStartsOn?: number;
  kind: "weekly" | "daily";
  range?: { range?: string; from?: string; to?: string };
}) {
  if (!isAIConfigured()) {
    throw new AIError("missing_key");
  }
  await assertCanUseFeature(input.userId, "AI_WEEKLY_REVIEW");
  await assertAIRateLimit(input.userId);
  await assertAIUsage(input.userId, input.timeZone);

  const now = formatNow(input.timeZone);
  const analytics = await getLifeAnalytics(
    input.userId,
    input.timeZone,
    input.kind === "daily" ? { range: "this-week" } : (input.range ?? { range: "this-week" }),
    input.weekStartsOn ?? 1
  );

  let extra = "";
  if (input.kind === "daily") {
    const dashboard = await getDashboardData(input.userId, input.timeZone);
    extra = JSON.stringify({
      today: {
        remaining: dashboard.remainingToday,
        completed: dashboard.completedToday,
        overdue: dashboard.overdueCount,
        highPriority: dashboard.highPriorityToday,
        tasks: dashboard.todayTasks.slice(0, 8).map((task) => ({
          title: task.title,
          status: task.status,
          priority: task.priority,
          overdue: task.overdue,
        })),
        events: dashboard.upcomingEvents.slice(0, 6).map((event) => ({
          title: event.title,
          href: event.href,
        })),
        habits: dashboard.habits.map((habit) => ({
          name: habit.name,
          completedToday: habit.completedToday,
        })),
        focus: dashboard.focus,
      },
      goals: analytics.goals.slice(0, 6).map((goal) => ({
        title: goal.title,
        progress: goal.progress,
        status: goal.status,
      })),
    });
  }

  const provider = getAIProvider();
  const system = `You are LifeOS AI writing a private ${input.kind === "daily" ? "daily brief" : "weekly review"}.
Current local time: ${now.weekday}, ${now.date} ${now.time} (${now.timeZone}).
Never invent data. Never mention API keys, IDs, or implementation details.`;

  aiLog.started({ user: publicUserRef(input.userId), event: `analytics_${input.kind}` });
  const response = await provider.chat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          input.kind === "daily" ? dailyBriefPrompt() : weeklyReviewPrompt(),
          "Authorized analytics snapshot:",
          buildLifeAnalyticsContext(analytics),
          extra ? `Today snapshot:\n${extra}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  aiLog.completed({ user: publicUserRef(input.userId), event: `analytics_${input.kind}` });

  const content = response.content.trim();
  if (!content) throw new AIError("malformed");
  await recordAIUsage(input.userId, input.timeZone);
  return content;
}
