-- Рассылки: добавляем канал (email|telegram) и опциональную картинку для
-- telegram-пушей об оффлайн-мероприятиях. Zero-downtime, идемпотентно.
-- Существующие рассылки останутся email (DEFAULT).

ALTER TABLE "BroadcastJob" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "BroadcastJob" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
