import Link from "next/link";
import { CalendarDays, Goal, Repeat, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/db/dashboard";
import { firstName, greetingForHour } from "@/lib/utils/greeting";
import { formatLongDate, formatShortDate, formatTime } from "@/lib/utils/date";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { SectionCard } from "@/components/dashboard/section-card";
import { TaskCompleteButton } from "@/components/dashboard/task-complete-button";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const data = await getDashboardData(user.id);
  const name = firstName(user.profile?.displayName ?? user.name);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(
      new Date()
    )
  );
  const greeting = greetingForHour(Number.isFinite(hour) ? hour : new Date().getHours());
  const averageGoalProgress =
    data.activeGoals.length > 0
      ? Math.round(
          data.activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / data.activeGoals.length
        )
      : null;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatLongDate(new Date(), timezone)}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
      </header>

      {!data.hasAnyData ? (
        <EmptyState
          icon={Sparkles}
          title="Your workspace is ready."
          description="LifeOS stays quiet until you add something real. Start with one task or a single goal — nothing here is fabricated."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <CreateTrigger type="task">Create a task</CreateTrigger>
              <CreateTrigger type="goal" variant="outline">
                Add a goal
              </CreateTrigger>
            </div>
          }
        />
      ) : (
        <>
          <OverviewStats
            completedToday={data.completedToday}
            remainingToday={data.remainingToday}
            currentStreak={data.currentStreak}
            goalProgress={averageGoalProgress}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Today’s tasks">
              {data.todayTasks.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Nothing scheduled for today. Add a task if something needs your attention.
                  </p>
                  <CreateTrigger type="task" size="sm">
                    Create task
                  </CreateTrigger>
                </div>
              ) : (
                <ul className="space-y-2">
                  {data.todayTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-3 rounded-xl px-1 py-1.5">
                      <TaskCompleteButton taskId={task.id} done={task.status === "DONE"} />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm",
                            task.status === "DONE" && "text-muted-foreground line-through"
                          )}
                        >
                          {task.title}
                        </p>
                        {task.dueAt ? (
                          <p className="text-xs text-muted-foreground">
                            {formatShortDate(task.dueAt, timezone)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Upcoming events">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  No events in the next two weeks. Your calendar stays empty until you add one.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.upcomingEvents.map((event) => (
                    <li key={event.id} className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(event.startAt, timezone)}
                          {event.allDay ? "" : ` · ${formatTime(event.startAt, timezone)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Active goals">
              {data.activeGoals.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    No active goals yet. When you add one, progress will live here.
                  </p>
                  <CreateTrigger type="goal" size="sm" variant="outline">
                    Create goal
                  </CreateTrigger>
                </div>
              ) : (
                <ul className="space-y-4">
                  {data.activeGoals.map((goal) => (
                    <li key={goal.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm">
                          <Goal className="size-3.5 text-muted-foreground" />
                          {goal.title}
                        </p>
                        <span className="text-xs text-muted-foreground">{goal.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/80"
                          style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Habit progress">
              {data.habits.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Habits will appear here once you start tracking them.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.habits.map((habit) => {
                    const doneToday = habit.logs.some((log) => {
                      const date = log.date.toISOString().slice(0, 10);
                      const today = new Date().toISOString().slice(0, 10);
                      return log.completed && date === today;
                    });
                    return (
                      <li key={habit.id} className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm">
                          <Repeat className="size-3.5 text-muted-foreground" />
                          {habit.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {doneToday ? "Done today" : "Not yet"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}

      <SectionCard title="AI insight">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background">
            <Sparkles className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-sm leading-6 text-muted-foreground">
              {data.hasAnyData
                ? "As this workspace fills in, LifeOS will summarize patterns — not invent activity. The assistant is prepared, but no model is connected yet."
                : "Add a few real items first. Insights stay empty until there is something true to observe."}
            </p>
            <Link href="/ai" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-0")}>
              Open AI assistant
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
