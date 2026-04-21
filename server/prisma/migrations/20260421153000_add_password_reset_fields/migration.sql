ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "reset_token" TEXT,
ADD COLUMN IF NOT EXISTS "reset_token_expiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reset_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "reset_last_attempt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_reset_token_key" ON "users"("reset_token");

DROP TABLE IF EXISTS "password_reset_tokens";
