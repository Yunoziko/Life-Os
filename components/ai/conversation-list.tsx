"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAIConversationAction, renameAIConversationAction } from "@/lib/actions/ai";
import { addCalendarDays, calendarDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/ai/types";

function groupConversations(items: ConversationSummary[], timeZone: string) {
  const today = calendarDate(timeZone);
  const yesterday = addCalendarDays(today, -1);
  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const item of items) {
    const day = calendarDate(timeZone, new Date(item.updatedAt));
    if (day === today) groups[0].items.push(item);
    else if (day === yesterday) groups[1].items.push(item);
    else groups[2].items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

export function ConversationList({
  conversations,
  activeId,
  timeZone,
  onNavigate,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
  timeZone: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [rename, setRename] = useState<ConversationSummary | null>(null);
  const [title, setTitle] = useState("");
  const groups = useMemo(() => groupConversations(conversations, timeZone), [conversations, timeZone]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Conversations</p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="New conversation"
          onClick={() => {
            onNavigate?.();
            router.push("/ai");
          }}
        >
          <Plus />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-2 py-1 text-[11px] text-muted-foreground">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const href = `/ai/${item.id}`;
                  const active = activeId === item.id || pathname === href;
                  return (
                    <li key={item.id} className="group relative">
                      <Link
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-xl py-2 pr-9 pl-2.5 text-sm leading-5 transition-colors",
                          active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        <span className="line-clamp-2">{item.title}</span>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              className="absolute top-1.5 right-1 opacity-0 group-hover:opacity-100 focus:opacity-100 data-open:opacity-100"
                              aria-label="Conversation actions"
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem
                            onClick={() => {
                              setRename(item);
                              setTitle(item.title);
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={pending}
                            onClick={() => {
                              start(async () => {
                                const result = await deleteAIConversationAction(item.id);
                                if (result.ok) {
                                  if (active) router.push("/ai");
                                  router.refresh();
                                }
                              });
                            }}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <Dialog open={Boolean(rename)} onOpenChange={(open) => !open && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>This stays in your history only.</DialogDescription>
          </DialogHeader>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRename(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !title.trim()}
              onClick={() => {
                if (!rename) return;
                start(async () => {
                  const result = await renameAIConversationAction(rename.id, title);
                  if (result.ok) {
                    setRename(null);
                    router.refresh();
                  }
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
