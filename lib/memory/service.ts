import { prisma } from "@/lib/db/prisma";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { looksLikePromptInjection } from "@/lib/agents/injection";
import {
  MAX_MEMORY_CANDIDATES,
  MEMORY_TYPES,
  memoryOwnerFilter,
  type MemoryConfidenceId,
  type MemoryImportanceId,
  type MemoryRecord,
  type MemoryRetrievalContext,
  type MemorySourceId,
  type MemoryTypeId,
  type MemoryWriteInput,
} from "@/lib/memory/types";
import { inferMemoryType, rankMemories } from "@/lib/memory/retrieval";
import { jaccard, keywordOverlap, looksContradictory } from "@/lib/memory/similarity";
import { isInferredTrait, isSensitiveMemoryContent, sanitizeMemoryContent } from "@/lib/memory/safety";
import { decideMemoryWrite } from "@/lib/memory/write-policy";

export class MemoryError extends Error {
  readonly code: "disabled" | "unsafe" | "not_found" | "limit" | "invalid";

  constructor(code: MemoryError["code"], message: string) {
    super(message);
    this.name = "MemoryError";
    this.code = code;
  }
}

function asRecord(row: {
  id: string;
  userId: string;
  type: MemoryTypeId;
  content: string;
  source: MemorySourceId;
  importance: MemoryImportanceId;
  confidence: MemoryConfidenceId;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  projectId: string | null;
  goalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
}): MemoryRecord {
  return row;
}

export async function isMemoryEnabled(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { memoryEnabled: true },
  });
  return profile?.memoryEnabled ?? true;
}

export async function setMemoryEnabled(userId: string, enabled: boolean) {
  await prisma.profile.upsert({
    where: { userId },
    update: { memoryEnabled: enabled },
    create: { userId, memoryEnabled: enabled },
  });
}

async function ownedLink(userId: string, projectId?: string | null, goalId?: string | null) {
  const [project, goal] = await Promise.all([
    projectId
      ? prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
      : Promise.resolve(null),
    goalId ? prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  return {
    projectId: project?.id ?? null,
    goalId: goal?.id ?? null,
  };
}

export async function listActiveMemories(userId: string) {
  const rows = await prisma.memory.findMany({
    where: { ...memoryOwnerFilter(userId), status: "ACTIVE" },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });
  return rows.map(asRecord);
}

export async function searchMemories(userId: string, query: string, type?: MemoryTypeId) {
  const q = query.trim();
  const rows = await prisma.memory.findMany({
    where: {
      ...memoryOwnerFilter(userId),
      status: "ACTIVE",
      ...(type ? { type } : {}),
    },
    orderBy: [{ importance: "desc" }, { lastUsedAt: "desc" }, { updatedAt: "desc" }],
    take: MAX_MEMORY_CANDIDATES,
  });
  if (!q) return rows.slice(0, 20).map(asRecord);
  return rows
    .map((row) => ({ row, score: Math.max(keywordOverlap(q, row.content), jaccard(q, row.content)) }))
    .filter((item) => item.score >= 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => asRecord(item.row));
}

export async function getRelevantMemories(context: MemoryRetrievalContext) {
  const enabled = await isMemoryEnabled(context.userId);
  if (!enabled) return [];

  const tokens = context.query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 6);

  const keywordFilters = tokens.map((token) => ({
    content: { contains: token, mode: "insensitive" as const },
  }));

  const rows = await prisma.memory.findMany({
    where: {
      ...memoryOwnerFilter(context.userId),
      status: "ACTIVE",
      OR: [
        { importance: "HIGH" },
        ...(context.projectId ? [{ projectId: context.projectId }] : []),
        ...(context.goalId ? [{ goalId: context.goalId }] : []),
        ...keywordFilters,
      ],
    },
    orderBy: [{ importance: "desc" }, { lastUsedAt: "desc" }, { updatedAt: "desc" }],
    take: MAX_MEMORY_CANDIDATES,
  });

  const ranked = rankMemories(rows.map(asRecord), context);
  if (ranked.length) {
    await prisma.memory.updateMany({
      where: { userId: context.userId, id: { in: ranked.map((item) => item.id) } },
      data: { lastUsedAt: new Date() },
    });
  }
  return ranked;
}

export async function createMemory(
  userId: string,
  input: MemoryWriteInput,
  options?: { explicit?: boolean; skipEnabledCheck?: boolean }
) {
  if (!options?.skipEnabledCheck && !(await isMemoryEnabled(userId))) {
    throw new MemoryError("disabled", "Personalized Memory is off. Turn it on in Settings to save this.");
  }

  const content = sanitizeMemoryContent(input.content);
  if (!content) throw new MemoryError("invalid", "Write a short fact to remember.");
  if (isInferredTrait(content) || looksLikePromptInjection(content)) {
    throw new MemoryError("unsafe", "I don’t store personal judgments or untrusted instructions as memory.");
  }
  if (!options?.explicit && isSensitiveMemoryContent(content)) {
    throw new MemoryError("unsafe", "That looks personal. Confirm in Settings if you want it saved.");
  }

  const type = input.type ?? inferMemoryType(content, "IMPORTANT_CONTEXT");
  const source = input.source ?? "USER";
  const existing = await prisma.memory.findMany({
    where: { userId, status: { in: ["ACTIVE", "ARCHIVED"] } },
    select: { id: true, type: true, content: true, status: true },
    take: MAX_MEMORY_CANDIDATES,
  });
  const decision = decideMemoryWrite(existing, {
    content,
    type,
    explicit: options?.explicit,
    confidence: input.confidence,
  });

  if (decision.action === "reject") {
    throw new MemoryError("unsafe", "I don’t store personal judgments or untrusted instructions as memory.");
  }

  if (decision.action === "update") {
    const updated = await prisma.memory.update({
      where: { id: decision.existingId },
      data: {
        content,
        type,
        source,
        importance: input.importance ?? "HIGH",
        confidence: input.confidence ?? (options?.explicit ? "HIGH" : "MEDIUM"),
        status: "ACTIVE",
        lastUsedAt: new Date(),
        ...(await ownedLink(userId, input.projectId, input.goalId)),
      },
    });
    return asRecord(updated);
  }

  if (decision.action === "replace") {
    await prisma.memory.updateMany({
      where: { userId, id: { in: decision.archiveIds } },
      data: { status: "ARCHIVED" },
    });
  }

  if (decision.action === "confirm" && !options?.explicit) {
    throw new MemoryError("unsafe", "Confirm this memory before AZIO saves it.");
  }

  try {
    await assertWithinLimit(userId, "MEMORIES");
  } catch (error) {
    if (error instanceof EntitlementError) {
      throw new MemoryError("limit", error.message);
    }
    throw error;
  }

  const links = await ownedLink(userId, input.projectId, input.goalId);
  const created = await prisma.memory.create({
    data: {
      userId,
      type,
      content,
      source,
      importance: input.importance ?? (options?.explicit ? "HIGH" : "MEDIUM"),
      confidence: input.confidence ?? (options?.explicit ? "HIGH" : "MEDIUM"),
      projectId: links.projectId,
      goalId: links.goalId,
      lastUsedAt: new Date(),
    },
  });
  return asRecord(created);
}

export async function updateMemory(
  userId: string,
  id: string,
  patch: Partial<Pick<MemoryWriteInput, "content" | "type" | "importance" | "projectId" | "goalId">>
) {
  const existing = await prisma.memory.findFirst({
    where: { id, userId, status: { not: "DELETED" } },
  });
  if (!existing) throw new MemoryError("not_found", "Memory not found.");

  const content = patch.content ? sanitizeMemoryContent(patch.content) : existing.content;
  if (!content) throw new MemoryError("invalid", "Memory can’t be empty.");
  if (isInferredTrait(content) || looksLikePromptInjection(content)) {
    throw new MemoryError("unsafe", "I don’t store personal judgments or untrusted instructions as memory.");
  }

  const type = (patch.type ?? existing.type) as MemoryTypeId;
  if (patch.content && CONTRADICTABLE.has(type)) {
    const others = await prisma.memory.findMany({
      where: { userId, status: "ACTIVE", id: { not: id }, type },
      select: { id: true, content: true },
    });
    const archiveIds = others.filter((item) => looksContradictory(item.content, content)).map((item) => item.id);
    if (archiveIds.length) {
      await prisma.memory.updateMany({
        where: { userId, id: { in: archiveIds } },
        data: { status: "ARCHIVED" },
      });
    }
  }

  const links = await ownedLink(userId, patch.projectId, patch.goalId);
  const updated = await prisma.memory.update({
    where: { id: existing.id },
    data: {
      content,
      type,
      importance: patch.importance ?? existing.importance,
      projectId: patch.projectId === undefined ? existing.projectId : links.projectId,
      goalId: patch.goalId === undefined ? existing.goalId : links.goalId,
    },
  });
  return asRecord(updated);
}

const CONTRADICTABLE = new Set<MemoryTypeId>(["PREFERENCE", "ROUTINE", "DECISION", "WORKFLOW", "PERSONALIZATION"]);

export async function forgetMemory(userId: string, input: { id?: string; query?: string }) {
  if (input.id) {
    const existing = await prisma.memory.findFirst({ where: { id: input.id, userId } });
    if (!existing) throw new MemoryError("not_found", "Memory not found.");
    await prisma.memory.update({
      where: { id: existing.id },
      data: { status: "DELETED" },
    });
    return asRecord({ ...existing, status: "DELETED" });
  }

  const query = sanitizeMemoryContent(input.query ?? "");
  if (!query) throw new MemoryError("invalid", "Choose a memory to forget.");
  const matches = await searchMemories(userId, query);
  if (!matches.length) throw new MemoryError("not_found", "I don’t have a saved memory matching that.");
  const best = matches[0];
  await prisma.memory.update({
    where: { id: best.id },
    data: { status: "DELETED" },
  });
  return asRecord({ ...best, status: "DELETED" });
}

export async function findForgetCandidates(userId: string, query: string) {
  return searchMemories(userId, query);
}

export async function deleteAllMemories(userId: string) {
  const result = await prisma.memory.deleteMany({ where: { userId } });
  return result.count;
}

export async function exportMemories(userId: string) {
  const rows = await prisma.memory.findMany({
    where: { userId, status: { in: ["ACTIVE", "ARCHIVED"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      content: true,
      source: true,
      importance: true,
      confidence: true,
      status: true,
      projectId: true,
      goalId: true,
      createdAt: true,
      updatedAt: true,
      lastUsedAt: true,
    },
  });
  return {
    exportedAt: new Date().toISOString(),
    product: "AZIO",
    memories: rows,
  };
}

export function isMemoryType(value: string): value is MemoryTypeId {
  return MEMORY_TYPES.includes(value as MemoryTypeId);
}
