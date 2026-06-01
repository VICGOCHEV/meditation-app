-- Feedback (форма ОС в Profile). Zero-downtime, идемпотентно.
-- Куда отправлять — решит клиент, пока в БД + outbox.
CREATE TABLE IF NOT EXISTS "Feedback" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER,
  "type"      TEXT NOT NULL DEFAULT 'other',
  "message"   TEXT NOT NULL,
  "email"     TEXT,
  "name"      TEXT,
  "status"    TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FK на User (SetNull чтобы при удалении юзера фидбек остался для архива)
DO $$ BEGIN
  ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt" DESC);
