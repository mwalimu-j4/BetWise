import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

function createRateLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ message });
  };
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return req.ip ?? "anonymous";
}

function userOrIpKeyGenerator(req: Request) {
  return req.user?.id ?? getClientIp(req);
}

function ipKeyGenerator(req: Request) {
  return getClientIp(req);
}

function normalizeLoginIdentifier(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/[^a-z0-9+]/g, "");
}

function loginKeyGenerator(req: Request) {
  const rawPhone = normalizeLoginIdentifier(req.body?.phone);
  if (rawPhone) {
    return `phone:${rawPhone}`;
  }

  const rawEmail = normalizeLoginIdentifier(req.body?.email);
  if (rawEmail) {
    return `email:${rawEmail}`;
  }

  return ipKeyGenerator(req);
}

function mfaKeyGenerator(req: Request) {
  const rawToken = normalizeLoginIdentifier(req.body?.mfaToken);
  return rawToken ? `mfa:${rawToken}` : ipKeyGenerator(req);
}

const commonLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  skip: (req: Request) => req.method === "OPTIONS",
} as const;

export const apiGlobalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler("Too many requests. Please try again later."),
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: loginKeyGenerator,
  skipSuccessfulRequests: true,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many login attempts. Please try again in 15 minutes.",
  ),
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: ipKeyGenerator,
  skipSuccessfulRequests: true,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many registration attempts. Please try again in 1 hour.",
  ),
});

export const passwordResetRouteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many password reset requests. Please try again in 15 minutes.",
  ),
});

export const authGeneralRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler("Too many requests. Please try again later."),
});

export const mfaRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: mfaKeyGenerator,
  skipSuccessfulRequests: true,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many verification attempts. Please try again in 10 minutes.",
  ),
});

export const withdrawalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many withdrawal requests. Please wait a minute and try again.",
  ),
});

export const profileUpdateRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many profile updates. Please wait a minute and try again.",
  ),
});

export const myBetsListRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many my-bets requests. Please wait a minute and try again.",
  ),
});

export const myBetDetailRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many bet detail requests. Please wait a minute and try again.",
  ),
});

export const cancelBetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many cancellation attempts. Please wait a minute and try again.",
  ),
});

export const liveMatchesRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many live match requests. Please wait and retry.",
  ),
});

export const liveOddsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many live update requests. Please wait and retry.",
  ),
});

export const placeBetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many bet placements. Please wait a minute and try again.",
  ),
});

export const loadBetSlipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many shared betslip load attempts. Please wait and retry.",
  ),
});

export const contactSubmitRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many contact submissions. Please try again later.",
  ),
});

export const newsletterRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: ipKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many newsletter requests. Please try again later.",
  ),
});

export const depositRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  keyGenerator: userOrIpKeyGenerator,
  ...commonLimiterOptions,
  handler: createRateLimitHandler(
    "Too many deposit requests. Please wait a minute and try again.",
  ),
});
