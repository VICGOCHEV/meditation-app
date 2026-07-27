-- «Слать всем, кто в боте»: подписчики Telegram-бота (TgSubscriber) как
-- ИСТОЧНИК аудитории пушей вместо привязки к аккаунту (User.tgUserId).
-- Заполняется вебхуком на каждое входящее сообщение + авто-capture при запуске
-- Mini App. Zero-downtime, идемпотентно (повторный прогон безопасен).

CREATE TABLE IF NOT EXISTS "TgSubscriber" (
  "id"            SERIAL PRIMARY KEY,
  "chat_id"       BIGINT       NOT NULL,
  "enabled"       BOOLEAN      NOT NULL DEFAULT true,
  "timezone"      TEXT         NOT NULL DEFAULT 'Europe/Moscow',
  "last_slot_key" TEXT,
  "user_id"       INTEGER,
  "username"      TEXT,
  "first_name"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "TgSubscriber_chat_id_key" ON "TgSubscriber"("chat_id");
CREATE UNIQUE INDEX IF NOT EXISTS "TgSubscriber_user_id_key" ON "TgSubscriber"("user_id");
CREATE INDEX IF NOT EXISTS "TgSubscriber_enabled_idx" ON "TgSubscriber"("enabled");

-- FK на User (SET NULL при удалении юзера) — добавляем, только если ещё нет.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'TgSubscriber_user_id_fkey'
  ) THEN
    ALTER TABLE "TgSubscriber"
      ADD CONSTRAINT "TgSubscriber_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Бэкфилл: все, у кого уже проставлен tgUserId (легаси-привязка), становятся
-- подписчиками. enabled/timezone берём из NotifyPrefs (если есть), иначе дефолт
-- (enabled=true, МСК). ON CONFLICT по chat_id — идемпотентность.
INSERT INTO "TgSubscriber" ("chat_id", "enabled", "timezone", "user_id", "last_seen_at")
SELECT u."tg_user_id",
       COALESCE(p."enabled", true),
       COALESCE(p."timezone", 'Europe/Moscow'),
       u."id",
       CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "NotifyPrefs" p ON p."userId" = u."id"
WHERE u."tg_user_id" IS NOT NULL
ON CONFLICT ("chat_id") DO NOTHING;
