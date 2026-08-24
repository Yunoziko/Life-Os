import { requireUser } from "@/lib/auth/session";
import { isAIConfigured } from "@/lib/ai";
import { getLifeAnalytics } from "@/lib/db/analytics";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsView, serializeAnalytics } from "@/components/analytics/analytics-view";

export const metadata = { title: "Your Life" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const timezone = user.profile?.timezone ?? "UTC";
  const analytics = await getLifeAnalytics(
    user.id,
    timezone,
    { range: params.range, from: params.from, to: params.to },
    user.profile?.weekStartsOn ?? 1
  );

  return (
    <div>
      <PageHeader title="Your Life" description="Understand your progress, patterns and momentum." />
      <AnalyticsView
        analytics={serializeAnalytics(analytics)}
        timezone={timezone}
        configured={isAIConfigured()}
      />
    </div>
  );
}
