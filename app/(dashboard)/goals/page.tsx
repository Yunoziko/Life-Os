import { Goal } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getGoals } from "@/lib/db/workspace";
import { formatShortDate } from "@/lib/utils/date";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await getGoals(user.id);
  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <ModulePage
      title="Goals"
      description="Outcomes you are actually working toward."
      icon={Goal}
      emptyTitle="No goals yet"
      emptyDescription="Name one meaningful outcome. Progress stays at zero until you move it."
      action={<CreateTrigger type="goal">New goal</CreateTrigger>}
      isEmpty={goals.length === 0}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((goal) => (
          <article key={goal.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-sm font-medium">{goal.title}</h2>
              <span className="text-xs text-muted-foreground">{goal.status.toLowerCase()}</span>
            </div>
            {goal.description ? (
              <p className="mb-4 text-sm leading-6 text-muted-foreground">{goal.description}</p>
            ) : null}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/80"
                style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {goal.progress}%
              {goal.targetDate ? ` · ${formatShortDate(goal.targetDate, timezone)}` : ""}
            </p>
          </article>
        ))}
      </div>
    </ModulePage>
  );
}
