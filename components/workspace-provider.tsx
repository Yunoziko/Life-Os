"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTypingTarget } from "@/lib/utils/keyboard";
import { createBlankNoteAction } from "@/lib/actions/entities";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";
import type { CreateEntityType } from "@/types";

export type CreateDefaults = {
  projectId?: string;
  goalId?: string;
  date?: string;
  startTime?: string;
};

type WorkspaceContextValue = {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  createType: CreateEntityType | null;
  createDefaults: CreateDefaults;
  assignable: {
    projects: AssignableProject[];
    goals: AssignableGoal[];
  };
  openCreate: (type: CreateEntityType, defaults?: CreateDefaults) => void;
  closeCreate: () => void;
  setPageDefaults: (defaults: CreateDefaults | null) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  projects = [],
  goals = [],
}: {
  children: React.ReactNode;
  projects?: AssignableProject[];
  goals?: AssignableGoal[];
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createType, setCreateType] = useState<CreateEntityType | null>(null);
  const [createDefaults, setCreateDefaults] = useState<CreateDefaults>({});
  const pathname = usePathname();
  const router = useRouter();
  const [pageDefaults, setPageDefaultsState] = useState<CreateDefaults>({});

  const openCreate = useCallback((type: CreateEntityType, defaults?: CreateDefaults) => {
    setCommandOpen(false);
    setSearchOpen(false);
    setCreateDefaults({ ...pageDefaults, ...defaults });
    setCreateType(type);
  }, [pageDefaults]);

  const closeCreate = useCallback(() => {
    setCreateType(null);
    setCreateDefaults(pageDefaults);
  }, [pageDefaults]);

  const setPageDefaults = useCallback((defaults: CreateDefaults | null) => {
    const next = defaults ?? {};
    setPageDefaultsState(next);
    setCreateDefaults(next);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      if (pathname.startsWith("/notes")) {
        void createBlankNoteAction().then((result) => {
          if (result.ok && result.data?.id) router.push(`/notes/${result.data.id}`);
        });
        return;
      }
      if (pathname.startsWith("/calendar")) {
        openCreate("event");
        return;
      }
      if (pathname.startsWith("/learning")) {
        openCreate("learning");
        return;
      }
      openCreate("task");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCreate, pathname, router]);

  const value = useMemo(
    () => ({
      commandOpen,
      setCommandOpen,
      searchOpen,
      setSearchOpen,
      createType,
      createDefaults,
      assignable: { projects, goals },
      openCreate,
      closeCreate,
      setPageDefaults,
    }),
    [
      commandOpen,
      searchOpen,
      createType,
      createDefaults,
      projects,
      goals,
      openCreate,
      closeCreate,
      setPageDefaults,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider.");
  }
  return context;
}
