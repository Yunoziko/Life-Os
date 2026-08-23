"use client";

import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace-provider";
import type { CreateEntityType } from "@/types";

export function CreateTrigger({
  type,
  children,
  variant = "default",
  size = "default",
}: {
  type: CreateEntityType;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}) {
  const { openCreate } = useWorkspace();

  return (
    <Button type="button" variant={variant} size={size} onClick={() => openCreate(type)}>
      {children}
    </Button>
  );
}
