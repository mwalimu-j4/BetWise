import type { NextFunction, Request, Response } from "express";

function getAllowedOrigins() {
  const raw = process.env.FRONTEND_URL ?? "http://localhost:5173";

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin));
}

function toOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) {
    return res
      .status(500)
      .json({ message: "Origin allowlist is not configured." });
  }

  const originHeader =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const refererHeader =
    typeof req.headers.referer === "string" ? req.headers.referer : undefined;

  const requestOrigin = toOrigin(originHeader) ?? toOrigin(refererHeader);

  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    return res.status(403).json({ message: "Forbidden origin." });
  }

  return next();
}
