export class IntegrationError extends Error {
  readonly code:
    | "not_connected"
    | "expired"
    | "denied"
    | "cancelled"
    | "permission"
    | "rate_limit"
    | "network"
    | "provider"
    | "config";

  constructor(
    code: IntegrationError["code"],
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "IntegrationError";
    this.code = code;
  }

  toUserMessage() {
    return this.message;
  }
}

export function userFacingIntegrationError(error: unknown) {
  if (error instanceof IntegrationError) return error.toUserMessage();
  return "That connection couldn’t be completed. Try again.";
}
