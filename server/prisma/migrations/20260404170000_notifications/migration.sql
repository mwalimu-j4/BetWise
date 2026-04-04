DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationAudience') THEN
    CREATE TYPE "NotificationAudience" AS ENUM ('USER', 'ADMIN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('DEPOSIT_SUCCESS', 'DEPOSIT_FAILED', 'SYSTEM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "audience" "NotificationAudience" NOT NULL DEFAULT 'USER',
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "transaction_id" UUID,
  "amount" INTEGER,
  "balance" INTEGER,
  "mpesa_code" TEXT,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_audience_is_read_idx" ON "notifications"("audience", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "notifications_transaction_id_idx" ON "notifications"("transaction_id");
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_user_id_transaction_id_type_audience_key"
  ON "notifications"("user_id", "transaction_id", "type", "audience");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
