"use client";

import Link from "next/link";
import { Repeat } from "lucide-react";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { HabitHistory } from "@/components/habits/habit-history";
import { EmptyState } from "@/components/shared/empty-state";
import type { HabitOverview } from "@/lib/db/habits";

export function HabitTracker({
  habits,
  timezone,
}: {
  habits: HabitOverview[];
  timezone: string;
}) {
  const todayHabits = habits.filter((habit) => !habit.paused);
  const paused = habits.filter((habit) => habit.paused);

  if (habits.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Build your first habit."
        description="Consistency starts with one small action."
        action={<CreateTrigger type="habit">Create habit</CreateTrigger>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <h2 className="mb-4 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Today</h2>
        <ul className="space-y-3">
          {todayHabits.map((habit) => (
            <li key={habit.id} className="flex items-start gap-3">
              <CompleteControl id={habit.id} done={habit.completedToday} kind="habit" label={habit.name} />
              <Link href={`/habits/${habit.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-medium">{habit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {habit.frequency === "DAILY" ? "Daily" : "Weekly"}
                  {habit.target ? ` · ${habit.target}` : ""}
                  {` · ${habit.currentStreak} day streak`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {habits.map((habit) => (
          <Link
            key={habit.id}
            href={`/habits/${habit.id}`}
            className="rounded-2xl border border-border/70 bg-card p-5 outline-none transition-colors hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{habit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {habit.currentStreak} current · {habit.bestStreak} best · {habit.completionRate}%
                </p>
              </div>
              {habit.paused ? <span className="text-xs text-muted-foreground">Paused</span> : null}
            </div>
            <HabitHistory history={habit.history} timezone={timezone} />
          </Link>
        ))}
      </div>

      {paused.length > 0 ? (
        <p className="text-xs text-muted-foreground">{paused.length} paused habit{paused.length === 1 ? "" : "s"}.</p>
      ) : null}
    </div>
  );
}
