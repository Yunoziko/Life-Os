import { formatShortDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { HabitDayState } from "@/lib/habits/stats";

const labels: Record<HabitDayState, string> = {
  completed: "completed",
  missed: "missed",
  pending: "pending",
  none: "not scheduled",
};

export function HabitHistory({
  history,
  timezone,
}: {
  history: { date: string; state: HabitDayState }[];
  timezone: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Last {history.length} days</p>
      <div
        className="grid grid-cols-10 gap-1 sm:grid-cols-[repeat(15,minmax(0,1fr))]"
        role="list"
        aria-label="Habit history"
      >
        {history.map((day) => (
          <div
            key={day.date}
            role="listitem"
            title={`${formatShortDate(new Date(`${day.date}T12:00:00`), timezone)} · ${labels[day.state]}`}
            aria-label={`${formatShortDate(new Date(`${day.date}T12:00:00`), timezone)}, ${labels[day.state]}`}
            className={cn(
              "aspect-square rounded-sm",
              day.state === "completed" && "bg-foreground",
              day.state === "missed" && "bg-foreground/15",
              day.state === "pending" && "bg-foreground/35",
              day.state === "none" && "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <Legend className="bg-foreground" label="Completed" />
        <Legend className="bg-foreground/15" label="Missed" />
        <Legend className="bg-foreground/35" label="Pending" />
        <Legend className="bg-muted" label="Not scheduled" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} aria-hidden />
      {label}
    </span>
  );
}
