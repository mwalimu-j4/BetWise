import type { Request, Response } from "express";
import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  sendAdminLoginOtpEmail,
  sendPasswordResetEmail,
} from "../utils/emailUtils";
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
const PASSWORD_MIN_LENGTH = 10;
const ADMIN_MFA_CODE_LENGTH = 6;
const ADMIN_MFA_TTL_MS = 10 * 60 * 1000;
const ADMIN_MFA_MAX_ATTEMPTS = 5;

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

const verifyAdminMfaSchema = z.object({
  challengeId: z.string().trim().min(16),
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
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

function validatePassword(password: string) {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    );
  }

  if (password.length > 128) {
    errors.push("Password must be at most 128 characters long.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter.");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must include at least one number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must include at least one special character.");
  }

  return errors;
}

function generateAdminOtpCode() {
  const min = 10 ** (ADMIN_MFA_CODE_LENGTH - 1);
  const max = 10 ** ADMIN_MFA_CODE_LENGTH;
  return String(randomInt(min, max));
}

function maskEmail(email: string) {
  const [namePart, domainPart] = email.split("@");
  if (!namePart || !domainPart || namePart.length < 2) {
    return "***";
  }

  return `${namePart.slice(0, 1)}***${namePart.slice(-1)}@${domainPart}`;
}

async function isAdminTwoFactorRequired() {
  const settings = await prisma.adminSettings.findUnique({
    where: { key: "global" },
    select: { adminTwoFactorRequired: true },
  });

  return settings?.adminTwoFactorRequired ?? true;
}

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

function getDeviceInfo(req: Request) {
  const value = req.headers["user-agent"];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRefreshCookie(req: Request) {
  const value = req.cookies.refreshToken;
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
      deviceInfo: getDeviceInfo(req),
      ipAddress: getIpAddress(req),
      expiresAt: getRefreshExpiryDate(),
    },
  });

  res.cookie("refreshToken", rawRefreshToken, getRefreshTokenCookieOptions());
}

async function createAuthenticatedSession(args: {
  req: Request;
  res: Response;
  user: {
    id: string;
    email: string;
    phone: string;
    role: "USER" | "ADMIN";
    isVerified: boolean;
    createdAt: Date;
  };
}) {
  const accessToken = createAccessToken({
    id: args.user.id,
    role: args.user.role,
  });

  await setRefreshTokenCookieAndPersist(args.req, args.res, args.user.id);

  return {
    accessToken,
    user: sanitizeUser(args.user),
  };
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

  const passwordErrors = validatePassword(parsed.data.password);
  if (passwordErrors.length > 0) {
    fieldErrors.password = passwordErrors;
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

  const session = await createAuthenticatedSession({
    req,
    res,
    user,
  });

  return res.status(201).json({
    accessToken: session.accessToken,
    user: session.user,
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

  const requireAdminMfa =
    user.role === "ADMIN" && (await isAdminTwoFactorRequired());

  if (requireAdminMfa) {
    await prisma.adminLoginChallenge.deleteMany({
      where: {
        userId: user.id,
        OR: [{ consumedAt: { not: null } }, { expiresAt: { lte: new Date() } }],
      },
    });

    const otpCode = generateAdminOtpCode();
    const rawChallengeId = randomBytes(32).toString("hex");
    const challengeHash = hashToken(rawChallengeId, getRefreshTokenSecret());
    const otpHash = hashToken(otpCode, getRefreshTokenSecret());

    await prisma.adminLoginChallenge.create({
      data: {
        userId: user.id,
        challengeHash,
        otpHash,
        expiresAt: new Date(Date.now() + ADMIN_MFA_TTL_MS),
        ipAddress: getIpAddress(req),
        deviceInfo: req.headers["user-agent"] ?? null,
      },
    });

    await sendAdminLoginOtpEmail({
      email: user.email,
      otpCode,
      expiresInMinutes: Math.floor(ADMIN_MFA_TTL_MS / 60000),
    });

    return res.status(202).json({
      mfaRequired: true,
      challengeId: rawChallengeId,
      expiresInSeconds: Math.floor(ADMIN_MFA_TTL_MS / 1000),
      message: "Admin verification code sent to your email.",
      emailHint: maskEmail(user.email),
    });
  }

  const session = await createAuthenticatedSession({
    req,
    res,
    user,
  });

  return res.status(200).json({
    accessToken: session.accessToken,
    user: session.user,
  });
}

export async function verifyAdminMfaLogin(req: Request, res: Response) {
  const parsed = verifyAdminMfaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid verification request." });
  }

  const challengeHash = hashToken(
    parsed.data.challengeId,
    getRefreshTokenSecret(),
  );
  const otpHash = hashToken(parsed.data.otpCode, getRefreshTokenSecret());

  const challenge = await prisma.adminLoginChallenge.findUnique({
    where: { challengeHash },
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

  if (!challenge || !challenge.user || challenge.user.role !== "ADMIN") {
    return res.status(401).json({ message: "Verification challenge invalid." });
  }

  if (challenge.consumedAt || challenge.expiresAt <= new Date()) {
    return res.status(401).json({ message: "Verification challenge expired." });
  }

  if (challenge.attempts >= ADMIN_MFA_MAX_ATTEMPTS) {
    return res.status(429).json({
      message: "Maximum verification attempts exceeded. Log in again.",
    });
  }

  const requestIp = getIpAddress(req);
  const requestDeviceInfo = getDeviceInfo(req);
  const enforceIpBinding = process.env.ADMIN_MFA_ENFORCE_IP === "true";

  if (
    challenge.deviceInfo &&
    requestDeviceInfo &&
    challenge.deviceInfo !== requestDeviceInfo
  ) {
    return res.status(401).json({ message: "Verification challenge invalid." });
  }

  if (
    enforceIpBinding &&
    challenge.ipAddress &&
    requestIp &&
    challenge.ipAddress !== requestIp
  ) {
    return res.status(401).json({ message: "Verification challenge invalid." });
  }

  if (challenge.otpHash !== otpHash) {
    await prisma.adminLoginChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    return res.status(401).json({ message: "Invalid verification code." });
  }

  if (challenge.user.accountStatus === "SUSPENDED") {
    return res
      .status(403)
      .json({ message: "This account has been suspended." });
  }

  await prisma.adminLoginChallenge.update({
    where: { id: challenge.id },
    data: {
      consumedAt: new Date(),
    },
  });

  const session = await createAuthenticatedSession({
    req,
    res,
    user: challenge.user,
  });

  return res.status(200).json({
    accessToken: session.accessToken,
    user: session.user,
  });
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = getRefreshCookie(req);
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

    const requestDeviceInfo = getDeviceInfo(req);
    if (
      tokenRecord.deviceInfo &&
      requestDeviceInfo &&
      tokenRecord.deviceInfo !== requestDeviceInfo
    ) {
      await prisma.refreshToken.deleteMany({
        where: { id: tokenRecord.id },
      });
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
          deviceInfo: getDeviceInfo(req),
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
  const refreshToken = getRefreshCookie(req);

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
