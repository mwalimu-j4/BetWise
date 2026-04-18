import { z } from "zod";
import crypto from "crypto";

// Environment variables required for Paystack
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY || !PAYSTACK_WEBHOOK_SECRET) {
  console.warn(
    "⚠️  Paystack environment variables missing. Initialize to enable Paystack payments.",
  );
}

// ============================================================================
// TYPES
// ============================================================================

export interface PaystackInitializeRequest {
  email: string;
  amount: number; // in smallest unit (kobo for NGN, cents for USD, etc.)
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
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
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export interface PaystackWebhookEvent {
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
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
    };
    metadata?: Record<string, unknown>;
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const paystackInitializeSchema = z.object({
  email: z.string().email(),
  amount: z.number().int().positive("Amount must be greater than 0"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const paystackVerifySchema = z.object({
  reference: z.string().min(1, "Reference is required"),
});

// ============================================================================
// CORE PAYSTACK OPERATIONS
// ============================================================================

/**
 * Initialize a Paystack transaction
 * @param request Initialize request with email and amount
 * @returns Authorization URL and reference
 */
export async function initializePaystackTransaction(
  request: PaystackInitializeRequest,
): Promise<PaystackInitializeResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  const reference = request.reference || generateReference();

  const payload = {
    email: request.email,
    amount: request.amount, // Must be in smallest unit
    reference,
    callback_url: request.callbackUrl,
    metadata: request.metadata || {},
  };

  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Paystack API error: ${response.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = (await response.json()) as PaystackInitializeResponse;

    if (!data.status) {
      throw new Error(
        `Paystack initialization failed: ${data.message || "Unknown error"}`,
      );
    }

    return data;
  } catch (error) {
    console.error("Paystack initialize error:", error);
    throw error;
  }
}

/**
 * Verify a Paystack transaction
 * @param reference Transaction reference
 * @returns Verification response with transaction details
 */
export async function verifyPaystackTransaction(
  reference: string,
): Promise<PaystackVerifyResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Paystack API error: ${response.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = (await response.json()) as PaystackVerifyResponse;

    if (!data.status) {
      throw new Error(
        `Paystack verification failed: ${data.message || "Unknown error"}`,
      );
    }

    return data;
  } catch (error) {
    console.error("Paystack verify error:", error);
    throw error;
  }
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Verify webhook signature from Paystack
 * @param payload Raw request body as string/buffer
 * @param signature X-Paystack-Signature header value
 * @returns true if signature is valid
 */
export function verifyPaystackWebhookSignature(
  payload: string | Buffer,
  signature: string,
): boolean {
  if (!PAYSTACK_WEBHOOK_SECRET) {
    console.error("PAYSTACK_WEBHOOK_SECRET not configured");
    return false;
  }

  const payloadBuffer =
    typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  const hash = crypto
    .createHmac("sha512", PAYSTACK_WEBHOOK_SECRET)
    .update(payloadBuffer)
    .digest("hex");
  const normalizedSignature = signature.trim().toLowerCase();

  // Ensure signature is valid hex before Buffer conversion/comparison.
  if (!/^[a-f0-9]+$/.test(normalizedSignature) || normalizedSignature.length % 2 !== 0) {
    return false;
  }

  const expectedBuffer = Buffer.from(hash, "hex");
  const receivedBuffer = Buffer.from(normalizedSignature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Parse and validate webhook event
 * @param data Webhook event data
 * @returns Parsed webhook event
 */
export function parseWebhookEvent(
  data: Record<string, unknown>,
): PaystackWebhookEvent {
  // Minimal validation - Paystack sends event and data
  if (!data.event || !data.data) {
    throw new Error("Invalid webhook event structure");
  }

  return data as unknown as PaystackWebhookEvent;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a unique transaction reference
 */
export function generateReference(): string {
  return `PAYSTACK_${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
}

/**
 * Convert amount from KES/currency to smallest unit (cents/kobo)
 * @param amountInKes Amount in main currency unit
 * @returns Amount in smallest unit
 */
export function convertToSmallestUnit(amountInKes: number): number {
  return Math.round(amountInKes * 100); // Assumes 2 decimal places
}

/**
 * Convert amount from smallest unit back to main currency
 * @param amountInSmallestUnit Amount in smallest unit
 * @returns Amount in main currency unit
 */
export function convertFromSmallestUnit(amountInSmallestUnit: number): number {
  return Math.round(amountInSmallestUnit / 100);
}

/**
 * Format Paystack error for client
 */
export function formatPaystackError(error: unknown): {
  message: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: "PAYSTACK_ERROR",
    };
  }

  return {
    message: "An unexpected error occurred with Paystack",
    code: "UNKNOWN_ERROR",
  };
}

// ============================================================================
// TRANSFER/PAYOUT TYPES
// ============================================================================

export interface PaystackTransferRecipient {
  type: "nuban" | "mobile_money"; // Mobile money for phone numbers
  account_number?: string; // For bank transfers
  bank_code?: string; // For bank transfers
  phone_number?: string; // For mobile money
  currency?: string; // e.g., "KES" for Kenya
}

export interface PaystackTransferRequest {
  source: "balance"; // Always use wallet balance
  recipient: string; // Recipient code (created via recipient endpoint)
  amount: number; // Amount in smallest unit (KES -> kobo)
  reference?: string;
  reason?: string;
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    status: string;
    amount: number;
    recipient: string;
    transfer_code: string;
    id: number;
    createdAt: string;
  };
}

export interface PaystackRecipientResponse {
  status: boolean;
  message: string;
  data?: {
    recipient_code: string;
    active: boolean;
    id: number;
    name: string;
    phone_number: string;
    type: string;
  };
}

// ============================================================================
// TRANSFER/PAYOUT OPERATIONS
// ============================================================================

/**
 * Create a transfer recipient for mobile money payouts
 * @param phoneNumber Mobile money phone number
 * @param name Recipient name
 * @returns Recipient code for use in transfers
 */
export async function createPaystackTransferRecipient(
  phoneNumber: string,
  name?: string,
): Promise<PaystackRecipientResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  // Normalize phone number to remove + prefix if present (Paystack expects different formats for different regions)
  const normalizedPhone = phoneNumber.replace(/^\+/, "");

  const payload = {
    type: "mobile_money",
    phone_number: normalizedPhone,
    account_number: normalizedPhone, // Required by Paystack for mobile money transfers
    name: name || `Mobile Money - ${phoneNumber}`,
    business_name: name || `Mobile Money - ${phoneNumber}`, // Additional required field for some regions
  };

  try {
    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PaystackRecipientResponse;

    if (!data.status) {
      throw new Error(
        `Failed to create transfer recipient: ${data.message || "Unknown error"}`,
      );
    }

    return data;
  } catch (error) {
    console.error("Paystack create recipient error:", error);
    throw error;
  }
}

/**
 * Initiate a withdrawal transfer via Paystack
 * @param phoneNumber Mobile money phone number to withdraw to
 * @param amount Amount in KES (will be converted to smallest unit)
 * @param reference Transaction reference
 * @returns Transfer response with status
 */
export async function initiatePaystackWithdrawal(
  phoneNumber: string,
  amount: number,
  reference: string,
): Promise<PaystackTransferResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  try {
    // First, create a transfer recipient for this phone number
    const recipientResponse = await createPaystackTransferRecipient(
      phoneNumber,
      `Withdrawal - ${phoneNumber}`,
    );

    if (!recipientResponse.data?.recipient_code) {
      throw new Error(
        "Failed to create transfer recipient: No recipient code returned",
      );
    }

    // Convert amount to smallest unit (kobo)
    const amountInSmallestUnit = convertToSmallestUnit(amount);

    // Then initiate the transfer
    const transferPayload = {
      source: "balance",
      recipient: recipientResponse.data.recipient_code,
      amount: amountInSmallestUnit,
      reference,
      reason: "BetWise Withdrawal",
    };

    const response = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transferPayload),
    });

    const data = (await response.json()) as PaystackTransferResponse;

    if (!data.status) {
      throw new Error(
        `Paystack transfer failed: ${data.message || "Unknown error"}`,
      );
    }

    return data;
  } catch (error) {
    console.error("Paystack withdrawal error:", error);
    throw error;
  }
}

/**
 * Get status of a withdrawal transfer
 * @param transferCode Transfer code from initiated transfer
 * @returns Transfer status
 */
export async function getPaystackTransferStatus(
  transferCode: string,
): Promise<PaystackTransferResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transfer/${encodeURIComponent(transferCode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const data = (await response.json()) as PaystackTransferResponse;

    if (!data.status) {
      throw new Error(
        `Failed to get transfer status: ${data.message || "Unknown error"}`,
      );
    }

    return data;
  } catch (error) {
    console.error("Paystack get transfer status error:", error);
    throw error;
  }
}
