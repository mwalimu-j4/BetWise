import { z } from "zod";

export type WalletTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED";
export type WalletTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BET_STAKE"
  | "BET_WIN"
  | "REFUND"
  | "BONUS";

export type MpesaAuthTokenResponse = {
  access_token: string;
  expires_in: string;
};

export type MpesaStkPushResponse = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorMessage?: string;
};

export type MpesaStkQueryResponse = {
  ResponseCode?: string;
  ResponseDescription?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string;
  ResultDesc?: string;
  errorMessage?: string;
};

export type MpesaB2CResponse = {
  ConversationID?: string;
  OriginatorConversationID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  errorMessage?: string;
};

export type MpesaCallbackItem = {
  Name: string;
  Value?: string | number;
};

export const stkPushBodySchema = z.object({
  phone: z.string().trim().min(10),
  amount: z.number().int().positive(),
  accountReference: z.string().trim().min(2).max(20).optional(),
  description: z.string().trim().min(2).max(40).optional(),
});

export const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().optional(),
      CheckoutRequestID: z.string().optional(),
      ResultCode: z.union([z.number(), z.string()]).optional(),
      ResultDesc: z.string().optional(),
      CallbackMetadata: z
        .object({
          Item: z
            .array(
              z.object({
                Name: z.string(),
                Value: z.union([z.string(), z.number()]).optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    }),
  }),
});

export function toTransactionType(value: WalletTransactionType): string {
  switch (value) {
    case "DEPOSIT":
      return "deposit";
    case "WITHDRAWAL":
      return "withdrawal";
    case "BET_STAKE":
      return "bet-stake";
    case "BET_WIN":
      return "bet-win";
    case "REFUND":
      return "refund";
    case "BONUS":
      return "bonus";
  }
}

export function toTransactionStatus(value: WalletTransactionStatus): string {
  switch (value) {
    case "PENDING":
      return "pending";
    case "PROCESSING":
      return "processing";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    case "REVERSED":
      return "reversed";
  }
}

export function normalizePhoneNumber(phone: string): string | null {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    return `254${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith("7") && digitsOnly.length === 9) {
    return `254${digitsOnly}`;
  }

  if (digitsOnly.startsWith("254") && digitsOnly.length === 12) {
    return digitsOnly;
  }

  return null;
}

export function getMpesaConfig():
  | {
      isConfigured: true;
      baseUrl: string;
      consumerKey: string;
      consumerSecret: string;
      shortcode: string;
      passkey: string;
      callbackUrl: string;
    }
  | {
      isConfigured: false;
      missingVars: string[];
    } {
  const env =
    process.env.MPESA_ENV?.toLowerCase() === "live" ? "live" : "sandbox";
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  const missingVars: string[] = [];

  if (!consumerKey) missingVars.push("MPESA_CONSUMER_KEY");
  if (!consumerSecret) missingVars.push("MPESA_CONSUMER_SECRET");
  if (!shortcode) missingVars.push("MPESA_SHORTCODE");
  if (!passkey) missingVars.push("MPESA_PASSKEY");
  if (!callbackUrl) missingVars.push("MPESA_CALLBACK_URL");

  if (missingVars.length > 0) {
    return {
      isConfigured: false,
      missingVars,
    };
  }

  const baseUrl =
    env === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  return {
    isConfigured: true,
    baseUrl,
    consumerKey: consumerKey as string,
    consumerSecret: consumerSecret as string,
    shortcode: shortcode as string,
    passkey: passkey as string,
    callbackUrl: callbackUrl as string,
  };
}

function deriveSiblingCallbackUrl(callbackUrl: string, pathname: string) {
  const url = new URL(callbackUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getMpesaB2CConfig():
  | {
      isConfigured: true;
      baseUrl: string;
      consumerKey: string;
      consumerSecret: string;
      shortcode: string;
      initiatorName: string;
      securityCredential: string;
      commandId: string;
      resultUrl: string;
      timeoutUrl: string;
    }
  | {
      isConfigured: false;
      missingVars: string[];
    } {
  const baseConfig = getMpesaConfig();
  if (!baseConfig.isConfigured) {
    return baseConfig;
  }

  const initiatorName = process.env.MPESA_INITIATOR_NAME?.trim();
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL?.trim();
  const commandId = process.env.MPESA_B2C_COMMAND_ID?.trim() || "BusinessPayment";
  const resultUrl =
    process.env.MPESA_B2C_RESULT_URL?.trim() ||
    deriveSiblingCallbackUrl(
      baseConfig.callbackUrl,
      "/api/payments/mpesa/withdrawals/result",
    );
  const timeoutUrl =
    process.env.MPESA_B2C_TIMEOUT_URL?.trim() ||
    deriveSiblingCallbackUrl(
      baseConfig.callbackUrl,
      "/api/payments/mpesa/withdrawals/timeout",
    );

  const missingVars: string[] = [];
  if (!initiatorName) missingVars.push("MPESA_INITIATOR_NAME");
  if (!securityCredential) missingVars.push("MPESA_SECURITY_CREDENTIAL");

  if (missingVars.length > 0) {
    return {
      isConfigured: false,
      missingVars,
    };
  }

  return {
    isConfigured: true,
    baseUrl: baseConfig.baseUrl,
    consumerKey: baseConfig.consumerKey,
    consumerSecret: baseConfig.consumerSecret,
    shortcode: baseConfig.shortcode,
    initiatorName: initiatorName as string,
    securityCredential: securityCredential as string,
    commandId,
    resultUrl,
    timeoutUrl,
  };
}

export function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

export async function getMpesaAccessToken(config: {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}): Promise<MpesaAuthTokenResponse> {
  const authHeader = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64");

  const tokenResponse = await fetch(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    },
  );

  if (!tokenResponse.ok) {
    throw new Error("Could not authenticate with M-Pesa API.");
  }

  return (await tokenResponse.json()) as MpesaAuthTokenResponse;
}

export function getValue(
  items: MpesaCallbackItem[],
  name: string,
): undefined | string | number {
  return items.find((item) => item.Name === name)?.Value;
}

export function normalizeCallbackValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

export function toClientTransaction(transaction: {
  id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  currency: string;
  channel: string;
  reference: string;
  providerReceiptNumber: string | null;
  createdAt: Date;
}) {
  return {
    id: transaction.id,
    type: toTransactionType(transaction.type),
    status: toTransactionStatus(transaction.status),
    amount: transaction.amount,
    currency: transaction.currency,
    channel: transaction.channel,
    reference: transaction.reference,
    mpesaCode: transaction.providerReceiptNumber,
    createdAt: transaction.createdAt.toISOString(),
  };
}
