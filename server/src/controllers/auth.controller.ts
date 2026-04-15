import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { verifySync } from "otplib";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  decryptAdminTotpSecret,
  encryptAdminTotpSecret,
} from "../utils/adminTotpSecretCrypto";
import { sendPasswordResetEmail } from "../utils/emailUtils";
import {
  getAccessTokenSecret,
  createAccessToken,
  createBanAppealToken,
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
const ADMIN_MFA_TTL_MS = 10 * 60 * 1000;
const ADMIN_MFA_TOKEN_ISSUER = "betixpro-admin-mfa";
const ADMIN_MFA_TOKEN_AUDIENCE = "betixpro-admin";

type AdminMfaTokenPayload = {
  sub: string;
  role: "ADMIN";
  purpose: "totp_setup" | "totp_verify";
  secret?: string;
};

function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

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
  mfaToken: z.string().trim().min(1),
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

async function isAdminTwoFactorRequired() {
  const settings = await prisma.adminSettings.findUnique({
    where: { key: "global" },
    select: { adminTwoFactorRequired: true },
  });

  return settings?.adminTwoFactorRequired ?? true;
}

function getAdminMfaFailureResponse(error: unknown) {
  if (isPrismaKnownRequestError(error) && error.code === "P2021") {
    return {
      status: 503,
      message:
        "Admin login verification is temporarily unavailable. Please contact support.",
    };
  }

  if (error instanceof Error) {
    const maybeMailError = error as Error & {
      code?: string;
      responseCode?: number;
    };

    if (
      maybeMailError.code === "EAUTH" ||
      maybeMailError.responseCode === 535
    ) {
      return {
        status: 503,
        message:
          "Admin login verification is temporarily unavailable. Please contact support.",
      };
    }

    if (
      error.message.includes("EMAIL_HOST is required") ||
      error.message.includes("EMAIL_PORT is required") ||
      error.message.includes("EMAIL_USER is required") ||
      error.message.includes("EMAIL_PASS is required")
    ) {
      return {
        status: 503,
        message:
          "Admin login verification is temporarily unavailable. Please contact support.",
      };
    }

    if (error.message.toLowerCase().includes("admin_login_challenges")) {
      return {
        status: 503,
        message:
          "Admin login verification is temporarily unavailable. Please contact support.",
      };
    }
  }

  return {
    status: 500,
    message: "Internal server error",
  };
}

function createAdminMfaToken(payload: AdminMfaTokenPayload) {
  return jwt.sign(payload, getAccessTokenSecret(), {
    algorithm: "HS256",
    issuer: ADMIN_MFA_TOKEN_ISSUER,
    audience: ADMIN_MFA_TOKEN_AUDIENCE,
    expiresIn: Math.floor(ADMIN_MFA_TTL_MS / 1000),
  });
}

function verifyAdminMfaToken(token: string) {
  const decoded = jwt.verify(token, getAccessTokenSecret(), {
    algorithms: ["HS256"],
    issuer: ADMIN_MFA_TOKEN_ISSUER,
    audience: ADMIN_MFA_TOKEN_AUDIENCE,
  });

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid admin MFA token.");
  }

  const sub = "sub" in decoded ? decoded.sub : undefined;
  const role = "role" in decoded ? decoded.role : undefined;
  const purpose = "purpose" in decoded ? decoded.purpose : undefined;
  const secret = "secret" in decoded ? decoded.secret : undefined;

  if (
    typeof sub !== "string" ||
    role !== "ADMIN" ||
    (purpose !== "totp_setup" && purpose !== "totp_verify")
  ) {
    throw new Error("Invalid admin MFA token payload.");
  }

  return {
    sub,
    role,
    purpose,
    secret: typeof secret === "string" ? secret : undefined,
  } as AdminMfaTokenPayload;
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
  bannedAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    bannedAt: user.bannedAt?.toISOString() ?? null,
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
      bannedAt: true,
      banReason: true,
      adminTotpEnabled: true,
      adminTotpSecret: true,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.bannedAt) {
    const appealToken = createBanAppealToken({
      userId: user.id,
      reason: user.banReason || "No reason provided",
      bannedAt: user.bannedAt.toISOString(),
    });

    return res.status(403).json({
      message: "Your account has been banned and is no longer active.",
      isBanned: true,
      banReason: user.banReason || "No reason provided",
      bannedAt: user.bannedAt?.toISOString(),
      appealToken,
    });
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
    user.role === "ADMIN" &&
    (await isAdminTwoFactorRequired()) &&
    user.adminTotpEnabled &&
    Boolean(user.adminTotpSecret);

  if (requireAdminMfa) {
    try {
      const mfaToken = createAdminMfaToken({
        sub: user.id,
        role: "ADMIN",
        purpose: "totp_verify",
      });

      return res.status(202).json({
        mfaRequired: true,
        mfaMode: "totp_verify",
        mfaToken,
        expiresInSeconds: Math.floor(ADMIN_MFA_TTL_MS / 1000),
        message:
          "Enter the verification code from Microsoft Authenticator to continue.",
      });
    } catch (error) {
      console.error("Admin MFA login setup failed:", error);
      const failure = getAdminMfaFailureResponse(error);
      return res.status(failure.status).json({ message: failure.message });
    }
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

  let tokenPayload: AdminMfaTokenPayload;
  try {
    tokenPayload = verifyAdminMfaToken(parsed.data.mfaToken);
  } catch {
    return res.status(401).json({ message: "Verification challenge invalid." });
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.sub },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      accountStatus: true,
      adminTotpEnabled: true,
      adminTotpSecret: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return res.status(401).json({ message: "Verification challenge invalid." });
  }

  if (user.accountStatus === "SUSPENDED") {
    return res
      .status(403)
      .json({ message: "This account has been suspended." });
  }

  if (tokenPayload.purpose === "totp_setup") {
    if (!tokenPayload.secret) {
      return res.status(400).json({ message: "Invalid verification request." });
    }

    const result = verifySync({
      token: parsed.data.otpCode,
      secret: tokenPayload.secret,
    });

    if (!result.valid) {
      return res.status(401).json({ message: "Invalid verification code." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        adminTotpEnabled: true,
        adminTotpSecret: encryptAdminTotpSecret(tokenPayload.secret),
      },
    });
  } else {
    if (!user.adminTotpEnabled || !user.adminTotpSecret) {
      return res.status(400).json({
        message:
          "Authenticator is not configured for this account. Log in again to set up.",
      });
    }

    const decryptedSecret = decryptAdminTotpSecret(user.adminTotpSecret);

    const result = verifySync({
      token: parsed.data.otpCode,
      secret: decryptedSecret.secret,
    });

    if (!result.valid) {
      return res.status(401).json({ message: "Invalid verification code." });
    }

    if (decryptedSecret.isLegacyPlaintext) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          adminTotpSecret: encryptAdminTotpSecret(decryptedSecret.secret),
        },
      });
    }
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
    const requestIpAddress = getIpAddress(req);
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

    if (
      tokenRecord.ipAddress &&
      requestIpAddress &&
      tokenRecord.ipAddress !== requestIpAddress
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
          ipAddress: requestIpAddress,
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
      bannedAt: true,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.status(200).json({ user: sanitizeUser(user) });
}
