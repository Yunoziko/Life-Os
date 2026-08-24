"use client";

import { useEffect, useRef } from "react";
import { AIMarkdown } from "@/components/ai/markdown";
import { ActionCard } from "@/components/ai/action-card";
import { PlanReviewCard } from "@/components/agents/plan-review";
import { AgentProgress } from "@/components/agents/agent-progress";
import { cn } from "@/lib/utils";
import type { ConversationMessage, StructuredAction } from "@/lib/ai/types";

function formatStamp(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MessageThread({
  messages,
  streaming,
  thinking,
  pendingActions = [],
  agentSteps = [],
  error,
  onRetry,
  timeZone,
  onActionResolved,
}: {
  messages: ConversationMessage[];
  streaming?: string;
  thinking?: boolean;
  pendingActions?: StructuredAction[];
  agentSteps?: { label: string; status: string }[];
  error?: string | null;
  onRetry?: () => void;
  timeZone: string;
  onActionResolved?: (messageId: string, action: StructuredAction) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming, thinking]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-1 py-6">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const actions = message.metadata?.actions ?? [];
        return (
          <article
            key={message.id}
            className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,38rem)] rounded-2xl px-4 py-3",
                isUser
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-foreground ring-1 ring-border/60"
              )}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              ) : (
                <AIMarkdown content={message.content} />
              )}
            </div>
            {!isUser && message.metadata?.agentRunId ? (
              <PlanReviewCard
                runId={message.metadata.agentRunId}
                actions={actions.filter((action) => action.status === "awaiting_confirmation")}
              />
            ) : !isUser
              ? actions.map((action) => (
                  <ActionCard
                    key={action.id}
                    messageId={message.id}
                    action={action}
                    onResolved={(next) => onActionResolved?.(message.id, next)}
                  />
                ))
              : null}
            {!isUser && message.metadata?.usedMemories ? (
              <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Based on your saved preference…</p>
            ) : null}
            <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
              {formatStamp(message.createdAt, timeZone)}
            </p>
          </article>
        );
      })}

      {thinking ? (
        <div className="flex items-start">
          <div className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border/60">
            {agentSteps.length ? <AgentProgress steps={agentSteps} /> : "Thinking…"}
          </div>
        </div>
      ) : null}

      {streaming ? (
        <div className="flex flex-col items-start">
          <div className="max-w-[min(100%,38rem)] rounded-2xl bg-muted/70 px-4 py-3 ring-1 ring-border/60">
            <AIMarkdown content={streaming} />
          </div>
          {pendingActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          {onRetry ? (
            <button type="button" className="mt-2 text-sm underline underline-offset-2" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
