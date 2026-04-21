ALTER TABLE "sport_events"
ADD COLUMN "external_event_id" TEXT,
ADD COLUMN "odds_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookmaker_key" TEXT,
ADD COLUMN "bookmaker_margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "auto_configured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "synced_at" TIMESTAMP(3),
ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "sport_events_external_event_id_key"
ON "sport_events"("external_event_id");

CREATE INDEX "sport_events_synced_at_idx" ON "sport_events"("synced_at");
CREATE INDEX "sport_events_bookmaker_margin_idx" ON "sport_events"("bookmaker_margin");

UPDATE "sport_events"
SET "external_event_id" = "event_id"
WHERE "external_event_id" IS NULL;

CREATE TABLE "odds_api_call_logs" (
  "id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "sport_key" TEXT,
  "request_type" TEXT NOT NULL,
  "response_status" INTEGER NOT NULL,
  "credits_used" INTEGER,
  "credits_remaining" INTEGER,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odds_api_call_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "odds_api_call_logs_sport_key_idx" ON "odds_api_call_logs"("sport_key");
CREATE INDEX "odds_api_call_logs_request_type_idx" ON "odds_api_call_logs"("request_type");
CREATE INDEX "odds_api_call_logs_response_status_idx" ON "odds_api_call_logs"("response_status");
CREATE INDEX "odds_api_call_logs_created_at_idx" ON "odds_api_call_logs"("created_at");

CREATE TABLE "admin_alerts" (
  "id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "sport_key" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_alerts_severity_idx" ON "admin_alerts"("severity");
CREATE INDEX "admin_alerts_is_read_idx" ON "admin_alerts"("is_read");
CREATE INDEX "admin_alerts_created_at_idx" ON "admin_alerts"("created_at");

CREATE TABLE "api_sync_logs" (
  "id" UUID NOT NULL,
  "job_name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sports_processed" INTEGER NOT NULL DEFAULT 0,
  "events_loaded" INTEGER NOT NULL DEFAULT 0,
  "credits_used" INTEGER,
  "credits_remaining" INTEGER,
  "error_message" TEXT,
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "api_sync_logs_job_name_idx" ON "api_sync_logs"("job_name");
CREATE INDEX "api_sync_logs_created_at_idx" ON "api_sync_logs"("created_at");
