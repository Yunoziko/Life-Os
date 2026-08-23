import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export function ModulePage({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  action,
  children,
  isEmpty,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  isEmpty: boolean;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} action={action} />
      {isEmpty ? (
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} action={action} />
      ) : (
        children
      )}
    </div>
  );
}
