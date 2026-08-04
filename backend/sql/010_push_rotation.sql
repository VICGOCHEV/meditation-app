-- Ротация push-фраз: курсор выдачи на (подписчика бота, фазу дня) + таблица
-- глобальных настроек под рубильник режима ротации.
-- Zero-downtime, идемпотентно (повторный прогон безопасен).

-- 1. Курсор ротации. Ключ по subscriber_id, а не по user_id: у большинства
--    подписчиков бота аккаунта нет, и на ключе по юзеру они остались бы без
--    ротации. CASCADE — вместе с подписчиком уходит и его курсор.
CREATE TABLE IF NOT EXISTS "PushRotationState" (
  "id"            SERIAL PRIMARY KEY,
  "subscriber_id" INTEGER      NOT NULL,
  "phase"         TEXT         NOT NULL,
  "order_json"    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  "position"      INTEGER      NOT NULL DEFAULT 0,
  "cycle_number"  INTEGER      NOT NULL DEFAULT 0,
  "last_push_id"  INTEGER,
  "last_sent_at"  TIMESTAMP(3),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushRotationState_subscriber_id_phase_key"
  ON "PushRotationState"("subscriber_id", "phase");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PushRotationState_subscriber_id_fkey'
  ) THEN
    ALTER TABLE "PushRotationState"
      ADD CONSTRAINT "PushRotationState_subscriber_id_fkey"
      FOREIGN KEY ("subscriber_id") REFERENCES "TgSubscriber"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Глобальные настройки (key/value). Кроме режима ротации сюда же ляжет
--    рубильник VPN-гейта.
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key"       TEXT         PRIMARY KEY,
  "value"     TEXT         NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Режим по умолчанию — shuffled (подтверждено клиентом 2026-08-04).
INSERT INTO "AppSetting" ("key", "value")
VALUES ('push_rotation_mode', 'shuffled')
ON CONFLICT ("key") DO NOTHING;
