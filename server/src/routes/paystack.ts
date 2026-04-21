import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  verifyPaystackWebhookSignature,
  parseWebhookEvent,
} from "../lib/paystack";
import {
  initializePaystackPayment,
  handlePaystackBrowserCallback,
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
paystackRouter.post("/initialize", authenticate, initializePaystackPayment);

/**
 * Paystack browser callback
 * GET /payments/paystack/callback
 *
 * Paystack redirects the user here after checkout.
 * The server verifies the reference, logs the raw query, and redirects
 * the browser back to the payments page with status information.
 */
paystackRouter.get("/callback", handlePaystackBrowserCallback);

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
paystackRouter.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;

    if (!signature) {
      console.warn("Paystack webhook: missing X-Paystack-Signature header");
      res.status(401).json({ error: "Missing signature" });
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error(
        "Paystack webhook: missing raw body for signature verification",
      );
      res.status(400).json({ error: "Missing raw body" });
      return;
    }

    const isValid = await verifyPaystackWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error("Paystack webhook: invalid signature or secret not configured. Webhook rejected.");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Parse and handle webhook
    const event = parseWebhookEvent(req.body as Record<string, unknown>);
    handlePaystackWebhook(event)
      .then(() => {
        console.log(
          `✅ Paystack webhook processed successfully for reference ${event.data.reference}`,
        );
        res.status(200).json({ received: true });
      })
      .catch((error) => {
        console.error("Paystack webhook handler error:", error);
        res.status(500).json({
          received: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    res.status(500).json({ error: "Webhook processing error" });
  }
});

export default paystackRouter;
