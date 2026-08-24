import { z } from "zod";
import { MEMORY_TYPES } from "@/lib/memory/types";
import {
  createMemory,
  forgetMemory,
  isMemoryEnabled,
  listActiveMemories,
  MemoryError,
  searchMemories,
  updateMemory,
} from "@/lib/memory/service";
import { inferMemoryType } from "@/lib/memory/retrieval";

type ToolContext = { userId: string; timeZone: string };
type ToolResult = { ok: boolean; data?: unknown; error?: string; summary?: string };

function ok(data: unknown, summary?: string): ToolResult {
  return { ok: true, data, summary };
}

function fail(error: string): ToolResult {
  return { ok: false, error };
}

function wrap(error: unknown): ToolResult {
  if (error instanceof MemoryError) return fail(error.message);
  return fail("That memory action couldn’t be completed.");
}

const typeSchema = z.enum(MEMORY_TYPES);
const rememberSchema = z.object({
  content: z.string().trim().min(1).max(280),
  type: typeSchema.optional(),
  projectId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
});
const searchSchema = z.object({
  query: z.string().trim().min(1).max(200),
});
const listSchema = z.object({
  query: z.string().trim().max(200).optional(),
  type: typeSchema.optional(),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  content: z.string().trim().min(1).max(280).optional(),
  type: typeSchema.optional(),
  importance: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
});
const forgetSchema = z.object({
  id: z.string().uuid().optional(),
  query: z.string().trim().max(200).optional(),
});

export async function rememberFactTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = rememberSchema.safeParse(args ?? {});
  if (!parsed.success) return fail("Write a short fact to remember.");
  if (!(await isMemoryEnabled(ctx.userId))) {
    return fail("Personalized Memory is off. Turn it on in Settings to save this.");
  }
  try {
    const memory = await createMemory(
      ctx.userId,
      {
        content: parsed.data.content,
        type: parsed.data.type ?? inferMemoryType(parsed.data.content, "PREFERENCE"),
        source: "AI",
        projectId: parsed.data.projectId,
        goalId: parsed.data.goalId,
      },
      { explicit: true }
    );
    return ok({ id: memory.id, type: memory.type }, `Remembered: ${memory.content}`);
  } catch (error) {
    return wrap(error);
  }
}

export async function searchMemoriesTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = searchSchema.safeParse(args ?? {});
  if (!parsed.success) return fail("Add a search query.");
  if (!(await isMemoryEnabled(ctx.userId))) {
    return ok({ memories: [], disabled: true }, "Personalized Memory is off.");
  }
  try {
    const memories = await searchMemories(ctx.userId, parsed.data.query);
    return ok(
      {
        memories: memories.map((item) => ({
          id: item.id,
          type: item.type,
          content: item.content,
          importance: item.importance,
          confidence: item.confidence,
        })),
      },
      memories.length ? `Found ${memories.length} relevant memories.` : "No matching memories."
    );
  } catch (error) {
    return wrap(error);
  }
}

export async function listMemoriesTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = listSchema.safeParse(args ?? {});
  if (!parsed.success) return fail("Could not list memories.");
  if (!(await isMemoryEnabled(ctx.userId))) {
    return ok({ memories: [], disabled: true }, "Personalized Memory is off. Saved memories stay in Settings.");
  }
  try {
    const memories = parsed.data.query
      ? await searchMemories(ctx.userId, parsed.data.query, parsed.data.type)
      : parsed.data.type
        ? (await listActiveMemories(ctx.userId)).filter((item) => item.type === parsed.data.type)
        : await listActiveMemories(ctx.userId);
    const slice = memories.slice(0, 20);
    return ok(
      {
        memories: slice.map((item) => ({
          id: item.id,
          type: item.type,
          content: item.content,
          importance: item.importance,
        })),
        total: memories.length,
      },
      slice.length ? `Listing ${slice.length} saved memories.` : "No saved memories yet."
    );
  } catch (error) {
    return wrap(error);
  }
}

export async function updateMemoryTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = updateSchema.safeParse(args ?? {});
  if (!parsed.success) return fail("Choose a memory to update.");
  if (!(await isMemoryEnabled(ctx.userId))) {
    return fail("Personalized Memory is off.");
  }
  try {
    const memory = await updateMemory(ctx.userId, parsed.data.id, {
      content: parsed.data.content,
      type: parsed.data.type,
      importance: parsed.data.importance,
    });
    return ok({ id: memory.id }, `Updated memory: ${memory.content}`);
  } catch (error) {
    return wrap(error);
  }
}

export async function forgetMemoryTool(ctx: ToolContext, args: unknown): Promise<ToolResult> {
  const parsed = forgetSchema.safeParse(args ?? {});
  if (!parsed.success || (!parsed.data.id && !parsed.data.query)) {
    return fail("Choose a memory to forget.");
  }
  try {
    const memory = await forgetMemory(ctx.userId, parsed.data);
    return ok({ id: memory.id }, `Forgot: ${memory.content}`);
  } catch (error) {
    return wrap(error);
  }
}
