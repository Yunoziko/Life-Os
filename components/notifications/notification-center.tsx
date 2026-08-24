"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationRow, type NotificationItem } from "@/components/notifications/notification-bell";
import { markNotificationsReadAction } from "@/lib/actions/agents";

export function NotificationCenter({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("all");
  const unread = items.filter((item) => !item.readAt);
  const visible = filter === "unread" ? unread : items;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList variant="line">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>
        {unread.length ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
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
      </div>

      {!visible.length ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications." : "No notifications yet."}
          description="AZIO will let you know when a Daily Brief, weekly review, or automation needs you."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <NotificationRow item={item} />
              {!item.readAt ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-3"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await markNotificationsReadAction([item.id]);
                      router.refresh();
                    })
                  }
                >
                  Mark as read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
