import { requireUser } from "@/lib/auth/session";
import { canUseFeature } from "@/lib/billing/entitlements";
import { listAutomations } from "@/lib/db/automations";
import { PageHeader } from "@/components/layout/page-header";
import { AutomationsWorkspace } from "@/components/automations/automations-workspace";

export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const user = await requireUser();
  const [isPro, rows] = await Promise.all([
    canUseFeature(user.id, "AUTOMATION"),
    listAutomations(user.id),
  ]);

  return (
    <div>
      <PageHeader title="Automations" description="Let AZIO handle the repetitive work." />
      <AutomationsWorkspace
        isPro={isPro}
        items={rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          triggerType: row.triggerType,
          enabled: row.enabled,
          nextRunAt: row.nextRunAt?.toISOString() ?? null,
          lastRunAt: row.lastRunAt?.toISOString() ?? null,
          runs: row.runs.map((run) => ({
            id: run.id,
            status: run.status,
            startedAt: run.startedAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
