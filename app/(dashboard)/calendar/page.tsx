import { CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getUpcomingEvents } from "@/lib/db/workspace";
import { formatShortDate, formatTime } from "@/lib/utils/date";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const user = await requireUser();
  const events = await getUpcomingEvents(user.id);
  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <ModulePage
      title="Calendar"
      description="What’s coming, without the noise."
      icon={CalendarDays}
      emptyTitle="No upcoming events"
      emptyDescription="This calendar stays empty until something is actually scheduled."
      action={<CreateTrigger type="event">Add event</CreateTrigger>}
      isEmpty={events.length === 0}
    >
      <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {events.map((event) => (
          <li key={event.id} className="flex items-start justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm font-medium">{event.title}</p>
              {event.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">
              {formatShortDate(event.startAt, timezone)}
              {event.allDay ? "" : ` · ${formatTime(event.startAt, timezone)}`}
            </p>
          </li>
        ))}
      </ul>
    </ModulePage>
  );
}
