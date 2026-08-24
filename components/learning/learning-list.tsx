"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { LearningCard } from "@/components/learning/learning-card";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEARNING_FILTERS, type LearningFilter } from "@/lib/learning/labels";
import type { LearningOverview } from "@/lib/db/learning";

export function LearningList({
  items,
  timezone,
}: {
  items: LearningOverview[];
  timezone: string;
}) {
  const [filter, setFilter] = useState<LearningFilter>("all");

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (filter === "active") return item.status === "IN_PROGRESS" || item.status === "NOT_STARTED";
      if (filter === "completed") return item.status === "COMPLETED";
      if (filter === "paused") return item.status === "PAUSED";
      return true;
    });
  }, [filter, items]);

  return (
    <div className="space-y-5">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as LearningFilter)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          {LEARNING_FILTERS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {items.filter((entry) => {
                  if (item.id === "active") return entry.status === "IN_PROGRESS" || entry.status === "NOT_STARTED";
                  if (item.id === "completed") return entry.status === "COMPLETED";
                  if (item.id === "paused") return entry.status === "PAUSED";
                  return true;
                }).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing on your learning list yet."
          description="Add a course, book, or resource you want to actually finish."
          action={<CreateTrigger type="learning">Add learning</CreateTrigger>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing in this view."
          description="Try another filter, or add something new."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <LearningCard key={item.id} item={item} timezone={timezone} />
          ))}
        </div>
      )}
    </div>
  );
}
