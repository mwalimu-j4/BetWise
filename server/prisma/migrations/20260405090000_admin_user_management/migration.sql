DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus') THEN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "full_name" TEXT,
  ADD COLUMN IF NOT EXISTS "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP(3);
