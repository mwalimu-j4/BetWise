import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
    try {
        console.log("🌱 Starting database seed...\n");
        // Admin user details
        const adminEmail = process.env.ADMIN_EMAIL || "admin@betwise.com";
        const adminPhone = process.env.ADMIN_PHONE || "+254712345678";
        const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail },
        });
        if (existingAdmin) {
            console.log(`✅ Admin user already exists: ${adminEmail}`);
            if (existingAdmin.role === "ADMIN") {
                console.log(`   Role: ${existingAdmin.role}`);
                console.log(`   Verified: ${existingAdmin.isVerified}`);
            }
            return;
        }
        // Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
        // Create admin user
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                phone: adminPhone,
                passwordHash,
                role: "ADMIN",
                isVerified: true,
            },
        });
        console.log("✅ Admin user created successfully!\n");
        console.log("Admin Account Details:");
        console.log("─".repeat(40));
        console.log(`ID:        ${admin.id}`);
        console.log(`Email:     ${admin.email}`);
        console.log(`Phone:     ${admin.phone}`);
        console.log(`Role:      ${admin.role}`);
        console.log(`Verified:  ${admin.isVerified}`);
        console.log(`Created:   ${admin.createdAt.toISOString()}`);
        console.log("─".repeat(40));
        console.log("\n💡 Login Credentials:");
        console.log(`   Email:    ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    }
    catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
