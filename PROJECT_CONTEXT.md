# PROJECT_CONTEXT.md — Relax Me (Meditation App)

> Единая карта памяти и архитектуры проекта. Договор **VC-26-013**.
> Составлено на основе аудита кодовой базы (~24k строк, 5 пакетов) и 37 хронологических доков.
> Дата аудита: 2026-07-24.

---

## 1. Executive Summary

Relax Me — мобильный веб-сервис медитаций и трекинга состояния (PWA + Telegram/VK Mini App): практики расслабления и осознанности с кастомизацией «голос x музыка», ежедневные чек-ины и глубокий анализ с расчётом индексов состояния, подписочная монетизация через ЮKassa. Проект сдан в прод 10.06.2026 на `all-relaxme.ru` (Selectel), это монорепо из четырёх боевых под-приложений (фронт, Fastify-бэкенд, кастомная CMS, промо-лендинг) плюс портфолио-кейс, с собственной CMS вместо Strapi и Telegram-ботом для пуш-напоминаний через relay вне РФ.

---

## 2. Технологический стек

### Фронтенд `application/` (юзер-аппка)
- **Ядро:** React 18.3 + Vite 5.4, react-router-dom 6.26
- **State:** Zustand 4.5 (vanilla `create`, ручной персист в localStorage — без middleware)
- **Анимация:** Framer Motion 12, Lenis 1.3 (smooth scroll, только pointer-fine)
- **Аудио:** Howler 2.2 (`html5: true` из-за iOS autoplay)
- **3D/шейдеры:** three 0.169 + @react-three/fiber **8.x** (пришит к React 18; v9 требует React 19)
- **UI:** Tailwind 3.4, class-variance-authority, clsx, tailwind-merge, @radix-ui/react-slot
- **Платформы:** @twa-dev/sdk (Telegram), @vkontakte/vk-bridge (VK)
- **Мониторинг:** @sentry/react (no-op без DSN)

### Бэкенд `backend/`
- **Сервер:** Fastify 5.8 (ESM, `"type":"module"`), плагины cors/helmet/jwt/rate-limit/multipart/static/sensible
- **ORM/БД:** Prisma 6.19 + PostgreSQL
- **Крипто/почта:** bcrypt 6 (12 rounds), nodemailer 8 (fallback в file-outbox)
- **Крон:** node-cron 4 (notifier, expirationNotifier, broadcastWorker)
- **Медиа:** music-metadata 11 (длительность mp3), @sentry/node
- **Тесты:** нативный `node --test`

### CMS `cms/` (`/manage/`)
- React 18 + Vite 5 + react-router 6 (`basename="/manage"`) + Zustand (только auth) + axios. Без TS.

### Лендинг `landing/` + Кейс `CASE/`
- React 18 + Vite 5, @react-three/fiber + three 0.169 (lazy), Framer Motion 11, Lenis. Статика.

### Внешние сервисы и интеграции
- **Эквайринг:** ЮKassa (REST v3, embedded confirmation widget + webhook)
- **Telegram:** Bot API через **relay** (Cloudflare Worker вне РФ, `deploy/tg-relay/`) — прямой api.telegram.org режется DPI
- **VK:** Mini App auth (HMAC-SHA256), приложение `vk.com/app54600947`
- **Email:** SMTP (Selectel/Yandex 360), шаблоны в `utils/emailTemplates.js`
- **Аналитика:** Yandex.Metrika (id `109442488`, захардкожен в `application/index.html`)
- **Мониторинг:** UptimeRobot + self-watchdog (cron 5 мин -> `/internal/alert`) + Sentry
- **Инфра:** Caddy + Let's Encrypt (авто-SSL), systemd (`meditation-api`), daily pg-backup

> Примечание: TS/tsconfig НЕТ (проект целиком на JS/JSX). Docker/docker-compose НЕТ (bare-metal + systemd). CI НЕТ (деплой вручную через ssh + git pull).

---

## 3. Архитектурная карта

### 3.1 Древо монорепо

```
APP/                          мета-репо (github.com/VICGOCHEV/meditation-app, ветка main = прод)
├── application/              Vite-фронт, юзер видит на all-relaxme.ru/
│   ├── src/
│   │   ├── app/              App.jsx (оркестратор), routes.jsx (роутинг)
│   │   ├── pages/            экраны: Onboarding, Auth/*, Home, Checkin,
│   │   │                     DeepAnalysis, Player, Subscription, Profile
│   │   ├── components/       UI + WebGL (AppBackground, AmorphSphere, OnboardingFog,
│   │   │                     AudioPlayer, TrackerCalendar, KTGauge, ProgressionGate…)
│   │   ├── store/            Zustand: useAuthStore, useProgressStore,
│   │   │                     useCheckinStore, usePlayerStore, useThemeStore
│   │   ├── hooks/            useAudio, usePlatformAuth, useTimeTheme, useProgression
│   │   ├── api/              client.js (axios), cms.js, practices.js, blocks.js,
│   │   │                     notify.js, mock.js
│   │   ├── lib/              vk.js (vkInit/splash), утилиты
│   │   └── utils/            scoreCalc.js (формулы IS/IT/IO/KT), dateHelpers.js
│   ├── public/               preloaders, onboarding-voices, manifest.webmanifest
│   └── .env, .env.production
├── backend/                  Fastify + Prisma + Postgres, /api/* на :3001 (loopback)
│   ├── src/
│   │   ├── index.js          entry, регистрация роутов/плагинов/кронов
│   │   ├── routes/           auth, subscription, payments, promocodes, notify, tg,
│   │   │   │                 feedback, checkin, progress, deepAnalysis, practices,
│   │   │   │                 content, health, internal
│   │   │   └── admin/        login, account, dashboard, subscriptions, promocodes,
│   │   │                     broadcast, practices, voices, music, media, pushPhrases,
│   │   │                     blocks, feedback  (CMS API)
│   │   ├── jobs/             notifier.js, expirationNotifier.js, broadcastWorker.js
│   │   ├── utils/            yookassa, tgBot, platformAuth, mailer, emailTemplates,
│   │   │                     pushPhases, blockDefaults, sentry, auth
│   │   ├── middlewares/      auth.js (юзер JWT), adminAuth.js (admin JWT)
│   │   └── db.js             Prisma client
│   ├── prisma/schema.prisma  ВСЕ модели (источник правды после всех SQL)
│   ├── prisma/migrations/    ПУСТО (базовые таблицы через `prisma db push`)
│   ├── sql/                  001..007 идемпотентные миграции (CMS/push/feedback/broadcast)
│   └── scripts/              seed-admin, seed-push-phrases и пр.
├── cms/                      Кастомная CMS SPA (/manage/), заменила Strapi
│   └── src/{pages,components,ui,lib}/
├── landing/                  Промо WebGL scroll-scrub (/promo/) — СЕЙЧАС ЗАГЛУШКА на проде
│   └── src/{sections,components,shaders}/
├── CASE/                     Портфолио-кейс (не на этом проде), статика
├── deploy/                   cms.Caddyfile, deploy-cms.sh, watchdog.sh,
│                             tg-relay/ (CF Worker), security-hardening/ (pg-backup и пр.)
├── docs/                     37 нумерованных доков (01-architecture … 37-push-…) + PDF-артефакты
├── AUDIO/                    клиентские mp3 (в .gitignore)
├── AGENTS.md                 контракт проекта для агентов
└── package.json              orchestrator (alias-скрипты)
```

### 3.2 Архитектурный паттерн

- **Монорепо** из независимых приложений (не workspaces, не Nx/Turbo) — каждый пакет со своим `package.json`, связь через alias-скрипты в корневом `package.json`.
- **Фронт:** feature-by-page (pages/ + components/ + store/ + hooks/ + api/). НЕ FSD в строгом смысле, но близко: слои `api -> store -> hooks -> pages`.
- **Бэк:** классический layered Fastify (routes -> utils/services -> Prisma). Роуты плоские, admin выделен в под-папку. Крон-джобы отдельным слоем.
- **CMS и лендинг** — отдельные SPA/статика, общаются с бэком только по HTTP (CMS) или не общаются (лендинг/кейс — чистая статика + внешние ссылки).

### 3.3 Роутинг

- **Фронт (`application/src/app/routes.jsx`):** react-router 6, `AnimatePresence mode="wait"`, переходы **строго opacity-only** (любой transform/filter создаёт stacking context и ломает `mix-blend-mode:screen` у AmorphSphere).
  - Public: `/onboarding`, `/auth/login` (+VK auto-login), `/auth/register`, `/auth/reset`, `/auth/reset/confirm`
  - Protected (через `ProtectedRoute` + `AuthGate`): `/`, `/checkin`, `/deep-analysis`, `/player/:id` (lazy), `/subscription`, `/profile`
- **CMS:** react-router 6 c `basename="/manage"`, экраны practices/blocks/voices/music/push-phrases/promocodes/broadcasts/users/feedback/account.
- **Бэк:** все API под `/api/*`, кроме `/internal/*` (loopback-only, не проксируется Caddy наружу).

### 3.4 Auth flow (два непересекающихся контура на одном JWT-секрете)

- **Юзерский контур:** payload `{id}`, TTL 7д (`remember` -> 90д). Способы входа:
  1. email + пароль (bcrypt 12 rounds)
  2. Telegram Mini App (`POST /auth/tg-init`, HMAC initData по TG_BOT_TOKEN)
  3. VK Mini App (`POST /auth/vk-init`, HMAC по VK_SECURE_KEY)
  - Reset-flow: `sha256(token)` в БД, письмо; anti-enumeration (всегда 200).
  - Frontend: axios interceptor вешает `Bearer` из LS; **401 -> hard-redirect `/auth/login`** (`window.location.replace`).
- **Админский контур:** payload `{kind:'admin', aid, role}`, TTL 12ч (`remember` -> 30д). RBAC: роли `editor` / `admin`. `requireAdmin` гейтит деструктив (подписки, промокоды, рассылки, управление админами). Юзерский токен в админ-контур не проходит (разные claim-поля).
- **Rate-limit:** глобально 120/мин, на login-роутах (юзер и админ) 5/мин/IP.

### 3.5 Потоки данных и работа с API

- **Транспорт:** REST (axios на фронте, fetch на бэке для внешних API). Нет GraphQL/gRPC/React Query — данные тянутся императивно в Zustand-сторах.
- **Резолюция контента (`api/practices.js`):** трёхслойная — `USE_CMS ? CMS-API(кэш 60с) : USE_MOCK ? mock.js : real-backend`.
- **Offline-очереди:** чек-ины и завершения практик пишутся оптимистично + в pending-очередь LS (`checkin_pending_sync`, `completion_pending_sync`), флашатся на mount App.jsx.
- **ЮKassa flow:** `POST /payments/yookassa/create` -> `confirmationToken` -> динамическая загрузка виджета -> inline-рендер в `#yukassa-widget` -> на success **поллинг `/progress` до 12с** (лаг webhook) -> webhook `payment.succeeded` продлевает подписку + отмечает промо + открывает `a1`.

---

## 4. Ключевые бизнес-модули

| Модуль | Фронт | Бэк | Зона ответственности |
|---|---|---|---|
| **Онбординг** | `pages/Onboarding` | — | 4 слайда, шейдер тумана, вход в auth |
| **Аутентификация** | `pages/Auth/*`, `useAuthStore` | `routes/auth.js` | email/TG/VK, reset, GDPR-удаление (`DELETE /auth/me`) |
| **Практики/Плеер** | `pages/Player`, `useAudio`, `usePlayerStore` | `routes/practices.js`, `content.js` | предмиксованные аудио-варианты `<voice>_music<n>`, отметка completion |
| **Прогрессия** | `useProgressStore`, `useProgression` | `routes/progress.js`, `practices.js` | открытие awareness a1..a6 по циклу 4 дня, unlock после DA |
| **Чек-ины** | `pages/Checkin`, `useCheckinStore` | `routes/checkin.js` | daily, индекс ИС (0..40), 4 состояния |
| **Глубокий анализ** | `pages/DeepAnalysis` | `routes/deepAnalysis.js` | 10 вопросов -> ИТ/ИО/КТ, KtEntry |
| **Подписка/оплата** | `pages/Subscription` | `payments.js`, `subscription.js`, `promocodes.js` | ЮKassa виджет, промокоды, 199₽/мес |
| **Пуши** | `hooks/usePlatformAuth`, `api/notify.js` | `routes/notify.js`, `routes/tg.js`, `jobs/notifier.js` | привязка tgUserId (3 пути), фазы дня утро/день/вечер |
| **Рассылки (broadcast)** | CMS `Broadcasts.jsx` | `admin/broadcast.js`, `jobs/broadcastWorker.js` | email + telegram (с картинкой), пачки 25/мин |
| **CMS-контент** | пакет `cms/` | `routes/admin/*`, `content.js` | практики, голоса, музыка, блоки, промокоды, юзеры, фидбек |
| **Мониторинг** | Sentry/react | `health.js`, `internal.js`, `deploy/watchdog.sh` | UptimeRobot + watchdog + Sentry |

### Переиспользуемые компоненты и хелперы
- **UI-кит фронта:** inline SVG-иконки (без иконочной библиотеки), TrackerCalendar, KTGauge, Sparkline, CountUp, ShinyButton, LiquidGlassFilter.
- **WebGL:** общие GLSL-хелперы (`hash/noise/fbm/angularDistort`), паттерн fullscreen-quad + uniform `uTime/uResolution` через `useFrame`.
- **Формулы:** `utils/scoreCalc.js` (единый источник расчёта ИС/ИТ/ИО/КТ).
- **Бэк-утилиты:** `pushPhases.js` (единый источник фаз для notifier + admin), `blockDefaults.js` (дефолты заголовков секций), `yookassa.js`, `tgBot.js`, `mailer.js`.

---

## 5. Модели данных и бэкенд

### 5.1 Ключевые сущности (Prisma)

**Пользователь и прогресс:**
- `User` — центр. `email`/`passwordHash` опциональны (TG/VK-юзеры без email). Идентичности: `tgUserId`, `vkUserId`, `tgLinkCode/Exp`. Reset: `resetTokenHash/Exp`. Дочерние — `onDelete: Cascade` (кроме Feedback = SetNull).
- `Subscription` (1:1) — `active`, `expiresAt`, `tier` (`awareness`/`all-inclusive`), `expirationNotifiedAt`.
- `PracticeCompletion`, `TrackerDay`, `Checkin` (q1..q4 -> `is_value`), `KtEntry` (it/io/kt + answers Json).
- `UnlockedAwareness` (прогрессия, a1 при активации), `BonusUnlock` (legacy, механика снята).

**Платежи/промо:**
- `Payment` (лог ЮKassa, `yookassaId` unique, amount в копейках), `PromoCode` (percent 0-100, окно, лимиты), `PromoCodeUse` (unique promo+user — один юзер один раз).

**Пуши/рассылки/фидбек:**
- `NotifyPrefs` (1:1, `enabled`, `timezone`, `lastSlotKey`), `PushPhrase` (`phases` comma-join, `audience` paid/free, `slot` legacy-nullable), `BroadcastJob` (`channel` email/telegram, `imageUrl`, счётчики), `Feedback`.

**CMS:**
- `MediaFile` (аудио), `Practice` (`slug` unique = старый Strapi documentId, 6 FK на MediaFile = матрица голос x музыка), `Voice`, `MusicTrack`, `BlockMeta` (заголовки секций), `AdminUser` (отдельно от User).

### 5.2 SQL-миграции (`backend/sql/`, поверх Prisma, идемпотентны)

| # | Что добавляет |
|---|---|
| 001 | CMS-таблицы: MediaFile, Practice, Voice, MusicTrack, AdminUser |
| 002 | Feedback |
| 003 | NotifyPrefs + PushPhrase (старая схема: `slot NOT NULL`, без `phases`) |
| 004 | BlockMeta (заголовки секций) |
| 005 | User.tg_link_code + exp (deep-link привязка TG) |
| 006 | PushPhrase.phases + `slot` DROP NOT NULL + бэкфилл (08->morning, 12/16->day, 20->evening) |
| 007 | BroadcastJob.channel + image_url (TG-канал рассылок с картинкой) |
| 013 | LegalDoc — юр. документы, редактируемые в CMS (+ сид трёх текущих) |

> Базовые пользовательские таблицы идут через `prisma db push` (нет версионированных миграций). CMS/push/feedback-слой — сырой SQL. Порядок важен: 006 обязателен после 003.

### 5.3 Основные API-эндпоинты

Легенда: [P] публичный, [U] JWT юзера, [A] admin JWT, [!] требует role=admin.

- **auth** `/api/auth`: [P] `/register`, `/login`, `/reset`, `/reset/confirm`, `/tg-init`, `/vk-init`; [U] `GET/DELETE /me`
- **progress/practices/checkin/deep-analysis**: [U] `GET /progress`, `POST /practices/:id/complete`, `POST /checkin`, `POST /deep-analysis`
- **subscription/payments/promo**: [U] `POST/DELETE /subscription`, `POST /payments/yookassa/create`, `POST /promocode/validate`; [P] `POST /payments/yookassa/webhook`
- **notify** `/api/notify` [U]: `GET/PATCH /prefs`, `POST /tg-link`, `POST /tg-capture`, `POST /test`
- **tg** [P]: `POST /tg/webhook`
- **content** `/api/content` [P, кэш 60с]: `/practices`, `/practices/:slug`, `/blocks`, `/voices`, `/music`, `/texts`, `/legal`, `/legal/:slug`
- **admin** `/api/admin/*` [A/!]: login, stats/users, subscription grant/revoke, promocodes, broadcasts (+image), practices/voices/music (+reorder), media, push-phrases, blocks, feedback, legal (юр. документы; DELETE — только role=admin)
- **health/internal**: [P] `/health`, `/health/full`; [loopback] `/internal/alert`

---

## 6. Технический долг, узкие места и риски

### Критично / операционное
1. **Незадеплоенный фикс пушей (doc 37).** Авто-привязка `tgUserId` (`/notify/tg-capture` + `usePlatformAuth`) + миграции 006/007 собраны локально, но НЕ на проде. Симптом: пуши доходят только разработчику (у остальных `tgUserId = null`). Требует деплой (SQL + prisma generate + рестарт + пересборка фронта/CMS).
2. **Локальный `.git` битый** (только config, без объектов) — этот чекаут не полноценный git-репо, сверить локалку с прод через git отсюда нельзя. Прод — отдельный clone в `/opt/meditation-app`.
3. **Лендинг на проде — заглушка** (`landing/dist/index.html`, реальный в `.bak.real`). `build:landing` затирает заглушку — при деплое лендинг НЕ билдить.
4. **Нет версионированных Prisma-миграций** — база через `db push` + ручной SQL. Неаккуратный `db push` может подровнять прод под schema.prisma без контроля -> риск потери данных.

### Архитектурные узкие места
5. **Дублирование сетки тарифов** (199/299) в `payments.js`, `promocodes.js` и фронте `Subscription.jsx` — три места.
6. **`--app-hue` дублируется** — inline-скрипт `index.html` + `useTimeTheme.js`, менять синхронно.
7. **`AWARENESS_ORDER=[a1..a6]` захардкожен** в нескольких местах (mock-store + useProgression) — расхождение mock/сервера даёт разное поведение unlock.
8. **Аудио — предмиксованные варианты, не dual-track.** Матрица `voice_musicN` хардкодится в аппке И в CMS (`PracticeEditor`) — добавление голоса/музыки ломает валидацию и `n/6`.
9. **CORS:** пустой `CORS_ORIGINS` = разрешить всё + credentials. На проде обязательно задавать список.
10. **`.env.example` неполный** (нет YOOKASSA/TG/VK/SMTP-переменных) — при развороте с нуля легко забыть ключи; часть кода деградирует тихо (mailer -> file-outbox, TG/VK -> 503).

### Performance / масштабирование
11. **`useAudio`** — `html5:true`, ручной crossfade + таймеры, чувствителен к StrictMode double-mount. Известная открытая проблема: музыка в прелоадере на iOS (autoplay).
12. **Broadcast offset = sent+failed + skip** — если аудитория меняется во время рассылки (регистрация/отписка), окно `skip` съезжает -> пропуски/дубли. Нет отдельного sent-лога.
13. **@react-three/fiber пришит к v8** — апгрейд React до 19 заблокирован три-стеком.
14. **ЮKassa webhook публичный** — защита только повторным `getPayment`; при недоступности API возвращает 200 -> успешный платёж может не активировать подписку без явного алерта. Обрабатывается только `payment.succeeded` (refund/cancel не отражаются).
15. **CASE/** — 20 секций с несколькими живыми WebGL-контекстами (AmorphSphere) + InteractivePlayer: перф-бюджет реальный (на лендинге фоновый шейдер намеренно выключен ради этого).

### Правила проекта (жёсткие)
16. **Без эмодзи** — нигде (UI, бейджи, письма, сообщения бота). Только SVG-иконки.
17. **Без headless/Playwright** на WebGL-страницах — кладёт Mac (полный фриз). Проверять через `npm run build` + глаза на localhost.

---

## 7. Гайд по быстрой навигации (для разработчика)

| Задача | Куда идти |
|---|---|
| Добавить/изменить экран аппки | `application/src/pages/*` + зарегистрировать в `app/routes.jsx` |
| Тронуть глобальный state | `application/src/store/use*Store.js` (не забыть reset в `useAuthStore.logout`) |
| Изменить формулы состояния | `application/src/utils/scoreCalc.js` + `docs/09-formulas.md` |
| Работа с аудио | `application/src/hooks/useAudio.js` + `usePlayerStore.js` |
| Шейдеры/фон | `application/src/components/{AppBackground,AmorphSphere,OnboardingFog}.jsx` + `docs/05-shaders.md` |
| Новый API-эндпоинт | `backend/src/routes/*.js` (зарегистрировать в `src/index.js`) |
| Изменить модель БД | `backend/prisma/schema.prisma` + написать идемпотентный `sql/00N_*.sql` (НЕ полагаться только на db push) |
| Логика оплаты | `backend/src/routes/payments.js` + `utils/yookassa.js` |
| Пуши | `backend/src/jobs/notifier.js` + `routes/notify.js` + `utils/pushPhases.js` |
| Telegram-бот | `backend/src/routes/tg.js` + `utils/tgBot.js` (транспорт через relay) |
| CMS-экран | `cms/src/pages/*.jsx` + `lib/api.js` |
| Юр. документы (оферта/политика) | CMS «Юр. документы» -> `LegalDoc` -> `/api/content/legal`; рендер текста — `application/components/ui/LegalBody.jsx`, страница `/legal/:slug`; фолбэк-PDF — `application/constants/legal.js` (docs/41) |
| Заголовки секций главной | CMS «Блоки» -> `BlockMeta` -> `content.js` /blocks (+ дефолты `blockDefaults.js`) |
| Деплой | `AGENTS.md` раздел «Прод» + `docs/37` (актуальная zero-downtime последовательность) |
| Контекст решений клиента | память `project_med_app_business.md`, доки `docs/24`, `docs/34` |

**Точки входа для чтения:** `AGENTS.md` (контракт) -> `docs/01-architecture.md` -> `application/src/app/App.jsx` -> `backend/src/index.js` -> `backend/prisma/schema.prisma`.

---

## 8. Code Conventions (соглашения)

1. **Язык кода/комментариев:** русский в комментариях и UI-текстах; идентификаторы — английские camelCase.
2. **Формат:** ESM везде на бэке (`import`/`export`), JSX на фронте. TypeScript НЕ используется.
3. **State:** Zustand vanilla `create`, персист вручную через localStorage (не middleware). Каждый новый пользовательский стор обязан очищаться в `useAuthStore.logout`.
4. **API-клиент:** единый axios instance с interceptor'ами; базовый URL из env (`VITE_API_URL || '/api'`).
5. **Оптимистичные апдейты + offline-очередь** для пользовательских действий (чек-ин, completion).
6. **Роут-переходы строго opacity-only** (никаких transform/filter на уровне route-контейнера).
7. **БД:** любое изменение схемы -> идемпотентный SQL (`IF NOT EXISTS`, перехват `duplicate_object`) для zero-downtime на проде, параллельно с обновлением `schema.prisma`.
8. **Два auth-контура** строго раздельны (claim `kind:'admin'`); деструктивные admin-операции за `requireAdmin` (role=admin).
9. **Единые источники правды:** фазы пушей — `utils/pushPhases.js`; формулы — `utils/scoreCalc.js`; бренд-акцент `#6145c2`; дефолты блоков — `blockDefaults.js`. Не дублировать логику.
10. **Иконки — только inline SVG.** Эмодзи запрещены во всём (код, UI, письма, бот).
11. **Крупные правки документируются** отдельным `docs/NN-*.md` (NN — следующий по порядку).
12. **Шрифты:** Manrope (всё) + JetBrains Mono (label/eyebrow/таймкоды). Unbounded не использовать.
13. **Проверка перед деплоем:** обязательный `npm run build`; никаких headless-браузеров на WebGL-страницах.
14. **Дизайн-токены:** фон Night sky (`#0a0714`..`#231a42`), fg (`#f4f0ff`..`#463e62`), single-hue акцент `#6145c2`, HUE-тема дня (4 слота).

---

## 9. Прод и деплой (справка)

- **Прод:** `all-relaxme.ru` -> Selectel `87.228.61.44`, Ubuntu 22.04, Caddy + Let's Encrypt.
- **Раскладка:** `/` -> `application/dist`; `/manage/` -> `cms/dist`; `/promo/` -> `landing/dist` (заглушка); `/api/*` -> Fastify :3001 (loopback); БД `meditation_app`; systemd `meditation-api`.
- **Деплой (zero-downtime):** `ssh root@87.228.61.44` -> `git pull --ff-only` -> накатить SQL-миграции через `psql -f` -> `npm install && npx prisma generate` (backend) -> пересобрать `application` + `cms` -> `systemctl restart meditation-api`. **Лендинг НЕ билдить.** Watchdog (`/usr/local/bin/relaxme-watchdog`) `git pull` не обновляет — копию перекладывать вручную.
- **Границы:** проект сдан 10.06.2026. Всё после — billable-сопровождение (см. память `project_med_app_support.md`).
