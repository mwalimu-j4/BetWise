ALTER TABLE "admin_settings"
ADD COLUMN IF NOT EXISTS "payment_paystack_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "paystack_secret_key" TEXT NOT NULL DEFAULT 'sk_test_replace_me',
ADD COLUMN IF NOT EXISTS "paystack_public_key" TEXT NOT NULL DEFAULT 'pk_test_replace_me',
ADD COLUMN IF NOT EXISTS "paystack_webhook_secret" TEXT NOT NULL DEFAULT 'whsec_replace_me',
ADD COLUMN IF NOT EXISTS "paystack_callback_url" TEXT NOT NULL DEFAULT 'https://your-domain.com/api/payments/paystack/callback',
ADD COLUMN IF NOT EXISTS "paystack_webhook_url" TEXT NOT NULL DEFAULT 'https://your-domain.com/api/payments/paystack/webhook',
ADD COLUMN IF NOT EXISTS "admin_withdrawal_sound_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "admin_withdrawal_sound_tone" TEXT NOT NULL DEFAULT '/sounds/universfield-new-notification-010-352755.mp3',
ADD COLUMN IF NOT EXISTS "admin_withdrawal_sound_volume" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN IF NOT EXISTS "updated_by" TEXT;
