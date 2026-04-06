CREATE TABLE "admin_settings" (
  "key" TEXT NOT NULL DEFAULT 'global',
  "config" JSONB NOT NULL,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key")
);
