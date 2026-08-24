import { requireUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/service";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationCenter } from "@/components/notifications/notification-center";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id, { take: 80 });

  return (
    <div>
      <PageHeader title="Notifications" description="Automation results, reviews, and things that need your approval." />
      <NotificationCenter
        items={items.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          body: item.body,
          href: item.href,
          readAt: item.readAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
