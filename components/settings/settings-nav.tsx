import Link from "next/link";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/profile", label: "Profile" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings", label: "Appearance" },
  { href: "/settings#account", label: "Account" },
] as const;

export function SettingsNav({
  current,
}: {
  current: "profile" | "integrations" | "billing" | "memory" | "appearance" | "account";
}) {
  return (
    <nav className="mb-8 flex flex-wrap gap-1">
      {ITEMS.map((item) => {
        const active =
          (current === "profile" && item.href === "/profile") ||
          (current === "integrations" && item.href === "/settings/integrations") ||
          (current === "billing" && item.href === "/settings/billing") ||
          (current === "memory" && item.href === "/settings/memory") ||
          (current === "appearance" && item.href === "/settings") ||
          (current === "account" && item.href === "/settings#account");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
