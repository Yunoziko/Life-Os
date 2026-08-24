"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/auth";
import { AIError, userFacingAIError } from "@/lib/ai/errors";
import { aiLog, publicUserRef } from "@/lib/ai/logger";
import { executeLifeOSTool } from "@/lib/ai/tools/execute";
import type { AIMessageMetadata, StructuredAction } from "@/lib/ai/types";
import {
  createConversation,
  deleteConversation,
  getOwnedMessage,
  listConversations,
  renameConversation,
  updateMessageMetadata,
} from "@/lib/db/ai";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AIError("unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) throw new AIError("unauthorized");
  return user;
}

export async function createAIConversationAction(): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSessionUser();
    const conversation = await createConversation(user.id, "New conversation");
    revalidatePath("/ai");
    return { ok: true, data: { id: conversation.id } };
  } catch (error) {
    return { ok: false, error: userFacingAIError(error) };
  }
}

export async function renameAIConversationAction(
  conversationId: string,
  title: string
): Promise<ActionResult> {
  try {
    const user = await requireSessionUser();
    const next = title.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!next) return { ok: false, error: "Give the conversation a name." };
    const updated = await renameConversation(user.id, conversationId, next);
    if (!updated) return { ok: false, error: "Conversation not found." };
    revalidatePath("/ai");
    revalidatePath(`/ai/${conversationId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: userFacingAIError(error) };
  }
}

export async function deleteAIConversationAction(conversationId: string): Promise<ActionResult> {
  try {
    const user = await requireSessionUser();
    const deleted = await deleteConversation(user.id, conversationId);
    if (!deleted) return { ok: false, error: "Conversation not found." };
    revalidatePath("/ai");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: userFacingAIError(error) };
  }
}

export async function listAIConversationsAction() {
  try {
    const user = await requireSessionUser();
    return { ok: true as const, data: await listConversations(user.id) };
  } catch (error) {
    return { ok: false as const, error: userFacingAIError(error) };
  }
}

function metadataOf(value: unknown): AIMessageMetadata {
  if (!value || typeof value !== "object") return {};
  return value as AIMessageMetadata;
}

export async function confirmAIActionAction(
  messageId: string,
  actionId: string
): Promise<ActionResult<{ action: StructuredAction }>> {
  try {
    const user = await requireSessionUser();
    const message = await getOwnedMessage(user.id, messageId);
    if (!message) return { ok: false, error: "That action is no longer available." };

    const metadata = metadataOf(message.metadata);
    const actions = metadata.actions ?? [];
    const action = actions.find((item) => item.id === actionId);
    if (!action) return { ok: false, error: "That action is no longer available." };
    if (action.status !== "awaiting_confirmation") {
      return { ok: false, error: "This change was already handled." };
    }

    const result = await executeLifeOSTool(action.tool, action.payload, {
      userId: user.id,
      timeZone: user.profile?.timezone ?? "UTC",
    });

    action.status = result.ok ? "executed" : "failed";
    action.result = result.ok ? result.summary : result.error;

    await updateMessageMetadata(message.id, { ...metadata, actions });
    revalidatePath("/ai");
    revalidatePath(`/ai/${message.conversationId}`);

    if (!result.ok) {
      aiLog.toolFailed({ user: publicUserRef(user.id), tool: action.tool, ok: false });
      return { ok: false, error: result.error ?? "Could not apply that change." };
    }

    return { ok: true, data: { action } };
  } catch (error) {
    return { ok: false, error: userFacingAIError(error) };
  }
}

export async function cancelAIActionAction(
  messageId: string,
  actionId: string
): Promise<ActionResult<{ action: StructuredAction }>> {
  try {
    const user = await requireSessionUser();
    const message = await getOwnedMessage(user.id, messageId);
    if (!message) return { ok: false, error: "That action is no longer available." };

    const metadata = metadataOf(message.metadata);
    const actions = metadata.actions ?? [];
    const action = actions.find((item) => item.id === actionId);
    if (!action) return { ok: false, error: "That action is no longer available." };
    if (action.status !== "awaiting_confirmation") {
      return { ok: false, error: "This change was already handled." };
    }

    action.status = "cancelled";
    await updateMessageMetadata(message.id, { ...metadata, actions });
    revalidatePath("/ai");
    revalidatePath(`/ai/${message.conversationId}`);
    return { ok: true, data: { action } };
  } catch (error) {
    return { ok: false, error: userFacingAIError(error) };
  }
}
