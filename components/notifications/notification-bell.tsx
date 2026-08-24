"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { AlertTriangle, Bell, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationsReadAction } from "@/lib/actions/agents";
import type { NotificationType } from "@/generated/prisma/client";

export type NotificationItem = {
  id: string;
  type?: NotificationType | string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({
  items,
  unread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon" aria-label="Notifications" />
        }
      >
        <span className="relative">
          <Bell />
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Notifications</p>
          <Link href="/notifications" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            View all
          </Link>
        </div>
        {!items.length ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">You’re all caught up.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationRow item={item} compact />
              </li>
            ))}
          </ul>
        )}
        {unread > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await markNotificationsReadAction();
                router.refresh();
              })
            }
          >
            Mark all as read
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function NotificationRow({
  item,
  compact = false,
}: {
  item: NotificationItem;
  compact?: boolean;
}) {
  const content = (
    <div className="flex gap-2">
      {item.type === "AUTOMATION_WAITING" || item.type === "AUTOMATION_FAILED" ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : item.type === "DAILY_BRIEF_READY" || item.type === "WEEKLY_REVIEW_READY" ? (
        <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className={item.readAt ? "text-sm" : "text-sm font-medium"}>{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
        {!compact ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

