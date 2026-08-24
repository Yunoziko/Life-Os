import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";

function getKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();
  if (!raw) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY is not set.");
  }
  return createHash("sha256").update(raw).digest();
}

export function isSecretEncryptionConfigured() {
  return Boolean(process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim());
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(payload: string) {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== PREFIX || !iv || !tag || !data) {
    throw new Error("Unrecognized secret payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
