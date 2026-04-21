/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const SPORT_CATEGORIES = [
  { sportKey: "soccer", displayName: "Football", icon: "⚽", apiSportId: "soccer", sortOrder: 1 },
  { sportKey: "basketball", displayName: "Basketball", icon: "🏀", apiSportId: "basketball", sortOrder: 2 },
  { sportKey: "tennis", displayName: "Tennis", icon: "🎾", apiSportId: "tennis", sortOrder: 3 },
  { sportKey: "americanfootball", displayName: "American Football", icon: "🏈", apiSportId: "americanfootball", sortOrder: 4 },
  { sportKey: "cricket", displayName: "Cricket", icon: "🏏", apiSportId: "cricket", sortOrder: 5 },
  { sportKey: "icehockey", displayName: "Ice Hockey", icon: "🏒", apiSportId: "icehockey", sortOrder: 6 },
  { sportKey: "rugbyunion", displayName: "Rugby Union", icon: "🏉", apiSportId: "rugbyleague", sortOrder: 7 },
  { sportKey: "boxing_mma", displayName: "Boxing / MMA", icon: "🥊", apiSportId: "mma", sortOrder: 8 },
  { sportKey: "baseball", displayName: "Baseball", icon: "⚾", apiSportId: "baseball", sortOrder: 9 },
  { sportKey: "volleyball", displayName: "Volleyball", icon: "🏐", apiSportId: "volleyball", sortOrder: 10 },
  { sportKey: "tabletennis", displayName: "Table Tennis", icon: "🏓", apiSportId: "tabletennis", sortOrder: 11 },
  { sportKey: "golf", displayName: "Golf", icon: "⛳", apiSportId: "golf", sortOrder: 12 },
  { sportKey: "snooker", displayName: "Snooker", icon: "🎱", apiSportId: "snooker", sortOrder: 13 },
  { sportKey: "darts", displayName: "Darts", icon: "🎯", apiSportId: "darts", sortOrder: 14 },
];

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

async function upsertSeedAdmin(args: {
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
      `Seed conflict: admin email ${args.email} and phone ${args.phone} belong to different users.`,
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
        role: "ADMIN",
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
      role: "ADMIN",
      mustChangePassword: false,
      isVerified: true,
    },
  });
}

async function seedSportCategories() {
  for (const category of SPORT_CATEGORIES) {
    await prisma.sportCategory.upsert({
      where: { sportKey: category.sportKey },
      update: {
        displayName: category.displayName,
        icon: category.icon,
        apiSportId: category.apiSportId,
        sortOrder: category.sortOrder,
        showInNav: true,
      },
      create: {
        sportKey: category.sportKey,
        displayName: category.displayName,
        icon: category.icon,
        apiSportId: category.apiSportId,
        sortOrder: category.sortOrder,
        isActive: false,
        showInNav: true,
        eventCount: 0,
      },
    });
  }
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

    const adminEmail = process.env.ADMIN_EMAIL || "admin@betwise.local";
    const adminPhone = process.env.ADMIN_PHONE || "+254700000001";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@Betixpro123!";
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const user = await upsertSeedUser({
      email: userEmail,
      phone: userPhone,
      passwordHash: userPasswordHash,
    });

    const admin = await upsertSeedAdmin({
      email: adminEmail,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
    });

    await seedSportCategories();

    console.log("Seed complete.");

    console.log(`USER:  ${user.phone} / ${userPassword}`);
    console.log(`ADMIN: ${admin.phone} / ${adminPassword}`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
