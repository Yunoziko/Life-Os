"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShortDate, utcMidnightFromCalendarDate } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard/section-card";
import type { TaskTrendPoint } from "@/lib/analytics/types";

const WINDOWS = [7, 30, 90] as const;

export function CompletionChart({
  series,
  timezone,
  defaultWindow,
  windows = WINDOWS,
}: {
  series: TaskTrendPoint[];
  timezone: string;
  defaultWindow: 7 | 30 | 90;
  windows?: readonly (7 | 30 | 90)[];
}) {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(defaultWindow);
  const points = series.slice(-windowDays);
  const total = points.reduce((sum, point) => sum + point.completed, 0);
  const peak = points.reduce((best, point) => (point.completed > best.completed ? point : best), points[0]);
  const chartData = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        label: formatShortDate(utcMidnightFromCalendarDate(point.date), timezone),
      })),
    [points, timezone]
  );

  return (
    <SectionCard
      title="Productivity trend"
      action={
        <div className="flex gap-1">
          {windows.map((item) => (
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
      }
    >
      <p className="sr-only">
        Completed tasks over the last {windowDays} days. Total {total}
        {peak ? `, peak ${peak.completed} on ${peak.date}` : ""}.
      </p>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No completed tasks in this window.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value) => [String(value ?? 0), "Completed"]}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="var(--foreground)"
                fill="var(--foreground)"
                fillOpacity={0.12}
                strokeWidth={1.5}
                name="Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}
