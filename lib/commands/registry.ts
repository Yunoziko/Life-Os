import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Goal,
  NotebookPen,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import type { CreateEntityType } from "@/types";

export type CommandAction =
  | { kind: "create"; type: CreateEntityType }
  | { kind: "navigate"; href: string }
  | { kind: "search" };

export type AppCommand = {
  id: string;
  label: string;
  keywords: string[];
  group: "Create" | "Navigate" | "Search";
  icon: LucideIcon;
  shortcut?: string;
  action: CommandAction;
};

export const appCommands: AppCommand[] = [
  {
    id: "create-task",
    label: "Create task",
    keywords: ["new", "todo", "add"],
    group: "Create",
    icon: CheckSquare,
    shortcut: "T",
    action: { kind: "create", type: "task" },
  },
  {
    id: "create-note",
    label: "Create note",
    keywords: ["new", "write", "doc"],
    group: "Create",
    icon: NotebookPen,
    shortcut: "N",
    action: { kind: "create", type: "note" },
  },
  {
    id: "create-goal",
    label: "Create goal",
    keywords: ["new", "target", "objective"],
    group: "Create",
    icon: Goal,
    shortcut: "G",
    action: { kind: "create", type: "goal" },
  },
  {
    id: "create-project",
    label: "Create project",
    keywords: ["new", "workspace"],
    group: "Create",
    icon: FolderKanban,
    shortcut: "P",
    action: { kind: "create", type: "project" },
  },
  {
    id: "search-everything",
    label: "Search everything",
    keywords: ["find", "lookup", "query"],
    group: "Search",
    icon: Search,
    shortcut: "/",
    action: { kind: "search" },
  },
  {
    id: "open-calendar",
    label: "Open calendar",
    keywords: ["schedule", "events", "date"],
    group: "Navigate",
    icon: CalendarDays,
    action: { kind: "navigate", href: "/calendar" },
  },
  {
    id: "open-ai",
    label: "Open AI assistant",
    keywords: ["chat", "assistant", "ask"],
    group: "Navigate",
    icon: Sparkles,
    action: { kind: "navigate", href: "/ai" },
  },
  {
    id: "go-settings",
    label: "Go to settings",
    keywords: ["preferences", "theme", "account"],
    group: "Navigate",
    icon: Settings,
    action: { kind: "navigate", href: "/settings" },
  },
];
