import {
  BookOpen,
  Briefcase,
  Code2,
  FolderKanban,
  Rocket,
  Target,
} from "lucide-react";

export function ProjectGlyph({
  icon,
  className,
}: {
  icon?: string | null;
  className?: string;
}) {
  switch (icon) {
    case "rocket":
      return <Rocket className={className} />;
    case "target":
      return <Target className={className} />;
    case "book":
      return <BookOpen className={className} />;
    case "code":
      return <Code2 className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    default:
      return <FolderKanban className={className} />;
  }
}
