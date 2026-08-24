"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/shared/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AgentProgress } from "@/components/agents/agent-progress";
import { PlanReviewCard } from "@/components/agents/plan-review";
import { retryAgentRunAction } from "@/lib/actions/agents";
import {
  deleteAutomationAction,
  runAutomationNowAction,
  toggleAutomationAction,
  updateAutomationAction,
} from "@/lib/actions/automations";
import type { AgentStepRecord } from "@/lib/agents/types";
import type { StructuredAction } from "@/lib/ai/types";

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
    timezone: string;
    pauseReason: string | null;
    eventType: string | null;
    nextRunAt: Date | null;
    lastRunAt: Date | null;
    nextRunLabel: string | null;
    scheduleLabel: string;
    schedule: {
      frequency: string;
      time: string;
      weekday?: number;
      monthDay?: number;
      timeZone: string;
    } | null;
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
  const [editing, setEditing] = useState(false);
  const latest = automation.runs[0];
  const live = latest?.status === "QUEUED" || latest?.status === "RUNNING";

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => router.refresh(), 2_500);
    return () => window.clearInterval(timer);
  }, [live, router]);

  const objective =
    automation.actionConfig && typeof automation.actionConfig === "object" && "objective" in automation.actionConfig
      ? String((automation.actionConfig as { objective?: string }).objective ?? automation.actionType)
      : automation.actionType;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <p className="text-xs text-muted-foreground">
          {automation.enabled ? "Active" : automation.pauseReason === "PRO_REQUIRED" ? "Paused" : "Paused"}
        </p>
        {automation.pauseReason === "PRO_REQUIRED" ? (
          <p className="mt-2 text-sm text-muted-foreground">This automation is paused because AZIO Pro is required.</p>
        ) : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Trigger</dt>
            <dd>{automation.scheduleLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Timezone</dt>
            <dd>{automation.timezone}</dd>
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
            <dd>{automation.nextRunLabel ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Latest status</dt>
            <dd>{latest ? statusLabel(latest.status) : "—"}</dd>
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
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
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
            const pendingWrites = steps.filter((step) => step.status === "awaiting_confirmation");
            return (
              <li key={run.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{statusLabel(run.status)}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.startedAt.toLocaleString()} · {duration}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {run.error ?? run.agentRun?.summary ?? (run.status === "QUEUED" ? "Queued for the background worker." : "No result yet.")}
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
                {(run.status === "AWAITING_CONFIRMATION" || run.status === "WAITING") && run.agentRun ? (
                  <PlanReviewCard
                    runId={run.agentRun.id}
                    rejectLabel="Reject"
                    actions={pendingWrites.map((step) => ({
                      id: String(step.index),
                      type: "CREATE_NOTE",
                      status: "awaiting_confirmation",
                      tool: step.tool,
                      title: step.label,
                      summary: step.summary || step.label,
                      payload: {},
                    })) as StructuredAction[]}
                  />
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

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Edit automation</SheetTitle>
          </SheetHeader>
          <form
            className="space-y-4 px-4 pb-6"
            action={(formData) => {
              start(async () => {
                const result = await updateAutomationAction(formData);
                if (result.ok) {
                  setEditing(false);
                  router.refresh();
                }
              });
            }}
          >
            <input type="hidden" name="id" value={automation.id} />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={automation.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={automation.description ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue={automation.timezone} />
            </div>
            {automation.schedule ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Repeat</Label>
                  <NativeSelect id="frequency" name="frequency" defaultValue={automation.schedule.frequency}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" name="time" type="time" defaultValue={automation.schedule.time} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekday">Weekday</Label>
                  <NativeSelect id="weekday" name="weekday" defaultValue={String(automation.schedule.weekday ?? 1)}>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthDay">Day of month</Label>
                  <Input id="monthDay" name="monthDay" type="number" min={1} max={28} defaultValue={automation.schedule.monthDay ?? 1} />
                </div>
              </>
            ) : null}
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "QUEUED") return "Queued";
  if (status === "RUNNING") return "Running";
  if (status === "AWAITING_CONFIRMATION" || status === "WAITING") return "Waiting for approval";
  if (status === "COMPLETED") return "Completed";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  return status.replaceAll("_", " ");
}
