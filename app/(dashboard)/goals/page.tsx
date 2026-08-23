import { requireUser } from "@/lib/auth/session";
import { getGoalsOverview } from "@/lib/db/goals";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { GoalList } from "@/components/goals/goal-list";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const goals = await getGoalsOverview(user.id);

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Turn intentions into outcomes."
        action={<CreateTrigger type="goal">+ New Goal</CreateTrigger>}
      />
      <GoalList goals={goals} timezone={timezone} />
    </div>
  );
}
