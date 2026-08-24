"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAgentRunAction, confirmAgentRunAction } from "@/lib/actions/agents";
import type { StructuredAction } from "@/lib/ai/types";

export function PlanReviewCard({
  runId,
  actions,
}: {
  runId: string;
  actions: StructuredAction[];
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"open" | "done" | "cancelled">("open");
  const [error, setError] = useState<string | null>(null);

  const run = (kind: "confirm" | "cancel") => {
    setError(null);
    start(async () => {
      const result = kind === "confirm" ? await confirmAgentRunAction(runId) : await cancelAgentRunAction(runId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(kind === "confirm" ? "done" : "cancelled");
    });
  };

  return (
    <div className="mt-3 max-w-md rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {status === "open" ? "AZIO wants to" : status === "done" ? "Applied" : "Cancelled"}
      </p>
      <p className="mt-1 text-sm font-medium">
        {actions.length ? `Create ${actions.length} ${actions.length === 1 ? "change" : "changes"}` : "Review plan"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        AZIO will change your workspace only after you confirm. Integrations stay untouched unless listed below.
      </p>
      {actions.length ? (
        <ol className="mt-3 space-y-1 text-sm">
          {actions.map((action, index) => (
            <li key={action.id}>
              {index + 1}. {action.summary || action.title}
            </li>
          ))}
        </ol>
      ) : null}
      {status === "open" ? (
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => run("confirm")}>
            <Check />
            Confirm
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run("cancel")}>
            <X />
            Cancel
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
