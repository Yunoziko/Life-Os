"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { FeatureKey } from "@/lib/billing/config";
import { UPGRADE_COPY } from "@/lib/billing/errors";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

type UpgradeContextValue = {
  openUpgrade: (feature?: FeatureKey) => void;
};

const UpgradeContext = createContext<UpgradeContextValue>({
  openUpgrade: () => undefined,
});

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [feature, setFeature] = useState<FeatureKey | null>(null);

  const openUpgrade = useCallback((next?: FeatureKey) => {
    setFeature(next ?? "ADVANCED_ANALYTICS");
  }, []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal
        open={feature !== null}
        title={feature ? UPGRADE_COPY[feature].title : "Unlock AZIO Pro"}
        description={feature ? UPGRADE_COPY[feature].body : "Get advanced AI, analytics and unlimited productivity tools."}
        onOpenChange={(open) => {
          if (!open) setFeature(null);
        }}
      />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade() {
  return useContext(UpgradeContext);
}
