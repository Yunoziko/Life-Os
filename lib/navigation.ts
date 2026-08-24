import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Goal,
  Home,
  NotebookPen,
  Repeat,
  Settings,
  Sparkles,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
};

export const overviewItem: NavItem = {
  href: "/dashboard",
  label: "Overview",
  icon: Home,
};

export const primaryNav: NavItem[] = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/automations", label: "Automations", icon: Zap },
];

export const assistantItem: NavItem = {
  href: "/ai",
  label: "AZIO AI",
  icon: Sparkles,
};

export const accountNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export const mobilePrimaryNav: NavItem[] = [
  overviewItem,
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  assistantItem,
];

export const protectedPrefixes = [
  "/dashboard",
  "/tasks",
  "/goals",
  "/calendar",
  "/notes",
  "/habits",
  "/projects",
  "/learning",
  "/finance",
  "/analytics",
  "/automations",
  "/ai",
  "/settings",
  "/profile",
] as const;

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
