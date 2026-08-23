import { BarChart3 } from "lucide-react";
import { ModulePage } from "@/components/shared/module-page";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <ModulePage
      title="Analytics"
      description="Patterns from your real data, never invented charts."
      icon={BarChart3}
      emptyTitle="Nothing to analyze yet"
      emptyDescription="Analytics will summarize tasks, habits, and goals once those modules have history."
      isEmpty
    />
  );
}
