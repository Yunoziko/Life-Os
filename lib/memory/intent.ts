import type { MemoryTypeId } from "@/lib/memory/types";
import { inferMemoryType } from "@/lib/memory/retrieval";
import { sanitizeMemoryContent } from "@/lib/memory/safety";

export type MemoryIntent =
  | { kind: "remember"; content: string; type: MemoryTypeId }
  | { kind: "forget"; query: string }
  | { kind: "forget_all" }
  | { kind: "list"; query?: string }
  | { kind: "none" };

const REMEMBER = /^(please\s+)?remember(?:\s+that)?\s+/i;
const FORGET_ALL = /forget everything|delete all (my )?memories|wipe (your |my )?memory/i;
const FORGET = /^(please\s+)?forget(?:\s+that)?\s+/i;
const LIST =
  /what do you remember|show (me )?(what you remember|your memories)|list (your |my )?memories|memories about me/i;

export function parseMemoryIntent(message: string): MemoryIntent {
  const text = message.trim();
  if (!text) return { kind: "none" };
  if (FORGET_ALL.test(text)) return { kind: "forget_all" };
  if (REMEMBER.test(text)) {
    const content = sanitizeMemoryContent(text.replace(REMEMBER, ""));
    if (!content) return { kind: "none" };
    return { kind: "remember", content, type: inferMemoryType(content, "PREFERENCE") };
  }
  if (FORGET.test(text)) {
    const query = sanitizeMemoryContent(text.replace(FORGET, "").replace(/^(my|the|that)\s+/i, ""));
    if (!query) return { kind: "none" };
    return { kind: "forget", query };
  }
  if (LIST.test(text)) {
    const about = text.match(/about\s+(.+)$/i)?.[1];
    const cleaned = about ? sanitizeMemoryContent(about) : undefined;
    if (!cleaned || /^(me|myself|you)\??\.?$/i.test(cleaned)) return { kind: "list" };
    return { kind: "list", query: cleaned };
  }
  return { kind: "none" };
}

export function looksLikePreferenceStatement(message: string) {
  return /\b(i prefer|i'd rather|i always|i usually|i work best|remember this)\b/i.test(message);
}
