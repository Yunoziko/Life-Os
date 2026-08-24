import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnedAutomationRun } from "@/lib/db/automations";
import { PageHeader } from "@/components/layout/page-header";
import { AgentProgress } from "@/components/agents/agent-progress";
import type { AgentStepRecord } from "@/lib/agents/types";

export const metadata = { title: "Automation run" };

export default async function AutomationRunPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const user = await requireUser();
  const { id, runId } = await params;
  const run = await getOwnedAutomationRun(user.id, runId);
  if (!run || run.automationId !== id) notFound();
  const steps = Array.isArray(run.agentRun?.steps) ? (run.agentRun?.steps as AgentStepRecord[]) : [];

  return (
    <div>
      <PageHeader
        title={run.automation.name}
        description="Run details. Internal identifiers stay hidden."
        action={
          <Link href={`/automations/${id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Back
          </Link>
        }
      />
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <p className="text-sm font-medium">{run.status.replaceAll("_", " ")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{run.error ?? run.agentRun?.summary ?? "No summary."}</p>
        <div className="mt-4">
          <AgentProgress
            steps={steps.map((step) => ({
              label: step.label,
              status: step.status === "completed" ? "done" : step.status,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
