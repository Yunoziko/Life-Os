"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationsReadAction } from "@/lib/actions/agents";

export type NotificationItem = {
  id: string;
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
  const [pending, start] = useTransition();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon" aria-label="Notifications" />
        }
      >
        <span className="relative">
          <Bell />
          {unread > 0 ? <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-foreground" /> : null}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Notifications</p>
        {!items.length ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">You’re all caught up.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                  </Link>
                ) : (
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                  </div>
                )}
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
              })
            }
          >
            Mark as read
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
