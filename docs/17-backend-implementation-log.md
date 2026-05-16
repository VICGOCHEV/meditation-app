# 17 — Backend (Node + Postgres + Auth + Progression) — implementation log

Поток 1 из `docs/14-work-plan.md`. Цель: вынести всю прогрессию и
auth с клиента на сервер (как требует ТЗ — «строго на сервере»).

Дата старта: 2026-05-16.

См. также:
- `docs/14-work-plan.md` — общий план потоков.
- `docs/15-strapi-implementation-log.md` — CMS уже задеплоен на тот же
  VPS, бэкенд встаёт рядом.

---

## Архитектура (целевая)

```
                      Caddy (port 80)
   ┌─────────────────────┼─────────────────────────────┐
   │                     │                             │
   /  (default)     /admin*, /content-manager*,    /api/*
   ↓                /upload*, /cms/*                   ↓
React (dist)       ↓                              ┌──────────────────────┐
                   ↓                              │ meditation-api :3001 │
              ┌─────────────────────┐             │ Fastify + Prisma     │
              │  Strapi CMS :1337   │             │ Auth (JWT)           │
              │  /opt/meditation-cms│             │ Progression          │
              └──────────┬──────────┘             │ /opt/meditation-api  │
                         │                        └──────────┬───────────┘
                         │                                   │
                    ┌────┴────────┐                  ┌───────┴────────┐
                    │ Postgres    │                  │ Postgres       │
                    │ meditation_cms                 │ meditation_app │
                    └─────────────┘                  └────────────────┘
```

CMS и API живут в разных Postgres-БД, чтобы не было пересечения
миграций (Strapi сам ведёт свою schema-эволюцию; нашу контролируем
через Prisma).

## Стек (зафиксировано)

- **Runtime:** Node.js 22 (уже стоит на VPS под Strapi).
- **HTTP:** Fastify v5 (быстрее Express, встроенная schema validation,
  лучше для API-only сервиса).
- **ORM:** Prisma (schema-first, генерированный клиент, миграции
  через `prisma migrate`).
- **DB:** PostgreSQL 14.22 (уже стоит).
- **Auth:** `@fastify/jwt` + `bcrypt`. Простой long-lived JWT 7 дней,
  без refresh — для MVP достаточно. Refresh добавим если понадобится.
- **Язык:** JavaScript (как фронт и CMS). JSDoc-комменты на сложных
  местах.
- **Validation:** JSON Schema через Fastify routes-options
  (никаких лишних libs типа joi/zod — Fastify умеет нативно).

## DB-схема (Prisma)

```prisma
model User {
  id              Int           @id @default(autoincrement())
  email           String        @unique
  passwordHash    String
  name            String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  subscription    Subscription?
  completions     PracticeCompletion[]
  trackerDays     TrackerDay[]
  checkins        Checkin[]
  ktEntries       KtEntry[]
  bonusUnlocks    BonusUnlock[]
  unlockedAwareness UnlockedAwareness[]
}

model Subscription {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  active    Boolean  @default(false)
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UnlockedAwareness {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  practiceId String   // "a1".."a6"
  unlockedAt DateTime @default(now())

  @@unique([userId, practiceId])
}

model PracticeCompletion {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  practiceId  String   // any id ("r1", "a1", documentId from CMS)
  completedAt DateTime @default(now())
  positionSec Int      @default(0) // last saved position for resume

  @@unique([userId, practiceId])
}

model TrackerDay {
  id      Int      @id @default(autoincrement())
  userId  Int
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date    DateTime @db.Date  // calendar day, no time

  @@unique([userId, date])
}

model Checkin {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  q1          Int
  q2          Int
  q3          Int
  q4          Int
  is_         Int      @map("is")  // ИС, 0..40
  createdAt   DateTime @default(now())
}

model KtEntry {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  it          Float
  io          Float
  kt          Float
  answers     Json     // [q1..q10]
  createdAt   DateTime @default(now())
}

model BonusUnlock {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  practiceId  String   // "au1", "au2"
  grantedAt   DateTime @default(now())

  @@unique([userId, practiceId])
}
```

## REST-контракты (под существующие `src/api/*.js`)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{identifier, password}` | `{ok: true, challengeId}` |
| POST | `/api/auth/login` | `{identifier, password}` | `{token, user: {id, email, name}}` |
| POST | `/api/auth/verify` | `{code}` | `{token, user}` *(mock; реальный SMS позже)* |
| POST | `/api/auth/reset` | `{identifier}` | `{ok: true}` *(mock email)* |
| GET | `/api/auth/me` | — | `{user}` |
| GET | `/api/progress` | — | весь user state: `{subscription, unlockedPractices, completedPractices, trackerDays, lastDeepAnalysisDate, lastKT, ktHistory, bonusUnlocked}` |
| POST | `/api/practices/:id/complete` | — | `{ok, trackerAdded: bool}` |
| POST | `/api/checkin` | `{q1..q4}` | `{ok, IS}` |
| POST | `/api/deep-analysis` | `{answers, IT, IO, KT}` | `{ok, newlyUnlockedId, newlyUnlockedBonus[]}` |
| POST | `/api/subscription` | — | `{ok, expiresAt}` |
| DELETE | `/api/subscription` | — | `{ok}` |

Все защищённые роуты (всё кроме register/login/verify/reset) — за
auth-middleware, JWT в `Authorization: Bearer ...`.

## File layout

```
/opt/meditation-api/
  package.json
  prisma/
    schema.prisma
    migrations/
  src/
    index.js              # Fastify boot
    config.js             # env-driven config
    db.js                 # Prisma singleton
    middlewares/
      auth.js             # JWT verify, attach req.user
    routes/
      health.js
      auth.js
      progress.js
      practices.js
      checkin.js
      subscription.js
    utils/
      scoreCalc.js        # mirror frontend's calcIS/calcIT/calcIO
      progressionRules.js # unlockNextPractice, bonus eligibility
  .env
```

---

## Чеклист

### Phase A — Server scaffolding
- [ ] `/opt/meditation-api/` создан, `package.json` инициализирован
- [ ] Зависимости установлены (`fastify`, `@fastify/jwt`, `@fastify/cors`,
      `@prisma/client`, `prisma`, `bcrypt`)
- [ ] Postgres БД `meditation_app` + роль `api` с паролем (хранится в
      `/root/.api_db_password`)
- [ ] `prisma/schema.prisma` написан, `prisma migrate dev` прокатил
      первую миграцию
- [ ] `src/index.js` поднимает Fastify на 127.0.0.1:3001, отдаёт
      `GET /health → {ok}`
- [ ] systemd unit `/etc/systemd/system/meditation-api.service`,
      enabled + started, логи в `/var/log/meditation-api.log`
- [ ] Caddy: `@strapi`-matcher и `handle_path /cms/*` остаются;
      добавлен `handle_path /api/* { reverse_proxy 127.0.0.1:3001 }`
- [ ] Smoke: `curl http://188.137.177.136/api/health → 200 {ok:true}`

### Phase B — Auth
- [ ] `bcrypt` обёртки (`hash`, `verify`) в `utils/auth.js`
- [ ] JWT-сигнинг через `@fastify/jwt`, secret из env `JWT_SECRET`
- [ ] `POST /api/auth/register` — создаёт User с уникальным email
- [ ] `POST /api/auth/login` — email+password → JWT
- [ ] `GET /api/auth/me` (требует JWT) — возвращает `{user}`
- [ ] `POST /api/auth/reset` — mock, всегда `{ok:true}` (без SMTP)
- [ ] `POST /api/auth/verify` — mock для SMS-флоу (404, нет SMS пока)
- [ ] Smoke: register → login → me

### Phase C — Progress endpoints
- [ ] `GET /api/progress` — собирает state из всех таблиц
- [ ] `POST /api/practices/:id/complete` — добавляет в
      PracticeCompletion + TrackerDay (idempotent через `@@unique`)
- [ ] `POST /api/checkin` — пишет Checkin, считает IS, возвращает
- [ ] `POST /api/deep-analysis` — пишет KtEntry, вызывает
      `unlockNextAwareness()` + `tryUnlockBonus()`, возвращает что
      открылось
- [ ] `POST /api/subscription` — выставляет active=true, expires=+30d,
      выдаёт первую `a1` через UnlockedAwareness
- [ ] `DELETE /api/subscription` — active=false (доступ к открытым
      сохраняется; новых открытий нет)
- [ ] Smoke каждый endpoint

### Phase D — Frontend wiring
- [ ] `src/api/auth.js` — `USE_MOCK=false`-ветка уже есть, проверить
      что соответствует контракту
- [ ] `src/api/checkin.js` — то же
- [ ] `src/api/subscription.js` — то же
- [ ] Новый файл `src/api/progress.js` с `fetchProgress()`,
      `completePractice(id)` (переехала из `practices.js`)
- [ ] `useAuthStore.login()` — после получения токена дёргает
      `useProgressStore.loadFromServer()` и `useCheckinStore.loadFromServer()`
- [ ] `useProgressStore.loadFromServer()` — GET /api/progress, replace
      state. Мутирующие экшены становятся `async` — оптимистичный
      update локально + POST на сервер.
- [ ] `useCheckinStore` аналогично
- [ ] `.env` фронта: `VITE_USE_MOCK=false`, `VITE_API_URL=/api`
- [ ] Build → deploy → smoke

### Phase E — Deploy + docs
- [ ] Commit + push (несколько мелких коммитов по фазам)
- [ ] Сервер: pull, rebuild api + frontend, restart api
- [ ] E2E smoke в браузере: регистрация нового юзера → чекин → плеер
      → DA → данные в БД
- [ ] `docs/10-deploy.md` дополнен новым сервисом
- [ ] `docs/03-state-management.md` дополнен (бэк-синком)
- [ ] `docs/99-session-changelog.md` Phase 20

---

## Сноски / решения по ходу

(Дописывается во время работы.)
