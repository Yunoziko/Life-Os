type LogFields = Record<string, string | number | boolean | null | undefined>;

const REDACT = /token|secret|password|authorization|cookie|apikey|api_key|private_key/i;

function sanitize(fields: LogFields) {
  const next: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACT.test(key)) {
      next[key] = "[redacted]";
      continue;
    }
    next[key] = value;
  }
  return next;
}

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...sanitize(fields),
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

export const appLog = {
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

export function userFacingFailure(requestId?: string) {
  return requestId ? `Something went wrong. Reference: ${requestId}` : "Something went wrong. Try again.";
}
