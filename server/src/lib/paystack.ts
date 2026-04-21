import { z } from "zod";
import crypto from "crypto";

/**
 * Get Paystack configuration from environment variables.
 */
async function getPaystackConfig() {
  return {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  };
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
  const config = await getPaystackConfig();
  if (!config.secretKey) {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

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
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Paystack initialize timeout:", request.email);
      throw new Error("Paystack service timeout. Please try again.");
    }
    console.error("Paystack initialize error:", error);
    throw error;
  }
}

/**
 * Verify a Paystack transaction with retry logic and timeout
 * @param reference Transaction reference
 * @param maxRetries Number of retry attempts (default: 3)
 * @returns Verification response with transaction details
 */
export async function verifyPaystackTransaction(
  reference: string,
  maxRetries = 3,
): Promise<PaystackVerifyResponse> {
  const config = await getPaystackConfig();
  if (!config.secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.secretKey}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      const data = (await response.json().catch(() => ({
        status: false,
        message: "Failed to parse response",
      }))) as PaystackVerifyResponse;

      if (!response.ok) {
        // If not found and we haven't retried yet, retry as transaction might not be settled yet
        if (response.status === 404 && attempt < maxRetries) {
          console.warn(
            `Paystack transaction ${reference} not found yet (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`,
          );
          const delayMs = Math.min(500 * Math.pow(2, attempt), 3000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const errorMessage = data.message || response.statusText;
        throw new Error(
          `Paystack API error ${response.status}: ${errorMessage}`,
        );
      }

      if (!data.status) {
        throw new Error(
          `Paystack verification failed: ${data.message || "Unknown error"}`,
        );
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isNetworkError =
        lastError.name === "AbortError" ||
        lastError.message.includes("ECONNREFUSED") ||
        lastError.message.includes("ENOTFOUND") ||
        lastError.message.includes("ETIMEDOUT") ||
        lastError.message.includes("fetch error");

      console.warn(
        `Paystack verify attempt ${attempt + 1}/${maxRetries + 1} failed:`,
        {
          reference,
          error: lastError.message,
          isNetworkError,
          willRetry: attempt < maxRetries,
        },
      );

      // Retry on network errors or failed attempts that might recover
      if (
        attempt < maxRetries &&
        (isNetworkError || lastError.message.includes("not found"))
      ) {
        const delayMs = Math.min(500 * Math.pow(2, attempt), 3000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // For other errors, throw immediately
      throw lastError;
    }
  }

  throw (
    lastError || new Error("Paystack verification failed after max retries")
  );
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
export async function verifyPaystackWebhookSignature(
  payload: string | Buffer,
  signature: string,
): Promise<boolean> {
  const config = await getPaystackConfig();
  if (!config.webhookSecret) {
    console.error("PAYSTACK_WEBHOOK_SECRET not configured");
    return false;
  }

  const payloadBuffer =
    typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  const hash = crypto
    .createHmac("sha512", config.webhookSecret)
    .update(payloadBuffer)
    .digest("hex");
  const normalizedSignature = signature.trim().toLowerCase();

  // Ensure signature is valid hex before Buffer conversion/comparison.
  if (
    !/^[a-f0-9]+$/.test(normalizedSignature) ||
    normalizedSignature.length % 2 !== 0
  ) {
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
  const config = await getPaystackConfig();
  if (!config.secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  // Convert phone to local Kenyan format (0XXXXXXXXX)
  // Paystack Kenya M-Pesa API expects local format, not international format
  let formattedPhone = phoneNumber.replace(/\D/g, ""); // Remove all non-digits

  if (formattedPhone.startsWith("254")) {
    // Convert from international (254789278383) to local (0789278383)
    formattedPhone = `0${formattedPhone.slice(3)}`;
  } else if (!formattedPhone.startsWith("0")) {
    // If it doesn't start with 0 or 254, assume it's already missing country code
    formattedPhone = `0${formattedPhone}`;
  }

  // For Kenya M-Pesa transfers, we need:
  // - type: "mobile_money"
  // - bank_code: "MPESA" (for individual users)
  // - account_number: the phone number in LOCAL format (0789278383)
  // - currency: "KES"
  const payload = {
    type: "mobile_money",
    bank_code: "MPESA", // CRITICAL: Required for Kenya mobile money
    account_number: formattedPhone, // Phone number in local format (0XXXXXXXXX)
    currency: "KES", // Kenya Shilling
    name: name || `M-Pesa - ${formattedPhone}`,
  };

  console.log("[Paystack] Creating transfer recipient:", {
    originalPhone: phoneNumber,
    formattedPhone: payload.account_number,
    bank_code: payload.bank_code,
    currency: payload.currency,
    type: payload.type,
  });

  try {
    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
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
  const config = await getPaystackConfig();
  if (!config.secretKey) {
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
        Authorization: `Bearer ${config.secretKey}`,
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
  const config = await getPaystackConfig();
  if (!config.secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transfer/${encodeURIComponent(transferCode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
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
