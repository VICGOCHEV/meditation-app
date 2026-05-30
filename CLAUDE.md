# Meditation App — контракт VC-26-013

Заказной проект. Vite + React 18 + Tailwind + Zustand + Framer Motion + Howler + Three.js на фронте. Fastify + Prisma + PostgreSQL на бэке. Strapi v5 как CMS. Всё деплоится на один Selectel-сервер за Caddy с авто-Let's Encrypt.

## Где что лежит

| Что | Путь |
|---|---|
| Фронт | `src/` (роуты в `src/app/routes.jsx`) |
| Бэк | `backend/src/` (роуты в `backend/src/routes/*.js`, Prisma в `backend/prisma/schema.prisma`) |
| Strapi-stage | `cms-stage/` (применяется на новый сервер при разворачивании) |
| Документация | `docs/` (нумерованные файлы — хронологический лог: 01-spec, 02-routing... 25-today-2026-05-27) |
| Прод-бэкапы (локально) | `~/Desktop/MED/prod-backup-2026-05-25/` (tarball'ы + DB-дампы, **не в git** через .gitignore) |
| Аудио клиента (превью голосов) | `public/onboarding-voices/{male,female}.mp3` |
| Preloader-видео (4 слота HUE) | `public/preloaders/{morning,day,evening,night}.mp4` |

## Память Claude

Полный контекст проекта — в **`~/.claude/projects/-Users-eblan-Desktop-MED-APP/memory/`** (симлинк на shared `~/.claude/projects/-Users-eblan/memory/`). Читать ВСЕГДА перед началом работы:

- `MEMORY.md` — индекс
- `project_med_app.md` — общий статус, что закрыто/висит
- `project_med_app_business.md` — решения клиента (тарифы, HUE-тема, цикл прогрессии, IS-фикс)
- `project_med_app_backend.md` — стек бэка + endpoints
- `project_med_app_cms.md` — Strapi-настройки
- `reference_med_app_infra.md` — **прод-сервер, пароли, команды деплоя**, бэкапы, старый прод
- `reference_med_app_session_digest.md` — указатель на 9379-строчный дайджест ранней сессии

## Прод

**`https://all-relaxme.ru/`** — Selectel `87.228.61.44`, Ubuntu 22.04, Caddy + Let's Encrypt SSL.

```bash
# Деплой
ssh root@87.228.61.44 'cd /opt/meditation-app && git pull --ff-only && npm install && npm run build && cd backend && npm install && systemctl restart meditation-api'
```

SSH пароль и архитектура — в `reference_med_app_infra.md`.

## Git

- `https://github.com/VICGOCHEV/meditation-app` ветка `main`
- Локалка обычно = `origin/main` = прод. Drift = что-то пошло не так, чинить.
- Коммитить часто, push в main без PR (solo dev).

## Текущие открытые задачи (на момент 27.05.2026 EOD)

Полный список — в `docs/24-client-needs-2026-05-25.md`. Сейчас ждём от клиента:

1. Тест-оплата ЮKassa с картой `5555 5555 5555 4444` (webhook зарегистрирован, готово к тесту)
2. URL Mini App в BotFather → `https://all-relaxme.ru/`
3. VK Mini App в prod-режим (описание/иконка/скриншоты + активация)
4. SMTP креды через Yandex 360 для бизнеса
5. ЮKassa боевые ключи (после теста)
6. MAX Mini App — создать приложение в MAX-консоли + бекенд auto-auth (план на завтра)
7. Триггер донейшна + куда отзыв
8. Форма обратной связи → email / TG-чат / TG-личка?

## Конвенции

- Память обновляется когда происходит что-то постоянное (решение клиента, переезд инфры, баг с глубокой историей). Не складировать туда временное.
- Большие правки → отдельный `docs/NN-...md` (NN — следующий номер по порядку).
- Auto-mode active по дефолту — не задавать лишних уточняющих вопросов, делать разумный выбор.
- Перед деплоем — local build проверка обязательно (`npm run build`).
- Backend модификация → `prisma migrate` локально + `ALTER TABLE IF NOT EXISTS ...` на проде (миграция без downtime).
