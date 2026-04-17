import type { VercelRequest, VercelResponse } from "@vercel/node";

type MpesaMetadataItem = {
  Name?: string;
  Value?: unknown;
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

function getCallbackSection(
  payload: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const body = payload.Body;
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const stkCallback = (body as { stkCallback?: unknown }).stkCallback;
  if (typeof stkCallback !== "object" || stkCallback === null) {
    return undefined;
  }

  return stkCallback as Record<string, unknown>;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function extractMetadataValue(
  items: MpesaMetadataItem[] | undefined,
  fieldName: string,
): unknown {
  if (!Array.isArray(items)) {
    return undefined;
  }

  const item = items.find((entry) => entry && entry.Name === fieldName);
  return item?.Value;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const payload = safeJsonParse(req.body);
  console.log("M-Pesa callback payload:", JSON.stringify(payload, null, 2));

  const callback = getCallbackSection(payload);
  const resultCode = toNumber(callback?.ResultCode);
  const resultDesc = callback?.ResultDesc ?? "No result description provided";
  const callbackMetadata = callback?.CallbackMetadata as
    | { Item?: MpesaMetadataItem[] }
    | undefined;
  const metadataItems = callbackMetadata?.Item;

  const amount = extractMetadataValue(metadataItems, "Amount");
  const phoneNumber = extractMetadataValue(metadataItems, "PhoneNumber");
  const mpesaReceiptNumber = extractMetadataValue(
    metadataItems,
    "MpesaReceiptNumber",
  );

  if (resultCode !== 0) {
    console.log("M-Pesa transaction failed:", {
      resultCode,
      resultDesc,
      amount,
      phoneNumber,
      mpesaReceiptNumber,
    });
  } else {
    console.log("M-Pesa transaction successful:", {
      resultCode,
      resultDesc,
      amount,
      phoneNumber,
      mpesaReceiptNumber,
    });
  }

  console.log("M-Pesa callback config:", {
    callbackUrl: process.env.MPESA_CALLBACK_URL,
  });

  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });
}
