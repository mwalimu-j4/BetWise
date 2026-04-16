-- CreateIndex
CREATE INDEX IF NOT EXISTS "custom_events_status_start_time_idx" ON "custom_events"("status", "start_time");
