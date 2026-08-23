"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteHabitAction, updateHabitAction } from "@/lib/actions/entities";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { HabitForm, habitValuesToFormData } from "@/components/habits/habit-form";
import { HabitHistory } from "@/components/habits/habit-history";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calendarDate, formatShortDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { AssignableGoal } from "@/lib/db/tasks";
import type { CreateHabitInput } from "@/lib/validations/entities";
import type { HabitDayState } from "@/lib/habits/stats";

export function HabitWorkspace({
  habit,
  goals,
  timezone,
}: {
  habit: {
    id: string;
    name: string;
    description: string | null;
    frequency: "DAILY" | "WEEKLY";
    target: string | null;
    startDate: string | null;
    goalId: string | null;
    goal: { id: string; title: string } | null;
    paused: boolean;
    archived: boolean;
    currentStreak: number;
    bestStreak: number;
    completionRate: number;
    completedToday: boolean;
    history: { date: string; state: HabitDayState }[];
    yearHistory: { date: string; state: HabitDayState }[];
  };
  goals: AssignableGoal[];
  timezone: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSave(values: CreateHabitInput) {
    setPending(true);
    const result = await updateHabitAction(habitValuesToFormData(values, habit.id));
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Habit updated");
    setEditing(false);
    router.refresh();
  }

  async function setFlag(name: "paused" | "archived", value: boolean) {
    const data = habitValuesToFormData(
      {
        name: habit.name,
        description: habit.description ?? "",
        frequency: habit.frequency,
        target: habit.target ?? "",
        startDate: habit.startDate ? calendarDate(timezone, new Date(habit.startDate)) : "",
        goalId: habit.goalId ?? "",
      },
      habit.id
    );
    data.set(name, String(value));
    const result = await updateHabitAction(data);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(value ? (name === "paused" ? "Habit paused" : "Habit archived") : "Habit restored");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          {habit.paused || habit.archived ? (
            <span className="mt-1.5 size-5 shrink-0 rounded-full border border-border" aria-hidden />
          ) : (
            <CompleteControl id={habit.id} done={habit.completedToday} kind="habit" label={habit.name} />
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
            <p className="text-sm text-muted-foreground">
              {habit.frequency === "DAILY" ? "Daily" : "Weekly"}
              {habit.target ? ` · ${habit.target}` : ""}
              {habit.paused ? " · Paused" : ""}
              {habit.archived ? " · Archived" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/habits" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All habits
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setFlag("paused", !habit.paused)}>
            {habit.paused ? "Resume" : "Pause"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setFlag("archived", !habit.archived)}>
            {habit.archived ? "Unarchive" : "Archive"}
          </Button>
        </div>
      </header>

      {habit.description ? (
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{habit.description}</p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Current streak" value={`${habit.currentStreak}`} />
        <Stat label="Best streak" value={`${habit.bestStreak}`} />
        <Stat label="Completion" value={`${habit.completionRate}%`} />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">History</h2>
        <HabitHistory history={habit.yearHistory} timezone={timezone} />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 text-sm">
        <h2 className="mb-3 text-sm font-medium">Settings</h2>
        <p className="text-muted-foreground">
          Started {habit.startDate ? formatShortDate(new Date(habit.startDate), timezone) : "when created"}
          {habit.goal ? (
            <>
              {" · "}
              Linked to{" "}
              <Link href={`/goals/${habit.goal.id}`} className="hover:underline">
                {habit.goal.title}
              </Link>
            </>
          ) : null}
        </p>
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)}>
          Delete habit
        </Button>
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit habit</DialogTitle>
            <DialogDescription>Adjust the repeat, not the history.</DialogDescription>
          </DialogHeader>
          <HabitForm
            values={{
              name: habit.name,
              description: habit.description ?? "",
              frequency: habit.frequency,
              target: habit.target ?? "",
              startDate: habit.startDate ? calendarDate(timezone, new Date(habit.startDate)) : "",
              goalId: habit.goalId ?? "",
            }}
            goals={goals}
            pending={pending}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={onSave}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this habit?</DialogTitle>
            <DialogDescription>
              “{habit.name}” and its history will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                const result = await deleteHabitAction(habit.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Habit deleted");
                router.push("/habits");
                router.refresh();
              }}
            >
              Delete habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
