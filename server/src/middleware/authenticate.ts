import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../utils/tokenUtils";

function logAuthFailure(req: Request, reason: string) {
  const originalPath = req.originalUrl.split("?")[0].toLowerCase();
  const isExpectedSessionProbe =
    originalPath.endsWith("/auth/me") &&
    reason.includes("Missing or invalid Authorization bearer token");

  const log = isExpectedSessionProbe ? console.info : console.warn;

  log("[Auth] Unauthorized request", {
    reason,
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin,
  });
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logAuthFailure(req, "Missing or invalid Authorization bearer token");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        role: true,
        accountStatus: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      logAuthFailure(req, "Token valid but user no longer exists");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.accountStatus === "SUSPENDED") {
      console.warn("[Auth] Suspended account blocked", {
        userId: user.id,
        path: req.originalUrl,
      });
      return res.status(403).json({ message: "Account suspended" });
    }

    const requestPath = req.path.toLowerCase();
    const requestOriginalPath = req.originalUrl.split("?")[0].toLowerCase();
    const isChangePasswordRoute =
      requestPath === "/auth/change-password" ||
      requestOriginalPath.endsWith("/auth/change-password");
    const mustChangePassword = user.mustChangePassword === true;

    if (mustChangePassword && !isChangePasswordRoute) {
      return res.status(403).json({
        message: "You must change your password before accessing this resource",
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      mustChangePassword,
    };

    return next();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logAuthFailure(req, `Access token verification failed: ${errorMsg}`);
    console.error("[Auth] Token verification error details:", {
      error: errorMsg,
      tokenLength: token?.length || 0,
      tokenPrefix: token?.substring(0, 20),
    });
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export const requireAuth = authenticate;
