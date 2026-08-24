"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import {
  createMemoryAction,
  deleteAllMemoriesAction,
  deleteMemoryAction,
  exportMemoriesAction,
  setMemoryEnabledAction,
  updateMemoryAction,
} from "@/lib/actions/memory";
import { MEMORY_TYPE_LABEL, MEMORY_TYPES, type MemoryTypeId } from "@/lib/memory/types";
import { memoryTitle } from "@/lib/memory/retrieval";
import { formatShortDate } from "@/lib/utils/date";

export type MemoryCardData = {
  id: string;
  type: MemoryTypeId;
  content: string;
  source: string;
  importance: string;
  confidence: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function MemorySettingsView({
  memories,
  memoryEnabled,
  timezone,
}: {
  memories: MemoryCardData[];
  memoryEnabled: boolean;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(memoryEnabled);
  const [editing, setEditing] = useState<MemoryCardData | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<MemoryTypeId>("PREFERENCE");
  const [deleting, setDeleting] = useState<MemoryCardData | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState<MemoryTypeId>("PREFERENCE");

  const sorted = useMemo(
    () => [...memories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [memories]
  );

  const toggle = (next: boolean) => {
    setEnabled(next);
    start(async () => {
      const result = await setMemoryEnabledAction(next);
      if (!result.ok) {
        setEnabled(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Personalized Memory is on." : "Personalized Memory is off. Saved memories stay until you delete them.");
      router.refresh();
    });
  };

  const saveNew = () => {
    start(async () => {
      const result = await createMemoryAction({ content: draft, type: draftType });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft("");
      toast.success("Memory saved.");
      router.refresh();
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    start(async () => {
      const result = await updateMemoryAction({
        id: editing.id,
        content: editContent,
        type: editType,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditing(null);
      toast.success("Memory updated.");
      router.refresh();
    });
  };

  const remove = () => {
    if (!deleting) return;
    start(async () => {
      const result = await deleteMemoryAction(deleting.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeleting(null);
      toast.success("Memory forgotten.");
      router.refresh();
    });
  };

  const wipe = () => {
    start(async () => {
      const result = await deleteAllMemoriesAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setWipeOpen(false);
      toast.success("AZIO’s saved memories were removed.");
      router.refresh();
    });
  };

  const exportJson = () => {
    start(async () => {
      const result = await exportMemoriesAction();
      if (!result.ok || !result.data) {
        toast.error(result.ok ? "Export failed." : result.error);
        return;
      }
      const blob = new Blob([result.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Memories exported.");
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium">Personalized Memory</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              When this is off, AZIO won’t create or use personal memories. Existing memories stay stored until you
              delete them.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} aria-label="Personalized Memory" />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Add a memory</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Save a short, useful fact you want AZIO to remember.</p>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="I prefer planning important work in the morning."
          maxLength={280}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <NativeSelect
            value={draftType}
            onChange={(event) => setDraftType(event.target.value as MemoryTypeId)}
            className="sm:max-w-48"
            aria-label="Memory category"
          >
            {MEMORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {MEMORY_TYPE_LABEL[type]}
              </option>
            ))}
          </NativeSelect>
          <Button type="button" size="sm" disabled={pending || !draft.trim()} onClick={saveNew}>
            Remember
          </Button>
        </div>
      </section>

      {sorted.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Tell AZIO “Remember that I prefer morning workouts.”
          </p>
        </section>
      ) : (
        <ul className="grid gap-3">
          {sorted.map((memory) => (
            <li key={memory.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{memoryTitle(memory.content)}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">“{memory.content}”</p>
                  <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <dt className="uppercase tracking-wide">Category</dt>
                      <dd className="mt-0.5 text-foreground">{MEMORY_TYPE_LABEL[memory.type]}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide">Created</dt>
                      <dd className="mt-0.5 text-foreground">
                        {formatShortDate(new Date(memory.createdAt), timezone)}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide">Last used</dt>
                      <dd className="mt-0.5 text-foreground">
                        {memory.lastUsedAt ? formatShortDate(new Date(memory.lastUsedAt), timezone) : "Not yet"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(memory);
                      setEditContent(memory.content);
                      setEditType(memory.type);
                    }}
                  >
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDeleting(memory)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={exportJson}>
          Export my memories
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={() => setWipeOpen(true)}>
          Forget everything
        </Button>
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit memory</DialogTitle>
            <DialogDescription>Update what AZIO remembers. Keep it short and useful.</DialogDescription>
          </DialogHeader>
          <Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={280} />
          <NativeSelect value={editType} onChange={(event) => setEditType(event.target.value as MemoryTypeId)}>
            {MEMORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {MEMORY_TYPE_LABEL[type]}
              </option>
            ))}
          </NativeSelect>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || !editContent.trim()} onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this memory?</DialogTitle>
            <DialogDescription>
              AZIO will stop using “{deleting?.content}”. Tasks, projects, and notes are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forget everything?</DialogTitle>
            <DialogDescription>
              This will permanently remove AZIO’s saved memories about you. Tasks, projects, goals, notes, calendar,
              and billing are not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWipeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={wipe}>
              Delete Memories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
