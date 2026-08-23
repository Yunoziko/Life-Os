import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { formatEventDuration, formatShortDate, formatTime } from "@/lib/utils/date";
import type { DashboardEvent } from "@/lib/db/dashboard";

export function UpcomingEvents({
  events,
  timezone,
}: {
  events: DashboardEvent[];
  timezone: string;
}) {
  return (
    <SectionCard
      title="Upcoming"
      action={
        <CreateTrigger type="event" variant="ghost" size="sm">
          + Add
        </CreateTrigger>
      }
    >
      {events.length === 0 ? (
        <SectionEmpty
          title="No upcoming events"
          description="The calendar stays empty until something is actually scheduled."
          action={<CreateTrigger type="event" size="sm">Add event</CreateTrigger>}
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const duration = formatEventDuration(event.startAt, event.endAt, event.allDay);
            return (
              <li key={event.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground/70"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{event.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.allDay
                      ? `${formatShortDate(event.startAt, timezone)} · All day`
                      : `${formatShortDate(event.startAt, timezone)} · ${formatTime(event.startAt, timezone)}`}
                    {duration && !event.allDay ? ` · ${duration}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
