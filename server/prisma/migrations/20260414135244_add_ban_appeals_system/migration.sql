-- CreateEnum
CREATE TYPE "BanAppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_user_id_fkey";

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ban_reason" TEXT;

-- CreateTable
CREATE TABLE "ban_appeals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "appeal_text" TEXT NOT NULL,
    "status" "BanAppealStatus" NOT NULL DEFAULT 'PENDING',
    "response_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "ban_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ban_appeals_user_id_idx" ON "ban_appeals"("user_id");

-- CreateIndex
CREATE INDEX "ban_appeals_status_idx" ON "ban_appeals"("status");

-- CreateIndex
CREATE INDEX "ban_appeals_created_at_idx" ON "ban_appeals"("created_at");

-- AddForeignKey
ALTER TABLE "ban_appeals" ADD CONSTRAINT "ban_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
