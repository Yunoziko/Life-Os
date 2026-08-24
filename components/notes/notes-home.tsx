"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { createBlankNoteAction } from "@/lib/actions/entities";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatShortDate } from "@/lib/utils/date";
import type { NoteOverview } from "@/lib/db/notes";

type NoteCard = Omit<NoteOverview, "updatedAt" | "createdAt"> & {
  updatedAt: string;
  createdAt: string;
};

type Filter = "all" | "pinned" | "archived";

export function NotesHome({
  notes,
  timezone,
}: {
  notes: NoteCard[];
  timezone: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (filter === "pinned" && !note.pinned) return false;
      if (filter === "archived" && !note.archived) return false;
      if (filter === "all" && note.archived) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.preview.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [filter, notes, query]);

  const pinned = visible.filter((note) => note.pinned);
  const recent = visible.filter((note) => !note.pinned);
  const byProject = groupBy(visible.filter((note) => note.project), (note) => note.project!.name);
  const byGoal = groupBy(visible.filter((note) => note.goal), (note) => note.goal!.title);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">Capture thoughts before they disappear.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="w-full sm:w-56"
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await createBlankNoteAction();
                if (result.ok && result.data?.id) router.push(`/notes/${result.data.id}`);
              });
            }}
          >
            + New Note
          </Button>
        </div>
      </header>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList variant="line">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pinned">Pinned</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Your mind is full of ideas."
          description="Capture the first one."
          action={
            <Button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  const result = await createBlankNoteAction();
                  if (result.ok && result.data?.id) router.push(`/notes/${result.data.id}`);
                });
              }}
            >
              Create note
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing matches this view.</p>
      ) : (
        <div className="space-y-8">
          {pinned.length > 0 && filter !== "archived" ? (
            <NoteSection title="Pinned" notes={pinned} timezone={timezone} />
          ) : null}
          <NoteSection title="Recent" notes={recent} timezone={timezone} />
          {byProject.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">By project</h2>
              {byProject.map(([name, group]) => (
                <NoteSection key={name} title={name} notes={group} timezone={timezone} />
              ))}
            </div>
          ) : null}
          {byGoal.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">By goal</h2>
              {byGoal.map(([name, group]) => (
                <NoteSection key={name} title={name} notes={group} timezone={timezone} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function NoteSection({
  title,
  notes,
  timezone,
}: {
  title: string;
  notes: NoteCard[];
  timezone: string;
}) {
  if (notes.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {notes.map((note) => (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            className="rounded-2xl border border-border/70 bg-card p-5 outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium">{note.title}</h3>
              {note.pinned ? <span className="text-[11px] text-muted-foreground">Pinned</span> : null}
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {note.preview || "Empty note"}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {formatShortDate(new Date(note.updatedAt), timezone)}
              {note.project ? ` · ${note.project.name}` : ""}
              {note.goal ? ` · ${note.goal.title}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    const current = map.get(name) ?? [];
    current.push(item);
    map.set(name, current);
  }
  return [...map.entries()];
}
