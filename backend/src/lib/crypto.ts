// ---------------------------------------------------------------------------
// AES-256-GCM encryption for exchange API keys at rest
// ---------------------------------------------------------------------------

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // Fallback for development — in production ENCRYPTION_KEY must be set
    console.warn("[CRYPTO] ENCRYPTION_KEY not set — using derived key from JWT_SECRET");
    const fallback = process.env.JWT_SECRET || "cladex-dev-key-not-for-production";
    return crypto.scryptSync(fallback, "cladex-salt", 32);
  }
  // Key should be 64-char hex (32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // Derive from arbitrary string
  return crypto.scryptSync(key, "cladex-salt", 32);
}

/**
 * Encrypt a plaintext string. Returns base64 encoded ciphertext
 * in format: iv:tag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string. Input format: iv:tag:ciphertext
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    // Not encrypted (legacy plaintext) — return as-is
    return ciphertext;
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  // Validate lengths
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    // Not a valid encrypted string — return as-is (legacy)
    return ciphertext;
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string looks like it's already encrypted (iv:tag:data format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // iv = 32 hex chars (16 bytes), tag = 32 hex chars (16 bytes)
  return parts[0].length === 32 && parts[1].length === 32 && /^[0-9a-f]+$/.test(parts[0]);
}
