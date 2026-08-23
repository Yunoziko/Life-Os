"use client";

import { Button } from "@/components/ui/button";
import { useWorkspace, type CreateDefaults } from "@/components/workspace-provider";
import type { CreateEntityType } from "@/types";

export function CreateTrigger({
  type,
  children,
  variant = "default",
  size = "default",
  defaults,
}: {
  type: CreateEntityType;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  defaults?: CreateDefaults;
}) {
  const { openCreate } = useWorkspace();

  return (
    <Button type="button" variant={variant} size={size} onClick={() => openCreate(type, defaults)}>
      {children}
    </Button>
  );
}
