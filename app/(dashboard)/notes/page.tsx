import { NotebookPen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getNotes } from "@/lib/db/workspace";
import { formatShortDate } from "@/lib/utils/date";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";

export const metadata = { title: "Notes" };

export default async function NotesPage() {
  const user = await requireUser();
  const notes = await getNotes(user.id);
  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <ModulePage
      title="Notes"
      description="A quiet place for thinking."
      icon={NotebookPen}
      emptyTitle="No notes yet"
      emptyDescription="Write the first one when a thought is worth keeping."
      action={<CreateTrigger type="note">New note</CreateTrigger>}
      isEmpty={notes.length === 0}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {notes.map((note) => (
          <article key={note.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-medium">{note.title}</h2>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
              {note.content || "Empty note"}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {formatShortDate(note.updatedAt, timezone)}
            </p>
          </article>
        ))}
      </div>
    </ModulePage>
  );
}
