type LogFields = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const payload = {
    scope: "lifeos-ai",
    event,
    ...fields,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

export const aiLog = {
  started(fields: LogFields) {
    write("info", "request_started", fields);
  },
  completed(fields: LogFields) {
    write("info", "request_completed", fields);
  },
  tool(fields: LogFields) {
    write("info", "tool_executed", fields);
  },
  toolFailed(fields: LogFields) {
    write("warn", "tool_failed", fields);
  },
  warn(event: string, fields: LogFields = {}) {
    write("warn", event, fields);
  },
};

export function publicUserRef(userId: string) {
  return userId.slice(-6);
}
