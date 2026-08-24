"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { weekdayFromYmd } from "@/lib/habits/stats";
import { cn } from "@/lib/utils";

export function HabitHeatmap({
  days,
}: {
  days: { date: string; completed: number; scheduled: number }[];
}) {
  const [windowDays, setWindowDays] = useState<30 | 90>(30);
  const visible = days.slice(-windowDays);
  const weeks = useMemo(() => {
    const pad = visible[0] ? weekdayFromYmd(visible[0].date) : 0;
    const cells: ((typeof visible)[number] | null)[] = [...Array.from({ length: pad }, () => null), ...visible];
    const columns: ((typeof visible)[number] | null)[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      columns.push(cells.slice(index, index + 7));
    }
    return columns;
  }, [visible]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        {([30, 90] as const).map((item) => (
          <Button
            key={item}
            type="button"
            size="xs"
            variant={windowDays === item ? "secondary" : "ghost"}
            onClick={() => setWindowDays(item)}
            aria-pressed={windowDays === item}
          >
            {item}d
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div
          className="flex min-w-[16rem] gap-1"
          role="img"
          aria-label="Habit activity heatmap. Columns are weeks, rows are Sunday through Saturday."
        >
          {weeks.map((week, weekIndex) => (
            <div key={week.find((day) => day)?.date ?? `week-${weekIndex}`} className="grid gap-1">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={`pad-${weekIndex}-${dayIndex}`} className="size-3 sm:size-3.5" aria-hidden />;
                }
                const ratio = day.scheduled === 0 ? 0 : day.completed / day.scheduled;
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.completed}/${day.scheduled} scheduled habits`}
                    aria-label={`${day.date}: ${day.completed} of ${day.scheduled} scheduled habits`}
                    className={cn(
                      "size-3 rounded-[3px] sm:size-3.5",
                      day.scheduled === 0 && "bg-muted/50",
                      day.scheduled > 0 && ratio === 0 && "bg-muted",
                      ratio > 0 && ratio < 0.5 && "bg-foreground/25",
                      ratio >= 0.5 && ratio < 1 && "bg-foreground/55",
                      ratio >= 1 && "bg-foreground/85"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Darker cells are days with more scheduled habits completed. Empty cells had nothing scheduled.
      </p>
    </div>
  );
}
