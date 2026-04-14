ALTER TABLE "users"
ADD COLUMN "admin_totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "admin_totp_secret" TEXT;
