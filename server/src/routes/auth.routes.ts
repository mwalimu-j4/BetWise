import { Router } from "express";
import {
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
  registerRateLimiter,
} from "../middleware/rateLimiter";
import { authenticate } from "../middleware/authenticate";

const authRouter = Router();

authRouter.post("/auth/register", registerRateLimiter, register);
authRouter.post("/auth/login", loginRateLimiter, login);
authRouter.post("/auth/refresh", authGeneralRateLimiter, refresh);
authRouter.post("/auth/logout", authGeneralRateLimiter, logout);
authRouter.post(
  "/auth/forgot-password",
  forgotPasswordRateLimiter,
  forgotPassword,
);
authRouter.post("/auth/reset-password", authGeneralRateLimiter, resetPassword);
authRouter.get("/auth/me", authGeneralRateLimiter, authenticate, me);

export { authRouter };
