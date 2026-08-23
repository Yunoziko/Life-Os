import Link from "next/link";
import { projectAccent, PROJECT_STATUS_LABEL } from "@/lib/projects/labels";
import { ProjectGlyph } from "@/components/projects/project-glyph";
import { ProgressBar } from "@/components/shared/progress-bar";
import { formatShortDate } from "@/lib/utils/date";
import type { ProjectOverview } from "@/lib/db/projects";
import type { ProjectStatus } from "@/generated/prisma/enums";

export function ProjectCard({
  project,
  timezone,
}: {
  project: ProjectOverview;
  timezone: string;
}) {
  const accent = projectAccent(project.color);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-2xl border border-border/70 bg-card p-5 shadow-sm outline-none transition-colors hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background"
            style={{ color: accent }}
          >
            <ProjectGlyph icon={project.icon} className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{project.name}</h2>
            <p className="text-xs text-muted-foreground">
              {PROJECT_STATUS_LABEL[project.status as ProjectStatus]}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{project.percent}%</span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {project.description || "No description yet."}
      </p>

      <ProgressBar value={project.percent} label={`${project.name} progress`} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {project.completed} / {project.total} tasks completed
        </span>
        <span>
          {project.active} active
          {project.dueDate ? ` · Due ${formatShortDate(project.dueDate, timezone)}` : ""}
        </span>
      </div>
    </Link>
  );
}
