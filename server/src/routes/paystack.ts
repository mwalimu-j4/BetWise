import { Router } from "express";
import { verifyPaystackWebhookSignature, parseWebhookEvent } from "../lib/paystack";
import {
  initializePaystackPayment,
  verifyPaystackPayment,
  checkPaystackPaymentStatus,
  getPaystackTransactions,
} from "../controllers/paystack.controller";
import { handlePaystackWebhook } from "./paystack-webhook";

export const paystackRouter = Router();

// ============================================================================
// DEPOSIT FLOW
// ============================================================================

/**
 * Initialize Paystack payment
 * POST /payments/paystack/initialize
 * Body: { email, amount }
 * Returns: { reference, authorization_url, access_code }
 */
paystackRouter.post("/initialize", initializePaystackPayment);

/**
 * Verify Paystack payment (MUST CALL AFTER CHECKOUT)
 * GET /payments/paystack/verify/:reference
 * Returns: { status, reference, amount, data }
 */
paystackRouter.get("/verify/:reference", verifyPaystackPayment);

/**
 * Check payment status (light polling endpoint)
 * GET /payments/paystack/status/:reference
 * Returns: { reference, status, amount, createdAt, processedAt }
 */
paystackRouter.get("/status/:reference", checkPaystackPaymentStatus);

/**
 * Get user's Paystack transaction history
 * GET /payments/paystack/history?limit=20&offset=0
 */
paystackRouter.get("/history", authenticate, getPaystackTransactions);

// ============================================================================
// WEBHOOK - NO AUTHENTICATION (public endpoint)
// ============================================================================

/**
 * Paystack webhook receiver
 * POST /payments/paystack/webhook
 *
 * Paystack will send:
 * - X-Paystack-Signature header: HMAC-SHA512 of raw body
 * - Body: { event: "charge.success", data: {...} }
 *
 * Only processes charge.success events.
 * Idempotent: uses reference as primary key.
 */
paystackRouter.post("/webhook", (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;

    if (!signature) {
      console.warn("Paystack webhook: missing X-Paystack-Signature header");
      res.status(401).json({ error: "Missing signature" });
      return;
    }

    // Verify signature with raw body
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const isValid = verifyPaystackWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error("Paystack webhook: invalid signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Parse and handle webhook
    const event = parseWebhookEvent(req.body as Record<string, unknown>);
    handlePaystackWebhook(event)
      .then(() => {
        res.status(200).json({ received: true });
      })
      .catch((error) => {
        console.error("Paystack webhook handler error:", error);
        // Return 200 to prevent Paystack retry, but log error
        res.status(200).json({ received: true, error: error instanceof Error ? error.message : "Unknown error" });
      });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    // Return 200 to prevent Paystack retry
    res.status(200).json({ error: "Webhook processing error" });
  }
});

export default paystackRouter;
