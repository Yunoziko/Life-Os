import { requireUser } from "@/lib/auth/session";
import { canUseFeature } from "@/lib/billing/entitlements";
import { listAutomations } from "@/lib/db/automations";
import { formatNextRunLabel, formatScheduleLabel, parseAutomationSchedule } from "@/lib/automations/schedule";
import { PageHeader } from "@/components/layout/page-header";
import { AutomationsWorkspace } from "@/components/automations/automations-workspace";

export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const user = await requireUser();
  const timeZone = user.profile?.timezone ?? "UTC";
  const [isPro, rows] = await Promise.all([
    canUseFeature(user.id, "AUTOMATION"),
    listAutomations(user.id),
  ]);

  return (
    <div>
      <PageHeader title="Automations" description="Let AZIO handle the repetitive work, even when this tab is closed." />
      <AutomationsWorkspace
        isPro={isPro}
        items={rows.map((row) => {
          const schedule = parseAutomationSchedule(row.schedule, row.timezone || timeZone);
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            triggerType: row.triggerType,
            enabled: row.enabled,
            pauseReason: row.pauseReason,
            scheduleLabel: schedule ? formatScheduleLabel(schedule) : row.triggerType === "EVENT" ? "On event" : "Manual",
            nextRunLabel: row.nextRunAt ? formatNextRunLabel(row.nextRunAt, row.timezone || timeZone) : null,
            lastRunLabel: row.lastRunAt ? row.lastRunAt.toLocaleString() : null,
            nextRunAt: row.nextRunAt?.toISOString() ?? null,
            lastRunAt: row.lastRunAt?.toISOString() ?? null,
            latestStatus: row.runs[0]?.status ?? null,
            runs: row.runs.map((run) => ({
              id: run.id,
              status: run.status,
              startedAt: run.startedAt.toISOString(),
            })),
          };
        })}
      />
    </div>
  );
}
