import { prisma } from "@/lib/db/prisma";

export async function recordAgentAudit(input: {
  userId: string;
  agentRunId?: string;
  tool: string;
  action: string;
  status: string;
}) {
  await prisma.agentAuditLog.create({
    data: {
      userId: input.userId,
      agentRunId: input.agentRunId,
      tool: input.tool.slice(0, 80),
      action: input.action.slice(0, 160),
      status: input.status.slice(0, 40),
    },
  });
}

export async function listRecentAudit(userId: string, take = 8) {
  return prisma.agentAuditLog.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take,
    select: {
      id: true,
      tool: true,
      action: true,
      status: true,
      timestamp: true,
      agentRunId: true,
    },
  });
}
