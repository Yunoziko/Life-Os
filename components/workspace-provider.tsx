"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CreateEntityType } from "@/types";

type WorkspaceContextValue = {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  createType: CreateEntityType | null;
  openCreate: (type: CreateEntityType) => void;
  closeCreate: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createType, setCreateType] = useState<CreateEntityType | null>(null);

  const openCreate = useCallback((type: CreateEntityType) => {
    setCommandOpen(false);
    setSearchOpen(false);
    setCreateType(type);
  }, []);

  const closeCreate = useCallback(() => setCreateType(null), []);

  const value = useMemo(
    () => ({
      commandOpen,
      setCommandOpen,
      searchOpen,
      setSearchOpen,
      createType,
      openCreate,
      closeCreate,
    }),
    [commandOpen, searchOpen, createType, openCreate, closeCreate]
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
