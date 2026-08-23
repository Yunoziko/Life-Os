import { BookOpen } from "lucide-react";
import { ModulePage } from "@/components/shared/module-page";

export const metadata = { title: "Learning" };

export default function LearningPage() {
  return (
    <ModulePage
      title="Learning"
      description="Courses, notes, and progress — coming after the foundation."
      icon={BookOpen}
      emptyTitle="Learning isn’t open yet"
      emptyDescription="The module is in the shell so it has a home. Curriculum and tracking will arrive later."
      isEmpty
    />
  );
}
