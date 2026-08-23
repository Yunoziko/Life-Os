import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckSquare,
  Flag,
  FolderKanban,
  Goal,
  NotebookPen,
  Repeat,
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
    shortcut: "N",
    action: { kind: "create", type: "task" },
  },
  {
    id: "create-note",
    label: "Create note",
    keywords: ["new", "write", "doc"],
    group: "Create",
    icon: NotebookPen,
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
    id: "create-habit",
    label: "Create habit",
    keywords: ["new", "streak", "daily"],
    group: "Create",
    icon: Repeat,
    action: { kind: "create", type: "habit" },
  },
  {
    id: "create-milestone",
    label: "Create milestone",
    keywords: ["checkpoint", "step", "goal"],
    group: "Create",
    icon: Flag,
    action: { kind: "create", type: "milestone" },
  },
  {
    id: "create-event",
    label: "Add event",
    keywords: ["calendar", "schedule", "meeting"],
    group: "Create",
    icon: CalendarDays,
    action: { kind: "create", type: "event" },
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
    id: "search-tasks",
    label: "Search tasks",
    keywords: ["find", "todo", "filter"],
    group: "Search",
    icon: CheckSquare,
    action: { kind: "navigate", href: "/tasks" },
  },
  {
    id: "search-projects",
    label: "Search projects",
    keywords: ["find", "workspace"],
    group: "Search",
    icon: FolderKanban,
    action: { kind: "navigate", href: "/projects" },
  },
  {
    id: "go-tasks",
    label: "Go to Tasks",
    keywords: ["open", "todo", "list"],
    group: "Navigate",
    icon: CheckSquare,
    action: { kind: "navigate", href: "/tasks" },
  },
  {
    id: "go-projects",
    label: "Go to Projects",
    keywords: ["open", "workspace"],
    group: "Navigate",
    icon: FolderKanban,
    action: { kind: "navigate", href: "/projects" },
  },
  {
    id: "go-goals",
    label: "Go to Goals",
    keywords: ["open", "outcomes"],
    group: "Navigate",
    icon: Goal,
    action: { kind: "navigate", href: "/goals" },
  },
  {
    id: "go-habits",
    label: "Go to Habits",
    keywords: ["open", "streaks", "daily"],
    group: "Navigate",
    icon: Repeat,
    action: { kind: "navigate", href: "/habits" },
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
