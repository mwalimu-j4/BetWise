import type { Prisma, PrismaClient, Wallet } from "@prisma/client";
import { prisma } from "./prisma";

type WalletDbClient = PrismaClient | Prisma.TransactionClient;

export async function getOrCreateWallet(
  userId: string,
  db: WalletDbClient = prisma,
): Promise<Wallet> {
  const existingWallet = await db.wallet.findUnique({ where: { userId } });
  if (existingWallet) {
    return existingWallet;
  }

  return db.wallet.create({
    data: {
      userId,
    },
  });
}
