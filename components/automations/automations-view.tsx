"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ProGate } from "@/components/billing/pro-gate";
import { createAutomationFromTemplateAction, runAutomationNowAction, toggleAutomationAction } from "@/lib/actions/automations";
import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";
import { cn } from "@/lib/utils";

export type AutomationListItem = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  enabled: boolean;
  pauseReason: string | null;
  scheduleLabel: string;
  nextRunLabel: string | null;
  lastRunLabel: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  latestStatus: string | null;
  runs: { id: string; status: string; startedAt: string }[];
};

export function AutomationsView({
  items,
  isPro,
  builder,
}: {
  items: AutomationListItem[];
  isPro: boolean;
  builder: React.ReactNode;
}) {
  if (!isPro && !items.length) {
    return (
      <ProGate feature="AUTOMATION" title="Automation is available with AZIO Pro.">
        Let AZIO handle the repetitive work — morning briefs, weekly reviews, and project checklists.
      </ProGate>
    );
  }

  const active = items.filter((item) => item.enabled);
  const paused = items.filter((item) => !item.enabled);
  const recent = items.flatMap((item) => item.runs.map((run) => ({ ...run, name: item.name }))).slice(0, 6);

  return (
    <div className="space-y-8">
      {!isPro ? (
        <p className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This automation is paused because AZIO Pro is required.
        </p>
      ) : null}
      {builder}
      {!items.length ? (
        <EmptyState
          icon={Zap}
          title="No automations yet."
          description="Start with a template. AZIO will run it on a schedule, even if this tab is closed."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AutomationGroup title="Active" items={active} isPro={isPro} />
          <AutomationGroup title="Paused" items={paused} isPro={isPro} />
        </div>
      )}
      {recent.length ? (
        <section>
          <h2 className="mb-3 text-sm font-medium">Recent runs</h2>
          <ul className="space-y-2">
            {recent.map((run) => (
              <li key={run.id} className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm">
                <span className="font-medium">{run.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {statusLabel(run.status)} · {new Date(run.startedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AutomationGroup({
  title,
  items,
  isPro,
}: {
  title: string;
  items: AutomationListItem[];
  isPro: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">{title}</h2>
      {!items.length ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl bg-muted/40 px-3 py-3">
              <button type="button" className="text-left" onClick={() => router.push(`/automations/${item.id}`)}>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.scheduleLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.enabled ? "Active" : item.pauseReason === "PRO_REQUIRED" ? "Paused · AZIO Pro required" : "Paused"}
                  {item.nextRunLabel ? ` · Next run: ${item.nextRunLabel}` : ""}
                </p>
                {item.latestStatus ? (
                  <p className="mt-1 text-xs text-muted-foreground">Status: {statusLabel(item.latestStatus)}</p>
                ) : null}
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || !isPro}
                  onClick={() =>
                    start(async () => {
                      await runAutomationNowAction(item.id);
                      router.refresh();
                    })
                  }
                >
                  Run
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending || !isPro}
                  onClick={() =>
                    start(async () => {
                      await toggleAutomationAction(item.id, !item.enabled);
                      router.refresh();
                    })
                  }
                >
                  {item.enabled ? "Pause" : "Resume"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TemplateGrid() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium">Templates</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AUTOMATION_TEMPLATES.map((template) => (
          <article key={template.id} className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-sm")}>
            <p className="text-sm font-medium">{template.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{template.description}</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await createAutomationFromTemplateAction(template.id);
                  if (result.ok && result.data?.id) router.push(`/automations/${result.data.id}`);
                })
              }
            >
              Use template
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function statusLabel(status: string) {
  if (status === "QUEUED") return "Queued";
  if (status === "RUNNING") return "Running";
  if (status === "AWAITING_CONFIRMATION" || status === "WAITING") return "Waiting for approval";
  if (status === "COMPLETED") return "Completed";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  return status.replaceAll("_", " ").toLowerCase();
}
