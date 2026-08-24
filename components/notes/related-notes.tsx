"use client";

import Link from "next/link";
import { formatShortDate } from "@/lib/utils/date";

export type RelatedNoteCard = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  pinned: boolean;
};

export function RelatedNotes({
  notes,
  timezone,
}: {
  notes: RelatedNoteCard[];
  timezone: string;
}) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes linked yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note.id}>
          <Link href={`/notes/${note.id}`} className="block rounded-xl px-1 py-1 hover:bg-muted/40">
            <p className="text-sm font-medium">{note.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {note.preview || formatShortDate(new Date(note.updatedAt), timezone)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
