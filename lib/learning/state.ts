export function normalizeResourceUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
}

export function deriveLearningState(input: {
  status?: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  progress?: number;
  previousStatus?: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  previousProgress?: number;
}) {
  const progress = Math.min(100, Math.max(0, input.progress ?? input.previousProgress ?? 0));
  let status = input.status ?? input.previousStatus ?? "NOT_STARTED";

  if (progress >= 100 && status !== "ARCHIVED") {
    status = "COMPLETED";
  } else if (progress < 100 && status === "COMPLETED") {
    status = "IN_PROGRESS";
  } else if (progress > 0 && status === "NOT_STARTED") {
    status = "IN_PROGRESS";
  }

  return {
    progress,
    status,
    completedAt: status === "COMPLETED" ? new Date() : null,
  };
}
