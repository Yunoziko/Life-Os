"use client";

import { CheckSquare, FolderKanban, Goal, NotebookPen, Repeat } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { SectionCard } from "@/components/dashboard/section-card";
import type { CreateEntityType } from "@/types";

const actions: { type: CreateEntityType; label: string; icon: typeof CheckSquare }[] = [
  { type: "task", label: "New Task", icon: CheckSquare },
  { type: "goal", label: "New Goal", icon: Goal },
  { type: "note", label: "New Note", icon: NotebookPen },
  { type: "project", label: "New Project", icon: FolderKanban },
  { type: "habit", label: "Add Habit", icon: Repeat },
];

export function QuickActions() {
  const { openCreate } = useWorkspace();

  return (
    <SectionCard title="Quick actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.type}
              type="button"
              onClick={() => openCreate(action.type)}
              className="flex h-9 items-center gap-2 rounded-xl border border-border/70 px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon className="size-3.5" />
              {action.label}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
