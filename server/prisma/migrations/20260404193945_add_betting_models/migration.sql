-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventStatus') THEN
        CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED', 'CANCELLED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BetStatus') THEN
        CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "sport_events" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "league_id" TEXT,
    "league_name" TEXT,
    "sport_key" TEXT,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "commence_time" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "home_score" INTEGER,
    "away_score" INTEGER,
    "raw_data" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "house_margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markets_enabled" TEXT[] DEFAULT ARRAY['h2h']::TEXT[],
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "event_odds" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "bookmaker_id" TEXT NOT NULL,
    "bookmaker_name" TEXT NOT NULL,
    "market_type" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "decimal_odds" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "displayed_odds" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "bookmaker_id" TEXT NOT NULL,
    "bookmaker_name" TEXT NOT NULL,
    "market_type" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "raw_odds" DOUBLE PRECISION NOT NULL,
    "display_odds" DOUBLE PRECISION NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "displayed_odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "bookmaker_id" TEXT,
    "market_type" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "display_odds" DOUBLE PRECISION NOT NULL,
    "potential_payout" DOUBLE PRECISION NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sport_events_event_id_key" ON "sport_events"("event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sport_events_status_idx" ON "sport_events"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sport_events_commence_time_idx" ON "sport_events"("commence_time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sport_events_sport_key_idx" ON "sport_events"("sport_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sport_events_is_active_idx" ON "sport_events"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_odds_event_id_idx" ON "event_odds"("event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_odds_bookmaker_id_idx" ON "event_odds"("bookmaker_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "displayed_odds_event_id_idx" ON "displayed_odds"("event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "displayed_odds_is_visible_idx" ON "displayed_odds"("is_visible");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "displayed_odds_event_id_bookmaker_id_market_type_side_key" ON "displayed_odds"("event_id", "bookmaker_id", "market_type", "side");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bets_user_id_idx" ON "bets"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bets_event_id_idx" ON "bets"("event_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bets_status_idx" ON "bets"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bets_placed_at_idx" ON "bets"("placed_at");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_odds_event_id_fkey') THEN
        ALTER TABLE "event_odds"
            ADD CONSTRAINT "event_odds_event_id_fkey"
            FOREIGN KEY ("event_id") REFERENCES "sport_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'displayed_odds_event_id_fkey') THEN
        ALTER TABLE "displayed_odds"
            ADD CONSTRAINT "displayed_odds_event_id_fkey"
            FOREIGN KEY ("event_id") REFERENCES "sport_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bets_user_id_fkey') THEN
        ALTER TABLE "bets"
            ADD CONSTRAINT "bets_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bets_event_id_fkey') THEN
        ALTER TABLE "bets"
            ADD CONSTRAINT "bets_event_id_fkey"
            FOREIGN KEY ("event_id") REFERENCES "sport_events"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
