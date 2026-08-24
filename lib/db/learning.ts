import { prisma } from "@/lib/db/prisma";

export async function getLearningOverview(userId: string) {
  const items = await prisma.learningItem.findMany({
    where: { userId, status: { not: "ARCHIVED" } },
    include: {
      goal: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 80,
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    status: item.status,
    provider: item.provider,
    url: item.url,
    progress: item.progress,
    targetDate: item.targetDate,
    goal: item.goal,
    project: item.project,
  }));
}

export async function getLearningWorkspace(userId: string, id: string) {
  return prisma.learningItem.findFirst({
    where: { id, userId },
    include: {
      goal: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
  });
}

export type LearningOverview = Awaited<ReturnType<typeof getLearningOverview>>[number];
export type LearningWorkspace = NonNullable<Awaited<ReturnType<typeof getLearningWorkspace>>>;
