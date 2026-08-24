import { requireUser } from "@/lib/auth/session";
import { getCalendarWorkspace } from "@/lib/db/calendar";
import { getAssignableOptions } from "@/lib/db/tasks";
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";
import { parseCalendarDate, parseCalendarView } from "@/lib/calendar/range";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; event?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const timezone = user.profile?.timezone ?? "UTC";
  const weekStartsOn = user.profile?.weekStartsOn ?? 1;
  const view = parseCalendarView(params.view) ?? "week";
  const date = parseCalendarDate(params.date, timezone);
  const [[projects, goals], data] = await Promise.all([
    getAssignableOptions(user.id),
    getCalendarWorkspace(user.id, view, date, timezone, weekStartsOn),
  ]);

  return (
    <CalendarWorkspace
      data={data}
      projects={projects}
      goals={goals}
      timezone={timezone}
      selectedEventId={params.event}
    />
  );
}
