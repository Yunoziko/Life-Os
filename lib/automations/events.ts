import type { WorkspaceEventType } from "@/lib/agents/types";

export function fireWorkspaceEvent(input: {
  userId: string;
  timeZone: string;
  type: WorkspaceEventType;
  entityId?: string;
  label?: string;
}) {
  void import("@/lib/automations/runner")
    .then(({ emitWorkspaceEvent }) => emitWorkspaceEvent(input))
    .catch(() => undefined);
}
