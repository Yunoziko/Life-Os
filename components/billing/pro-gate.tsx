"use client";

import { useUpgrade } from "@/components/billing/upgrade-provider";
import type { FeatureKey } from "@/lib/billing/config";
import { Button } from "@/components/ui/button";

export function ProGate({
  feature,
  title,
  children,
}: {
  feature: FeatureKey;
  title: string;
  children?: React.ReactNode;
}) {
  const { openUpgrade } = useUpgrade();
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">{title}</h2>
      {children ? <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div> : null}
      <p className="mt-3 text-sm text-muted-foreground">
        Get advanced AI, analytics and unlimited productivity tools.
      </p>
      <Button type="button" size="sm" className="mt-4" onClick={() => openUpgrade(feature)}>
        Upgrade to Pro
      </Button>
    </div>
  );
}
