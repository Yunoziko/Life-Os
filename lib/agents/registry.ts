import { executeLifeOSTool, isKnownTool, type ToolContext, type ToolResult } from "@/lib/ai/tools/execute";
import { resolveToolName, isRegisteredTool, isForbiddenTool, toolPermission } from "@/lib/agents/permissions";
import { sanitizeToolPayload } from "@/lib/agents/injection";

export async function executeRegisteredTool(
  name: string,
  args: unknown,
  ctx: ToolContext
): Promise<ToolResult> {
  if (isForbiddenTool(name) || !isRegisteredTool(name)) {
    return { ok: false, error: "That action isn’t allowed." };
  }

  const resolved = resolveToolName(name);
  if (!isKnownTool(resolved)) {
    return { ok: false, error: "That action isn’t available." };
  }

  const permission = toolPermission(name);
  if (permission === "DESTRUCTIVE" && !ctx) {
    return { ok: false, error: "Destructive actions require confirmation." };
  }

  const result = await executeLifeOSTool(resolved, args && typeof args === "object" ? args : {}, ctx);
  if (!result.ok) return result;
  return {
    ...result,
    data: sanitizeToolPayload(resolved, result.data),
  };
}
