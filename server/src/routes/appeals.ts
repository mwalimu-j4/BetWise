import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { prisma } from "../lib/prisma";
import { verifyBanAppealToken } from "../utils/tokenUtils";

const appealsRouter = Router();

// Create a ban appeal (user)
appealsRouter.post("/appeals/public", async (req: Request, res: Response) => {
  const appealSchema = z.object({
    appealToken: z.string().trim().min(1),
    appealText: z.string().trim().min(10).max(1000),
  });

  const parsed = appealSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid appeal data",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  let tokenData: { userId: string };
  try {
    tokenData = verifyBanAppealToken(parsed.data.appealToken);
  } catch {
    return res.status(400).json({
      message: "Invalid or expired appeal token. Please sign in again.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenData.userId },
    select: { id: true, bannedAt: true },
  });

  if (!user || !user.bannedAt) {
    return res.status(400).json({
      message: "You are not banned, so you cannot appeal a ban",
    });
  }

  // Check if user already has a pending appeal
  const existingPending = await prisma.banAppeal.findFirst({
    where: {
      userId: tokenData.userId,
      status: "PENDING",
    },
  });

  if (existingPending) {
    return res.status(400).json({
      message: "You already have a pending appeal. Please wait for a response.",
    });
  }

  const appeal = await prisma.banAppeal.create({
    data: {
      userId: tokenData.userId,
      appealText: parsed.data.appealText,
      status: "PENDING",
    },
  });

  return res.status(201).json({
    message: "Ban appeal submitted successfully",
    appeal: {
      id: appeal.id,
      status: appeal.status,
      createdAt: appeal.createdAt.toISOString(),
    },
  });
});

// Get user's appeals
appealsRouter.get(
  "/appeals/my",
  authenticate,
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const appeals = await prisma.banAppeal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      appeals: appeals.map((appeal) => ({
        id: appeal.id,
        appealText: appeal.appealText,
        status: appeal.status,
        responseText: appeal.responseText,
        createdAt: appeal.createdAt.toISOString(),
        updatedAt: appeal.updatedAt.toISOString(),
        reviewedAt: appeal.reviewedAt?.toISOString() || null,
      })),
    });
  },
);

// Get specific appeal for user
appealsRouter.get(
  "/appeals/:appealId",
  authenticate,
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const appealId = String(req.params.appealId);

    const appeal = await prisma.banAppeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      return res.status(404).json({ message: "Appeal not found" });
    }

    if (appeal.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({
      id: appeal.id,
      appealText: appeal.appealText,
      status: appeal.status,
      responseText: appeal.responseText,
      createdAt: appeal.createdAt.toISOString(),
      updatedAt: appeal.updatedAt.toISOString(),
      reviewedAt: appeal.reviewedAt?.toISOString() || null,
    });
  },
);

// Withdraw appeal
appealsRouter.post(
  "/appeals/:appealId/withdraw",
  authenticate,
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const appealId = String(req.params.appealId);

    const appeal = await prisma.banAppeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      return res.status(404).json({ message: "Appeal not found" });
    }

    if (appeal.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (appeal.status !== "PENDING") {
      return res.status(400).json({
        message: "Can only withdraw pending appeals",
      });
    }

    const updated = await prisma.banAppeal.update({
      where: { id: appealId },
      data: { status: "WITHDRAWN" },
    });

    return res.status(200).json({
      message: "Appeal withdrawn successfully",
      appeal: {
        id: updated.id,
        status: updated.status,
      },
    });
  },
);

export { appealsRouter };
