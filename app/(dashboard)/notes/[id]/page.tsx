import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getNoteWorkspace } from "@/lib/db/notes";
import { getAssignableOptions } from "@/lib/db/tasks";
import { NoteEditor } from "@/components/notes/note-editor";

export const metadata = { title: "Note" };

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [note, [projects, goals]] = await Promise.all([
    getNoteWorkspace(user.id, id),
    getAssignableOptions(user.id),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <NoteEditor
      note={{
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        pinned: note.pinned,
        archived: note.archived,
        projectId: note.projectId,
        goalId: note.goalId,
      }}
      projects={projects}
      goals={goals}
    />
  );
}
