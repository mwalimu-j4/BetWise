import crypto from "node:crypto";
import jwt from "jsonwebtoken";

type AccessTokenPayload = {
  id: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
};

type BanAppealTokenPayload = {
  userId: string;
  reason?: string;
  bannedAt: string;
};

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24;
const BAN_APPEAL_TOKEN_TTL_SECONDS = 60 * 60 * 24;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_ISSUER =
  process.env.ACCESS_TOKEN_ISSUER?.trim() || "betwise-api";
const ACCESS_TOKEN_AUDIENCE = process.env.ACCESS_TOKEN_AUDIENCE?.trim();

function normalizeSameSiteValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "strict") {
    return "strict" as const;
  }

  if (normalized === "lax") {
    return "lax" as const;
  }

  if (normalized === "none") {
    return "none" as const;
  }

  return null;
}

function parseBooleanEnv(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return null;
}

function getRequiredSecret(
  name: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET",
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

export function createAccessToken(payload: AccessTokenPayload) {
  const options: jwt.SignOptions = {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: ACCESS_TOKEN_ISSUER,
    algorithm: "HS256",
  };

  if (ACCESS_TOKEN_AUDIENCE) {
    options.audience = ACCESS_TOKEN_AUDIENCE;
  }

  return jwt.sign(payload, getAccessTokenSecret(), options);
}

export function createBanAppealToken(payload: BanAppealTokenPayload) {
  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: BAN_APPEAL_TOKEN_TTL_SECONDS,
    issuer: ACCESS_TOKEN_ISSUER,
    algorithm: "HS256",
    audience: "betwise-ban-appeal",
  });
}

export function verifyBanAppealToken(token: string) {
  const decoded = jwt.verify(token, getAccessTokenSecret(), {
    algorithms: ["HS256"],
    issuer: ACCESS_TOKEN_ISSUER,
    audience: "betwise-ban-appeal",
  });

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.bannedAt !== "string"
  ) {
    throw new Error("Invalid ban appeal token payload.");
  }

  return decoded as BanAppealTokenPayload;
}

export function verifyAccessToken(token: string) {
  const options: jwt.VerifyOptions = {
    algorithms: ["HS256"],
    issuer: ACCESS_TOKEN_ISSUER,
  };

  if (ACCESS_TOKEN_AUDIENCE) {
    options.audience = ACCESS_TOKEN_AUDIENCE;
  }

  try {
    const decoded = jwt.verify(token, getAccessTokenSecret(), options);
    return processDecodedToken(decoded);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error("[TokenUtils] Verify failed:", {
      err,
      issuer: ACCESS_TOKEN_ISSUER,
      hasAudience: Boolean(ACCESS_TOKEN_AUDIENCE),
      secretLength: getAccessTokenSecret().length,
    });
    throw error;
  }
}

function processDecodedToken(decoded: unknown) {
  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    !("role" in decoded)
  ) {
    throw new Error("Invalid access token payload.");
  }

  const mustChangePassword =
    "mustChangePassword" in decoded && decoded.mustChangePassword === true;

  return {
    id: decoded.id as string,
    role: decoded.role as "USER" | "ADMIN",
    mustChangePassword,
  } as AccessTokenPayload;
}

export function createRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
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
    configuredSameSite ?? (isProduction ? ("none" as const) : ("lax" as const));
  const configuredSecure = parseBooleanEnv(process.env.REFRESH_COOKIE_SECURE);
  const secure =
    sameSite === "none" ? true : (configuredSecure ?? isProduction);
  const domain = process.env.REFRESH_COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export function getRefreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}
