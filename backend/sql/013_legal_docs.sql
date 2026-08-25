-- Юридические документы, редактируемые владельцем в CMS (docs/41).
-- До этого три PDF лежали в application/public/docs/ и менялись только
-- деплоем. Идемпотентно, zero-downtime.

CREATE TABLE IF NOT EXISTS "LegalDoc" (
  "id"             SERIAL PRIMARY KEY,
  "slug"           TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "short_title"    TEXT,
  "body"           TEXT NOT NULL DEFAULT '',
  "file_url"       TEXT,
  "file_path"      TEXT,
  "version"        TEXT,
  "published"      BOOLEAN NOT NULL DEFAULT TRUE,
  "show_in_footer" BOOLEAN NOT NULL DEFAULT TRUE,
  "show_at_signup" BOOLEAN NOT NULL DEFAULT FALSE,
  "order"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalDoc_slug_key" ON "LegalDoc" ("slug");
CREATE INDEX IF NOT EXISTS "LegalDoc_published_order_idx"
  ON "LegalDoc" ("published", "order");

-- Сид трёх существующих документов. file_url ведёт на PDF, которые уже лежат
-- в статике фронта (application/public/docs/), body пустой — то есть поведение
-- ровно такое же, как до этой миграции. Когда клиент вставит текст в CMS,
-- документ автоматически станет внутренней страницей /legal/<slug>.
--
-- ON CONFLICT DO NOTHING: повторный прогон миграции не затирает правки клиента.
INSERT INTO "LegalDoc" ("slug", "title", "short_title", "file_url", "order", "show_in_footer", "show_at_signup")
VALUES
  ('user-agreement',        'Публичная оферта',                        'Оферта',                       '/docs/user-agreement.pdf',        0, TRUE, TRUE),
  ('privacy-policy',        'Политика конфиденциальности',             'Политика конфиденциальности',  '/docs/privacy-policy.pdf',        1, TRUE, TRUE),
  ('personal-data-consent', 'Согласие на обработку персональных данных','Согласие на обработку',        '/docs/personal-data-consent.pdf', 2, TRUE, TRUE)
ON CONFLICT ("slug") DO NOTHING;
