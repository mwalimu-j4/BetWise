ALTER TABLE "admin_settings"
ADD COLUMN "admin_withdrawal_sound_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "admin_withdrawal_sound_tone" TEXT NOT NULL DEFAULT '/sounds/universfield-new-notification-010-352755.mp3',
ADD COLUMN "admin_withdrawal_sound_volume" INTEGER NOT NULL DEFAULT 80;
