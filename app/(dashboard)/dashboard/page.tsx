import { requireUser } from "@/lib/auth/session";
import { dashboardStatusLine, getDashboardData } from "@/lib/db/dashboard";
import { deriveDashboardInsight } from "@/lib/ai/insight";
import { firstName, greetingForHour } from "@/lib/utils/greeting";
import { formatLongDate } from "@/lib/utils/date";
import { FadeIn } from "@/components/dashboard/fade-in";
import { TodayStrip } from "@/components/dashboard/today-strip";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { FocusCard } from "@/components/dashboard/focus-card";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { ActiveGoals } from "@/components/dashboard/active-goals";
import { CurrentlyLearning } from "@/components/dashboard/currently-learning";
import { HabitOverview } from "@/components/dashboard/habit-overview";
import { AiInsight } from "@/components/dashboard/ai-insight";
import { MomentumCard } from "@/components/dashboard/momentum-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { getMomentumSnapshot } from "@/lib/db/analytics";

export const metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const [data, momentum] = await Promise.all([
    getDashboardData(user.id, timezone),
    getMomentumSnapshot(user.id, timezone, user.profile?.weekStartsOn ?? 1),
  ]);
  const name = firstName(user.profile?.displayName ?? user.name);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
  );
  const greeting = greetingForHour(Number.isFinite(hour) ? hour : new Date().getHours());
  const insight = deriveDashboardInsight(data);
  const status = dashboardStatusLine(data);

  return (
    <div className="space-y-6">
      <FadeIn>
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">{formatLongDate(new Date(), timezone)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}
            {name ? `, ${name}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground">Here’s your overview for today.</p>
          <p className="text-sm text-foreground/80">{status}</p>
        </header>
      </FadeIn>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)] lg:grid-rows-[auto_auto_auto_auto] lg:items-start">
        <FadeIn delay={0.04} className="lg:col-start-1 lg:row-start-1">
          <TodayStrip
            completedToday={data.completedToday}
            remainingToday={data.remainingToday}
            overdueCount={data.overdueCount}
            currentStreak={data.currentStreak}
          />
        </FadeIn>
        <FadeIn delay={0.08} className="lg:col-start-1 lg:row-start-2">
          <TodayTasks tasks={data.todayTasks} timezone={timezone} />
        </FadeIn>
        <FadeIn delay={0.12} className="lg:col-start-1 lg:row-start-3">
          <FocusCard focus={data.focus} />
        </FadeIn>
        <FadeIn delay={0.1} className="lg:col-start-2 lg:row-start-1">
          <UpcomingEvents events={data.upcomingEvents} timezone={timezone} />
        </FadeIn>
        <FadeIn delay={0.16} className="space-y-4 lg:col-start-1 lg:row-start-4">
          <ActiveGoals goals={data.activeGoals} timezone={timezone} />
          <CurrentlyLearning items={data.currentlyLearning} />
        </FadeIn>
        <FadeIn delay={0.14} className="lg:col-start-2 lg:row-start-2">
          <HabitOverview habits={data.habits} />
        </FadeIn>
        <FadeIn delay={0.18} className="space-y-4 lg:col-start-2 lg:row-start-3">
          {momentum.hasAnyData ? (
            <MomentumCard score={momentum.score} delta={momentum.delta} insight={momentum.insight} />
          ) : null}
          <AiInsight insight={insight} />
        </FadeIn>
        <FadeIn delay={0.2} className="lg:col-start-2 lg:row-start-4">
          <QuickActions />
        </FadeIn>
      </div>
    </div>
  );
}
