import { EntitlementError } from "@/lib/billing/errors";

export type AutomationErrorCategory =
  | "TRANSIENT"
  | "PERMISSION"
  | "NOT_FOUND"
  | "INVALID"
  | "UNAUTHORIZED"
  | "ENTITLEMENT"
  | "PERMANENT";

const PERMANENT_PATTERNS = [
  "not found",
  "deleted",
  "paused",
  "not allowed",
  "permission",
  "unauthorized",
  "forbidden",
  "invalid tool",
  "unknown tool",
  "invalid argument",
  "invalid args",
  "could not use that plan",
  "rejected a plan",
];

const TRANSIENT_PATTERNS = [
  "temporar",
  "timeout",
  "timed out",
  "econnreset",
  "econnrefused",
  "enotfound",
  "network",
  "unavailable",
  "rate limit",
  "429",
  "502",
  "503",
  "504",
  "google calendar",
  "gmail",
  "github",
];

export function classifyAutomationError(error: unknown): AutomationErrorCategory {
  if (error instanceof EntitlementError) return "ENTITLEMENT";
  const message = error instanceof Error ? error.message : String(error);
  const text = message.toLowerCase();
  if (text.includes("not found") || text.includes("deleted")) return "NOT_FOUND";
  if (text.includes("unauthorized") || text.includes("forbidden")) return "UNAUTHORIZED";
  if (text.includes("paused because azio pro") || text.includes("upgrade")) return "ENTITLEMENT";
  if (text.includes("permission") || text.includes("not allowed")) return "PERMISSION";
  if (text.includes("invalid") || text.includes("unknown tool") || text.includes("could not use that plan")) {
    return "INVALID";
  }
  if (PERMANENT_PATTERNS.some((item) => text.includes(item)) && !TRANSIENT_PATTERNS.some((item) => text.includes(item))) {
    return "PERMANENT";
  }
  if (TRANSIENT_PATTERNS.some((item) => text.includes(item))) return "TRANSIENT";
  return "TRANSIENT";
}

export function isRetryableAutomationError(category: AutomationErrorCategory) {
  return category === "TRANSIENT";
}

export function retryDelayMs(attemptCount: number) {
  if (attemptCount <= 1) return 30_000;
  if (attemptCount === 2) return 2 * 60_000;
  return 10 * 60_000;
}

export const MAX_AUTOMATION_ATTEMPTS = 4;

export function publicAutomationError(error: unknown, category: AutomationErrorCategory) {
  const message = error instanceof Error ? error.message : "AZIO couldn’t complete this automation.";
  const text = message.toLowerCase();
  if (category === "ENTITLEMENT") {
    return "This automation is paused because AZIO Pro is required.";
  }
  if (category === "NOT_FOUND") {
    return "AZIO couldn’t find this automation.";
  }
  if (category === "UNAUTHORIZED" || category === "PERMISSION") {
    return "AZIO didn’t have permission to finish this automation.";
  }
  if (category === "INVALID") {
    return "AZIO couldn’t run this automation because the action was invalid.";
  }
  if (text.includes("calendar")) {
    return "AZIO couldn’t complete this automation because Google Calendar was temporarily unavailable.";
  }
  if (text.includes("gmail") || text.includes("email")) {
    return "AZIO couldn’t complete this automation because Gmail was temporarily unavailable.";
  }
  if (text.includes("github")) {
    return "AZIO couldn’t complete this automation because GitHub was temporarily unavailable.";
  }
  if (category === "TRANSIENT") {
    return "AZIO couldn’t complete this automation because a connected service was temporarily unavailable.";
  }
  return "AZIO couldn’t complete this automation.";
}
