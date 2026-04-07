import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

function createRateLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ message });
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many login attempts. Please try again in 15 minutes."),
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many registration attempts. Please try again in 1 hour."),
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many password reset requests. Please try again in 1 hour."),
});

export const authGeneralRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many requests. Please try again later."),
});

function userOrIpKeyGenerator(req: Request) {
  return req.user?.id ?? req.ip ?? "anonymous";
}

export const withdrawalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many withdrawal requests. Please wait a minute and try again."),
});

export const profileUpdateRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many profile updates. Please wait a minute and try again."),
});

export const myBetsListRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many my-bets requests. Please wait a minute and try again."),
});

export const myBetDetailRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many bet detail requests. Please wait a minute and try again."),
});

export const cancelBetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many cancellation attempts. Please wait a minute and try again."),
});

export const liveMatchesRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many live match requests. Please wait and retry."),
});

export const liveOddsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many live update requests. Please wait and retry."),
});

export const placeBetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many bet placements. Please wait a minute and try again."),
});

export const loadBetSlipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many shared betslip load attempts. Please wait and retry."),
});
