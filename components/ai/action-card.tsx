"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAIActionAction, confirmAIActionAction } from "@/lib/actions/ai";
import { describeAction } from "@/lib/ai/actions";
import type { StructuredAction } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export function ActionCard({
  messageId,
  action,
  onResolved,
}: {
  messageId?: string;
  action: StructuredAction;
  onResolved?: (action: StructuredAction) => void;
}) {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState(action);
  const [error, setError] = useState<string | null>(null);
  const copy = describeAction(current.tool, current.payload);
  const waiting = current.status === "awaiting_confirmation";
  const remember = current.tool === "remember_fact";
  const forget = current.tool === "forget_memory";
  const confirmLabel = remember ? "Remember" : forget ? "Forget" : "Confirm";
  const cancelLabel = remember ? "Don’t remember" : forget ? "Keep" : "Cancel";

  const run = (kind: "confirm" | "cancel") => {
    if (!messageId) return;
    setError(null);
    start(async () => {
      const result =
        kind === "confirm"
          ? await confirmAIActionAction(messageId, current.id)
          : await cancelAIActionAction(messageId, current.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data?.action) {
        setCurrent(result.data.action);
        onResolved?.(result.data.action);
      }
    });
  };

  return (
    <div
      className={cn(
        "mt-3 max-w-md rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm",
        current.status === "executed" && "border-foreground/15",
        current.status === "cancelled" && "opacity-70",
        current.status === "failed" && "border-destructive/30"
      )}
    >
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {waiting ? "AZIO wants to" : current.status === "executed" ? "Applied" : current.status === "cancelled" ? "Cancelled" : "Couldn’t apply"}
      </p>
      <p className="mt-1 text-sm font-medium">{copy.heading}</p>
      <p className="mt-0.5 text-sm text-foreground">{copy.title}</p>
      {copy.summary && copy.summary !== copy.title ? (
        <p className="mt-1 text-sm text-muted-foreground">{copy.summary}</p>
      ) : null}

      {waiting ? (
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" disabled={pending || !messageId} onClick={() => run("confirm")}>
            <Check />
            {confirmLabel}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending || !messageId} onClick={() => run("cancel")}>
            <X />
            {cancelLabel}
          </Button>
        </div>
      ) : current.result ? (
        <p className="mt-2 text-xs text-muted-foreground">{current.result}</p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
