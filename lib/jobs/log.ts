type LogFields = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const payload = {
    scope: "azio-automation",
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

export const automationLog = {
  info(event: string, fields: LogFields = {}) {
    write("info", event, fields);
  },
  warn(event: string, fields: LogFields = {}) {
    write("warn", event, fields);
  },
  error(event: string, fields: LogFields = {}) {
    write("error", event, fields);
  },
};

export function publicUserRef(userId: string) {
  return userId.slice(-6);
}
