import { describe, it, expect } from "vitest";
import { encrypt, decrypt, isEncrypted } from "../lib/crypto";

describe("encrypt/decrypt", () => {
  it("round-trips correctly", () => {
    const original = "sk-live-abc123xyz789";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const original = "test-api-key";
    const enc1 = encrypt(original);
    const enc2 = encrypt(original);
    expect(enc1).not.toBe(enc2); // Different IVs
    // But both decrypt to same value
    expect(decrypt(enc1)).toBe(original);
    expect(decrypt(enc2)).toBe(original);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles long strings", () => {
    const long = "x".repeat(10000);
    const encrypted = encrypt(long);
    expect(decrypt(encrypted)).toBe(long);
  });

  it("handles special characters", () => {
    const special = "key!@#$%^&*()_+-=[]{}|;':\",./<>?";
    expect(decrypt(encrypt(special))).toBe(special);
  });
});

describe("isEncrypted", () => {
  it("detects encrypted strings", () => {
    const encrypted = encrypt("test");
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("rejects plaintext", () => {
    expect(isEncrypted("plaintext-api-key")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });

  it("rejects strings with wrong format", () => {
    expect(isEncrypted("a:b")).toBe(false);
    expect(isEncrypted("a:b:c:d")).toBe(false);
  });
});

describe("decrypt — legacy fallback", () => {
  it("returns plaintext as-is if not encrypted format", () => {
    expect(decrypt("plaintext-key")).toBe("plaintext-key");
    expect(decrypt("abc123")).toBe("abc123");
  });
});
