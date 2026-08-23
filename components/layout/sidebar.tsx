"use client";

import { accountNav, assistantItem, overviewItem, primaryNav } from "@/lib/navigation";
import { Logo } from "@/components/layout/logo";
import { NavLink } from "@/components/layout/nav-link";
import { Separator } from "@/components/ui/separator";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="px-2 pb-5">
        <Logo href="/dashboard" />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <div className="space-y-0.5">
          <NavLink item={overviewItem} onNavigate={onNavigate} />
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>

        <Separator className="bg-sidebar-border" />

        <div className="space-y-0.5">
          <NavLink item={assistantItem} onNavigate={onNavigate} />
        </div>

        <div className="mt-auto space-y-0.5 pt-4">
          <Separator className="mb-3 bg-sidebar-border" />
          {accountNav.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
    </div>
  );
}
