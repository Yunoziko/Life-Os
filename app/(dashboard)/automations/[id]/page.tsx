import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnedAutomation } from "@/lib/db/automations";
import { PageHeader } from "@/components/layout/page-header";
import { AutomationDetail } from "@/components/automations/automation-detail";

export const metadata = { title: "Automation" };

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const automation = await getOwnedAutomation(user.id, id);
  if (!automation) notFound();

  return (
    <div>
      <PageHeader
        title={automation.name}
        description={automation.description ?? "Automation details and history."}
        action={
          <Link href="/automations" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            All automations
          </Link>
        }
      />
      <AutomationDetail automation={automation} />
    </div>
  );
}
