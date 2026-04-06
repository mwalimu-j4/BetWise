import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendPasswordResetEmail } from "../utils/emailUtils";
import {
  createAccessToken,
  createRefreshToken,
  createResetToken,
  getRefreshExpiryDate,
  getRefreshTokenCookieOptions,
  getRefreshTokenSecret,
  getResetTokenSecret,
  hashToken,
} from "../utils/tokenUtils";

const PASSWORD_SALT_ROUNDS = 12;
const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

const registerSchema = z.object({
  email: z.string().trim().email("Provide a valid email address."),
  phone: z.string().trim(),
  password: z.string(),
  confirmPassword: z.string(),
});

const loginSchema = z.object({
  phone: z.string().trim(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Provide a valid email address."),
  phone: z.string().trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

function normalizeKenyanPhone(rawPhone: string) {
  const trimmed = rawPhone.trim();
  if (!KENYAN_PHONE_REGEX.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.startsWith("254")) {
    return `+${digits}`;
  }

  return null;
}

function sanitizeUser(user: {
  id: string;
  email: string;
  phone: string;
  role: "USER" | "ADMIN";
  isVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

function getIpAddress(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return req.ip ?? null;
}

async function setRefreshTokenCookieAndPersist(
  req: Request,
  res: Response,
  userId: string,
) {
  const rawRefreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken, getRefreshTokenSecret());

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: refreshTokenHash,
      deviceInfo: req.headers["user-agent"] ?? null,
      ipAddress: getIpAddress(req),
      expiresAt: getRefreshExpiryDate(),
    },
  });

  res.cookie("refreshToken", rawRefreshToken, getRefreshTokenCookieOptions());
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const fieldErrors: Record<string, string[]> = {};
  const normalizedPhone = normalizeKenyanPhone(parsed.data.phone);

  if (!normalizedPhone) {
    fieldErrors.phone = [
      "Phone must match Kenyan format: 07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX.",
    ];
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    fieldErrors.confirmPassword = [
      "Confirm password must exactly match password.",
    ];
  }

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.email } }),
    normalizedPhone
      ? prisma.user.findUnique({ where: { phone: normalizedPhone } })
      : Promise.resolve(null),
  ]);

  if (existingEmail) {
    fieldErrors.email = ["This email is already registered."];
  }

  if (existingPhone) {
    fieldErrors.phone = ["This phone number is already registered."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return res.status(400).json({ errors: fieldErrors });
  }

  const passwordHash = await bcrypt.hash(
    parsed.data.password,
    PASSWORD_SALT_ROUNDS,
  );

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      phone: normalizedPhone!,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
  });

  await setRefreshTokenCookieAndPersist(req, res, user.id);

  return res.status(201).json({
    accessToken,
    user: sanitizeUser(user),
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const normalizedPhone = normalizeKenyanPhone(parsed.data.phone);
  if (!normalizedPhone) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      passwordHash: true,
      accountStatus: true,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.accountStatus === "SUSPENDED") {
    return res
      .status(403)
      .json({ message: "This account has been suspended." });
  }

  const isValidPassword = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );
  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
  });

  await setRefreshTokenCookieAndPersist(req, res, user.id);

  return res.status(200).json({
    accessToken,
    user: sanitizeUser(user),
  });
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken as string | undefined;
    if (!refreshToken) {
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tokenHash = hashToken(refreshToken, getRefreshTokenSecret());
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            createdAt: true,
            accountStatus: true,
          },
        },
      },
    });

    if (!tokenRecord?.user) {
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (tokenRecord.user.accountStatus === "SUSPENDED") {
      await prisma.refreshToken.deleteMany({
        where: { userId: tokenRecord.user.id },
      });
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res
        .status(403)
        .json({ message: "This account has been suspended." });
    }

    const newRawRefreshToken = createRefreshToken();
    const newRefreshHash = hashToken(
      newRawRefreshToken,
      getRefreshTokenSecret(),
    );

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: tokenRecord.id } }),
      prisma.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: newRefreshHash,
          deviceInfo: req.headers["user-agent"] ?? null,
          ipAddress: getIpAddress(req),
          expiresAt: getRefreshExpiryDate(),
        },
      }),
    ]);

    const accessToken = createAccessToken({
      id: tokenRecord.user.id,
      role: tokenRecord.user.role,
    });

    res.cookie(
      "refreshToken",
      newRawRefreshToken,
      getRefreshTokenCookieOptions(),
    );

    return res.status(200).json({
      accessToken,
      user: sanitizeUser(tokenRecord.user),
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken as string | undefined;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken, getRefreshTokenSecret());
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  return res.status(200).json({ message: "Logged out successfully." });
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  const genericMessage = {
    message: "If those details match our records, a reset link has been sent",
  };

  if (!parsed.success) {
    return res.status(200).json(genericMessage);
  }

  const normalizedPhone = normalizeKenyanPhone(parsed.data.phone);
  if (!normalizedPhone) {
    return res.status(200).json(genericMessage);
  }

  const user = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      phone: normalizedPhone,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (user) {
    const rawResetToken = createResetToken();
    const hashedResetToken = hashToken(rawResetToken, getResetTokenSecret());

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          used: false,
        },
        data: {
          used: true,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashedResetToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      }),
    ]);

    await sendPasswordResetEmail(user.email, rawResetToken);
  }

  return res.status(200).json(genericMessage);
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Reset link is invalid or has expired" });
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return res.status(400).json({
      errors: {
        confirmPassword: ["Confirm password must exactly match password."],
      },
    });
  }

  const passwordErrors = validatePassword(parsed.data.newPassword);
  if (passwordErrors.length > 0) {
    return res.status(400).json({
      errors: {
        newPassword: passwordErrors,
      },
    });
  }

  const tokenHash = hashToken(parsed.data.token, getResetTokenSecret());

  const tokenRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!tokenRecord) {
    return res
      .status(400)
      .json({ message: "Reset link is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(
    parsed.data.newPassword,
    PASSWORD_SALT_ROUNDS,
  );

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: tokenRecord.userId,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetToken.update({
      where: {
        id: tokenRecord.id,
      },
      data: {
        used: true,
      },
    }),
    prisma.refreshToken.deleteMany({
      where: {
        userId: tokenRecord.userId,
      },
    }),
  ]);

  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  return res.status(200).json({ message: "Password reset successful." });
}

export async function me(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.status(200).json({ user: sanitizeUser(user) });
}
