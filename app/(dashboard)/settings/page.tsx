import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Keep the workspace quiet, personal, and under your control."
      />

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Light, dark, or follow the system.
        </p>
        <ThemeToggle />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
