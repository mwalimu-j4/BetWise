import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { withdrawalRateLimiter } from "../middleware/rateLimiter";
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
paymentRouter.post("/mpesa/callback", handleMpesaCallback);
paymentRouter.post("/payments/mpesa/callback", handleMpesaCallback);
paymentRouter.post(
  "/payments/mpesa/withdrawals/result",
  handleMpesaWithdrawalResult,
);
paymentRouter.post(
  "/payments/mpesa/withdrawals/timeout",
  handleMpesaWithdrawalTimeout,
);

// Wallet endpoints
paymentRouter.get("/payments/wallet/summary", authenticate, getWalletSummary);

// Deposit endpoints
paymentRouter.post("/payments/mpesa/stk-push", authenticate, initiateStk);
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
paymentRouter.get("/admin/withdrawals", authenticate, listAdminWithdrawals);
paymentRouter.patch(
  "/admin/withdrawals/:transactionId/approve",
  authenticate,
  approveWithdrawal,
);
paymentRouter.patch(
  "/admin/withdrawals/:transactionId/reject",
  authenticate,
  rejectWithdrawal,
);

export { paymentRouter };
