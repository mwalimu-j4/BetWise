import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import { withdrawalRateLimiter } from "../middleware/rateLimiter";
import {
  approveWithdrawal,
  createWithdrawalRequest,
  getWalletSummary,
  listAdminWithdrawals,
  listWithdrawals,
  rejectWithdrawal,
  getEnabledPaymentMethods,
} from "../controllers/payments.controller";

const paymentRouter = Router();

// Public endpoint - get enabled payment methods
paymentRouter.get("/payments/methods/enabled", getEnabledPaymentMethods);

// Wallet endpoints
paymentRouter.get("/payments/wallet/summary", authenticate, getWalletSummary);

// Withdrawal endpoints
paymentRouter.post(
  "/payments/withdrawals",
  authenticate,
  withdrawalRateLimiter,
  createWithdrawalRequest,
);
paymentRouter.post(
  "/withdrawal",
  authenticate,
  withdrawalRateLimiter,
  createWithdrawalRequest,
);
paymentRouter.get("/payments/withdrawals", authenticate, listWithdrawals);

// Admin withdrawal endpoints
paymentRouter.get(
  "/admin/withdrawals",
  authenticate,
  requireAdmin,
  listAdminWithdrawals,
);
paymentRouter.patch(
  "/admin/withdrawals/:transactionId/approve",
  authenticate,
  requireAdmin,
  approveWithdrawal,
);
paymentRouter.patch(
  "/admin/withdrawals/:transactionId/reject",
  authenticate,
  requireAdmin,
  rejectWithdrawal,
);

export { paymentRouter };
