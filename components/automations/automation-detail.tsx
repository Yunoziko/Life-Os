"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AgentProgress } from "@/components/agents/agent-progress";
import { PlanReviewCard } from "@/components/agents/plan-review";
import { retryAgentRunAction } from "@/lib/actions/agents";
import { deleteAutomationAction, runAutomationNowAction, toggleAutomationAction } from "@/lib/actions/automations";
import type { AgentStepRecord } from "@/lib/agents/types";

export function AutomationDetail({
  automation,
}: {
  automation: {
    id: string;
    name: string;
    description: string | null;
    triggerType: string;
    actionType: string;
    enabled: boolean;
    eventType: string | null;
    nextRunAt: Date | null;
    lastRunAt: Date | null;
    actionConfig: unknown;
    runs: {
      id: string;
      status: string;
      startedAt: Date;
      completedAt: Date | null;
      error: string | null;
      result: unknown;
      agentRun: {
        id: string;
        status: string;
        summary: string | null;
        steps: unknown;
        error: string | null;
        failureClass: string | null;
      } | null;
    }[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const objective =
    automation.actionConfig && typeof automation.actionConfig === "object" && "objective" in automation.actionConfig
      ? String((automation.actionConfig as { objective?: string }).objective ?? automation.actionType)
      : automation.actionType;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <p className="text-xs text-muted-foreground">{automation.enabled ? "Active" : "Paused"}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Trigger</dt>
            <dd>{automation.triggerType === "SCHEDULE" ? "Schedule" : automation.triggerType === "EVENT" ? automation.eventType ?? "Event" : "Manual"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Action</dt>
            <dd>{objective}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last run</dt>
            <dd>{automation.lastRunAt ? automation.lastRunAt.toLocaleString() : "Not yet"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Next run</dt>
            <dd>{automation.nextRunAt ? automation.nextRunAt.toLocaleString() : "—"}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await runAutomationNowAction(automation.id);
                router.refresh();
              })
            }
          >
            Run now
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await toggleAutomationAction(automation.id, !automation.enabled);
                router.refresh();
              })
            }
          >
            {automation.enabled ? "Pause" : "Resume"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteAutomationAction(automation.id);
                router.push("/automations");
              })
            }
          >
            Delete
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Execution history</h2>
        <ul className="space-y-3">
          {automation.runs.map((run) => {
            const duration =
              run.completedAt && run.startedAt
                ? `${Math.max(1, Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000))}s`
                : "—";
            const steps = Array.isArray(run.agentRun?.steps) ? (run.agentRun?.steps as AgentStepRecord[]) : [];
            return (
              <li key={run.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{run.status.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.startedAt.toLocaleString()} · {duration}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {run.error ?? run.agentRun?.summary ?? "No result yet."}
                </p>
                {steps.length ? (
                  <div className="mt-3">
                    <AgentProgress
                      steps={steps.map((step) => ({
                        label: step.label,
                        status: step.status === "completed" ? "done" : step.status,
                      }))}
                    />
                  </div>
                ) : null}
                {run.status === "AWAITING_CONFIRMATION" && run.agentRun ? (
                  <PlanReviewCard runId={run.agentRun.id} actions={[]} />
                ) : null}
                {run.status === "FAILED" && run.agentRun?.failureClass === "recoverable" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await retryAgentRunAction(run.agentRun!.id);
                        router.refresh();
                      })
                    }
                  >
                    Retry
                  </Button>
                ) : null}
                <Link href={`/automations/${automation.id}/runs/${run.id}`} className="mt-3 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">
                  Inspect run
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
