-- Push-фразы: переход с 4 фиксированных слотов (08/12/16/20) на 3 фазы дня
-- (morning/day/evening) с множественным выбором (чекбоксы в CMS).
-- Zero-downtime, идемпотентно. Notifier после деплоя читает "phases".

-- 1. Новая колонка phases (comma-join фаз). slot оставляем nullable-legacy.
ALTER TABLE "PushPhrase" ADD COLUMN IF NOT EXISTS "phases" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PushPhrase" ALTER COLUMN "slot" DROP NOT NULL;

-- 2. Бэкфилл phases из старого slot (только там, где phases ещё пуст):
--    08:00 → утро, 12:00/16:00 → день, 20:00 → вечер.
UPDATE "PushPhrase"
   SET "phases" = CASE
     WHEN "slot" = '08:00' THEN 'morning'
     WHEN "slot" IN ('12:00', '16:00') THEN 'day'
     WHEN "slot" = '20:00' THEN 'evening'
     ELSE 'morning'
   END
 WHERE ("phases" IS NULL OR "phases" = '')
   AND "slot" IS NOT NULL;

-- 3. Индекс под выборку notifier'а (audience+active). Старый slot-индекс не мешает.
CREATE INDEX IF NOT EXISTS "PushPhrase_audience_active_idx"
  ON "PushPhrase"("audience", "active");
