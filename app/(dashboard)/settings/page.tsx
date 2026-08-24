import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Keep the workspace quiet, personal, and under your control."
      />
      <SettingsNav current="appearance" />

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Integrations</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Connect Google Calendar, Gmail, and GitHub. LifeOS only accesses data required for the
          features you enable.
        </p>
        <Link href="/settings/integrations" className={cn(buttonVariants({ size: "sm" }))}>
          Manage integrations
        </Link>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Billing</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Plan, usage, and LifeOS Pro.</p>
        <Link href="/settings/billing" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open billing
        </Link>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Light, dark, or follow the system.
        </p>
        <ThemeToggle />
      </section>

      <section id="account" className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Account deletion is not offered in this release. If you later delete an account with an
          active Pro subscription, LifeOS will cancel the Razorpay subscription first rather than
          leaving a paid plan running.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}

