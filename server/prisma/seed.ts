import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Seeding admin and user accounts...");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@betwise.local";
    const adminPhone = process.env.ADMIN_PHONE || "+254712345678";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

    const userEmail = process.env.USER_EMAIL || "user@betwise.local";
    const userPhone = process.env.USER_PHONE || "+254701234567";
    const userPassword = process.env.USER_PASSWORD || "User@12345";

    const [adminPasswordHash, userPasswordHash] = await Promise.all([
      bcrypt.hash(adminPassword, 12),
      bcrypt.hash(userPassword, 12),
    ]);

    const [admin, user] = await Promise.all([
      prisma.user.upsert({
        where: { phone: adminPhone },
        update: {
          email: adminEmail,
          passwordHash: adminPasswordHash,
          role: "ADMIN",
          isVerified: true,
        },
        create: {
          email: adminEmail,
          phone: adminPhone,
          passwordHash: adminPasswordHash,
          role: "ADMIN",
          isVerified: true,
        },
      }),
      prisma.user.upsert({
        where: { phone: userPhone },
        update: {
          email: userEmail,
          passwordHash: userPasswordHash,
          role: "USER",
          isVerified: true,
        },
        create: {
          email: userEmail,
          phone: userPhone,
          passwordHash: userPasswordHash,
          role: "USER",
          isVerified: true,
        },
      }),
    ]);

    console.log("Seed complete.");
    console.log(`ADMIN: ${admin.phone} / ${adminPassword}`);
    console.log(`USER:  ${user.phone} / ${userPassword}`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
