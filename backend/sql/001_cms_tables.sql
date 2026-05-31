-- Своя CMS — таблицы (docs/26). Zero-downtime: только новые таблицы,
-- существующих не трогает. Идемпотентно — повторный прогон безопасен
-- (IF NOT EXISTS + перехват дубля FK).

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MediaFile" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Practice" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "month_slot" INTEGER,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "audio_male_music1_id" INTEGER,
    "audio_male_music2_id" INTEGER,
    "audio_male_music3_id" INTEGER,
    "audio_female_music1_id" INTEGER,
    "audio_female_music2_id" INTEGER,
    "audio_female_music3_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Voice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "audio_full_id" INTEGER NOT NULL,
    "audio_preview_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Voice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MusicTrack" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "audio_full_id" INTEGER NOT NULL,
    "audio_preview_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MusicTrack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "Practice_slug_key" ON "Practice"("slug");
CREATE INDEX IF NOT EXISTS "Practice_block_order_idx" ON "Practice"("block", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "Voice_code_key" ON "Voice"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");

-- ── Foreign keys (идемпотентно через перехват duplicate_object) ──────────────
DO $$ BEGIN
  ALTER TABLE "Practice" ADD CONSTRAINT "Practice_audio_male_music1_id_fkey" FOREIGN KEY ("audio_male_music1_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Practice" ADD CONSTRAINT "Practice_audio_male_music2_id_fkey" FOREIGN KEY ("audio_male_music2_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Practice" ADD CONSTRAINT "Practice_audio_male_music3_id_fkey" FOREIGN KEY ("audio_male_music3_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Practice" ADD CONSTRAINT "Practice_audio_female_music1_id_fkey" FOREIGN KEY ("audio_female_music1_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Practice" ADD CONSTRAINT "Practice_audio_female_music2_id_fkey" FOREIGN KEY ("audio_female_music2_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Practice" ADD CONSTRAINT "Practice_audio_female_music3_id_fkey" FOREIGN KEY ("audio_female_music3_id") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Voice" ADD CONSTRAINT "Voice_audio_full_id_fkey" FOREIGN KEY ("audio_full_id") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Voice" ADD CONSTRAINT "Voice_audio_preview_id_fkey" FOREIGN KEY ("audio_preview_id") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_audio_full_id_fkey" FOREIGN KEY ("audio_full_id") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_audio_preview_id_fkey" FOREIGN KEY ("audio_preview_id") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
