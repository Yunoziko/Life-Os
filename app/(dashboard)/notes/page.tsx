import { requireUser } from "@/lib/auth/session";
import { getNotesOverview } from "@/lib/db/notes";
import { NotesHome } from "@/components/notes/notes-home";

export const metadata = { title: "Notes" };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const timezone = user.profile?.timezone ?? "UTC";
  const notes = await getNotesOverview(user.id, q?.trim() || undefined);

  return (
    <NotesHome
      notes={notes.map((note) => ({
        ...note,
        updatedAt: note.updatedAt.toISOString(),
        createdAt: note.createdAt.toISOString(),
      }))}
      timezone={timezone}
    />
  );
}
