-- CreateEnum
CREATE TYPE "RiskAlertType" AS ENUM ('HIGH_RISK_BET', 'EXPOSURE_LIMIT_EXCEEDED', 'SUSPICIOUS_PATTERN', 'RAPID_ACCOUNT_ACTIVITY', 'UNUSUAL_ODDS_MOVEMENT', 'SELF_EXCLUSION_BREACH', 'DUPLICATE_ACCOUNT', 'FRAUD_INDICATOR', 'BLACKLIST_MATCH', 'CUSTOM_RULE_VIOLATION');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "risk_alerts" (
    "id" UUID NOT NULL,
    "alertType" "RiskAlertType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "user_id" UUID,
    "bet_id" UUID,
    "event_id" TEXT,
    "triggered_value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "details" JSONB,
    "action_taken" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_alerts_user_id_idx" ON "risk_alerts"("user_id");

-- CreateIndex
CREATE INDEX "risk_alerts_alertType_idx" ON "risk_alerts"("alertType");

-- CreateIndex
CREATE INDEX "risk_alerts_severity_idx" ON "risk_alerts"("severity");

-- CreateIndex
CREATE INDEX "risk_alerts_status_idx" ON "risk_alerts"("status");

-- CreateIndex
CREATE INDEX "risk_alerts_created_at_idx" ON "risk_alerts"("created_at");

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
