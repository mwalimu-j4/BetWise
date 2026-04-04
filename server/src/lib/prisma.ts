import { PrismaClient } from "@prisma/client";
import type { PrismaClient as PrismaClientType } from "@prisma/client";

declare global {
  var prisma: PrismaClientType | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
