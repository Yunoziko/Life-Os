import { requireUser } from "@/lib/auth/session";
import { getAssignableOptions } from "@/lib/db/tasks";
import { AppShell } from "@/components/layout/app-shell";
import { getBillingChrome } from "@/lib/billing/entitlements";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications/service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [[projects, goals], billing, notifications, unread] = await Promise.all([
    getAssignableOptions(user.id),
    getBillingChrome(user.id),
    listNotifications(user.id, 8),
    unreadNotificationCount(user.id),
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
      unreadCount={unread}
      notifications={notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        href: item.href,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}
