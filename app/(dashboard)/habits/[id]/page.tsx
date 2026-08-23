import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getHabitWorkspace } from "@/lib/db/habits";
import { getAssignableOptions } from "@/lib/db/tasks";
import { HabitWorkspace } from "@/components/habits/habit-workspace";

export const metadata = { title: "Habit" };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const [habit, [, goals]] = await Promise.all([
    getHabitWorkspace(user.id, id, timezone),
    getAssignableOptions(user.id),
  ]);

  if (!habit) {
    notFound();
  }

  return (
    <HabitWorkspace
      habit={{
        id: habit.id,
        name: habit.name,
        description: habit.description,
        frequency: habit.frequency,
        target: habit.target,
        startDate: habit.startDate?.toISOString() ?? null,
        goalId: habit.goalId,
        goal: habit.goal,
        paused: habit.paused,
        archived: habit.archived,
        currentStreak: habit.currentStreak,
        bestStreak: habit.bestStreak,
        completionRate: habit.completionRate,
        completedToday: habit.completedToday,
        history: habit.history,
        yearHistory: habit.yearHistory,
      }}
      goals={goals}
      timezone={timezone}
    />
  );
}
