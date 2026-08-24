"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteNoteAction, updateNoteAction } from "@/lib/actions/entities";
import { NoteToolbar } from "@/components/notes/note-toolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";

export function NoteEditor({
  note,
  projects,
  goals,
}: {
  note: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    pinned: boolean;
    archived: boolean;
    projectId: string | null;
    goalId: string | null;
  };
  projects: AssignableProject[];
  goals: AssignableGoal[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags.join(", "));
  const [projectId, setProjectId] = useState(note.projectId ?? "");
  const [goalId, setGoalId] = useState(note.goalId ?? "");
  const [pinned, setPinned] = useState(note.pinned);
  const [archived, setArchived] = useState(note.archived);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedRef = useRef({ title: note.title, content: note.content, tags: note.tags.join(", "), projectId: note.projectId ?? "", goalId: note.goalId ?? "" });

  useEffect(() => {
    const dirty =
      title !== savedRef.current.title ||
      content !== savedRef.current.content ||
      tags !== savedRef.current.tags ||
      projectId !== savedRef.current.projectId ||
      goalId !== savedRef.current.goalId;
    if (!dirty) {
      setStatus("saved");
      return;
    }
    setStatus("unsaved");
    const timer = window.setTimeout(async () => {
      setStatus("saving");
      const data = new FormData();
      data.set("id", note.id);
      data.set("title", title.trim() || "Untitled");
      data.set("content", content);
      data.set("tags", tags);
      data.set("projectId", projectId);
      data.set("goalId", goalId);
      const result = await updateNoteAction(data);
      if (!result.ok) {
        setStatus("unsaved");
        toast.error(result.error);
        return;
      }
      savedRef.current = { title, content, tags, projectId, goalId };
      setStatus("saved");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [title, content, tags, projectId, goalId, note.id]);

  async function setFlag(name: "pinned" | "archived", value: boolean) {
    const data = new FormData();
    data.set("id", note.id);
    data.set("title", title.trim() || "Untitled");
    data.set("content", content);
    data.set("tags", tags);
    data.set("projectId", projectId);
    data.set("goalId", goalId);
    data.set(name, String(value));
    const result = await updateNoteAction(data);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (name === "pinned") setPinned(value);
    else setArchived(value);
    toast.success(value ? (name === "pinned" ? "Pinned" : "Archived") : name === "pinned" ? "Unpinned" : "Restored");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/notes" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          All notes
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {status === "saving" ? "Saving…" : status === "unsaved" ? "Unsaved" : "Saved"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => setFlag("pinned", !pinned)}>
            {pinned ? "Unpin" : "Pin"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setFlag("archived", !archived)}>
            {archived ? "Unarchive" : "Archive"}
          </Button>
        </div>
      </div>

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="h-auto border-0 bg-transparent px-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
        aria-label="Note title"
        placeholder="Untitled"
      />

      <NoteToolbar textareaRef={textareaRef} onChange={setContent} />

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start writing…"
        className="min-h-[50vh] resize-none border-0 bg-transparent px-0 text-base leading-7 shadow-none focus-visible:ring-0"
        aria-label="Note content"
      />

      <section className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="note-project">Project</Label>
          <NativeSelect id="note-project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="note-goal">Goal</Label>
          <NativeSelect id="note-goal" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">None</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="note-tags">Tags</Label>
          <Input id="note-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="ideas, launch" />
        </div>
      </section>

      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
        Delete note
      </Button>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                const result = await deleteNoteAction(note.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Note deleted");
                router.push("/notes");
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
