import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { MemorySettingsView } from "@/components/settings/memory-view";
import { getMemorySettingsSnapshot } from "@/lib/actions/memory";

export const metadata = { title: "AZIO Memory" };

export default async function MemorySettingsPage() {
  await requireUser();
  const snapshot = await getMemorySettingsSnapshot();

  return (
    <div>
      <PageHeader
        title="AZIO Memory"
        description="Control what AZIO remembers and uses to personalize your experience."
      />
      <SettingsNav current="memory" />
      <MemorySettingsView
        memories={snapshot.memories}
        memoryEnabled={snapshot.memoryEnabled}
        timezone={snapshot.timezone}
      />
    </div>
  );
}
