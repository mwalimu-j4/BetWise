import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

type AccessTokenPayload = {
  id: string;
  role: UserRole;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_ISSUER =
  process.env.ACCESS_TOKEN_ISSUER?.trim() || "betwise-api";
const ACCESS_TOKEN_AUDIENCE = process.env.ACCESS_TOKEN_AUDIENCE?.trim();

function normalizeSameSiteValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "lax") {
    return "lax" as const;
  }

  if (normalized === "none") {
    return "none" as const;
  }

  return "strict" as const;
}

function getRequiredSecret(
  name: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET" | "RESET_TOKEN_SECRET",
) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getAccessTokenSecret() {
  return getRequiredSecret("ACCESS_TOKEN_SECRET");
}

export function getRefreshTokenSecret() {
  return getRequiredSecret("REFRESH_TOKEN_SECRET");
}

export function getResetTokenSecret() {
  return getRequiredSecret("RESET_TOKEN_SECRET");
}

export function createAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, getAccessTokenSecret(), {
    algorithms: ["HS256"],
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
  });

  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    !("role" in decoded)
  ) {
    throw new Error("Invalid access token payload.");
  }

  return decoded as AccessTokenPayload;
}

export function createRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

export function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string, secret: string) {
  return crypto
    .createHash("sha256")
    .update(`${secret}:${rawToken}`)
    .digest("hex");
}

export function getRefreshTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const configuredSameSite = normalizeSameSiteValue(
    process.env.REFRESH_COOKIE_SAMESITE,
  );
  const sameSite =
    configuredSameSite === "strict" && isProduction
      ? ("none" as const)
      : configuredSameSite;
  const secure = isProduction || sameSite === "none";

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: "/",
  };
}

export function getRefreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}
