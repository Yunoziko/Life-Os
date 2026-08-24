"use client";

import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { ContextSource } from "@/lib/ai/types";

const LABELS: Record<ContextSource, string> = {
  tasks: "Tasks",
  goals: "Goals",
  projects: "Projects",
  calendar: "Calendar",
  habits: "Habits",
  notes: "Notes",
  gmail: "Gmail",
  github: "GitHub",
};

export function ContextIndicator({ sources }: { sources: ContextSource[] }) {
  const list = sources.length ? sources : (Object.keys(LABELS) as ContextSource[]);

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
      >
        Using your LifeOS context
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Considered for this reply</PopoverTitle>
          <PopoverDescription>LifeOS looks at your workspace, not the open internet.</PopoverDescription>
        </PopoverHeader>
        <ul className="grid grid-cols-2 gap-1.5">
          {list.map((source) => (
            <li
              key={source}
              className="rounded-lg bg-muted/60 px-2 py-1.5 text-xs text-foreground"
            >
              {LABELS[source]}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
