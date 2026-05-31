# Meditation App — контракт VC-26-013

Заказной проект. Vite + React 18 + Tailwind + Zustand + Framer Motion + Howler + Three.js на фронте. Fastify + Prisma + PostgreSQL на бэке. Strapi v5 как первая CMS (на проде, но клиент её не любит), кастомная CMS в активной разработке. Всё деплоится на один Selectel-сервер за Caddy с авто-Let's Encrypt.

## Структура монорепо

Корень `APP/` — мета-репо. Четыре независимых под-приложения + общие папки:

```
APP/
├── application/        ← Vite-фронт (то что юзер видит, /)
│   ├── src/            (роуты в src/app/routes.jsx)
│   ├── public/         (preloaders, onboarding-voices)
│   ├── index.html
│   ├── package.json
│   └── .env, .env.production, dist/, node_modules/
├── backend/            ← Fastify + Prisma + PostgreSQL (/api/*)
│   ├── src/routes/*.js (incl. /admin, /content для CMS)
│   ├── prisma/schema.prisma
│   ├── sql/001_cms_tables.sql (idempotent CMS миграция)
│   └── .env (с DB-кредами, JWT, TG_BOT_TOKEN, VK_*, YOOKASSA_*, UPLOAD_DIR)
├── cms/                ← Кастомная CMS SPA (/manage/) — заменит Strapi
│   ├── src/
│   └── package.json
├── landing/            ← Промо-лендинг (/promo/) — WebGL scroll-scrub
│   ├── src/            (App, components, sections, shaders)
│   ├── public/         (media, hero-assets)
│   ├── index.html      (base=/promo/ при build, / в dev)
│   └── package.json
├── cms-stage/          ← Strapi v5 артефакты (legacy reference)
├── docs/               ← Хронологический лог: 01-spec → 28-cms-todo
├── deploy/             ← cms.Caddyfile, deploy-cms.sh, security-hardening
├── AUDIO/              ← Клиентские mp3 (не в git, через .gitignore)
├── CLAUDE.md           ← этот файл
└── package.json        ← orchestrator (alias-скрипты)
```

Из корня работают alias-скрипты:
- `npm run dev`           → `cd application && npm run dev`
- `npm run build`         → `cd application && npm run build`
- `npm run dev:cms`       → `cd cms && npm run dev`
- `npm run dev:backend`   → `cd backend && npm run dev`
- `npm run dev:landing`   → `cd landing && npm run dev` (порт 5190)
- `npm run build:landing` → `cd landing && npm run build`

## Git

- `https://github.com/VICGOCHEV/meditation-app` ветка `main`
- Локалка обычно = `origin/main` = прод. Drift = что-то пошло не так, чинить.
- Коммитить часто, push в main без PR (solo dev).

## Прод

**`https://all-relaxme.ru/`** — Selectel `87.228.61.44`, Ubuntu 22.04, Caddy + Let's Encrypt SSL.

Структура на проде:
- Юзерфронт: `https://all-relaxme.ru/` → `/opt/meditation-app/application/dist`
- Кастомная CMS: `https://all-relaxme.ru/manage/` → `/opt/meditation-app/cms/dist` (логин `admin@all-relaxme.ru`)
- Промо-лендинг: `https://all-relaxme.ru/promo/` → `/opt/meditation-app/landing/dist` (после переезда 01.06)
- API: `https://all-relaxme.ru/api/*` → Fastify :3001
- Strapi (legacy): `https://all-relaxme.ru/admin` + `/cms/` → :1337, погасим после cutover'а

```bash
# Деплой
ssh root@87.228.61.44 'cd /opt/meditation-app && git pull --ff-only && \
  cd application && npm install && npm run build && cd .. && \
  cd cms && npm install && npm run build && cd .. && \
  cd landing && npm install && npm run build && cd .. && \
  cd backend && npm install && systemctl restart meditation-api'
```

SSH пароль и архитектура — в `reference_med_app_infra.md`.

## Память Claude

Полный контекст проекта — в **`~/.claude/projects/-Users-eblan-Desktop-MED-APP/memory/`** (симлинк на shared `~/.claude/projects/-Users-eblan/memory/`). Читать ВСЕГДА перед началом работы:

- `MEMORY.md` — индекс
- `project_med_app.md` — общий статус, что закрыто/висит
- `project_med_app_business.md` — решения клиента (тарифы, HUE-тема, цикл прогрессии, IS-фикс)
- `project_med_app_backend.md` — стек бэка + endpoints
- `project_med_app_cms.md` — Strapi-настройки
- `reference_med_app_infra.md` — **прод-сервер, пароли, команды деплоя**, бэкапы, старый прод
- `reference_med_app_session_digest.md` — указатель на 9379-строчный дайджест ранней сессии

## Текущие открытые задачи

Полный список — в `docs/24-client-needs-2026-05-25.md`. Сейчас ждём от клиента:

1. Тест-оплата ЮKassa с картой `5555 5555 5555 4444` (webhook зарегистрирован, готово к тесту — но только после деплоя фикса виджета)
2. URL Mini App в BotFather → `https://all-relaxme.ru/`
3. VK Mini App в prod-режим (описание/иконка/скриншоты + активация)
4. SMTP креды через Yandex 360 для бизнеса
5. ЮKassa боевые ключи (после теста)
6. MAX Mini App — создать приложение в MAX-консоли + бекенд auto-auth
7. Триггер донейшна + куда отзыв
8. Форма обратной связи → email / TG-чат / TG-личка?

## Тестирование оплаты

**Локально**: USE_MOCK=true по умолчанию (в `application/.env`) → onPay сразу прыгает в success, реальный виджет не покажется. Чтобы протестить полный путь с виджетом — нужен либо запущенный backend локально, либо деплой на прод.

**На проде**: после деплоя `/subscription` → виджет рендерится inline в контейнере (баг 31.05 с modal-overlay починен). Тест-карта `5555 5555 5555 4444`, CVV `123`, срок `12/26`, 3DS `12345678`.

## Конвенции

- Память обновляется когда происходит что-то постоянное (решение клиента, переезд инфры, баг с глубокой историей). Не складировать туда временное.
- Большие правки → отдельный `docs/NN-...md` (NN — следующий номер по порядку).
- Auto-mode active по дефолту — не задавать лишних уточняющих вопросов, делать разумный выбор.
- Перед деплоем — local build проверка обязательно (`npm run build` из корня или application/).
- Backend модификация → `prisma migrate` локально + `ALTER TABLE IF NOT EXISTS ...` на проде (миграция без downtime).
- Реструктуризация 31.05: фронт переехал в `application/`. CLAUDE.md и память отражают это. На проде Caddyfile надо обновить ДО `git pull`.
