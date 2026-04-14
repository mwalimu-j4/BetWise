import crypto from "node:crypto";
import { getAccessTokenSecret } from "./tokenUtils";

const ADMIN_TOTP_SECRET_PREFIX = "enc:v1";
const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;

function getAdminTotpEncryptionKey() {
  const configuredSecret = process.env.ADMIN_TOTP_ENCRYPTION_SECRET?.trim();
  const keyMaterial = configuredSecret || getAccessTokenSecret();

  return crypto.createHash("sha256").update(keyMaterial).digest();
}

export function encryptAdminTotpSecret(secret: string) {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getAdminTotpEncryptionKey(),
    iv,
  );

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ADMIN_TOTP_SECRET_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptAdminTotpSecret(storedValue: string) {
  const parts = storedValue.split(":");
  if (parts.length !== 4 || parts[0] !== ADMIN_TOTP_SECRET_PREFIX) {
    return { secret: storedValue, isLegacyPlaintext: true };
  }

  const [, ivPart, tagPart, ciphertextPart] = parts;
  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const ciphertext = Buffer.from(ciphertextPart, "base64");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getAdminTotpEncryptionKey(),
    iv,
  );
  decipher.setAuthTag(tag);

  const secret = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return { secret, isLegacyPlaintext: false };
}
