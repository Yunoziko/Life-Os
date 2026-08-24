/**
 * Future long-term memory — not used in this phase.
 * Keep preferences, personal instructions, and important facts
 * separate from raw LifeOS records (tasks, notes, etc.).
 */

export type MemoryKind = "preference" | "instruction" | "fact";

export type UserMemoryEntry = {
  id: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
};

export async function getUserMemory(userId: string): Promise<UserMemoryEntry[]> {
  void userId;
  return [];
}

export function formatMemoryForPrompt(entries: UserMemoryEntry[]) {
  if (entries.length === 0) return "";
  const lines = entries.map((entry) => `- (${entry.kind}) ${entry.content}`);
  return `User memory (explicit, user-approved):\n${lines.join("\n")}`;
}
