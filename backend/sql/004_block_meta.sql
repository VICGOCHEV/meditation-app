-- Редактируемые заголовки секций блоков на главной (CMS «Блоки», docs/35).
-- Zero-downtime: только новая таблица. Идемпотентно (IF NOT EXISTS).
-- Сидировать не нужно: пустые ключи отдаются с дефолтами на уровне API
-- (backend/src/utils/blockDefaults.js); строки создаются при первом
-- сохранении блока в CMS.

CREATE TABLE IF NOT EXISTS "BlockMeta" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "eyebrow" TEXT,
    "title" TEXT NOT NULL,
    "sub" TEXT,
    "chip" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockMeta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlockMeta_key_key" ON "BlockMeta"("key");
