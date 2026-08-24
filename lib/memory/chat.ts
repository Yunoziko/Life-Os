import { buildStructuredAction } from "@/lib/ai/actions";
import type { ChatStreamEvent } from "@/lib/ai/types";
import {
  appendMessage,
  conversationTitleFrom,
  createConversation,
  getConversation,
  touchConversation,
} from "@/lib/db/ai";
import { parseMemoryIntent } from "@/lib/memory/intent";
import {
  createMemory,
  findForgetCandidates,
  isMemoryEnabled,
  listActiveMemories,
  MemoryError,
  searchMemories,
} from "@/lib/memory/service";
import { isSensitiveMemoryContent } from "@/lib/memory/safety";

async function openConversation(userId: string, conversationId: string | undefined, message: string) {
  let id = conversationId;
  let title = conversationTitleFrom(message);
  if (id) {
    const existing = await getConversation(userId, id);
    if (!existing) return null;
    title = existing.title;
    await touchConversation(userId, id, title);
  } else {
    const created = await createConversation(userId, title);
    id = created.id;
  }
  if (!id) return null;
  return { id, title };
}

async function finish(input: {
  userId: string;
  conversationId?: string;
  message: string;
  reply: string;
  onEvent: (event: ChatStreamEvent) => void;
  actions?: Array<NonNullable<ReturnType<typeof buildStructuredAction>>>;
}) {
  const opened = await openConversation(input.userId, input.conversationId, input.message);
  if (!opened) return false;
  input.onEvent({ type: "conversation", id: opened.id, title: opened.title });
  await appendMessage(opened.id, "USER", input.message);
  const actions = input.actions ?? [];
  const saved = await appendMessage(opened.id, "ASSISTANT", input.reply, {
    actions: actions.length ? actions : undefined,
  });
  for (const action of actions) {
    if (action) input.onEvent({ type: "action", action });
  }
  input.onEvent({ type: "done", conversationId: opened.id, message: saved });
  return true;
}

export async function maybeHandleMemoryChat(input: {
  userId: string;
  conversationId?: string;
  message: string;
  onEvent: (event: ChatStreamEvent) => void;
}) {
  const intent = parseMemoryIntent(input.message);
  if (intent.kind === "none") return false;

  const enabled = await isMemoryEnabled(input.userId);

  if (intent.kind === "forget_all") {
    return finish({
      ...input,
      reply:
        "I won’t erase everything from chat. Open Settings → Memory and confirm **Forget everything** if you want to permanently remove AZIO’s saved memories about you. Tasks, projects, and notes stay untouched.",
    });
  }

  if (intent.kind === "remember") {
    if (!enabled) {
      return finish({
        ...input,
        reply: "Personalized Memory is off, so I won’t save that. You can turn it on in Settings → Memory.",
      });
    }
    if (isSensitiveMemoryContent(intent.content)) {
      const action = buildStructuredAction("remember_fact", {
        content: intent.content,
        type: intent.type,
      });
      return finish({
        ...input,
        reply: "That’s personal enough that I want your confirmation before saving it.",
        actions: action ? [action] : [],
      });
    }
    try {
      const memory = await createMemory(
        input.userId,
        { content: intent.content, type: intent.type, source: "USER", importance: "HIGH", confidence: "HIGH" },
        { explicit: true }
      );
      return finish({
        ...input,
        reply: `Got it. I’ll remember that ${memory.content.replace(/^user\s+/i, "").replace(/\.$/, "")}.`,
      });
    } catch (error) {
      const message = error instanceof MemoryError ? error.message : "I couldn’t save that memory.";
      return finish({ ...input, reply: message });
    }
  }

  if (intent.kind === "forget") {
    try {
      const matches = await findForgetCandidates(input.userId, intent.query);
      if (!matches.length) {
        return finish({ ...input, reply: "I don’t have a saved memory matching that." });
      }
      if (matches.length === 1) {
        const action = buildStructuredAction("forget_memory", { id: matches[0].id, query: intent.query });
        return finish({
          ...input,
          reply: `I can forget this saved memory: “${matches[0].content}”`,
          actions: action ? [action] : [],
        });
      }
      const action = buildStructuredAction("forget_memory", { id: matches[0].id, query: intent.query });
      return finish({
        ...input,
        reply: `I found a few related memories. Confirm to forget the closest match: “${matches[0].content}”`,
        actions: action ? [action] : [],
      });
    } catch (error) {
      const message = error instanceof MemoryError ? error.message : "I couldn’t update that memory.";
      return finish({ ...input, reply: message });
    }
  }

  const memories = enabled
    ? intent.query
      ? await searchMemories(input.userId, intent.query)
      : await listActiveMemories(input.userId)
    : [];

  if (!enabled) {
    return finish({
      ...input,
      reply: "Personalized Memory is off, so I’m not using saved memories in chat. They’re still in Settings → Memory if you want to review them.",
    });
  }

  if (!memories.length) {
    return finish({
      ...input,
      reply: intent.query
        ? `I don’t have saved memories about ${intent.query} yet.`
        : "I don’t have any saved memories yet. Tell me something to remember, like “Remember that I prefer morning workouts.”",
    });
  }

  const lines = memories.slice(0, 10).map((item) => `- ${item.content}`);
  const about = intent.query ? ` about ${intent.query}` : "";
  return finish({
    ...input,
    reply: `Here’s what I remember${about}:\n\n${lines.join("\n")}`,
  });
}
