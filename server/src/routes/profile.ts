import { Router } from "express";
import { requireAuth } from "../middleware/authenticate";
import { requireOwnership } from "../middleware/requireOwnership";
import { profileUpdateRateLimiter } from "../middleware/rateLimiter";
import {
  deleteOwnAccount,
  disableAdminTwoFactor,
  enableAdminTwoFactor,
  getAdminTwoFactorStatus,
  getProfile,
  getProfileBalance,
  getProfileTransactions,
  sendAdminTwoFactorAppLink,
  getSingleProfileTransaction,
  getTransactionOwnerId,
  startAdminTwoFactorSetup,
  updateProfilePreferences,
  updatePhone,
} from "../controllers/profile.controller";

const profileRouter = Router();

profileRouter.use("/profile", requireAuth);

profileRouter.get("/profile", getProfile);
profileRouter.get("/profile/balance", getProfileBalance);
profileRouter.get("/profile/transactions", getProfileTransactions);
profileRouter.get(
  "/profile/transactions/:transactionReference",
  requireOwnership(getTransactionOwnerId),
  getSingleProfileTransaction,
);
profileRouter.post(
  "/profile/preferences",
  profileUpdateRateLimiter,
  updateProfilePreferences,
);
profileRouter.patch("/profile/phone", profileUpdateRateLimiter, updatePhone);
profileRouter.post(
  "/profile/delete-account",
  profileUpdateRateLimiter,
  deleteOwnAccount,
);
profileRouter.get(
  "/profile/admin-2fa/status",
  profileUpdateRateLimiter,
  getAdminTwoFactorStatus,
);
profileRouter.post(
  "/profile/admin-2fa/setup",
  profileUpdateRateLimiter,
  startAdminTwoFactorSetup,
);
profileRouter.post(
  "/profile/admin-2fa/send-app-link",
  profileUpdateRateLimiter,
  sendAdminTwoFactorAppLink,
);
profileRouter.post(
  "/profile/admin-2fa/enable",
  profileUpdateRateLimiter,
  enableAdminTwoFactor,
);
profileRouter.post(
  "/profile/admin-2fa/disable",
  profileUpdateRateLimiter,
  disableAdminTwoFactor,
);

export { profileRouter };
