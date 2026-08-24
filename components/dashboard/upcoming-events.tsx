import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { calendarDate, formatEventDuration, formatShortDate, formatTime } from "@/lib/utils/date";
import type { DashboardEvent } from "@/lib/db/dashboard";

export function UpcomingEvents({
  events,
  timezone,
}: {
  events: DashboardEvent[];
  timezone: string;
}) {
  const today = calendarDate(timezone);
  const todayItems = events.filter((event) => calendarDate(timezone, event.startAt) === today);
  const laterItems = events.filter((event) => calendarDate(timezone, event.startAt) !== today);

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
          title="Your schedule is clear."
          description="Add an event or give a task a due time."
          action={<CreateTrigger type="event" size="sm">Add event</CreateTrigger>}
        />
      ) : (
        <div className="space-y-4">
          {todayItems.length > 0 ? (
            <UpcomingGroup title="Today" events={todayItems} timezone={timezone} />
          ) : null}
          {laterItems.length > 0 ? (
            <UpcomingGroup title={todayItems.length > 0 ? "Later" : "Coming up"} events={laterItems} timezone={timezone} />
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function UpcomingGroup({
  title,
  events,
  timezone,
}: {
  title: string;
  events: DashboardEvent[];
  timezone: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{title}</p>
      <ul className="space-y-3">
        {events.map((event) => {
          const duration = formatEventDuration(event.startAt, event.endAt, event.allDay);
          return (
            <li key={`${event.kind}-${event.id}`}>
              <Link
                href={event.href}
                className="flex items-start gap-3 rounded-lg outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground/70"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{event.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.kind === "task"
                      ? "TASK · "
                      : event.source === "GOOGLE"
                        ? "GOOGLE · "
                        : "AZIO · "}
                    {event.allDay
                      ? `${formatShortDate(event.startAt, timezone)} · All day`
                      : `${formatShortDate(event.startAt, timezone)} · ${formatTime(event.startAt, timezone)}`}
                    {duration && !event.allDay ? ` · ${duration}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
