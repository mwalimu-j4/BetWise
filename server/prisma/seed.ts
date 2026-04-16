/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function upsertSeedUser(args: {
  email: string;
  phone: string;
  passwordHash: string;
}) {
  const byEmail = await prisma.user.findUnique({
    where: { email: args.email },
    select: { id: true },
  });

  const byPhone = await prisma.user.findUnique({
    where: { phone: args.phone },
    select: { id: true },
  });

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    throw new Error(
      `Seed conflict: email ${args.email} and phone ${args.phone} belong to different users.`,
    );
  }

  const existingUserId = byEmail?.id ?? byPhone?.id;

  if (existingUserId) {
    return prisma.user.update({
      where: { id: existingUserId },
      data: {
        email: args.email,
        phone: args.phone,
        passwordHash: args.passwordHash,
        role: "USER",
        mustChangePassword: false,
        isVerified: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: args.email,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: "USER",
      mustChangePassword: false,
      isVerified: true,
    },
  });
}

async function main() {
  try {
    console.log("Seeding demo user account...");

    const isProduction = process.env.NODE_ENV === "production";

    // Never use seed files for privileged account creation in production.
    if (isProduction) {
      console.log("Skipping seed in production.");
      return;
    }

    const createStrongDevPassword = () => {
      const randomSegment = randomBytes(12).toString("base64url");
      return `Seed@${randomSegment}9!`;
    };

    const userEmail = process.env.USER_EMAIL || "user@betwise.local";
    const userPhone = process.env.USER_PHONE || "+254701234567";
    const userPassword = process.env.USER_PASSWORD || createStrongDevPassword();

    const userPasswordHash = await bcrypt.hash(userPassword, 12);

    const user = await upsertSeedUser({
      email: userEmail,
      phone: userPhone,
      passwordHash: userPasswordHash,
    });

    console.log("Seed complete.");

    console.log(`USER:  ${user.phone} / ${userPassword}`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
