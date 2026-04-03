import { Router } from "express";
import { z } from "zod";

const paymentRouter = Router();

const stkPushBodySchema = z.object({
  phone: z.string().trim().min(10),
  amount: z.number().int().positive(),
  accountReference: z.string().trim().min(2).max(20).optional(),
  description: z.string().trim().min(2).max(40).optional(),
});

type MpesaAuthTokenResponse = {
  access_token: string;
  expires_in: string;
};

type MpesaStkPushResponse = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorMessage?: string;
};

function normalizePhoneNumber(phone: string) {
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

function getMpesaConfig() {
  const env = process.env.MPESA_ENV === "live" ? "live" : "sandbox";
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    return null;
  }

  const baseUrl =
    env === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  return {
    baseUrl,
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
  };
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

paymentRouter.post("/payments/mpesa/stk-push", async (req, res, next) => {
  try {
    const parsedBody = stkPushBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid payment payload." });
    }

    const config = getMpesaConfig();
    if (!config) {
      return res.status(500).json({
        message:
          "M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY and MPESA_CALLBACK_URL.",
      });
    }

    const normalizedPhone = normalizePhoneNumber(parsedBody.data.phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Phone must be in Kenyan format like 2547XXXXXXXX.",
      });
    }

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
      return res.status(502).json({
        message: "Could not authenticate with M-Pesa API.",
      });
    }

    const tokenData = (await tokenResponse.json()) as MpesaAuthTokenResponse;

    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestamp}`,
    ).toString("base64");

    const stkPayload = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: parsedBody.data.amount,
      PartyA: normalizedPhone,
      PartyB: config.shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: parsedBody.data.accountReference ?? "BET-DEPOSIT",
      TransactionDesc: parsedBody.data.description ?? "Bet wallet deposit",
    };

    const stkPushResponse = await fetch(
      `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      },
    );

    const stkData = (await stkPushResponse.json()) as MpesaStkPushResponse;

    if (!stkPushResponse.ok || stkData.ResponseCode !== "0") {
      return res.status(502).json({
        message: stkData.errorMessage ?? "M-Pesa rejected the STK push request.",
      });
    }

    return res.status(200).json({
      message: "STK push initiated successfully.",
      merchantRequestId: stkData.MerchantRequestID,
      checkoutRequestId: stkData.CheckoutRequestID,
      customerMessage: stkData.CustomerMessage,
    });
  } catch (error) {
    next(error);
  }
});

export { paymentRouter };
