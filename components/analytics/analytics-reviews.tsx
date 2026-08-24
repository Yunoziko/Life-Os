"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateDailyBriefAction, generateWeeklyReviewAction } from "@/lib/actions/analytics";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { isUpgradeResult } from "@/lib/billing/action";
import { useUpgrade } from "@/components/billing/upgrade-provider";
import type { AnalyticsRangeId } from "@/lib/analytics/range";

export function AnalyticsReviews({
  range,
  from,
  to,
  configured,
}: {
  range: AnalyticsRangeId;
  from?: string;
  to?: string;
  configured: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReviewPanel
        title="Weekly review"
        description="What moved, what stalled, and where to put next week’s attention."
        action="Generate review"
        kind="weekly"
        range={range}
        from={from}
        to={to}
        configured={configured}
      />
      <ReviewPanel
        title="Daily brief"
        description="Today’s tasks, calendar, habits, and the goal that most needs time."
        action="Generate brief"
        kind="daily"
        range={range}
        from={from}
        to={to}
        configured={configured}
      />
    </div>
  );
}

function ReviewPanel({
  title,
  description,
  action,
  kind,
  range,
  from,
  to,
  configured,
}: {
  title: string;
  description: string;
  action: string;
  kind: "weekly" | "daily";
  range: AnalyticsRangeId;
  from?: string;
  to?: string;
  configured: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const { openUpgrade } = useUpgrade();

  async function onGenerate() {
    setPending(true);
    const data = new FormData();
    data.set("range", range);
    if (from) data.set("from", from);
    if (to) data.set("to", to);
    const result = kind === "weekly" ? await generateWeeklyReviewAction(data) : await generateDailyBriefAction(data);
    setPending(false);
    if (!result.ok) {
      if (isUpgradeResult(result)) {
        openUpgrade(result.feature);
        return;
      }
      toast.error(result.error);
      return;
    }
    setText(result.data?.text ?? "");
  }

  return (
    <SectionCard title={title}>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      {!configured ? (
        <p className="mt-3 text-sm text-muted-foreground">
          AZIO AI isn’t connected yet. Add an API key on the server to generate this.
        </p>
      ) : (
        <Button type="button" className="mt-4" size="sm" disabled={pending} onClick={() => void onGenerate()}>
          {pending ? "Reading your workspace…" : action}
        </Button>
      )}
      {text ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{text}</div>
      ) : null}
    </SectionCard>
  );
}
