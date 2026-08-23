"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Goal,
  NotebookPen,
} from "lucide-react";
import { searchEverything } from "@/lib/search";
import { useWorkspace } from "@/components/workspace-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchResult, SearchResultType } from "@/types";

const icons: Record<SearchResultType, typeof CheckSquare> = {
  task: CheckSquare,
  goal: Goal,
  project: FolderKanban,
  note: NotebookPen,
  event: CalendarDays,
};

export function GlobalSearch() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useWorkspace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingInField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !typingInField) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  function handleOpenChange(open: boolean) {
    setSearchOpen(open);
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      startTransition(async () => {
        const next = await searchEverything(value);
        setResults(next);
      });
    }, 200);
  }

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={handleOpenChange}
      title="Search LifeOS"
      description="Search tasks, goals, projects, notes, and events."
    >
      <CommandInput
        placeholder="Search everything…"
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        <CommandEmpty>
          {query.trim().length < 2
            ? "Type at least two characters."
            : isPending
              ? "Searching…"
              : "Nothing matches that yet."}
        </CommandEmpty>
        {results.length > 0 ? (
          <CommandGroup heading="Results">
            {results.map((result) => {
              const Icon = icons[result.type];
              return (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  value={`${result.title} ${result.type}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    router.push(result.href);
                  }}
                >
                  <Icon />
                  <span className="flex min-w-0 flex-col">
                    <span>{result.title}</span>
                    {result.subtitle ? (
                      <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                    ) : null}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
