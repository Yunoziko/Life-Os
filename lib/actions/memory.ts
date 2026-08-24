"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { MEMORY_TYPES, type MemoryImportanceId, type MemoryTypeId } from "@/lib/memory/types";
import {
  createMemory,
  deleteAllMemories,
  exportMemories,
  forgetMemory,
  MemoryError,
  setMemoryEnabled,
  updateMemory,
} from "@/lib/memory/service";

function revalidateMemory() {
  revalidatePath("/settings/memory");
  revalidatePath("/settings");
  revalidatePath("/ai");
}

function fail(error: unknown): ActionResult {
  if (error instanceof MemoryError) {
    if (error.code === "limit") {
      return { ok: false, error: error.message, code: "upgrade_required", feature: "MEMORIES" };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not update memory." };
}

export async function createMemoryAction(input: {
  content: string;
  type?: MemoryTypeId;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const memory = await createMemory(
      user.id,
      { content: input.content, type: input.type, source: "USER", importance: "HIGH", confidence: "HIGH" },
      { explicit: true }
    );
    revalidateMemory();
    return { ok: true, data: { id: memory.id } };
  } catch (error) {
    return fail(error) as ActionResult<{ id: string }>;
  }
}

export async function updateMemoryAction(input: {
  id: string;
  content: string;
  type: MemoryTypeId;
  importance?: MemoryImportanceId;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!MEMORY_TYPES.includes(input.type)) return { ok: false, error: "Choose a valid memory category." };
    await updateMemory(user.id, input.id, {
      content: input.content,
      type: input.type,
      importance: input.importance,
    });
    revalidateMemory();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMemoryAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await forgetMemory(user.id, { id });
    revalidateMemory();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAllMemoriesAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireUser();
    const count = await deleteAllMemories(user.id);
    revalidateMemory();
    return { ok: true, data: { count } };
  } catch (error) {
    return fail(error) as ActionResult<{ count: number }>;
  }
}

export async function setMemoryEnabledAction(enabled: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setMemoryEnabled(user.id, enabled);
    revalidateMemory();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update that setting." };
  }
}

export async function exportMemoriesAction(): Promise<ActionResult<{ json: string; filename: string }>> {
  try {
    const user = await requireUser();
    const payload = await exportMemories(user.id);
    return {
      ok: true,
      data: {
        json: JSON.stringify(payload, null, 2),
        filename: `azio-memories-${new Date().toISOString().slice(0, 10)}.json`,
      },
    };
  } catch (error) {
    return fail(error) as ActionResult<{ json: string; filename: string }>;
  }
}

export async function getMemorySettingsSnapshot() {
  const user = await requireUser();
  const [memories, profile] = await Promise.all([
    prisma.memory.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { memoryEnabled: true, timezone: true },
    }),
  ]);
  return {
    memoryEnabled: profile?.memoryEnabled ?? true,
    timezone: profile?.timezone ?? "UTC",
    memories: memories.map((item) => ({
      id: item.id,
      type: item.type,
      content: item.content,
      source: item.source,
      importance: item.importance,
      confidence: item.confidence,
      createdAt: item.createdAt.toISOString(),
      lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    })),
  };
}
