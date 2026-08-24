import { getAIProvider, isAIConfigured } from "@/lib/ai";
import { AIError } from "@/lib/ai/errors";
import { aiLog, publicUserRef } from "@/lib/ai/logger";
import { buildLifeOSContext, formatNow } from "@/lib/ai/context";
import { lifeOSSystemPrompt } from "@/lib/ai/prompt";
import { getUserMemory, formatMemoryForPrompt } from "@/lib/ai/memory";
import { assertAIRateLimit } from "@/lib/ai/rate-limit";
import { assertAIUsage } from "@/lib/billing/entitlements";
import { recordAIUsage } from "@/lib/billing/usage";
import { buildStructuredAction } from "@/lib/ai/actions";
import {
  AUTO_WRITE_TOOLS,
  CONFIRM_WRITE_TOOLS,
  READ_TOOLS,
  lifeOSTools,
} from "@/lib/ai/tools/definitions";
import { executeLifeOSTool, isKnownTool } from "@/lib/ai/tools/execute";
import type { AIChatMessage, AIChatResponse } from "@/lib/ai/provider";
import type { ConversationMessage, StructuredAction, ChatStreamEvent } from "@/lib/ai/types";
import { maybeRunAgentFromChat } from "@/lib/agents/chat-bridge";
import {
  appendMessage,
  conversationTitleFrom,
  createConversation,
  getConversation,
  touchConversation,
} from "@/lib/db/ai";

export type { ChatStreamEvent };

const MAX_HISTORY = 16;
const MAX_ROUNDS = 4;
const PROVIDER_TIMEOUT_MS = 28_000;

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw || "{}") as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  } catch {
    return { __invalid: true };
  }
}

function compactResult(result: { ok: boolean; data?: unknown; error?: string; summary?: string }) {
  if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
  return JSON.stringify({
    ok: true,
    summary: result.summary,
    data: result.data,
  });
}

function withTimeout(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  if (!signal) return timeout;
  return AbortSignal.any([timeout, signal]);
}

export async function runLifeOSChat(input: {
  userId: string;
  timeZone: string;
  conversationId?: string;
  message: string;
  onEvent: (event: ChatStreamEvent) => void;
  signal?: AbortSignal;
}) {
  const started = Date.now();
  const text = input.message.trim();
  if (!text) throw new AIError("invalid_args", "Write a message first.");
  if (text.length > 4000) throw new AIError("invalid_args", "That message is too long.");

  const handled = await maybeRunAgentFromChat({
    userId: input.userId,
    timeZone: input.timeZone,
    conversationId: input.conversationId,
    message: text,
    onEvent: input.onEvent,
  });
  if (handled) return;

  if (!isAIConfigured()) throw new AIError("missing_key");

  await assertAIRateLimit(input.userId);
  await assertAIUsage(input.userId, input.timeZone);
  input.onEvent({ type: "status", value: "thinking" });

  let conversationId = input.conversationId;
  let title = conversationTitleFrom(text);
  let history: ConversationMessage[] = [];

  if (conversationId) {
    const existing = await getConversation(input.userId, conversationId);
    if (!existing) throw new AIError("unauthorized", "Conversation not found.");
    history = existing.messages.filter((message) => message.role !== "system");
    title = existing.title;
    const hasUser = existing.messages.some((message) => message.role === "user");
    if (!hasUser) {
      await touchConversation(input.userId, conversationId, title);
    }
  } else {
    const created = await createConversation(input.userId, title);
    conversationId = created.id;
  }

  if (!conversationId) {
    throw new AIError("database", "Could not open a conversation.");
  }

  input.onEvent({ type: "conversation", id: conversationId, title });
  const lastSaved = history.at(-1);
  if (!(lastSaved?.role === "user" && lastSaved.content === text)) {
    await appendMessage(conversationId, "USER", text);
  }

  const now = formatNow(input.timeZone);
  const [context, memory] = await Promise.all([
    buildLifeOSContext(input.userId, input.timeZone),
    getUserMemory(input.userId),
  ]);

  input.onEvent({ type: "context", sources: context.sources });

  const provider = getAIProvider();
  aiLog.started({
    user: publicUserRef(input.userId),
    provider: provider.id,
    conversation: conversationId.slice(-6),
  });

  const messages: AIChatMessage[] = [
    {
      role: "system",
      content: [
        lifeOSSystemPrompt(now),
        formatMemoryForPrompt(memory),
        context.promptBlock,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...history.slice(-MAX_HISTORY).map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    })),
    { role: "user", content: text },
  ];

  const pendingActions: StructuredAction[] = [];
  const toolTrace: { name: string; ok: boolean }[] = [];
  const ctx = { userId: input.userId, timeZone: input.timeZone };
  const signal = withTimeout(input.signal);
  let final: AIChatResponse | null = null;
  let assistantText = "";

  const emit = (delta: string) => {
    if (!delta) return;
    assistantText += delta;
    input.onEvent({ type: "text", delta });
  };

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const canStream = Boolean(provider.stream) && round === 0 && !assistantText;
    const response = canStream && provider.stream
      ? await provider.stream({ messages, tools: lifeOSTools, signal }, emit)
      : await provider.chat({
          messages,
          tools: lifeOSTools,
          signal,
        });

    if (!response.toolCalls?.length) {
      final = response;
      break;
    }

    if (assistantText && canStream) {
      assistantText = "";
      input.onEvent({ type: "status", value: "thinking" });
    }

    messages.push({
      role: "assistant",
      content: response.content || "",
      toolCalls: response.toolCalls,
    });

    const writeCalls = response.toolCalls.filter(
      (call) => CONFIRM_WRITE_TOOLS.has(call.name) || AUTO_WRITE_TOOLS.has(call.name)
    );
    const forceConfirm = writeCalls.length > 1;

    for (const call of response.toolCalls) {
      const args = parseArgs(call.arguments);
      if (args.__invalid || !isKnownTool(call.name)) {
        messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify({
            ok: false,
            error: args.__invalid ? "Invalid tool arguments." : "Unknown tool.",
          }),
        });
        toolTrace.push({ name: call.name, ok: false });
        continue;
      }

      const confirm =
        CONFIRM_WRITE_TOOLS.has(call.name) || (forceConfirm && AUTO_WRITE_TOOLS.has(call.name));

      if (confirm) {
        const action = buildStructuredAction(call.name, args);
        if (action) pendingActions.push(action);
        messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify({
            ok: true,
            status: "awaiting_confirmation",
            message: "Shown to the user as a confirmation card. Do not claim it is already saved.",
          }),
        });
        toolTrace.push({ name: call.name, ok: true });
        continue;
      }

      if (READ_TOOLS.has(call.name) || AUTO_WRITE_TOOLS.has(call.name)) {
        const result = await executeLifeOSTool(call.name, args, ctx);
        toolTrace.push({ name: call.name, ok: result.ok });
        messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: compactResult(result),
        });
        continue;
      }

      messages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify({ ok: false, error: "That action is not allowed." }),
      });
    }
  }

  if (final?.content) {
    if (!assistantText) emit(final.content);
  } else if (!assistantText && provider.stream) {
    const streamed = await provider.stream({ messages, signal }, emit);
    if (!assistantText) emit(streamed.content);
  } else if (!assistantText) {
    const closing = await provider.chat({ messages, signal });
    emit(closing.content);
  }

  if (!assistantText.trim()) {
    emit(
      pendingActions.length
        ? "I can make that change in your workspace. Confirm below to apply it."
        : "I don’t have enough from your workspace to answer that yet."
    );
  }

  for (const action of pendingActions) {
    input.onEvent({ type: "action", action });
  }

  const saved = await appendMessage(conversationId, "ASSISTANT", assistantText, {
    actions: pendingActions.length ? pendingActions : undefined,
    sources: context.sources,
    tools: toolTrace.length ? toolTrace : undefined,
  });

  await recordAIUsage(input.userId, input.timeZone);

  input.onEvent({
    type: "done",
    conversationId,
    message: saved,
  });

  aiLog.completed({
    user: publicUserRef(input.userId),
    provider: provider.id,
    ms: Date.now() - started,
    tools: toolTrace.length,
  });
}
