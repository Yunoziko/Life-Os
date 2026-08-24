import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function getOrCreateDefaultAgent(userId: string) {
  const existing = await prisma.agent.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.agent.create({
    data: {
      userId,
      name: "AZIO",
      description: "The intelligent personal operating system assistant.",
      status: "ACTIVE",
    },
  });
}

export async function createAgentRun(input: {
  userId: string;
  agentId: string;
  goal: string;
  conversationId?: string;
  automationRunId?: string;
}) {
  return prisma.agentRun.create({
    data: {
      userId: input.userId,
      agentId: input.agentId,
      goal: input.goal.slice(0, 500),
      conversationId: input.conversationId,
      automationRunId: input.automationRunId,
      status: "PLANNING",
    },
  });
}

export async function saveAgentRun(id: string, data: {
  status?: "PLANNING" | "EXECUTING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
  plan?: unknown;
  steps?: unknown;
  summary?: string | null;
  error?: string | null;
  failureClass?: string | null;
  completedAt?: Date | null;
}) {
  return prisma.agentRun.update({
    where: { id },
    data: {
      ...data,
      plan: data.plan as Prisma.InputJsonValue | undefined,
      steps: data.steps as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getOwnedAgentRun(userId: string, runId: string) {
  return prisma.agentRun.findFirst({
    where: { id: runId, userId },
  });
}

export async function listRecentAgentRuns(userId: string, take = 8) {
  return prisma.agentRun.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      goal: true,
      status: true,
      summary: true,
      startedAt: true,
      completedAt: true,
    },
  });
}
