import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  depositRateLimiter,
  withdrawalRateLimiter,
} from "../middleware/rateLimiter";
import { verifyMpesaCallback } from "../middleware/verifyMpesaCallback";
import {
  approveWithdrawal,
  checkDepositStatus,
  createWithdrawalRequest,
  getWalletSummary,
  handleMpesaCallback,
  handleMpesaWithdrawalResult,
  handleMpesaWithdrawalTimeout,
  initiateStk,
  listAdminWithdrawals,
  listWithdrawals,
  rejectWithdrawal,
} from "../controllers/payments.controller";

const paymentRouter = Router();

// M-Pesa callback endpoints
paymentRouter.post("/mpesa/callback", verifyMpesaCallback, handleMpesaCallback);
paymentRouter.post(
  "/payments/mpesa/callback",
  verifyMpesaCallback,
  handleMpesaCallback,
);
paymentRouter.post(
  "/payments/mpesa/withdrawals/result",
  verifyMpesaCallback,
  handleMpesaWithdrawalResult,
);
paymentRouter.post(
  "/payments/mpesa/withdrawals/timeout",
  verifyMpesaCallback,
  handleMpesaWithdrawalTimeout,
);

// Wallet endpoints
paymentRouter.get("/payments/wallet/summary", authenticate, getWalletSummary);

// Deposit endpoints
paymentRouter.post(
  "/payments/mpesa/stk-push",
  authenticate,
  depositRateLimiter,
  initiateStk,
);
paymentRouter.get(
  "/payments/mpesa/status/:transactionId",
  authenticate,
  checkDepositStatus,
);

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
