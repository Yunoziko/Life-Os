import { prisma } from "@/lib/db/prisma";
import type { AIMessageMetadata, ConversationMessage, ConversationSummary } from "@/lib/ai/types";
import type { AIMessageRole } from "@/generated/prisma/enums";

function asMetadata(value: unknown): AIMessageMetadata | null {
  if (!value || typeof value !== "object") return null;
  return value as AIMessageMetadata;
}

function toMessage(row: {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: Date;
  metadata: unknown;
}): ConversationMessage {
  return {
    id: row.id,
    role: row.role === "USER" ? "user" : row.role === "ASSISTANT" ? "assistant" : "system",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    metadata: asMetadata(row.metadata),
  };
}

export function conversationTitleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > 48 ? `${clean.slice(0, 45)}…` : clean;
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const rows = await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { id: true, title: true, updatedAt: true },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title?.trim() || "New conversation",
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 80,
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    title: conversation.title?.trim() || "New conversation",
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map(toMessage),
  };
}

export async function createConversation(userId: string, title?: string) {
  return prisma.aIConversation.create({
    data: { userId, title: title || null },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function touchConversation(userId: string, conversationId: string, title?: string) {
  const result = await prisma.aIConversation.updateMany({
    where: { id: conversationId, userId },
    data: title ? { title } : { updatedAt: new Date() },
  });
  return result.count > 0;
}

export async function renameConversation(userId: string, conversationId: string, title: string) {
  const result = await prisma.aIConversation.updateMany({
    where: { id: conversationId, userId },
    data: { title },
  });
  return result.count > 0;
}

export async function deleteConversation(userId: string, conversationId: string) {
  const result = await prisma.aIConversation.deleteMany({
    where: { id: conversationId, userId },
  });
  return result.count > 0;
}

export async function appendMessage(
  conversationId: string,
  role: AIMessageRole,
  content: string,
  metadata?: AIMessageMetadata | null
) {
  const message = await prisma.aIMessage.create({
    data: {
      conversationId,
      role,
      content,
      ...(metadata ? { metadata } : {}),
    },
  });
  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  return toMessage(message);
}

export async function getOwnedMessage(userId: string, messageId: string) {
  return prisma.aIMessage.findFirst({
    where: {
      id: messageId,
      conversation: { userId },
    },
  });
}

export async function updateMessageMetadata(
  messageId: string,
  metadata: AIMessageMetadata
) {
  await prisma.aIMessage.update({
    where: { id: messageId },
    data: { metadata },
  });
}
