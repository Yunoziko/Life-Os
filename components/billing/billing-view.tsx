import Link from "next/link";
import { formatLongDate } from "@/lib/utils/date";
import { formatUsage, usageNearLimit } from "@/lib/billing/rules";
import { statusLabel } from "@/lib/billing/subscriptions";
import { PLAN_CATALOG } from "@/lib/billing/config";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { ManageBilling } from "@/components/billing/manage-billing";
import { razorpayConfigured } from "@/lib/billing/config";
import type { getEntitlementSnapshot } from "@/lib/billing/entitlements";

type Snapshot = Awaited<ReturnType<typeof getEntitlementSnapshot>>;

export function BillingView({
  snapshot,
  timezone,
  checkoutPending,
}: {
  snapshot: Snapshot;
  timezone: string;
  checkoutPending?: boolean;
}) {
  const { plan, usage, limits, subscription } = snapshot;
  const pro = plan === "PRO";
  const ready = razorpayConfigured();

  return (
    <div className="space-y-6">
      {checkoutPending ? (
        <p className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm">
          Payment was submitted. If Pro hasn’t unlocked yet, refresh this page in a moment.
        </p>
      ) : null}

      {subscription?.lastPaymentError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {subscription.lastPaymentError}{" "}
          {ready ? "Use Refresh billing to check payment status." : null}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs text-muted-foreground">Current plan</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{pro ? "AZIO Pro" : "AZIO Free"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pro ? PLAN_CATALOG.PRO.displayMonthly : PLAN_CATALOG.FREE.displayMonthly}
            </p>
          </div>
          {!pro ? (
            ready ? (
              <UpgradeButton label="Upgrade to Pro" />
            ) : (
              <p className="text-sm text-muted-foreground">Billing isn’t configured on this server yet.</p>
            )
          ) : null}
        </div>

        {subscription ? (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{statusLabel(subscription.status)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Renewal</dt>
              <dd>
                {subscription.currentPeriodEnd
                  ? formatLongDate(subscription.currentPeriodEnd, timezone)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Interval</dt>
              <dd>{subscription.interval === "ANNUAL" ? "Yearly" : "Monthly"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cancellation</dt>
              <dd>
                {subscription.cancelAtPeriodEnd
                  ? "Ends after the current period. Pro stays until then."
                  : "Not scheduled"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">You’re on Free. Upgrade when you need more room.</p>
        )}

        {pro ? <ManageBilling cancelScheduled={subscription?.cancelAtPeriodEnd ?? false} /> : null}
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-medium">Usage</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["AI usage", usage.AI_MESSAGES, limits.AI_MESSAGES, "messages"] as const,
              ["Projects", usage.PROJECTS, limits.PROJECTS, "active"] as const,
              ["Goals", usage.GOALS, limits.GOALS, "active"] as const,
              ["Habits", usage.HABITS, limits.HABITS, "active"] as const,
              ["Memories", usage.MEMORIES, limits.MEMORIES, "saved"] as const,
            ] as const
          ).map(([label, used, limit]) => (
            <li key={label} className="rounded-xl bg-muted/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-medium tabular-nums">{formatUsage(used, limit)}</p>
              {usageNearLimit(used, limit) && !pro ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  You’re near the Free limit.{" "}
                  <Link href="/pricing" className="underline underline-offset-2">
                    Upgrade to Pro
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
