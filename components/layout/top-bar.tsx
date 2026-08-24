"use client";

import { Command, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace-provider";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell, type NotificationItem } from "@/components/notifications/notification-bell";
import type { BillingPlanId } from "@/lib/billing/config";

export function TopBar({
  name,
  email,
  image,
  plan = "FREE",
  onOpenSidebar,
  notifications = [],
  unreadCount = 0,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  plan?: BillingPlanId;
  onOpenSidebar: () => void;
  notifications?: NotificationItem[];
  unreadCount?: number;
}) {
  const { setCommandOpen, setSearchOpen } = useWorkspace();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur-md sm:px-5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onOpenSidebar}
      >
        <Menu />
      </Button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 sm:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search tasks, notes, goals…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-md border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          /
        </kbd>
      </button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden h-9 px-2.5 md:inline-flex"
        onClick={() => setCommandOpen(true)}
      >
        <Command />
        <span>Command</span>
        <kbd className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <NotificationBell items={notifications} unread={unreadCount} />

      {plan === "PRO" ? (
        <Badge variant="secondary" className="hidden sm:inline-flex" render={<Link href="/settings/billing" />}>
          Pro
        </Badge>
      ) : null}

      <UserMenu name={name} email={email} image={image} />
    </header>
  );
}
