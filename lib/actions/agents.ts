"use server";

import { requireUser } from "@/lib/auth/session";
import { cancelAgentRun, confirmAgentRun, retryFailedStep } from "@/lib/agents/loop";
import { syncAutomationRunFromAgent } from "@/lib/automations/runner";
import { markNotificationsRead } from "@/lib/notifications/service";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { ActionResult } from "@/types";
import type { AgentRunResult } from "@/lib/agents/types";

export async function confirmAgentRunAction(runId: string): Promise<ActionResult<AgentRunResult>> {
  try {
    const user = await requireUser();
    const result = await confirmAgentRun({
      userId: user.id,
      timeZone: user.profile?.timezone ?? "UTC",
      runId,
    });
    await syncAutomationRunFromAgent(runId, user.id);
    revalidateWorkspace(["/ai", "/automations", "/dashboard", "/notifications"]);
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "Could not confirm that plan." };
  }
}

export async function cancelAgentRunAction(runId: string): Promise<ActionResult<AgentRunResult>> {
  try {
    const user = await requireUser();
    const result = await cancelAgentRun({ userId: user.id, runId });
    await syncAutomationRunFromAgent(runId, user.id);
    revalidateWorkspace(["/ai", "/automations", "/dashboard", "/notifications"]);
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "Could not cancel that plan." };
  }
}

export async function retryAgentRunAction(runId: string): Promise<ActionResult<AgentRunResult>> {
  try {
    const user = await requireUser();
    const result = await retryFailedStep({
      userId: user.id,
      timeZone: user.profile?.timezone ?? "UTC",
      runId,
    });
    revalidateWorkspace(["/ai", "/automations", "/dashboard"]);
    return { ok: true, data: result };
  } catch {
    return { ok: false, error: "Could not retry that step." };
  }
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationsRead(user.id, ids);
    revalidateWorkspace(["/dashboard", "/notifications"]);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update notifications." };
  }
}
