// =============================================================================
// src/utils/idCrypto.js
// =============================================================================
// Encrypts government ID numbers before they reach the database.
//
//   AES-256-GCM  — encrypted AND tamper-proof. The member's database id is
//                  bound in as "additional data", so a stored value copied onto
//                  another member's record fails to decrypt.
//   HMAC-SHA256  — a one-way fingerprint, used only to spot the same ID number
//                  on two accounts. It cannot be turned back into the number.
//
// Key: ID_ENCRYPTION_KEY = 64 hex characters (32 bytes), set in the server
// environment (Render). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// LOSE THE KEY AND EVERY STORED ID BECOMES UNREADABLE — keep a separate backup.
// =============================================================================

import crypto from "crypto";
import ApiError from "./apiError.js";

const VERSION = "v1";

const loadKey = () => {
  const hex = process.env.ID_ENCRYPTION_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    // Not a crash: the rest of the app keeps working, only ID storage is off
    throw new ApiError(
      503,
      "ID storage is not set up on the server yet. Please tell the gym admin.",
    );
  }
  return Buffer.from(hex, "hex");
};

export const isIdEncryptionConfigured = () =>
  /^[0-9a-fA-F]{64}$/.test(process.env.ID_ENCRYPTION_KEY || "");

export const encryptId = (plainText, ownerId) => {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(String(ownerId)));
  const body = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(":");
};

export const decryptId = (stored, ownerId) => {
  const key = loadKey();
  const [version, iv, tag, body] = String(stored || "").split(":");
  if (version !== VERSION || !iv || !tag || !body) {
    throw new ApiError(500, "Stored ID could not be read.");
  }
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(String(ownerId)));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key, damaged value, or a value moved to another member
    throw new ApiError(500, "Stored ID could not be read.");
  }
};

export const fingerprintId = (docType, number) => {
  const master = loadKey();
  const hmacKey = Buffer.from(crypto.hkdfSync("sha256", master, Buffer.alloc(0), "hulk-id-fingerprint-v1", 32));
  return crypto.createHmac("sha256", hmacKey).update(`${docType}|${number}`).digest("hex");
};
