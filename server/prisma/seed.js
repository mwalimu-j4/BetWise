import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function upsertSeedUser(args) {
    const byEmail = await prisma.user.findUnique({
        where: { email: args.email },
        select: { id: true },
    });
    const byPhone = await prisma.user.findUnique({
        where: { phone: args.phone },
        select: { id: true },
    });
    if (byEmail && byPhone && byEmail.id !== byPhone.id) {
        throw new Error(`Seed conflict: email ${args.email} and phone ${args.phone} belong to different users.`);
    }
    const existingUserId = byEmail?.id ?? byPhone?.id;
    if (existingUserId) {
        return prisma.user.update({
            where: { id: existingUserId },
            data: {
                email: args.email,
                phone: args.phone,
                passwordHash: args.passwordHash,
                role: args.role,
                isVerified: true,
            },
        });
    }
    return prisma.user.create({
        data: {
            email: args.email,
            phone: args.phone,
            passwordHash: args.passwordHash,
            role: args.role,
            isVerified: true,
        },
    });
}
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
            upsertSeedUser({
                email: adminEmail,
                phone: adminPhone,
                passwordHash: adminPasswordHash,
                role: "ADMIN",
            }),
            upsertSeedUser({
                email: userEmail,
                phone: userPhone,
                passwordHash: userPasswordHash,
                role: "USER",
            }),
        ]);
        console.log("Seed complete.");
        console.log(`ADMIN: ${admin.phone} / ${adminPassword}`);
        console.log(`USER:  ${user.phone} / ${userPassword}`);
    }
    catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
