-- Добровольные донаты со страницы /donate/ (решение клиента 2026-07-30,
-- docs/38). Платёж анонимный — привязки к User нет, поэтому отдельная
-- таблица, а не Payment (там userId NOT NULL + FK).
-- Идемпотентно, zero-downtime.

CREATE TABLE IF NOT EXISTS "Donation" (
  "id"           TEXT PRIMARY KEY,
  "yookassa_id"  TEXT NOT NULL,
  "amount"       INTEGER NOT NULL,
  "currency"     TEXT NOT NULL DEFAULT 'RUB',
  "status"       TEXT NOT NULL,
  "paid_at"      TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Donation_yookassa_id_key" ON "Donation" ("yookassa_id");
CREATE INDEX IF NOT EXISTS "Donation_status_idx" ON "Donation" ("status");
