"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/lib/actions/entities";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { EventForm, eventValuesToFormData, type EventFormValues } from "@/components/calendar/event-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { eventAccent } from "@/lib/calendar/labels";
import { firstOfMonth, type CalendarView } from "@/lib/calendar/range";
import type { CalendarItem, CalendarWorkspace } from "@/lib/db/calendar";
import { addCalendarDays, calendarDate, formatClock, formatShortDate, formatTime, formatWeekday, utcMidnightFromCalendarDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BANDS = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
] as const;

export function CalendarWorkspace({
  data,
  projects,
  goals,
  timezone,
  selectedEventId,
}: {
  data: CalendarWorkspace;
  projects: AssignableProject[];
  goals: AssignableGoal[];
  timezone: string;
  selectedEventId?: string;
}) {
  const router = useRouter();
  const mobile = useMediaQuery("(max-width: 767px)");
  const view = data.view;
  const [editing, setEditing] = useState<CalendarWorkspace["events"][number] | "new" | null>(
    () => data.events.find((event) => event.id === selectedEventId) ?? null
  );
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = calendarDate(timezone);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const day of data.range.days) map.set(day, []);
    for (const item of data.items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [data.items, data.range.days]);

  function go(next: { view?: CalendarView; date?: string; event?: string | null }) {
    const params = new URLSearchParams();
    params.set("view", next.view ?? view);
    params.set("date", next.date ?? data.ymd);
    if (next.event) params.set("event", next.event);
    router.push(`/calendar?${params.toString()}`);
  }

  function openNew(date = data.ymd) {
    setEditing("new");
    setCreateDate(date);
  }

  const [createDate, setCreateDate] = useState(data.ymd);

  async function onCreate(values: EventFormValues) {
    setPending(true);
    const result = await createEventAction(eventValuesToFormData(values));
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Event created");
    setEditing(null);
    router.refresh();
  }

  async function onUpdate(values: EventFormValues) {
    if (editing === "new" || !editing) return;
    setPending(true);
    const result = await updateEventAction(eventValuesToFormData(values, editing.id));
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Event updated");
    setEditing(null);
    router.refresh();
  }

  const selectedEvent = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Time, laid out calmly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => go({ date: today })}>
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Previous"
            onClick={() => go({ date: shiftDate(data.ymd, view, -1) })}
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Next"
            onClick={() => go({ date: shiftDate(data.ymd, view, 1) })}
          >
            ›
          </Button>
          <p className="min-w-36 text-sm font-medium">{rangeLabel(data, timezone)}</p>
          <CreateTrigger type="event" size="sm" defaults={{ date: data.ymd }}>
            + Add event
          </CreateTrigger>
        </div>
      </header>

      <Tabs value={view} onValueChange={(value) => go({ view: value as CalendarView })}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          {(["month", "week", "day", "agenda"] as const).map((item) => (
            <TabsTrigger key={item} value={item} className={cn(mobile && (item === "week" || item === "month") && "hidden sm:inline-flex")}>
              {item[0].toUpperCase() + item.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {data.items.length === 0 && (view === "agenda" || view === "day") ? (
        <EmptyState
          icon={CalendarDays}
          title="Your schedule is clear."
          description="Nothing is booked in this stretch of days."
          action={
            <Button type="button" onClick={() => openNew()}>
              Add event
            </Button>
          }
        />
      ) : view === "month" ? (
        <MonthView
          days={data.range.days}
          itemsByDate={itemsByDate}
          selected={data.ymd}
          today={today}
          timezone={timezone}
          onSelectDay={(date) => go({ view: mobile ? "day" : "day", date })}
        />
      ) : view === "week" ? (
        <WeekView
          days={data.range.days}
          itemsByDate={itemsByDate}
          today={today}
          timezone={timezone}
          onOpenEvent={(id) => {
            const event = data.events.find((item) => item.id === id);
            if (event) setEditing(event);
          }}
          onNew={openNew}
        />
      ) : view === "day" ? (
        <DayView
          date={data.ymd}
          items={itemsByDate.get(data.ymd) ?? []}
          timezone={timezone}
          onOpenEvent={(id) => {
            const event = data.events.find((item) => item.id === id);
            if (event) setEditing(event);
          }}
          onNew={() => openNew(data.ymd)}
        />
      ) : (
        <AgendaView
          days={data.range.days}
          itemsByDate={itemsByDate}
          today={today}
          timezone={timezone}
          onOpenEvent={(id) => {
            const event = data.events.find((item) => item.id === id);
            if (event) setEditing(event);
          }}
        />
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New event" : "Edit event"}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.source === "GOOGLE"
                ? "Google Calendar event"
                : selectedEvent?.project?.name || selectedEvent?.goal?.title
                  ? [selectedEvent.project?.name, selectedEvent.goal?.title].filter(Boolean).join(" · ")
                  : "A block of time that matters."}
            </DialogDescription>
          </DialogHeader>
          <EventForm
            values={
              selectedEvent
                ? {
                    title: selectedEvent.title,
                    description: selectedEvent.description ?? "",
                    date: calendarDate(timezone, new Date(selectedEvent.startAt)),
                    startTime: formatClock(new Date(selectedEvent.startAt), timezone),
                    endTime: selectedEvent.endAt ? formatClock(new Date(selectedEvent.endAt), timezone) : "",
                    allDay: selectedEvent.allDay ? "true" : undefined,
                    location: selectedEvent.location ?? "",
                    color: selectedEvent.color ?? "stone",
                    projectId: selectedEvent.projectId ?? "",
                    goalId: selectedEvent.goalId ?? "",
                    recurrence: selectedEvent.recurrence ?? "",
                    reminderMinutes: selectedEvent.reminderMinutes ?? undefined,
                  }
                : { date: createDate }
            }
            projects={projects}
            goals={goals}
            pending={pending}
            submitLabel={editing === "new" ? "Create" : "Save"}
            onCancel={() => setEditing(null)}
            onSubmit={editing === "new" ? onCreate : onUpdate}
          />
          {selectedEvent ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete event
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>{selectedEvent?.title} will be removed from your calendar.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!selectedEvent) return;
                const result = await deleteEventAction(selectedEvent.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Event deleted");
                setConfirmDelete(false);
                setEditing(null);
                router.refresh();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthView({
  days,
  itemsByDate,
  selected,
  today,
  timezone,
  onSelectDay,
}: {
  days: string[];
  itemsByDate: Map<string, CalendarItem[]>;
  selected: string;
  today: string;
  timezone: string;
  onSelectDay: (date: string) => void;
}) {
  const month = selected.slice(0, 7);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="grid grid-cols-7 border-b border-border/70 text-center text-[11px] tracking-wide text-muted-foreground uppercase">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = itemsByDate.get(day) ?? [];
          const inMonth = day.startsWith(month);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={`${formatShortDate(utcMidnightFromCalendarDate(day), timezone)}, ${items.length} items`}
              className={cn(
                "min-h-20 border-r border-b border-border/50 p-2 text-left outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring/50",
                !inMonth && "bg-muted/20 text-muted-foreground",
                day === today && "bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  day === today && "bg-foreground text-background"
                )}
              >
                {Number(day.slice(8))}
              </span>
              <span className="mt-2 flex gap-1">
                {items.slice(0, 3).map((item) => (
                  <span
                    key={`${item.kind}-${item.id}`}
                    className="size-1.5 rounded-full"
                    style={{ background: item.kind === "event" ? eventAccent(item.color) : "currentColor" }}
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  days,
  itemsByDate,
  today,
  timezone,
  onOpenEvent,
  onNew,
}: {
  days: string[];
  itemsByDate: Map<string, CalendarItem[]>;
  today: string;
  timezone: string;
  onOpenEvent: (id: string) => void;
  onNew: (date: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
      <div className="grid min-w-[52rem] grid-cols-[5.5rem_repeat(7,minmax(0,1fr))]">
        <div className="border-b border-border/70" />
        {days.map((day) => (
          <div
            key={day}
            className={cn(
              "border-b border-l border-border/70 px-2 py-2 text-center",
              day === today && "bg-muted/30"
            )}
          >
            <p className="text-[11px] text-muted-foreground uppercase">{formatWeekday(utcMidnightFromCalendarDate(day), timezone)}</p>
            <p className={cn("text-sm font-medium", day === today && "text-foreground")}>{Number(day.slice(8))}</p>
          </div>
        ))}
        {BANDS.map((band) => (
          <div key={band.id} className="contents">
            <div className="border-b border-border/70 px-2 py-3 text-xs text-muted-foreground">{band.label}</div>
            {days.map((day) => {
              const items = (itemsByDate.get(day) ?? []).filter((item) => item.band === band.id);
              return (
                <button
                  key={`${band.id}-${day}`}
                  type="button"
                  onClick={() => onNew(day)}
                  className={cn(
                    "min-h-24 space-y-1 border-b border-l border-border/70 p-1.5 text-left align-top",
                    day === today && "bg-muted/20"
                  )}
                >
                  {items.map((item) => (
                    <CalendarChip key={`${item.kind}-${item.id}`} item={item} timezone={timezone} onOpenEvent={onOpenEvent} />
                  ))}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({
  date,
  items,
  timezone,
  onOpenEvent,
  onNew,
}: {
  date: string;
  items: CalendarItem[];
  timezone: string;
  onOpenEvent: (id: string) => void;
  onNew: () => void;
}) {
  const events = items.filter((item) => item.kind === "event");
  const tasks = items.filter((item) => item.kind === "task");
  const habits = items.filter((item) => item.kind === "habit");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium">{formatShortDate(utcMidnightFromCalendarDate(date), timezone)}</h2>
          <Button type="button" size="sm" variant="outline" onClick={onNew}>
            Add event
          </Button>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events on this day.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((item) => (
              <li key={item.id}>
                <button type="button" className="block w-full text-left" onClick={() => onOpenEvent(item.id)}>
                  <ItemRow item={item} timezone={timezone} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="space-y-4">
        <SideList title="Tasks" items={tasks} timezone={timezone} empty="No tasks scheduled." />
        <SideList title="Habits" items={habits} timezone={timezone} empty="No habits due." />
      </div>
    </div>
  );
}

function AgendaView({
  days,
  itemsByDate,
  today,
  timezone,
  onOpenEvent,
}: {
  days: string[];
  itemsByDate: Map<string, CalendarItem[]>;
  today: string;
  timezone: string;
  onOpenEvent: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {days.map((day) => {
        const items = itemsByDate.get(day) ?? [];
        const label = day === today ? "Today" : day === addCalendarDays(today, 1) ? "Tomorrow" : formatShortDate(utcMidnightFromCalendarDate(day), timezone);
        return (
          <section key={day}>
            <h2 className="mb-2 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</h2>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
                Nothing scheduled.
              </p>
            ) : (
              <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
                {items.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    {item.kind === "event" ? (
                      <button type="button" className="block w-full px-4 py-3 text-left" onClick={() => onOpenEvent(item.id)}>
                        <ItemRow item={item} timezone={timezone} />
                      </button>
                    ) : (
                      <Link href={item.href} className="block px-4 py-3">
                        <ItemRow item={item} timezone={timezone} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CalendarChip({
  item,
  timezone,
  onOpenEvent,
}: {
  item: CalendarItem;
  timezone: string;
  onOpenEvent: (id: string) => void;
}) {
  const className = cn(
    "block w-full truncate rounded-md px-1.5 py-1 text-[11px] leading-tight",
    item.kind === "task" && "bg-muted text-muted-foreground",
    item.kind === "habit" && "bg-muted/70 text-muted-foreground",
    item.kind === "event" && "text-background"
  );
  const style = item.kind === "event" ? { background: eventAccent(item.color) } : undefined;
  const label = item.title;

  if (item.kind === "event") {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={(event) => {
          event.stopPropagation();
          onOpenEvent(item.id);
        }}
      >
        {label}
        {item.source === "GOOGLE" ? <span className="ml-1 opacity-70">G</span> : null}
      </button>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={(event) => event.stopPropagation()}>
      {item.startAt && !item.allDay ? `${formatTime(new Date(item.startAt), timezone)} · ` : ""}
      {label}
    </Link>
  );
}

function ItemRow({ item, timezone }: { item: CalendarItem; timezone: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{ background: item.kind === "event" ? eventAccent(item.color) : undefined }}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.kind.toUpperCase()}
          {item.source === "GOOGLE" ? " · Google" : item.kind === "event" ? " · LifeOS" : ""}
          {item.allDay || !item.startAt ? " · All day" : ` · ${formatTime(new Date(item.startAt), timezone)}`}
          {item.projectName ? ` · ${item.projectName}` : ""}
          {item.goalTitle ? ` · ${item.goalTitle}` : ""}
        </p>
      </div>
    </div>
  );
}

function SideList({
  title,
  items,
  timezone,
  empty,
}: {
  title: string;
  items: CalendarItem[];
  timezone: string;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="text-sm hover:underline">
                {item.title}
              </Link>
              {item.startAt && !item.allDay ? (
                <p className="text-xs text-muted-foreground">{formatTime(new Date(item.startAt), timezone)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function shiftDate(ymd: string, view: CalendarView, direction: number) {
  if (view === "month") {
    const [year, month] = ymd.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1 + direction, 1));
    return firstOfMonth(next.toISOString().slice(0, 10));
  }
  if (view === "week") return addCalendarDays(ymd, direction * 7);
  if (view === "agenda") return addCalendarDays(ymd, direction * 14);
  return addCalendarDays(ymd, direction);
}

function rangeLabel(data: CalendarWorkspace, timezone: string) {
  const start = utcMidnightFromCalendarDate(data.range.startYmd);
  const end = utcMidnightFromCalendarDate(data.range.endYmd);
  if (data.view === "day") return formatShortDate(start, timezone);
  if (data.view === "month") {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "long", year: "numeric" }).format(start);
  }
  return `${formatShortDate(start, timezone)} – ${formatShortDate(end, timezone)}`;
}
