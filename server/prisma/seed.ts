import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const seedAccounts = [
  {
    role: "ADMIN" as const,
    email: "admin@betwise.local",
    phone: "+254712345678",
    password: "Admin@12345",
    isVerified: true,
  },
  {
    role: "USER" as const,
    email: "user@betwise.local",
    phone: "+254701234567",
    password: "User@12345",
    isVerified: true,
  },
];

async function runSeed() {
  for (const account of seedAccounts) {
    const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);

    await prisma.user.upsert({
      where: {
        phone: account.phone,
      },
      create: {
        email: account.email,
        phone: account.phone,
        passwordHash,
        role: account.role,
        isVerified: account.isVerified,
      },
      update: {
        email: account.email,
        passwordHash,
        role: account.role,
        isVerified: account.isVerified,
      },
    });
  }

  const users = await prisma.user.findMany({
    where: {
      phone: {
        in: seedAccounts.map((account) => account.phone),
      },
    },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
    },
    orderBy: {
      role: "asc",
    },
  });

  console.log("Seed complete. Accounts ready:");
  for (const user of users) {
    console.log(
      `${user.role} | ${user.phone} | ${user.email} | verified=${user.isVerified}`,
    );
  }
}

runSeed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
