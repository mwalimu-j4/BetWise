import { Router, Request, Response } from "express";
import crypto from "crypto";

type PaystackWebhookPayload = {
  event: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    paid_at: string;
    status: string;
    customer: {
      customer_code: string;
      email: string;
    };
    authorization: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
};

function safeJsonParse(rawBody: unknown): Record<string, unknown> {
  if (typeof rawBody === "object" && rawBody !== null) {
    return rawBody as Record<string, unknown>;
  }

  if (typeof rawBody !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function verifyPaystackSignature(
  payload: string | Buffer,
  signature: string,
): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("PAYSTACK_WEBHOOK_SECRET not configured");
    return false;
  }

  const payloadStr = typeof payload === "string" ? payload : payload.toString();
  const hash = crypto
    .createHmac("sha512", secret)
    .update(payloadStr)
    .digest("hex");

  return hash === signature;
}

export const paystackRouter: Router = Router();

paystackRouter.post("/webhook", (req: Request, res: Response): void => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const signature = req.headers["x-paystack-signature"] as string;
  if (!signature) {
    console.warn("Paystack webhook: missing X-Paystack-Signature header");
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  const rawBody =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  if (!verifyPaystackSignature(rawBody, signature)) {
    console.error("Paystack webhook: invalid signature");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const payload = safeJsonParse(req.body);
  console.log("Paystack webhook payload:", JSON.stringify(payload, null, 2));

  const event = payload as PaystackWebhookPayload;
  if (event.event !== "charge.success") {
    console.log(`Skipping Paystack event: ${event.event}`);
    res.status(200).json({ received: true });
    return;
  }

  const serverWebhookUrl =
    process.env.PAYSTACK_WEBHOOK_SERVER_URL ||
    process.env.BETWISE_SERVER_URL ||
    "http://localhost:5000";
  const fullWebhookPath = `${serverWebhookUrl}/api/payments/paystack/webhook`;

  fetch(fullWebhookPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Paystack-Signature": signature,
    },
    body: rawBody,
  })
    .then((response) => {
      console.log(
        `Paystack webhook forwarded to server: ${response.status} ${response.statusText}`,
      );
      if (!response.ok) {
        console.warn(
          `Server webhook response was not OK: ${response.status} ${response.statusText}`,
        );
      }
    })
    .catch((error) => {
      console.error("Failed to forward Paystack webhook to server:", error);
    });

  res.status(200).json({ received: true });
});

export default paystackRouter;
