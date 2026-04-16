import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const PASSWORD_SALT_ROUNDS = 12;
const KENYAN_PHONE_REGEX = /^(\+?254|0)(7|1)\d{8}$/;

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

function getRequiredAdminEnv(name: "ADMIN_EMAIL" | "ADMIN_PHONE" | "ADMIN_PASSWORD") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to initialize the production admin account.`);
  }

  return value;
}

function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

export async function initializeProductionAdmin() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (existingAdmin) {
    return;
  }

  const adminEmail = getRequiredAdminEnv("ADMIN_EMAIL").toLowerCase();
  const rawAdminPhone = getRequiredAdminEnv("ADMIN_PHONE");
  const adminPassword = getRequiredAdminEnv("ADMIN_PASSWORD");

  const normalizedPhone = normalizeKenyanPhone(rawAdminPhone);
  if (!normalizedPhone) {
    throw new Error(
      "ADMIN_PHONE must use a Kenyan format like +2547XXXXXXXX or +2541XXXXXXXX.",
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, PASSWORD_SALT_ROUNDS);

  try {
    await prisma.user.create({
      data: {
        email: adminEmail,
        phone: normalizedPhone,
        passwordHash,
        role: "ADMIN",
        mustChangePassword: true,
        isVerified: true,
      },
    });

    console.log("Initial production admin account created.");
  } catch (error) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      throw new Error(
        "Failed to initialize production admin: ADMIN_EMAIL or ADMIN_PHONE conflicts with an existing user.",
      );
    }

    throw error;
  }
}
