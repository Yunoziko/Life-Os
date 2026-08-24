"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import type { PlanDefinition } from "@/lib/billing/config";

export function PricingView({
  signedIn,
  billingReady,
  plans,
  benefits,
}: {
  signedIn: boolean;
  billingReady: boolean;
  plans: PlanDefinition[];
  benefits: string[];
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.96_0.01_85),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.22_0.015_70),transparent_40%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo href={signedIn ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/settings/billing" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Billing
            </Link>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl px-6 pb-24 pt-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">AZIO</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">AZIO</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Simple pricing. Powerful life management.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8",
                plan.id === "PRO" && "ring-1 ring-foreground/10"
              )}
            >
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{plan.displayMonthly}</p>
              {plan.id === "PRO" ? (
                <p className="mt-1 text-sm text-muted-foreground">or {plan.displayAnnual}</p>
              ) : null}
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-6 grid gap-2 text-sm">
                {plan.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-8">
                {plan.id === "FREE" ? (
                  <Link
                    href={signedIn ? "/dashboard" : "/signup"}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    {signedIn ? "Continue with Free" : "Get started"}
                  </Link>
                ) : signedIn ? (
                  billingReady ? (
                    <div className="grid gap-2">
                      <UpgradeButton className="w-full" label="Upgrade to Pro" />
                      <UpgradeButton
                        className="w-full"
                        interval="ANNUAL"
                        variant="outline"
                        label="Go yearly · ₹4,999"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Billing isn’t configured on this server yet. You can still use AZIO on the Free plan.
                    </p>
                  )
                ) : (
                  <Link href="/signup" className={cn(buttonVariants(), "w-full")}>
                    Start Pro
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        <section className="mx-auto mt-16 max-w-2xl rounded-3xl border border-border/70 bg-card/80 p-6">
          <h2 className="text-sm font-medium">AZIO Pro</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">₹499/month</p>
          <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
