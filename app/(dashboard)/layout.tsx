import { requireUser } from "@/lib/auth/session";
import { getAssignableOptions } from "@/lib/db/tasks";
import { AppShell } from "@/components/layout/app-shell";
import { getBillingChrome } from "@/lib/billing/entitlements";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [[projects, goals], billing] = await Promise.all([
    getAssignableOptions(user.id),
    getBillingChrome(user.id),
  ]);

  return (
    <AppShell
      user={{
        name: user.profile?.displayName ?? user.name,
        email: user.email,
        image: user.image,
      }}
      projects={projects}
      goals={goals}
      plan={billing.plan}
      billingWarning={billing.warning}
    >
      {children}
    </AppShell>
  );
}
