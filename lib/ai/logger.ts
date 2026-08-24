import { appLog } from "@/lib/observability/log";

type LogFields = Record<string, string | number | boolean | null | undefined>;

export const aiLog = {
  started(fields: LogFields) {
    appLog.info("ai_request_started", { scope: "azio-ai", ...fields });
  },
  completed(fields: LogFields) {
    appLog.info("ai_request_completed", { scope: "azio-ai", ...fields });
  },
  tool(fields: LogFields) {
    appLog.info("ai_tool_executed", { scope: "azio-ai", ...fields });
  },
  toolFailed(fields: LogFields) {
    appLog.warn("ai_tool_failed", { scope: "azio-ai", ...fields });
  },
  warn(event: string, fields: LogFields = {}) {
    appLog.warn(`ai_${event}`, { scope: "azio-ai", ...fields });
  },
};

export { publicUserRef } from "@/lib/observability/log";
