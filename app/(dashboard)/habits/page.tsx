import { requireUser } from "@/lib/auth/session";
import { getHabitsWorkspace } from "@/lib/db/habits";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { HabitTracker } from "@/components/habits/habit-tracker";

export const metadata = { title: "Habits" };

export default async function HabitsPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const habits = await getHabitsWorkspace(user.id, timezone);

  return (
    <div>
      <PageHeader
        title="Habits"
        description="Small actions. Compounded results."
        action={<CreateTrigger type="habit">+ New Habit</CreateTrigger>}
      />
      <HabitTracker habits={habits} timezone={timezone} />
    </div>
  );
}
