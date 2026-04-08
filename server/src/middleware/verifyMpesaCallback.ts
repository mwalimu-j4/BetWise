import type { NextFunction, Request, Response } from "express";

function getRemoteIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return req.ip ?? null;
}

function getAllowedIps() {
  const raw = process.env.MPESA_CALLBACK_ALLOWED_IPS;
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function verifyMpesaCallback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const sharedSecret = process.env.MPESA_CALLBACK_SHARED_SECRET?.trim();
  const callbackToken =
    typeof req.query.token === "string" ? req.query.token.trim() : "";
  const allowedIps = getAllowedIps();
  const remoteIp = getRemoteIp(req);

  if (!sharedSecret) {
    return res.status(500).json({
      message:
        "M-Pesa callback verification is not configured. Set MPESA_CALLBACK_SHARED_SECRET.",
    });
  }

  if (callbackToken !== sharedSecret) {
    return res.status(403).json({ message: "Forbidden callback request." });
  }

  if (allowedIps.length > 0 && (!remoteIp || !allowedIps.includes(remoteIp))) {
    return res.status(403).json({ message: "Forbidden callback source." });
  }

  return next();
}
