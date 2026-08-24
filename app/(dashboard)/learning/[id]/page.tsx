import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLearningWorkspace } from "@/lib/db/learning";
import { getAssignableOptions } from "@/lib/db/tasks";
import { LearningWorkspace } from "@/components/learning/learning-workspace";

export const metadata = { title: "Learning" };

export default async function LearningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [item, [projects, goals]] = await Promise.all([
    getLearningWorkspace(user.id, id),
    getAssignableOptions(user.id),
  ]);

  if (!item) {
    notFound();
  }

  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <LearningWorkspace
      item={{
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        status: item.status,
        url: item.url,
        provider: item.provider,
        progress: item.progress,
        targetDate: item.targetDate?.toISOString() ?? null,
        goalId: item.goalId,
        projectId: item.projectId,
        goal: item.goal,
        project: item.project,
      }}
      goals={goals}
      projects={projects}
      timezone={timezone}
    />
  );
}
