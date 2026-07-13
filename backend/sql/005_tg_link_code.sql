-- Telegram-привязка для пушей через deep-link бота. Zero-downtime, идемпотентно.
-- Юзер жмёт «Подключить Telegram» → генерим одноразовый код → /start link_<code>
-- в боте → webhook находит юзера по коду и проставляет tg_user_id.
-- Так пуши доходят и до PWA-юзеров, которые не открывали Mini App.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tg_link_code"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tg_link_code_exp" TIMESTAMP(3);

-- Уникальность кода (чтобы webhook находил ровно одного юзера).
-- Partial-free: NULL'ы в Postgres не конфликтуют в UNIQUE, так что обычный
-- unique-index безопасен даже когда у большинства юзеров код пуст.
CREATE UNIQUE INDEX IF NOT EXISTS "User_tg_link_code_key" ON "User"("tg_link_code");
