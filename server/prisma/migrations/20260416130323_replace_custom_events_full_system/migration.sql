/*
  Warnings:

  - You are about to drop the column `away_score` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `away_team` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `commence_time` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `event_id` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `h2h_odds` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `home_score` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `home_team` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `sport` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `spreads_odds` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `totals_odds` on the `custom_events` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `custom_events` table. All the data in the column will be lost.
  - The `status` column on the `custom_events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `created_by` to the `custom_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `custom_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team_away` to the `custom_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team_home` to the `custom_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `custom_events` table without a default value. This is not possible if the table is not empty.
  - Made the column `league` on table `custom_events` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CustomEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'LIVE', 'SUSPENDED', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomMarketStatus" AS ENUM ('OPEN', 'SUSPENDED', 'CLOSED', 'SETTLED');

-- CreateEnum
CREATE TYPE "CustomSelectionResult" AS ENUM ('PENDING', 'WIN', 'LOSE', 'VOID');

-- CreateEnum
CREATE TYPE "CustomBetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID', 'CANCELLED');

-- DropIndex
DROP INDEX "custom_events_commence_time_idx";

-- DropIndex
DROP INDEX "custom_events_event_id_key";

-- DropIndex
DROP INDEX "custom_events_is_active_idx";

-- DropIndex
DROP INDEX "custom_events_user_id_idx";

-- AlterTable
ALTER TABLE "custom_events" DROP COLUMN "away_score",
DROP COLUMN "away_team",
DROP COLUMN "commence_time",
DROP COLUMN "event_id",
DROP COLUMN "h2h_odds",
DROP COLUMN "home_score",
DROP COLUMN "home_team",
DROP COLUMN "is_active",
DROP COLUMN "sport",
DROP COLUMN "spreads_odds",
DROP COLUMN "totals_odds",
DROP COLUMN "user_id",
ADD COLUMN     "banner_url" TEXT,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Football',
ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "end_time" TIMESTAMP(3),
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "team_away" TEXT NOT NULL,
ADD COLUMN     "team_home" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "league" SET NOT NULL,
ALTER COLUMN "league" SET DEFAULT 'Custom League',
DROP COLUMN "status",
ADD COLUMN     "status" "CustomEventStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "custom_markets" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CustomMarketStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_selections" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "result" "CustomSelectionResult" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "selection_id" UUID NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "potential_win" DOUBLE PRECISION NOT NULL,
    "status" "CustomBetStatus" NOT NULL DEFAULT 'PENDING',
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "custom_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_event_audit_logs" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_event_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_markets_event_id_idx" ON "custom_markets"("event_id");

-- CreateIndex
CREATE INDEX "custom_markets_status_idx" ON "custom_markets"("status");

-- CreateIndex
CREATE INDEX "custom_selections_market_id_idx" ON "custom_selections"("market_id");

-- CreateIndex
CREATE INDEX "custom_bets_user_id_idx" ON "custom_bets"("user_id");

-- CreateIndex
CREATE INDEX "custom_bets_event_id_idx" ON "custom_bets"("event_id");

-- CreateIndex
CREATE INDEX "custom_bets_selection_id_idx" ON "custom_bets"("selection_id");

-- CreateIndex
CREATE INDEX "custom_bets_status_idx" ON "custom_bets"("status");

-- CreateIndex
CREATE INDEX "custom_bets_placed_at_idx" ON "custom_bets"("placed_at");

-- CreateIndex
CREATE INDEX "custom_event_audit_logs_event_id_idx" ON "custom_event_audit_logs"("event_id");

-- CreateIndex
CREATE INDEX "custom_event_audit_logs_admin_id_idx" ON "custom_event_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "custom_event_audit_logs_created_at_idx" ON "custom_event_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "custom_events_status_idx" ON "custom_events"("status");

-- CreateIndex
CREATE INDEX "custom_events_start_time_idx" ON "custom_events"("start_time");

-- CreateIndex
CREATE INDEX "custom_events_created_by_idx" ON "custom_events"("created_by");

-- AddForeignKey
ALTER TABLE "custom_markets" ADD CONSTRAINT "custom_markets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "custom_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_selections" ADD CONSTRAINT "custom_selections_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "custom_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_bets" ADD CONSTRAINT "custom_bets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "custom_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_bets" ADD CONSTRAINT "custom_bets_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "custom_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_event_audit_logs" ADD CONSTRAINT "custom_event_audit_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "custom_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
