CREATE TABLE "sport_categories" (
  "id" UUID NOT NULL,
  "sport_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT '🎯',
  "api_sport_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "show_in_nav" BOOLEAN NOT NULL DEFAULT true,
  "event_count" INTEGER NOT NULL DEFAULT 0,
  "last_synced_at" TIMESTAMP(3),
  "configured_by" UUID,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sport_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sport_categories_sport_key_key" ON "sport_categories"("sport_key");
CREATE INDEX "sport_categories_is_active_idx" ON "sport_categories"("is_active");
CREATE INDEX "sport_categories_sort_order_idx" ON "sport_categories"("sort_order");

CREATE TABLE "category_config_logs" (
  "id" UUID NOT NULL,
  "sport_key" TEXT NOT NULL,
  "admin_id" UUID NOT NULL,
  "events_configured" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "category_config_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "category_config_logs_sport_key_fkey" FOREIGN KEY ("sport_key") REFERENCES "sport_categories"("sport_key") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "category_config_logs_sport_key_idx" ON "category_config_logs"("sport_key");
CREATE INDEX "category_config_logs_admin_id_idx" ON "category_config_logs"("admin_id");
CREATE INDEX "category_config_logs_created_at_idx" ON "category_config_logs"("created_at");
