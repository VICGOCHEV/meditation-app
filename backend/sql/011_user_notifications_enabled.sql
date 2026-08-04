-- Тумблер «Напоминания» переезжает на User.notifications_enabled — единственный
-- источник правды. Раньше отправщик читал TgSubscriber.enabled, а интерфейс —
-- NotifyPrefs.enabled, и эти два значения расходились (например, после /stop в
-- боте тумблер в профиле продолжал показывать «Вкл»).
-- Zero-downtime, идемпотентно.

-- 1. Колонка сначала nullable — чтобы отличить «поля не было» от осознанного
--    выбора юзера и не затереть выключенные уведомления.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifications_enabled" BOOLEAN;

-- 2. Переносим уже сделанный выбор. Кто выключил уведомления — остаётся
--    выключенным: ставить всем true значило бы включить пуши тем, кто их
--    осознанно отключил.
--    2а. Явный выбор в приложении (NotifyPrefs).
UPDATE "User" u
   SET "notifications_enabled" = p."enabled"
  FROM "NotifyPrefs" p
 WHERE p."userId" = u."id"
   AND u."notifications_enabled" IS NULL;

--    2б. Явный /stop в боте (у привязанного подписчика enabled = false), если
--        в приложении настройку не трогали.
UPDATE "User" u
   SET "notifications_enabled" = false
  FROM "TgSubscriber" s
 WHERE s."user_id" = u."id"
   AND s."enabled" = false
   AND u."notifications_enabled" IS NULL;

-- 3. Всем остальным (поля не было, выбора не делали) — true.
UPDATE "User" SET "notifications_enabled" = true
 WHERE "notifications_enabled" IS NULL;

-- 4. Фиксируем контракт: DEFAULT TRUE NOT NULL.
ALTER TABLE "User" ALTER COLUMN "notifications_enabled" SET DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "notifications_enabled" SET NOT NULL;
