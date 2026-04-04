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
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.accountStatus === "SUSPENDED") {
      return res.status(403).json({ message: "Account suspended" });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
