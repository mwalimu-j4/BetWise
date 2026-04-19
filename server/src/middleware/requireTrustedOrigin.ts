import type { NextFunction, Request, Response } from "express";
import {
  isRequestOriginAllowed,
  resolveAllowedOriginsFromEnv,
} from "../config/cors";

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const allowedOrigins = resolveAllowedOriginsFromEnv();
  if (allowedOrigins.length === 0) {
    return res
      .status(500)
      .json({ message: "Origin allowlist is not configured." });
  }

  const originHeader =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const refererHeader =
    typeof req.headers.referer === "string" ? req.headers.referer : undefined;

  if (!isRequestOriginAllowed(originHeader, refererHeader)) {
    console.warn("[TrustedOrigin] Forbidden origin", {
      path: req.originalUrl,
      origin: originHeader,
      referer: refererHeader,
      allowedOrigins,
    });
    return res.status(403).json({ message: "Forbidden origin." });
  }

  return next();
}
