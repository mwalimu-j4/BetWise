import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const clientOrigin = process.env.CLIENT_URL;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

if (!clientOrigin) {
  throw new Error("CLIENT_URL is required.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: betterAuthSecret,
  trustedOrigins: [clientOrigin],
  emailAndPassword: {
    enabled: true,
  },
});
