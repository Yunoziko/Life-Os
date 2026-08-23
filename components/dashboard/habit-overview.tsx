import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { CompleteControl } from "@/components/dashboard/complete-control";
import type { DashboardHabit } from "@/lib/db/dashboard";

export function HabitOverview({ habits }: { habits: DashboardHabit[] }) {
  return (
    <SectionCard
      title="Habits"
      action={
        <CreateTrigger type="habit" variant="ghost" size="sm">
          + Add
        </CreateTrigger>
      }
    >
      {habits.length === 0 ? (
        <SectionEmpty
          title="No habits yet"
          description="Track one small repeat. Streaks only start when you actually log them."
          action={<CreateTrigger type="habit" size="sm">Add habit</CreateTrigger>}
        />
      ) : (
        <ul className="space-y-2.5">
          {habits.map((habit) => (
            <li key={habit.id} className="flex items-center gap-3">
              <CompleteControl
                id={habit.id}
                done={habit.completedToday}
                kind="habit"
                label={habit.name}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{habit.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {habit.streak}d
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
