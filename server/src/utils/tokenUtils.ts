import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

type AccessTokenPayload = {
  id: string;
  role: UserRole;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getAccessTokenSecret()) as AccessTokenPayload;
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

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: "/",
  };
}

export function getRefreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}
