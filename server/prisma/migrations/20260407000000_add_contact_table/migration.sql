-- Create ContactStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactStatus') THEN
    CREATE TYPE "ContactStatus" AS ENUM ('SUBMITTED', 'READ', 'RESOLVED');
  END IF;
END $$;

-- Create contacts table
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "full_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactStatus" NOT NULL DEFAULT 'SUBMITTED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "contacts_user_id_idx" ON "contacts"("user_id");
CREATE INDEX IF NOT EXISTS "contacts_status_idx" ON "contacts"("status");
CREATE INDEX IF NOT EXISTS "contacts_created_at_idx" ON "contacts"("created_at");
CREATE INDEX IF NOT EXISTS "contacts_phone_idx" ON "contacts"("phone");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='contacts_user_id_fkey'
  ) THEN
    ALTER TABLE "contacts" 
      ADD CONSTRAINT "contacts_user_id_fkey" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
