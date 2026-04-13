/*
  Warnings:

  - You are about to drop the column `auto_verification_rule` on the `admin_settings` table. All the data in the column will be lost.
  - You are about to drop the column `default_wallet_balance` on the `admin_settings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_airtel_money_enabled` on the `admin_settings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_card_enabled` on the `admin_settings` table. All the data in the column will be lost.

*/
-- DropForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contacts'
  ) THEN
    ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "contacts_user_id_fkey";
  END IF;
END $$;

-- AlterTable
ALTER TABLE "admin_settings" DROP COLUMN "auto_verification_rule",
DROP COLUMN "default_wallet_balance",
DROP COLUMN "payment_airtel_money_enabled",
DROP COLUMN "payment_card_enabled";

-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contacts'
  ) THEN
    ALTER TABLE "contacts" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "newsletter_subscriptions" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscriptions_email_idx" ON "newsletter_subscriptions"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscriptions_is_active_idx" ON "newsletter_subscriptions"("is_active");

-- CreateIndex
CREATE INDEX "newsletter_subscriptions_subscribed_at_idx" ON "newsletter_subscriptions"("subscribed_at");

-- CreateIndex
CREATE INDEX "bets_user_id_status_idx" ON "bets"("user_id", "status");

-- CreateIndex
CREATE INDEX "bets_event_id_status_idx" ON "bets"("event_id", "status");

-- CreateIndex
CREATE INDEX "bets_placed_at_status_idx" ON "bets"("placed_at", "status");

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contacts'
  ) THEN
    ALTER TABLE "contacts"
      ADD CONSTRAINT "contacts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
