import type { NextFunction, Request, Response } from "express";

function buildSafeRequestBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const source = body as Record<string, unknown>;
  return {
    email:
      typeof source.email === "string"
        ? source.email.trim().toLowerCase()
        : undefined,
    phoneProvided:
      typeof source.phone === "string" && source.phone.trim().length > 0,
    passwordProvided:
      typeof source.password === "string" && source.password.length > 0,
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isCorsBlocked =
    err instanceof Error && err.message === "Not allowed by CORS";

  console.error("GLOBAL ERROR", {
    message: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin,
    requestBody: buildSafeRequestBody(req.body),
  });

  if (isCorsBlocked) {
    return res.status(403).json({
      message: "Request origin is not allowed by CORS policy.",
    });
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err instanceof Error
        ? err.message
        : "Internal server error";
  res.status(500).json({ message });
}
