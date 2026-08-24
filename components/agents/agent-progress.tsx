"use client";

import { cn } from "@/lib/utils";

export function AgentProgress({
  steps,
}: {
  steps: { label: string; status: string }[];
}) {
  if (!steps.length) {
    return <p className="text-sm text-muted-foreground">AZIO is working…</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">AZIO is working…</p>
      <ul className="space-y-1.5">
        {steps.map((step, index) => (
          <li key={`${step.label}-${index}`} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "size-1.5 rounded-full",
                step.status === "done" || step.status === "completed"
                  ? "bg-foreground"
                  : step.status === "running"
                    ? "bg-foreground/70"
                    : step.status === "failed"
                      ? "bg-destructive"
                      : "bg-border"
              )}
            />
            <span
              className={cn(
                step.status === "running" ? "text-foreground" : "text-muted-foreground",
                (step.status === "done" || step.status === "completed") && "text-foreground"
              )}
            >
              {step.status === "done" || step.status === "completed"
                ? "✓ "
                : step.status === "running"
                  ? "⏳ "
                  : step.status === "failed"
                    ? "! "
                    : ""}
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
