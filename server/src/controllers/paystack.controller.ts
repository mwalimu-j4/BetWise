import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getOrCreateWallet } from "../lib/wallet";
import { emitWalletUpdate } from "../lib/socket";
import { createDepositNotifications } from "./notifications.controller";
import { getSystemSettings } from "../lib/settings";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  convertToSmallestUnit,
  convertFromSmallestUnit,
  generateReference,
  paystackInitializeSchema,
  paystackVerifySchema,
} from "../lib/paystack";

// ============================================================================
// VALIDATION
// ============================================================================

const paystackDepositSchema = paystackInitializeSchema.extend({
  callbackUrl: z.string().url().optional(),
});

type FinalizePaystackDepositResult =
  | {
      status: "success";
      message: string;
      reference: string;
      transactionId: string;
      amount: number;
      processedAt: Date;
    }
  | {
      status: "pending" | "failed";
      message: string;
      reference: string;
      transactionId: string;
      amount: number;
      processedAt?: Date | null;
    };

function logPaystackContext(label: string, details: Record<string, unknown>) {
  console.log(`[Paystack] ${label}`, details);
}

function toSafeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizePaystackChargeStatus(status: string | undefined) {
  return (status ?? "").trim().toLowerCase();
}

async function finalizePaystackDeposit(
  reference: string,
): Promise<FinalizePaystackDepositResult> {
  logPaystackContext("finalize:start", { reference });

  const transaction = await prisma.walletTransaction.findUnique({
    where: { reference },
    include: { wallet: true, user: true },
  });

  if (!transaction) {
    logPaystackContext("finalize:missing-transaction", { reference });
    throw new Error("Transaction not found");
  }

  if (transaction.status === "COMPLETED") {
    const completedAt = transaction.processedAt ?? new Date();
    logPaystackContext("finalize:already-completed", {
      reference,
      transactionId: transaction.id,
      amount: transaction.amount,
    });

    return {
      status: "success",
      message: "Payment already processed",
      reference,
      transactionId: transaction.id,
      amount: transaction.amount,
      processedAt: completedAt,
    };
  }

  if (transaction.status === "FAILED" || transaction.status === "REVERSED") {
    // Allow retry for failed payments - re-verify with Paystack
    // This handles cases where payment failed due to transient errors
    logPaystackContext("finalize:retrying-failed-payment", {
      reference,
      transactionId: transaction.id,
      status: transaction.status,
      message: "Attempting to re-verify failed payment with Paystack",
    });

    try {
      // Attempt to verify with Paystack again
      const retryVerificationResult =
        await verifyPaystackTransaction(reference);

      if (retryVerificationResult.data.status === "success") {
        // Payment actually succeeded on Paystack! Update our record
        logPaystackContext("finalize:retry-succeeded", {
          reference,
          transactionId: transaction.id,
          message: "Payment verified successful on Paystack after retry",
        });

        // Continue with normal success flow by falling through
        // Set verificationResult for the rest of the function
        const verificationResult = retryVerificationResult;

        const paidAmountInKes = convertFromSmallestUnit(
          verificationResult.data.amount,
        );
        const amountTolerance = transaction.amount * 0.01;

        if (Math.abs(paidAmountInKes - transaction.amount) > amountTolerance) {
          logPaystackContext("finalize:amount-mismatch-on-retry", {
            reference,
            transactionId: transaction.id,
            expected: transaction.amount,
            paidAmountInKes,
            tolerance: amountTolerance,
          });

          const processedAt = new Date();
          await prisma.walletTransaction.update({
            where: { id: transaction.id },
            data: {
              status: "FAILED",
              processedAt,
              providerCallback: {
                provider: "paystack",
                verifiedAt: processedAt.toISOString(),
                failureReason: "Amount mismatch",
                paystackReference: verificationResult.data.reference,
                verificationData: toSafeJson(verificationResult.data),
              },
            },
          });

          return {
            status: "failed",
            message: "Payment amount mismatch",
            reference,
            transactionId: transaction.id,
            amount: transaction.amount,
            processedAt,
          };
        }

        // Update transaction to completed
        const processedAt = new Date();
        const wallet = transaction.wallet!;
        const updatedWallet = await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: transaction.amount } },
        });

        await prisma.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
            processedAt,
            providerCallback: {
              provider: "paystack",
              verifiedAt: processedAt.toISOString(),
              paystackReference: verificationResult.data.reference,
              verificationData: toSafeJson(verificationResult.data),
            },
          },
        });

        emitWalletUpdate(transaction.userId, {
          transactionId: transaction.id,
          status: "COMPLETED",
          message: "Deposit successful (recovered from previous failure)",
          balance: updatedWallet.balance,
          amount: transaction.amount,
        });

        await createDepositNotifications({
          userId: transaction.userId,
          transactionId: transaction.id,
          amount: transaction.amount,
          balance: updatedWallet.balance,
          paystackReference: verificationResult.data.reference,
          status: "COMPLETED",
        });

        return {
          status: "success",
          message: "Payment verified successfully (retry succeeded)",
          reference,
          transactionId: transaction.id,
          amount: transaction.amount,
          processedAt,
        };
      } else {
        // Paystack confirms it's still failed
        logPaystackContext("finalize:retry-still-failed", {
          reference,
          transactionId: transaction.id,
          paystackStatus: retryVerificationResult.data.status,
          message: "Payment confirmed as failed on Paystack",
        });

        return {
          status: "failed",
          message: "Payment is confirmed as failed. Please try a new payment.",
          reference,
          transactionId: transaction.id,
          amount: transaction.amount,
          processedAt: transaction.processedAt,
        };
      }
    } catch (error) {
      // If verification fails with network error, return pending to allow more retries
      const errorMessage =
        error instanceof Error ? error.message : "Unknown verification error";
      const isNetworkError =
        errorMessage.includes("timeout") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("end of file");

      logPaystackContext("finalize:retry-verification-error", {
        reference,
        transactionId: transaction.id,
        error: errorMessage,
        isNetworkError,
      });

      if (isNetworkError) {
        return {
          status: "pending",
          message: "Re-verification in progress. Please try again in a moment.",
          reference,
          transactionId: transaction.id,
          amount: transaction.amount,
        };
      }

      // For non-network errors, return failed
      return {
        status: "failed",
        message: `Payment failed: ${errorMessage}`,
        reference,
        transactionId: transaction.id,
        amount: transaction.amount,
        processedAt: transaction.processedAt,
      };
    }
  }

  if (!transaction.wallet || !transaction.user) {
    logPaystackContext("finalize:missing-relations", {
      reference,
      transactionId: transaction.id,
      hasWallet: Boolean(transaction.wallet),
      hasUser: Boolean(transaction.user),
    });
    throw new Error("Invalid transaction state");
  }

  let verificationResult;
  try {
    verificationResult = await verifyPaystackTransaction(reference);
    logPaystackContext("finalize:verified", {
      reference,
      transactionId: transaction.id,
      paystackStatus: verificationResult.data.status,
      paystackAmount: verificationResult.data.amount,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown verification error";
    const isNetworkError =
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("end of file");

    logPaystackContext("finalize:verification-error", {
      reference,
      transactionId: transaction.id,
      error: errorMessage,
      isNetworkError,
    });

    // On network errors or timeouts, return pending to allow client retry
    if (isNetworkError && transaction.status === "PENDING") {
      return {
        status: "pending",
        message:
          "Payment verification is still in progress. Please try again in a moment.",
        reference,
        transactionId: transaction.id,
        amount: transaction.amount,
        processedAt: transaction.processedAt,
      };
    }

    // If verification fails completely, throw the error
    throw error;
  }

  const isSuccessful =
    verificationResult.status && verificationResult.data.status === "success";

  const normalizedProviderStatus = normalizePaystackChargeStatus(
    verificationResult.data.status,
  );

  if (
    ["pending", "ongoing", "processing", "queued"].includes(
      normalizedProviderStatus,
    )
  ) {
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "PROCESSING",
        providerCallback: {
          provider: "paystack",
          verifiedAt: new Date().toISOString(),
          verificationData: toSafeJson(verificationResult.data),
          paystackReference: verificationResult.data.reference,
        },
      },
    });

    return {
      status: "pending",
      message: "Payment is still being confirmed by Paystack",
      reference,
      transactionId: transaction.id,
      amount: transaction.amount,
      processedAt: transaction.processedAt,
    };
  }

  if (!isSuccessful) {
    const processedAt = new Date();
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        processedAt,
        providerCallback: {
          provider: "paystack",
          verifiedAt: processedAt.toISOString(),
          failureReason: `Paystack returned ${verificationResult.data.status}`,
          paystackReference: verificationResult.data.reference,
          verificationData: toSafeJson(verificationResult.data),
        },
      },
    });

    emitWalletUpdate(transaction.userId, {
      transactionId: transaction.id,
      status: "FAILED",
      message: "Deposit failed",
      balance: transaction.wallet.balance,
      amount: transaction.amount,
    });

    await createDepositNotifications({
      userId: transaction.userId,
      transactionId: transaction.id,
      amount: transaction.amount,
      balance: transaction.wallet.balance,
      paystackReference: verificationResult.data.reference,
      status: "FAILED",
      failureReason: `Paystack returned ${verificationResult.data.status}`,
    });

    return {
      status: "failed",
      message: "Payment not yet confirmed or failed on Paystack",
      reference,
      transactionId: transaction.id,
      amount: transaction.amount,
    };
  }

  const paidAmountInKes = convertFromSmallestUnit(
    verificationResult.data.amount,
  );
  // Allow 1% tolerance for rounding/currency conversion differences
  const amountTolerance = transaction.amount * 0.01;
  if (Math.abs(paidAmountInKes - transaction.amount) > amountTolerance) {
    logPaystackContext("finalize:amount-mismatch", {
      reference,
      transactionId: transaction.id,
      expected: transaction.amount,
      paidAmountInKes,
      tolerance: amountTolerance,
      providerAmount: verificationResult.data.amount,
    });

    const processedAt = new Date();
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        processedAt,
        providerCallback: {
          provider: "paystack",
          verifiedAt: processedAt.toISOString(),
          failureReason: "Amount mismatch",
          paystackReference: verificationResult.data.reference,
          verificationData: toSafeJson(verificationResult.data),
        },
      },
    });

    emitWalletUpdate(transaction.userId, {
      transactionId: transaction.id,
      status: "FAILED",
      message: "Deposit amount mismatch",
      balance: transaction.wallet.balance,
      amount: transaction.amount,
    });

    await createDepositNotifications({
      userId: transaction.userId,
      transactionId: transaction.id,
      amount: transaction.amount,
      balance: transaction.wallet.balance,
      paystackReference: verificationResult.data.reference,
      status: "FAILED",
      failureReason: "Amount mismatch",
    });

    return {
      status: "failed",
      message: "Payment amount mismatch",
      reference,
      transactionId: transaction.id,
      amount: transaction.amount,
    };
  }

  const processedAt = new Date();
  const wallet = transaction.wallet;
  const verificationPayload = toSafeJson(verificationResult.data);

  const settings = await getSystemSettings();
  const { depositTaxPercent } = settings.taxAndFinancialRules;
  const taxAmount = (transaction.amount * depositTaxPercent) / 100;
  const netAmount = transaction.amount - taxAmount;

  const updatedWallet = await prisma.$transaction(async (tx) => {
    const transition = await tx.walletTransaction.updateMany({
      where: {
        id: transaction.id,
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      data: {
        status: "COMPLETED",
        processedAt,
        providerReceiptNumber: verificationResult.data.customer.customer_code,
        providerCallback: {
          provider: "paystack",
          verifiedAt: processedAt.toISOString(),
          verificationData: verificationPayload,
          paystackReference: verificationResult.data.reference,
          netAmount,
          taxAmount,
          depositTaxPercent,
        },
      },
    });

    if (transition.count === 0) {
      return null;
    }

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: netAmount,
        },
      },
    });
  });

  if (!updatedWallet) {
    const completedAt = transaction.processedAt ?? processedAt;
    logPaystackContext("finalize:duplicate-delivery", {
      reference,
      transactionId: transaction.id,
    });

    return {
      status: "success",
      message: "Payment already processed",
      reference,
      transactionId: transaction.id,
      amount: transaction.amount,
      processedAt: completedAt,
    };
  }

  logPaystackContext("finalize:wallet-credited", {
    reference,
    transactionId: transaction.id,
    amount: transaction.amount,
    balance: updatedWallet.balance,
  });

  emitWalletUpdate(transaction.userId, {
    transactionId: transaction.id,
    status: "COMPLETED",
    message: `Deposit successful${taxAmount > 0 ? `. Tax of KES ${taxAmount} deducted.` : ""}`,
    balance: updatedWallet.balance,
    amount: netAmount,
  });

  await createDepositNotifications({
    userId: transaction.userId,
    transactionId: transaction.id,
    amount: transaction.amount,
    balance: updatedWallet.balance,
    paystackReference: verificationResult.data.reference,
    status: "COMPLETED",
  });

  return {
    status: "success",
    message: "Payment verified and wallet credited",
    reference,
    transactionId: transaction.id,
    amount: transaction.amount,
    processedAt,
  };
}

// ============================================================================
// DEPOSIT INITIALIZATION
// ============================================================================

/**
 * Initialize a Paystack payment transaction
 * POST /payments/paystack/initialize
 *
 * Request body:
 * {
 *   email: "user@example.com",
 *   amount: 5000  // in KES
 * }
 *
 * Response:
 * {
 *   reference: "PAYSTACK_...",
 *   authorization_url: "https://checkout.paystack.com/...",
 *   access_code: "...",
 *   message: "Authorization URL generated"
 * }
 */
export async function initializePaystackPayment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = paystackDepositSchema.parse(req.body);

    logPaystackContext("initialize:request", {
      email: body.email,
      amountKes: body.amount,
      callbackUrl:
        body.callbackUrl ?? process.env.PAYSTACK_CALLBACK_URL?.trim(),
    });

    const authenticatedUser = req.user?.id
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
        })
      : null;

    const user =
      authenticatedUser ??
      (await prisma.user.findUnique({
        where: { email: body.email },
      }));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (authenticatedUser && authenticatedUser.email !== body.email) {
      res.status(403).json({ error: "Email does not match your account" });
      return;
    }

    const settings = await getSystemSettings();
    const { minDeposit, maxDeposit } = settings.userDefaultsAndRestrictions;
    const paystackEnabled = settings.paymentsConfig.methods.paystack;

    if (!paystackEnabled) {
      res.status(403).json({ error: "Paystack payments are currently disabled." });
      return;
    }

    if (body.amount < minDeposit) {
      res.status(400).json({
        error: `Minimum deposit is KES ${minDeposit.toLocaleString()}.`,
      });
      return;
    }

    if (body.amount > maxDeposit) {
      res.status(400).json({
        error: `Maximum deposit is KES ${maxDeposit.toLocaleString()}.`,
      });
      return;
    }

    const wallet = await getOrCreateWallet(user.id);

    // Convert KES to smallest unit (cents)
    const amountInSmallestUnit = convertToSmallestUnit(body.amount);

    // Generate unique reference
    const reference = generateReference();

    // Create pending transaction record
    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        reference,
        type: "DEPOSIT",
        status: "PENDING",
        amount: body.amount, // Store in KES
        currency: "KES",
        channel: "paystack",
        description: "Paystack wallet deposit",
        providerCallback: {
          provider: "paystack",
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    // Call Paystack API to initialize transaction
    const paystackResponse = await initializePaystackTransaction({
      email: body.email,
      amount: amountInSmallestUnit,
      reference,
      callbackUrl:
        process.env.PAYSTACK_CALLBACK_URL?.trim() || body.callbackUrl,
      metadata: {
        userId: user.id,
        transactionId: transaction.id,
        ...body.metadata,
      },
    });

    // Update transaction with Paystack meta
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        providerCallback: {
          provider: "paystack",
          initiatedAt: new Date().toISOString(),
          accessCode: paystackResponse.data.access_code,
          paystackReference: paystackResponse.data.reference,
        },
      },
    });

    res.json({
      reference,
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      message:
        "Authorization URL generated. Redirect user to Paystack checkout.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: error.issues.map((issue) => {
          return `${issue.path.join(".")}: ${issue.message}`;
        }),
      });
      return;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to initialize Paystack payment";

    logPaystackContext("initialize:error", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error("Paystack initialize error:", error);
    res.status(500).json({
      error: errorMessage,
      ...(error instanceof Error && { details: error.message }),
    });
  }
}

// ============================================================================
// PAYMENT VERIFICATION
// ============================================================================

/**
 * Verify a Paystack transaction
 * GET /payments/paystack/verify/:reference
 *
 * Query: reference=PAYSTACK_...
 *
 * Response:
 * {
 *   status: "success|pending|failed",
 *   message: "...",
 *   data: {
 *     reference: "...",
 *     amount: 5000,
 *     paid_at: "2024-01-01T...",
 *     status: "success",
 *     authorization: { ... }
 *   }
 * }
 */
export async function verifyPaystackPayment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { reference } = paystackVerifySchema.parse(req.params);
    const result = await finalizePaystackDeposit(reference);
    res.json({
      status: result.status,
      message: result.message,
      reference: result.reference,
      data: {
        reference: result.reference,
        amount: result.amount,
        status: result.status,
        processedAt: result.processedAt ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid reference" });
      return;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to verify Paystack payment";
    const isNetworkError =
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("end of file");

    console.error("Paystack verify error:", {
      error: errorMessage,
      isNetworkError,
      reference: req.params.reference,
    });

    // Return pending status for network errors so client retries
    if (isNetworkError) {
      res.status(200).json({
        status: "pending",
        message: "Payment verification is in progress. Please try again.",
        reference: req.params.reference,
        data: {
          reference: req.params.reference,
          amount: 0,
          status: "pending",
          processedAt: null,
        },
      });
      return;
    }

    res.status(500).json({
      error: errorMessage,
      status: "error",
    });
  }
}

export async function handlePaystackBrowserCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as Record<string, string | string[] | undefined>;
  const reference =
    (typeof query.reference === "string" && query.reference) ||
    (typeof query.trxref === "string" && query.trxref) ||
    (typeof query.trxref === "string" ? query.trxref : undefined);

  logPaystackContext("callback:request", {
    query,
    rawBody: req.rawBody,
    reference,
  });

  if (!reference) {
    res.status(400).json({ error: "Missing Paystack reference" });
    return;
  }

  // Attempt to finalize and verify the payment
  let paymentStatus: "success" | "failed" | "pending" = "pending";
  try {
    const result = await finalizePaystackDeposit(reference);
    paymentStatus = result.status;
  } catch (error) {
    logPaystackContext("callback:verification_error", {
      reference,
      error: error instanceof Error ? error.message : String(error),
    });
    paymentStatus = "pending";
  }

  const redirectUrl = new URL(
    process.env.PAYSTACK_SUCCESS_REDIRECT_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      "http://localhost:5173",
  );
  redirectUrl.pathname = "/user/payments/deposit";
  redirectUrl.searchParams.set("status", paymentStatus);

  logPaystackContext("callback:redirect", {
    reference,
    paymentStatus,
    target: redirectUrl.toString(),
  });

  res.redirect(302, redirectUrl.toString());
}

// ============================================================================
// STATUS CHECK (for polling)
// ============================================================================

/**
 * Check payment status without verification
 * GET /payments/paystack/status/:reference
 *
 * Light-weight status check, returns local DB state
 */
export async function checkPaystackPaymentStatus(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { reference } = paystackVerifySchema.parse(req.params);

    const transaction = await prisma.walletTransaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const statusMap: Record<string, string> = {
      PENDING: "pending",
      PROCESSING: "processing",
      COMPLETED: "success",
      FAILED: "failed",
      REVERSED: "reversed",
    };

    res.json({
      reference,
      status: statusMap[transaction.status] || "unknown",
      transactionStatus: transaction.status,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      processedAt: transaction.processedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid reference" });
      return;
    }

    console.error("Paystack status check error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to check payment status",
    });
  }
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

/**
 * Get Paystack transactions for current user
 * GET /payments/paystack/history?limit=10&offset=0
 */
export async function getPaystackTransactions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        userId,
        channel: "paystack",
        type: "DEPOSIT",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        reference: true,
        amount: true,
        status: true,
        currency: true,
        createdAt: true,
        processedAt: true,
        description: true,
      },
    });

    const total = await prisma.walletTransaction.count({
      where: {
        userId,
        channel: "paystack",
        type: "DEPOSIT",
      },
    });

    res.json({
      data: transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Paystack history error:", error);
    res.status(500).json({
      error: "Failed to fetch transaction history",
    });
  }
}
