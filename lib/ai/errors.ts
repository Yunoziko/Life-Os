export type AIErrorCode =
  | "missing_key"
  | "provider"
  | "timeout"
  | "rate_limit"
  | "invalid_args"
  | "database"
  | "malformed"
  | "unauthorized";

const MESSAGES: Record<AIErrorCode, string> = {
  missing_key: "LifeOS AI isn’t connected yet. Add an API key on the server and try again.",
  provider: "The assistant is unavailable right now. Try again in a moment.",
  timeout: "The assistant took too long to respond. Try again.",
  rate_limit: "You’ve reached the assistant limit for now. Try again in a minute.",
  invalid_args: "That request couldn’t be understood. Try rephrasing it.",
  database: "LifeOS couldn’t read your workspace just then. Try again.",
  malformed: "The assistant returned something LifeOS couldn’t use. Try again.",
  unauthorized: "Please sign in to use LifeOS AI.",
};

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly expose: boolean;

  constructor(code: AIErrorCode, message?: string, options?: { expose?: boolean; cause?: unknown }) {
    super(message ?? MESSAGES[code], options?.cause ? { cause: options.cause } : undefined);
    this.name = "AIError";
    this.code = code;
    this.expose = options?.expose ?? true;
  }

  static fromUnknown(error: unknown): AIError {
    if (error instanceof AIError) return error;
    if (error instanceof Error && error.name === "TimeoutError") {
      return new AIError("timeout", undefined, { cause: error });
    }
    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("aborted"))) {
      return new AIError("timeout", undefined, { cause: error });
    }
    return new AIError("provider", undefined, { cause: error });
  }

  toUserMessage() {
    return this.expose ? this.message : MESSAGES[this.code];
  }
}

export function userFacingAIError(error: unknown) {
  return AIError.fromUnknown(error).toUserMessage();
}
