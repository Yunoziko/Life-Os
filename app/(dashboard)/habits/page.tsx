import { Repeat } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getHabits } from "@/lib/db/workspace";
import { calendarDate } from "@/lib/utils/date";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { CompleteControl } from "@/components/dashboard/complete-control";

export const metadata = { title: "Habits" };

export default async function HabitsPage() {
  const user = await requireUser();
  const habits = await getHabits(user.id);
  const today = calendarDate(user.profile?.timezone ?? "UTC");

  return (
    <ModulePage
      title="Habits"
      description="Small repeats that compound. Nothing is marked done unless you did it."
      icon={Repeat}
      emptyTitle="No habits yet"
      emptyDescription="Add one small repeat. Streaks only start when you actually log them."
      action={<CreateTrigger type="habit">Add habit</CreateTrigger>}
      isEmpty={habits.length === 0}
    >
      <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {habits.map((habit) => {
          const doneToday = habit.logs.some(
            (log) => log.completed && log.date.toISOString().slice(0, 10) === today
          );
          return (
            <li key={habit.id} className="flex items-center gap-3 px-4 py-4">
              <CompleteControl id={habit.id} done={doneToday} kind="habit" label={habit.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{habit.name}</p>
                <p className="text-xs text-muted-foreground">{habit.frequency.toLowerCase()}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </ModulePage>
  );
}
