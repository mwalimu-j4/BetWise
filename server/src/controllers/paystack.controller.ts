import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getOrCreateWallet } from "../lib/wallet";
import { emitWalletUpdate } from "../lib/socket";
import { createDepositNotifications } from "./notifications.controller";
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

const paystackDepositSchema = z.object({
  email: z.string().email("Invalid email address"),
  amount: z
    .number()
    .int()
    .positive("Amount must be greater than 0")
    .min(100, "Minimum amount is 100 KES")
    .max(500000, "Maximum amount is 500,000 KES"),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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
        body.callbackUrl ??
        process.env.PAYSTACK_CALLBACK_URL?.trim() ??
        undefined,
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

    console.error("Paystack initialize error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to initialize Paystack payment",
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

    // Get transaction from DB
    const transaction = await prisma.walletTransaction.findUnique({
      where: { reference },
      include: { wallet: true, user: true },
    });

    if (!transaction) {
      res.status(404).json({
        error: "Transaction not found",
        status: "unknown",
      });
      return;
    }

    // If already processed, return current status
    if (transaction.status === "COMPLETED" || transaction.status === "FAILED") {
      res.json({
        status: transaction.status === "COMPLETED" ? "success" : "failed",
        message:
          transaction.status === "COMPLETED"
            ? "Payment successful"
            : "Payment failed",
        reference,
        data: {
          reference,
          amount: transaction.amount,
          status: transaction.status,
          processedAt: transaction.processedAt,
        },
      });
      return;
    }

    // Call Paystack API to verify
    const verificationResult = await verifyPaystackTransaction(reference);

    // Parse verification result
    const isSuccessful =
      verificationResult.status &&
      verificationResult.data &&
      verificationResult.data.status === "success";

    if (isSuccessful && transaction.wallet && transaction.user) {
      const processedAt = new Date();
      const wallet = transaction.wallet;
      const verificationPayload = JSON.parse(
        JSON.stringify(verificationResult.data),
      ) as Prisma.InputJsonValue;
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
            providerCallback: {
              provider: "paystack",
              verifiedAt: processedAt.toISOString(),
              verificationData: verificationPayload,
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
              increment: transaction.amount,
            },
          },
        });
      });

      if (!updatedWallet) {
        res.json({
          status: "success",
          message: "Payment already processed",
          reference,
          data: {
            reference,
            amount: transaction.amount,
            status: "success",
            processedAt: transaction.processedAt,
          },
        });
        return;
      }

      // Emit wallet update event
      emitWalletUpdate(transaction.userId, {
        transactionId: transaction.id,
        status: "COMPLETED",
        message: "Deposit successful",
        balance: updatedWallet.balance,
        amount: transaction.amount,
      });

      // Create notification
      await createDepositNotifications({
        userId: transaction.userId,
        transactionId: transaction.id,
        amount: transaction.amount,
        balance: updatedWallet.balance,
        status: "COMPLETED",
      });

      res.json({
        status: "success",
        message: "Payment verified and wallet credited",
        reference,
        data: {
          reference,
          amount: transaction.amount,
          status: "success",
          processedAt: new Date(),
        },
      });
    } else {
      // Mark as failed
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          providerCallback: {
            provider: "paystack",
            verifiedAt: new Date().toISOString(),
            failureReason: "Payment not successful on Paystack",
          },
        },
      });

      res.json({
        status: "pending",
        message: "Payment not yet confirmed. Please check again.",
        reference,
        data: {
          reference,
          amount: transaction.amount,
          status: "pending",
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid reference" });
      return;
    }

    console.error("Paystack verify error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to verify Paystack payment",
      status: "error",
    });
  }
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
