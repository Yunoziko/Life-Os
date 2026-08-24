import type { NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export type { NotificationType };

export type NotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  href?: string;
  data?: Record<string, unknown>;
};

export async function notifyInApp(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      channel: "IN_APP",
      type: input.type ?? "SYSTEM",
      title: input.title.slice(0, 120),
      body: input.message.slice(0, 400),
      href: input.href,
      data: input.data as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listNotifications(
  userId: string,
  options?: { take?: number; unreadOnly?: boolean }
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 50,
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
}

export async function getOwnedNotification(userId: string, id: string) {
  return prisma.notification.findFirst({
    where: { id, userId },
  });
}
