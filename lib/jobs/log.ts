import { appLog } from "@/lib/observability/log";

type LogFields = Record<string, string | number | boolean | null | undefined>;

export const automationLog = {
  info(event: string, fields: LogFields = {}) {
    appLog.info(`automation_${event}`, { scope: "azio-automation", ...fields });
  },
  warn(event: string, fields: LogFields = {}) {
    appLog.warn(`automation_${event}`, { scope: "azio-automation", ...fields });
  },
  error(event: string, fields: LogFields = {}) {
    appLog.error(`automation_${event}`, { scope: "azio-automation", ...fields });
  },
};

export { publicUserRef } from "@/lib/observability/log";
