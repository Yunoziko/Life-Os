"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/command/command-palette";
import { GlobalSearch } from "@/components/search/global-search";
import { CreateDialog } from "@/components/create/create-dialog";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { UpgradeProvider } from "@/components/billing/upgrade-provider";
import { BillingBanner } from "@/components/billing/billing-banner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";
import type { BillingPlanId } from "@/lib/billing/config";
import type { NotificationItem } from "@/components/notifications/notification-bell";

export function AppShell({
  children,
  user,
  projects = [],
  goals = [],
  plan = "FREE",
  billingWarning,
  notifications = [],
  unreadCount = 0,
}: {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  projects?: AssignableProject[];
  goals?: AssignableGoal[];
  plan?: BillingPlanId;
  billingWarning?: string | null;
  notifications?: NotificationItem[];
  unreadCount?: number;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <WorkspaceProvider projects={projects} goals={goals}>
      <UpgradeProvider>
        <div className="flex min-h-dvh bg-background">
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
            <Sidebar />
          </aside>

          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            {billingWarning ? <BillingBanner message={billingWarning} /> : null}
            <TopBar
              name={user.name}
              email={user.email}
              image={user.image}
              plan={plan}
              notifications={notifications}
              unreadCount={unreadCount}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
            <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>

          <MobileNav />
          <CommandPalette />
          <GlobalSearch />
          <CreateDialog />
        </div>
      </UpgradeProvider>
    </WorkspaceProvider>
  );
}
