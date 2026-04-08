-- CreateTable
CREATE TABLE "admin_login_challenges" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "challenge_hash" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "ip_address" TEXT,
  "device_info" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_login_challenges_challenge_hash_key"
ON "admin_login_challenges"("challenge_hash");

-- CreateIndex
CREATE INDEX "admin_login_challenges_user_id_idx"
ON "admin_login_challenges"("user_id");

-- CreateIndex
CREATE INDEX "admin_login_challenges_expires_at_idx"
ON "admin_login_challenges"("expires_at");

-- AddForeignKey
ALTER TABLE "admin_login_challenges"
ADD CONSTRAINT "admin_login_challenges_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
