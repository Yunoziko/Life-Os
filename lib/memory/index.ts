import { getRelevantMemories } from "@/lib/memory/service";
import { formatMemoryForPrompt } from "@/lib/memory/retrieval";
import type { MemoryRecord } from "@/lib/memory/types";

export async function getUserMemory(userId: string, query: string): Promise<MemoryRecord[]> {
  if (!query.trim()) return [];
  return getRelevantMemories({ userId, query });
}

export { formatMemoryForPrompt };
