import crypto from "crypto";

/**
 * Ticket QR data is AES-256-GCM encrypted, not just signed — this means the
 * raw ticket/passenger details (station IDs, fare, expiry) can't be read by
 * anyone who intercepts or photographs the QR code, and GCM's built-in
 * authentication tag means any tampering is detected automatically (no
 * separate HMAC needed).
 *
 * Key requirement: QR_SIGNING_SECRET must be set in production. We derive a
 * 32-byte AES key from it via SHA-256 so any string length works.
 */

const RAW_SECRET = process.env.QR_SIGNING_SECRET || "dev-only-secret-change-me";
const KEY = crypto.createHash("sha256").update(RAW_SECRET).digest(); // 32 bytes
const ALGO = "aes-256-gcm";

export interface QrPayload {
  id: string; // ticketId or passId
  kind: "TICKET" | "PASS";
  sourceStationId?: string;
  destStationId?: string;
  fare?: number;
  issuedAt: string;
  expiresAt: string;
}

export function signQrToken(payload: QrPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // pack iv (12) + authTag (16) + ciphertext, base64url encode as one token
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64url");
}

export function verifyQrToken(
  token: string
): { valid: true; payload: QrPayload } | { valid: false; reason: string } {
  let packed: Buffer;
  try {
    packed = Buffer.from(token, "base64url");
  } catch {
    return { valid: false, reason: "malformed_token" };
  }

  if (packed.length < 12 + 16 + 1) {
    return { valid: false, reason: "malformed_token" };
  }

  const iv = packed.subarray(0, 12);
  const authTag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);

  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf-8")) as QrPayload;
    return { valid: true, payload };
  } catch {
    // GCM auth tag mismatch (tampering) or corrupt data both land here
    return { valid: false, reason: "invalid_signature" };
  }
}
