import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../utils/tokenUtils";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.accountStatus === "SUSPENDED") {
      return res.status(403).json({ message: "Account suspended" });
    }

    const requestPath = req.path.toLowerCase();
    const requestOriginalPath = req.originalUrl.split("?")[0].toLowerCase();
    const isChangePasswordRoute =
      requestPath === "/auth/change-password" ||
      requestOriginalPath.endsWith("/auth/change-password");
    const mustChangePassword =
      payload.mustChangePassword === true || user.mustChangePassword === true;

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
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export const requireAuth = authenticate;
