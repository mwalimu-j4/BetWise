import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";
import { emitWalletUpdate } from "../lib/socket";
import { createDepositNotifications } from "../controllers/notifications.controller";
import type { PaystackWebhookEvent } from "../lib/paystack";

/**
 * Handle Paystack webhook events
 *
 * Paystack will POST to this endpoint with:
 * {
 *   event: "charge.success",
 *   data: {
 *     reference: "PAYSTACK_...",
 *     amount: 500000,  // in smallest unit (cents)
 *     paid_at: "2024-01-01T...",
 *     customer: { email, customer_code },
 *     ...
 *   }
 * }
 *
 * IDEMPOTENCY: Uses reference as unique key. If webhook is called multiple times,
 * only first call will update wallet (subsequent calls skip).
 */
export async function handlePaystackWebhook(
  event: PaystackWebhookEvent,
): Promise<void> {
  // Only process charge.success events
  if (event.event !== "charge.success") {
    console.log(`Skipping Paystack event: ${event.event}`);
    return;
  }

  const { reference, amount: amountInSmallestUnit, customer, paid_at } = event.data;

  if (!reference) {
    console.error("Paystack webhook: missing reference");
    throw new Error("Missing reference in webhook data");
  }

  try {
    // Find transaction by reference (guaranteed unique)
    const transaction = await prisma.walletTransaction.findUnique({
      where: { reference },
      include: { wallet: true, user: true },
    });

    if (!transaction) {
      console.warn(`Paystack webhook: transaction not found for reference ${reference}`);
      // This can happen if transaction record wasn't created yet
      // Log but don't fail - Paystack will retry
      return;
    }

    // IDEMPOTENCY CHECK: If already processed, skip
    if (
      transaction.status === "COMPLETED" ||
      transaction.status === "FAILED" ||
      transaction.status === "REVERSED"
    ) {
      console.log(
        `Paystack webhook: transaction ${reference} already processed (status: ${transaction.status})`,
      );
      return;
    }

    if (!transaction.wallet || !transaction.user) {
      console.error(
        `Paystack webhook: missing wallet or user for transaction ${reference}`,
      );
      throw new Error("Invalid transaction state");
    }

    const wallet = transaction.wallet;

    // Verify this is a PAYSTACK deposit
    if (transaction.channel !== "paystack" || transaction.type !== "DEPOSIT") {
      console.warn(
        `Paystack webhook: transaction ${reference} is not a Paystack deposit`,
      );
      return;
    }

    const amountInKes = Math.round(amountInSmallestUnit / 100);

    if (Math.abs(amountInKes - transaction.amount) > transaction.amount * 0.01) {
      console.error(
        `Paystack webhook: amount mismatch for reference ${reference}. Expected ${transaction.amount}, got ${amountInKes}`,
      );
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          providerCallback: {
            provider: "paystack",
            webhookReceivedAt: new Date().toISOString(),
            failureReason: "Amount mismatch",
          },
        },
      });
      return;
    }

    const processedAt = new Date();
    const webhookPayload = JSON.parse(JSON.stringify(event.data)) as Prisma.InputJsonValue;
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
          providerReceiptNumber: customer?.customer_code,
          providerCallback: {
            provider: "paystack",
            webhookReceivedAt: processedAt.toISOString(),
            paidAt: paid_at,
            amount: amountInSmallestUnit,
            customer,
            verified: true,
            webhookData: webhookPayload,
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
      console.log(
        `Paystack webhook: transaction ${reference} already finalized, skipping duplicate delivery`,
      );
      return;
    }

    console.log(
      `✅ Paystack webhook: deposit ${reference} completed. Wallet updated to ${updatedWallet.balance}`,
    );

    // Emit real-time wallet update
    emitWalletUpdate(transaction.userId, {
      transactionId: transaction.id,
      status: "COMPLETED",
      message: "Deposit successful",
      balance: updatedWallet.balance,
      amount: transaction.amount,
    });

    // Create notifications
    await createDepositNotifications(
      {
        userId: transaction.userId,
        transactionId: transaction.id,
        amount: transaction.amount,
        balance: updatedWallet.balance,
        status: "COMPLETED",
      },
    );
  } catch (error) {
    console.error(`Paystack webhook error for reference ${reference}:`, error);
    // Re-throw so caller logs it, but don't crash
    throw error;
  }
}
