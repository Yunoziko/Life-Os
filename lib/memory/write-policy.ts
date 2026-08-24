import { looksLikePromptInjection } from "@/lib/agents/injection";
import { DEDUPE_THRESHOLD } from "@/lib/memory/types";
import type { MemoryRecord, MemoryTypeId, MemoryWriteInput } from "@/lib/memory/types";
import { jaccard, looksContradictory } from "@/lib/memory/similarity";
import { canAutoStore, isInferredTrait, isSensitiveMemoryContent, sanitizeMemoryContent } from "@/lib/memory/safety";

export type MemoryWriteDecision =
  | { action: "reject"; reason: string }
  | { action: "confirm"; reason: "sensitive" | "low_confidence" }
  | { action: "update"; existingId: string }
  | { action: "replace"; archiveIds: string[] }
  | { action: "create" };

const CONTRADICTABLE = new Set<MemoryTypeId>(["PREFERENCE", "ROUTINE", "DECISION", "WORKFLOW", "PERSONALIZATION"]);

export function decideMemoryWrite(
  existing: Pick<MemoryRecord, "id" | "type" | "content" | "status">[],
  input: Pick<MemoryWriteInput, "content" | "type"> & { explicit?: boolean; confidence?: string }
): MemoryWriteDecision {
  const content = sanitizeMemoryContent(input.content);
  if (!content) return { action: "reject", reason: "empty" };
  if (isInferredTrait(content) || looksLikePromptInjection(content)) {
    return { action: "reject", reason: "unsafe" };
  }

  const active = existing.filter((item) => item.status === "ACTIVE");
  const duplicate = active.find((item) => jaccard(item.content, content) >= DEDUPE_THRESHOLD);
  if (duplicate) return { action: "update", existingId: duplicate.id };

  if (input.type && CONTRADICTABLE.has(input.type)) {
    const archiveIds = active
      .filter((item) => item.type === input.type && looksContradictory(item.content, content))
      .map((item) => item.id);
    if (archiveIds.length) {
      if (!canAutoStore(content) || isSensitiveMemoryContent(content)) {
        return { action: "confirm", reason: "sensitive" };
      }
      return { action: "replace", archiveIds };
    }
  }

  if (!canAutoStore(content) || isSensitiveMemoryContent(content)) {
    return { action: "confirm", reason: "sensitive" };
  }
  if (!input.explicit && input.confidence === "LOW") {
    return { action: "confirm", reason: "low_confidence" };
  }

  return { action: "create" };
}
