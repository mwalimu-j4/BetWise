import rateLimit from "express-rate-limit";
import type { Request } from "express";

const standardRateLimitHandler = {
  message: "Too many requests. Please try again later.",
};

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  ...standardRateLimitHandler,
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  ...standardRateLimitHandler,
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  ...standardRateLimitHandler,
});

export const authGeneralRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  ...standardRateLimitHandler,
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
  message: "Too many withdrawal requests. Please wait a minute and try again.",
});

export const profileUpdateRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many profile updates. Please wait a minute and try again.",
});

export const myBetsListRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many my-bets requests. Please wait a minute and try again.",
});

export const myBetDetailRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many bet detail requests. Please wait a minute and try again.",
});

export const cancelBetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message:
    "Too many cancellation attempts. Please wait a minute and try again.",
});

export const liveMatchesRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many live match requests. Please wait and retry.",
});

export const liveOddsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many live update requests. Please wait and retry.",
});

export const placeBetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many bet placements. Please wait a minute and try again.",
});

export const loadBetSlipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many shared betslip load attempts. Please wait and retry.",
});
