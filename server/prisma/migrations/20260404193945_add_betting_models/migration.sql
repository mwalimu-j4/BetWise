-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BET_STAKE', 'BET_WIN', 'REFUND', 'BONUS');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wallet_id" UUID,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "channel" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "checkout_request_id" TEXT,
    "merchant_request_id" TEXT,
    "phone" TEXT,
    "account_reference" TEXT,
    "description" TEXT,
    "provider_receipt_number" TEXT,
    "provider_response_code" TEXT,
    "provider_response_description" TEXT,
    "provider_callback" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_events" (
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
CREATE TABLE "event_odds" (
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
CREATE TABLE "displayed_odds" (
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
CREATE TABLE "bets" (
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
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_checkout_request_id_key" ON "wallet_transactions"("checkout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_merchant_request_id_key" ON "wallet_transactions"("merchant_request_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_idx" ON "wallet_transactions"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_checkout_request_id_idx" ON "wallet_transactions"("checkout_request_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sport_events_event_id_key" ON "sport_events"("event_id");

-- CreateIndex
CREATE INDEX "sport_events_status_idx" ON "sport_events"("status");

-- CreateIndex
CREATE INDEX "sport_events_commence_time_idx" ON "sport_events"("commence_time");

-- CreateIndex
CREATE INDEX "sport_events_sport_key_idx" ON "sport_events"("sport_key");

-- CreateIndex
CREATE INDEX "sport_events_is_active_idx" ON "sport_events"("is_active");

-- CreateIndex
CREATE INDEX "event_odds_event_id_idx" ON "event_odds"("event_id");

-- CreateIndex
CREATE INDEX "event_odds_bookmaker_id_idx" ON "event_odds"("bookmaker_id");

-- CreateIndex
CREATE INDEX "displayed_odds_event_id_idx" ON "displayed_odds"("event_id");

-- CreateIndex
CREATE INDEX "displayed_odds_is_visible_idx" ON "displayed_odds"("is_visible");

-- CreateIndex
CREATE UNIQUE INDEX "displayed_odds_event_id_bookmaker_id_market_type_side_key" ON "displayed_odds"("event_id", "bookmaker_id", "market_type", "side");

-- CreateIndex
CREATE INDEX "bets_user_id_idx" ON "bets"("user_id");

-- CreateIndex
CREATE INDEX "bets_event_id_idx" ON "bets"("event_id");

-- CreateIndex
CREATE INDEX "bets_status_idx" ON "bets"("status");

-- CreateIndex
CREATE INDEX "bets_placed_at_idx" ON "bets"("placed_at");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_odds" ADD CONSTRAINT "event_odds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "sport_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "displayed_odds" ADD CONSTRAINT "displayed_odds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "sport_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "sport_events"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;
