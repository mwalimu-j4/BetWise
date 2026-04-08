import { Router } from "express";
import {
  verifyAdminMfaLogin,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resetPassword,
} from "../controllers/auth.controller";
import {
  authGeneralRateLimiter,
  forgotPasswordRateLimiter,
  loginRateLimiter,
  mfaRateLimiter,
  registerRateLimiter,
} from "../middleware/rateLimiter";
import { authenticate } from "../middleware/authenticate";
import { requireTrustedOrigin } from "../middleware/requireTrustedOrigin";

const authRouter = Router();

authRouter.post("/auth/register", registerRateLimiter, register);
authRouter.post("/auth/login", loginRateLimiter, login);
authRouter.post(
  "/auth/login/verify-admin-mfa",
  mfaRateLimiter,
  verifyAdminMfaLogin,
);
authRouter.post(
  "/auth/refresh",
  authGeneralRateLimiter,
  requireTrustedOrigin,
  refresh,
);
authRouter.post(
  "/auth/logout",
  authGeneralRateLimiter,
  requireTrustedOrigin,
  logout,
);
authRouter.post(
  "/auth/forgot-password",
  forgotPasswordRateLimiter,
  forgotPassword,
);
authRouter.post("/auth/reset-password", authGeneralRateLimiter, resetPassword);
authRouter.get("/auth/me", authGeneralRateLimiter, authenticate, me);

export { authRouter };
