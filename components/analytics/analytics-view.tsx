import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { CompletionChart } from "@/components/analytics/completion-chart";
import { HabitHeatmap } from "@/components/analytics/habit-heatmap";
import { AnalyticsReviews } from "@/components/analytics/analytics-reviews";
import { ProGate } from "@/components/billing/pro-gate";
import { formatRelativeDeadline } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { AnalyticsRangeId } from "@/lib/analytics/range";
import type { GoalTrackStatus } from "@/lib/analytics/classify";
import type { LifeAnalytics } from "@/lib/analytics/types";

const TRACK_LABEL: Record<GoalTrackStatus, string> = {
  on_track: "On track",
  at_risk: "At risk",
  behind: "Behind",
};

export type SerializedAnalytics = Omit<LifeAnalytics, "range"> & {
  range: Omit<LifeAnalytics["range"], "start" | "end"> & { start: string; end: string };
};

export function serializeAnalytics(analytics: LifeAnalytics): SerializedAnalytics {
  return {
    ...analytics,
    range: {
      ...analytics.range,
      start: analytics.range.start.toISOString(),
      end: analytics.range.end.toISOString(),
    },
  };
}

export function AnalyticsView({
  analytics,
  timezone,
  configured,
  advanced = false,
}: {
  analytics: SerializedAnalytics;
  timezone: string;
  configured: boolean;
  advanced?: boolean;
}) {
  const rangeId = analytics.range.id as AnalyticsRangeId;
  const chartWindow: 7 | 30 | 90 = analytics.range.dayCount >= 90 ? 90 : analytics.range.dayCount >= 30 ? 30 : 7;

  if (!analytics.hasAnyData) {
    return (
      <div className="space-y-6">
        <AnalyticsFilters range={rangeId} from={analytics.range.fromParam} to={analytics.range.toParam} />
        <EmptyState
          icon={BarChart3}
          title="Your story is just getting started."
          description="Your life, organized intelligently. Use AZIO for a while and we'll show you meaningful patterns — nothing here is invented."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsFilters range={rangeId} from={analytics.range.fromParam} to={analytics.range.toParam} />
      <p className="text-xs leading-5 text-muted-foreground">
        AZIO Analytics are generated from the data you choose to keep in AZIO and the integrations you
        connect. Showing {analytics.range.label.toLowerCase()}.
      </p>
      <OverviewGrid analytics={analytics} />
      <CompletionChart
        series={analytics.taskTrend}
        timezone={timezone}
        defaultWindow={advanced ? chartWindow : 7}
        windows={advanced ? [7, 30, 90] : [7]}
      />
      <HabitsBlock analytics={analytics} advanced={advanced} />
      <GoalsBlock analytics={analytics} timezone={timezone} />
      <ProjectsBlock analytics={analytics} timezone={timezone} />
      {advanced ? (
        <>
          <CalendarBlock analytics={analytics} />
          <GitHubBlock analytics={analytics} />
          <EmailBlock analytics={analytics} />
          <PatternsBlock analytics={analytics} />
        </>
      ) : (
        <ProGate feature="ADVANCED_ANALYTICS" title="Advanced analytics">
          Time analysis, GitHub, email, patterns, and longer trends are part of AZIO Pro.
        </ProGate>
      )}
      <div id="momentum">
        <MomentumBlock analytics={analytics} />
      </div>
      <div id="review">
        {advanced ? (
          <AnalyticsReviews
            range={rangeId}
            from={analytics.range.fromParam}
            to={analytics.range.toParam}
            configured={configured}
          />
        ) : (
          <ProGate feature="AI_WEEKLY_REVIEW" title="Weekly review">
            AI weekly reviews and daily briefs are included with Pro.
          </ProGate>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  compact,
}: {
  label: string;
  value: string | number;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(!compact && "rounded-2xl border border-border/70 bg-card p-4 shadow-sm")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function OverviewGrid({ analytics }: { analytics: SerializedAnalytics }) {
  const { overview, github } = analytics;
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Metric label="Tasks completed" value={overview.tasksCompleted} />
      <Metric label="Tasks created" value={overview.tasksCreated} />
      <Metric
        label="Completion rate"
        value={overview.completionRate === null ? "—" : `${overview.completionRate}%`}
        hint="Completed this period relative to created, capped at 100%."
      />
      <Metric label="Overdue tasks" value={overview.overdueTasks} />
      <Metric label="Goals progressed" value={overview.goalsProgressed} hint="Goals with a task completed in this range." />
      <Metric label="Habits completed" value={overview.habitsCompleted} hint="Scheduled habit check-ins completed." />
      <Metric
        label="Projects progressed"
        value={overview.projectsProgressed}
        hint="Projects with a task completed in this range."
      />
      <Metric
        label="Calendar hours"
        value={overview.calendarHours}
        hint="Timed events only. All-day events are counted separately below."
      />
      <Metric
        label="GitHub activity"
        value={overview.githubActivity === null ? "—" : overview.githubActivity}
        hint={github.connected ? "Commits, pull requests, and issues in this range." : "Connect GitHub to include this."}
      />
    </section>
  );
}

function HabitsBlock({ analytics, advanced }: { analytics: SerializedAnalytics; advanced: boolean }) {
  const habits = analytics.habits;
  return (
    <SectionCard title="Habit consistency">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Overall completion" value={habits.overallRate === null ? "—" : `${habits.overallRate}%`} compact />
        <Metric label="Current streak" value={habits.currentStreak} compact />
        <Metric label="Best streak" value={habits.bestStreak} compact />
        <Metric
          label="Most consistent"
          value={habits.mostConsistent ? `${habits.mostConsistent.name} (${habits.mostConsistent.rate}%)` : "—"}
          compact
        />
        <Metric
          label="Least consistent"
          value={habits.leastConsistent ? `${habits.leastConsistent.name} (${habits.leastConsistent.rate}%)` : "—"}
          compact
        />
      </div>
      {advanced && habits.heatmap.some((day) => day.scheduled > 0) ? (
        <HabitHeatmap days={habits.heatmap} />
      ) : advanced ? (
        <p className="text-sm text-muted-foreground">No scheduled habits in this window yet.</p>
      ) : (
        <p className="text-sm text-muted-foreground">The activity heatmap is part of AZIO Pro.</p>
      )}
    </SectionCard>
  );
}

function GoalsBlock({ analytics, timezone }: { analytics: SerializedAnalytics; timezone: string }) {
  return (
    <SectionCard title="Goal momentum">
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        Status uses a linear pace from the day the goal was created to its target date. A gap of 10 points is at
        risk; 25 points, or a passed target, is behind. No target date is only flagged after 21 days at 0%.
      </p>
      {analytics.goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active goals to score.</p>
      ) : (
        <ul className="space-y-4">
          {analytics.goals.map((goal) => (
            <li key={goal.id} className="rounded-xl border border-border/60 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/goals/${goal.id}`} className="text-sm font-medium hover:underline">
                    {goal.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{goal.reason}</p>
                </div>
                <p className="shrink-0 text-xs font-medium">{TRACK_LABEL[goal.status]}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{goal.progress}% now</span>
                {goal.expected !== null ? <span>{goal.expected}% expected</span> : null}
                <span>{goal.velocity}% / week</span>
                <span>
                  {goal.targetDate ? formatRelativeDeadline(new Date(goal.targetDate), timezone) : "No target date"}
                </span>
              </div>
              <ProgressBar value={goal.progress} label={`${goal.title} progress`} className="mt-2" />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ProjectsBlock({ analytics, timezone }: { analytics: SerializedAnalytics; timezone: string }) {
  return (
    <SectionCard title="Project momentum">
      {analytics.projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active projects to score.</p>
      ) : (
        <ul className="space-y-4">
          {analytics.projects.map((project) => (
            <li key={project.id} className="rounded-xl border border-border/60 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link href={`/projects/${project.id}`} className="text-sm font-medium hover:underline">
                    {project.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{project.reason}</p>
                </div>
                <p className={cn("shrink-0 text-xs", project.attention ? "font-medium" : "text-muted-foreground")}>
                  {project.attention ? "Needs attention" : "Steady"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{project.completed} completed</span>
                <span>{project.remaining} remaining</span>
                <span>{project.percent}%</span>
                <span>
                  {project.dueDate ? formatRelativeDeadline(new Date(project.dueDate), timezone) : "No deadline"}
                </span>
              </div>
              <ProgressBar value={project.percent} label={`${project.name} completion`} className="mt-2" />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CalendarBlock({ analytics }: { analytics: SerializedAnalytics }) {
  const calendar = analytics.calendar;
  return (
    <SectionCard title="Time analysis">
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        {calendar.connectedGoogle
          ? "Includes AZIO events and Google Calendar events already synced into AZIO."
          : "Using AZIO calendar data. Connect Google Calendar in Settings to include that schedule."}{" "}
        Meetings are timed events whose title includes words like meet, call, or sync.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Scheduled hours" value={calendar.scheduledHours} compact />
        <Metric label="Focus hours" value={calendar.focusHours} compact />
        <Metric
          label="Meetings / events"
          value={`${calendar.meetingHours}h · ${calendar.timedEvents + calendar.allDayEvents} events`}
          compact
        />
        <Metric
          label="Free time"
          value={calendar.freeHours === null ? "—" : `${calendar.freeHours}h`}
          hint={calendar.freeHours === null ? "Not estimated until timed events exist." : calendar.wakingWindow}
          compact
        />
      </div>
    </SectionCard>
  );
}

function GitHubBlock({ analytics }: { analytics: SerializedAnalytics }) {
  const github = analytics.github;
  return (
    <SectionCard title="Work activity">
      {!github.connected ? (
        <p className="text-sm text-muted-foreground">
          Connect GitHub to see development activity.{" "}
          <Link href="/settings/integrations" className="underline-offset-4 hover:underline">
            Open integrations
          </Link>
        </p>
      ) : github.error ? (
        <p className="text-sm text-muted-foreground">{github.error}</p>
      ) : github.commits + github.pullRequests + github.issues === 0 ? (
        <p className="text-sm text-muted-foreground">No GitHub events landed in this range.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Commits" value={github.commits} compact />
            <Metric label="Pull requests" value={github.pullRequests} compact />
            <Metric label="Issues" value={github.issues} compact />
          </div>
          {github.repos.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {github.repos.map((repo) => (
                <li key={repo.name} className="flex justify-between gap-3 text-muted-foreground">
                  <span className="truncate">{repo.name}</span>
                  <span className="tabular-nums">{repo.events}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function EmailBlock({ analytics }: { analytics: SerializedAnalytics }) {
  const email = analytics.email;
  return (
    <SectionCard title="Email activity">
      {!email.connected ? (
        <p className="text-sm text-muted-foreground">
          Connect Gmail to surface a small, recent inbox sample.{" "}
          <Link href="/settings/integrations" className="underline-offset-4 hover:underline">
            Open integrations
          </Link>
        </p>
      ) : email.error ? (
        <p className="text-sm text-muted-foreground">{email.error}</p>
      ) : (
        <div className="space-y-3">
          <Metric label="Recent threads found" value={email.found} compact />
          {email.categories.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {email.categories.map((item) => (
                <li key={item.label} className="rounded-full border border-border/70 px-2.5 py-1">
                  {item.label} {item.count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No recent inbox threads matched this focused search.</p>
          )}
          {email.important.length > 0 ? (
            <ul className="space-y-1">
              {email.important.map((item) => (
                <li key={`${item.sender}-${item.subject}`} className="text-sm">
                  <span className="font-medium">{item.subject}</span>
                  <span className="text-muted-foreground"> · {item.sender}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">{email.disclaimer}</p>
        </div>
      )}
    </SectionCard>
  );
}

function PatternsBlock({ analytics }: { analytics: SerializedAnalytics }) {
  return (
    <SectionCard title="Patterns">
      {analytics.patterns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keep using AZIO. We&apos;ll surface patterns as more data becomes available.
        </p>
      ) : (
        <ul className="space-y-3">
          {analytics.patterns.map((pattern) => (
            <li key={pattern.body} className="text-sm leading-6">
              {pattern.body}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function MomentumBlock({ analytics }: { analytics: SerializedAnalytics }) {
  const momentum = analytics.momentum;
  return (
    <SectionCard title="AZIO Momentum">
      <p className="text-xs leading-5 text-muted-foreground">{momentum.formula}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">
        {momentum.score === null ? "—" : momentum.score}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {momentum.delta === null
          ? "Not enough of a previous period to compare."
          : momentum.delta === 0
            ? "Unchanged from the previous period."
            : momentum.delta > 0
              ? `Up ${momentum.delta} from the previous period.`
              : `Down ${Math.abs(momentum.delta)} from the previous period.`}
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {momentum.pillars.map((pillar) => (
          <li key={pillar.key} className="rounded-xl bg-muted/40 px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{pillar.label}</p>
              <p className="text-sm tabular-nums">{pillar.score === null ? "—" : pillar.score}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pillar.note}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
