import { requireUser } from "@/lib/auth/session";
import { getLearningOverview } from "@/lib/db/learning";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { LearningList } from "@/components/learning/learning-list";

export const metadata = { title: "Learning" };

export default async function LearningPage() {
  const user = await requireUser();
  const timezone = user.profile?.timezone ?? "UTC";
  const items = await getLearningOverview(user.id);

  return (
    <div>
      <PageHeader
        title="Learning"
        description="Courses, books, and resources you’re actually working through."
        action={<CreateTrigger type="learning">+ Add</CreateTrigger>}
      />
      <LearningList items={items} timezone={timezone} />
    </div>
  );
}
