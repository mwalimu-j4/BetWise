-- CreateTable
CREATE TABLE "custom_events" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'custom',
    "league" TEXT,
    "commence_time" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "home_score" INTEGER,
    "away_score" INTEGER,
    "h2h_odds" JSONB,
    "spreads_odds" JSONB,
    "totals_odds" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_events_event_id_key" ON "custom_events"("event_id");

-- CreateIndex
CREATE INDEX "custom_events_user_id_idx" ON "custom_events"("user_id");

-- CreateIndex
CREATE INDEX "custom_events_status_idx" ON "custom_events"("status");

-- CreateIndex
CREATE INDEX "custom_events_commence_time_idx" ON "custom_events"("commence_time");

-- CreateIndex
CREATE INDEX "custom_events_is_active_idx" ON "custom_events"("is_active");

-- CreateIndex
CREATE INDEX "custom_events_created_at_idx" ON "custom_events"("created_at");
