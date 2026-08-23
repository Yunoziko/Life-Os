import { Repeat } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getHabits } from "@/lib/db/workspace";
import { ModulePage } from "@/components/shared/module-page";

export const metadata = { title: "Habits" };

export default async function HabitsPage() {
  const user = await requireUser();
  const habits = await getHabits(user.id);

  return (
    <ModulePage
      title="Habits"
      description="Small repeats that compound. Nothing is marked done unless you did it."
      icon={Repeat}
      emptyTitle="No habits yet"
      emptyDescription="Habits will land here in the next phase. The data model is already in place."
      isEmpty={habits.length === 0}
    >
      <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {habits.map((habit) => (
          <li key={habit.id} className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium">{habit.name}</p>
              <p className="text-xs text-muted-foreground">{habit.frequency.toLowerCase()}</p>
            </div>
            <span className="text-xs text-muted-foreground">{habit.logs.length} logs</span>
          </li>
        ))}
      </ul>
    </ModulePage>
  );
}
