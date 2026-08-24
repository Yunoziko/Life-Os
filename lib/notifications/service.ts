import { prisma } from "@/lib/db/prisma";

export async function notifyInApp(input: {
  userId: string;
  title: string;
  body: string;
  href?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      channel: "IN_APP",
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 400),
      href: input.href,
    },
  });
}

export async function listNotifications(userId: string, take = 12) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
