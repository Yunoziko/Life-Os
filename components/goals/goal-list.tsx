"use client";

import { useMemo, useState } from "react";
import { Goal } from "lucide-react";
import { GoalCard } from "@/components/goals/goal-card";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GOAL_FILTERS, type GoalFilter } from "@/lib/goals/labels";
import type { GoalOverview } from "@/lib/db/goals";

export function GoalList({
  goals,
  timezone,
}: {
  goals: GoalOverview[];
  timezone: string;
}) {
  const [filter, setFilter] = useState<GoalFilter>("all");

  const visible = useMemo(() => {
    return goals.filter((goal) => {
      if (filter === "active") return goal.status === "ACTIVE" || goal.status === "NOT_STARTED";
      if (filter === "completed") return goal.status === "COMPLETED";
      if (filter === "paused") return goal.status === "PAUSED";
      return true;
    });
  }, [filter, goals]);

  return (
    <div className="space-y-5">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as GoalFilter)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          {GOAL_FILTERS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {goals.filter((goal) => {
                  if (item.id === "active") return goal.status === "ACTIVE" || goal.status === "NOT_STARTED";
                  if (item.id === "completed") return goal.status === "COMPLETED";
                  if (item.id === "paused") return goal.status === "PAUSED";
                  return true;
                }).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {goals.length === 0 ? (
        <EmptyState
          icon={Goal}
          title="No goals yet."
          description="Choose something worth working toward."
          action={<CreateTrigger type="goal">Create goal</CreateTrigger>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Goal}
          title="Nothing in this view."
          description="Try another filter, or create a new goal."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((goal) => (
            <GoalCard key={goal.id} goal={goal} timezone={timezone} />
          ))}
        </div>
      )}
    </div>
  );
}
