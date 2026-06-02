-- Push-уведомления (Telegram). См. docs/30-tg-relay-2026-06-01.md
-- и обсуждение фраз 2026-06-02 в чате. Zero-downtime, идемпотентно.

-- 1. Настройки пушей юзера (1:1 с User). Default — пуши вкл.
CREATE TABLE IF NOT EXISTS "NotifyPrefs" (
  "userId"        INTEGER PRIMARY KEY,
  "enabled"       BOOLEAN NOT NULL DEFAULT true,
  "timezone"      TEXT    NOT NULL DEFAULT 'Europe/Moscow',
  "last_slot_key" TEXT,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "NotifyPrefs" ADD CONSTRAINT "NotifyPrefs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Фразы пушей. Слот = 08:00 / 12:00 / 16:00 / 20:00. Аудитория = paid|free.
-- Cron ротирует случайно из active=true для (slot, audience).
CREATE TABLE IF NOT EXISTS "PushPhrase" (
  "id"        SERIAL PRIMARY KEY,
  "slot"      TEXT NOT NULL,
  "audience"  TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PushPhrase_slot_audience_active_idx"
  ON "PushPhrase"("slot", "audience", "active");
