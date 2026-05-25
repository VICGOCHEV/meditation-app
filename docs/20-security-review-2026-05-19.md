# 20 — Security review (2026-05-19)

Аудит всей системы: фронтенд, бэкенд (Fastify), CMS (Strapi). Поверхности: auth, инъекции, XSS, CORS, заголовки, зависимости, авторизация на эндпоинтах.

Легенда: 🟥 критично · 🟧 высокое · 🟨 среднее · 🟦 низкое / accepted risk.

---

## A. Бэкенд (Fastify + Prisma + Postgres)

### A1 🟥 КРИТИЧНО — уязвимый `fast-jwt` через `@fastify/jwt@9.x`

`npm audit` находит 6 CVE в `fast-jwt` (транзитивная зависимость), включая:
- **JWT auth bypass из-за пустого HMAC-секрета** (GHSA-gmvf-9v4p-v8jc).
- Algorithm Confusion (GHSA-mvf2-f6gm-w987).
- Cache Confusion — токен одного пользователя может вернуть claims другого (GHSA-rp9m-7r4c-75qg).
- ReDoS через `allowed*` (CPU-exhaustion DoS).

Фикс — `@fastify/jwt@10.x` (breaking change). После апгрейда — прогнать E2E.

```bash
cd backend && npm install @fastify/jwt@^10
```

### A2 🟥 КРИТИЧНО — HTTP вместо HTTPS

Прод-сервер `188.137.177.136` отдаёт всё по голому HTTP. Это означает:
- Пароли пользователей и админа Strapi передаются открытым текстом.
- JWT-токены утекают на любом hop'е между клиентом и сервером.
- Нет HSTS защиты (фронт уязвим к downgrade-атаке).

Фикс — после получения домена от клиента: Caddy сам подтянет Let's Encrypt-сертификат. До этого момента — это блокер для прод-релиза, не для разработки.

### A3 🟧 ВЫСОКОЕ — нет rate-limiting на auth-эндпоинтах

`/api/auth/login` и `/api/auth/register` принимают неограниченное число запросов с одного IP. Открыт brute-force паролей и enumeration пользователей.

Фикс:
```bash
npm install @fastify/rate-limit
# в index.js
await app.register(rateLimit, { max: 10, timeWindow: '1 minute', skipOnError: false })
# и persist limits в Redis, если масштаб > 1 инстанса
```

### A4 🟧 ВЫСОКОЕ — CORS отражает любой Origin

Конфиг `origin: true, credentials: true` (`src/index.js:19`) означает: бэк возвращает `Access-Control-Allow-Origin: <тот origin, что прислал клиент>` с `Access-Control-Allow-Credentials: true`. Проверено:

```
$ curl -X OPTIONS -H "Origin: https://evil.com" ... /api/auth/login
Access-Control-Allow-Origin: https://evil.com
Access-Control-Allow-Credentials: true
```

Сейчас JWT хранится в localStorage и куки не используются, так что CSRF-эксплойт ограничен. Но если когда-либо переключимся на cookie-based auth — мгновенный CSRF.

Фикс — белый список:
```js
const allowed = ['https://meditation.app', 'https://212.43.148.208:8081']
await app.register(cors, {
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true,
})
```

### A5 🟧 ВЫСОКОЕ — нет security-заголовков (`helmet`)

Backend не выставляет: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`. Strapi их выставляет (видно в `curl -I /admin`), а наш Fastify-API — нет.

Фикс:
```bash
npm install @fastify/helmet
# в index.js
await app.register(helmet, { contentSecurityPolicy: false })  // API не рендерит HTML
```

### A6 🟨 СРЕДНЕЕ — слабая валидация регистрации
- `password: { minLength: 6 }` — слишком слабо. Минимум 8, плюс хотя бы один не-буквенный.
- `identifier: { minLength: 3 }` — не проверяет email-формат. `!identifier.includes('@')` отбраковывает телефоны, но `"a@b"` пройдёт как email.
- Нет защиты от регистрации одноразовых email-адресов (на старте можно не делать).

Фикс — `pattern` в JSON-Schema для email и password complexity.

### A7 🟨 СРЕДНЕЕ — `auth/me` делает SELECT на каждый запрос

`middlewares/auth.js:13` — каждый authenticated request делает `db.user.findUnique`. Это создаёт IO-нагрузку и упрощает DoS на БД через большое число валидных JWT. Решается кешем (Redis, in-memory с TTL) или просто доверием claims из JWT для большинства роутов.

### A8 🟨 СРЕДНЕЕ — `practices/:id/complete` принимает любой string ID

Backend не валидирует, что `practiceId` существует в каталоге. Пользователь может POST'ить произвольные строки и накручивать `trackerDays` (а это влияет на бонус-эвалюатор). Эффект ограничен своим аккаунтом, но логика прогрессии становится манипулируемой.

Фикс — после стабилизации CMS-схемы: сверять ID с whitelist из Strapi или с регулярным выражением `/^(r|a|au)[1-9]$/`.

### A9 🟦 НИЗКОЕ / ACCEPTED — bcrypt rounds=10

Стандарт OWASP 2024 — 12 для production. На текущей нагрузке 10 безопасно, но если разово поднять `BCRYPT_ROUNDS=12` в `.env` — стоимость подбора х4.

### A10 🟦 НИЗКОЕ — error messages выдают существование email

`/auth/login` возвращает один и тот же текст "Неверный email или пароль" на оба случая — это правильно. Но `/auth/register` отдаёт `409 "Email уже зарегистрирован"` — это enumeration: можно скриптом проверять, есть ли почта в базе. Mitigation вместе с A3 (rate-limit).

---

## B. Frontend (React + Vite + Zustand)

### B1 🟧 ВЫСОКОЕ — `axios` 1.0–1.15.1 (prototype pollution)

`npm audit`: 2 HIGH-severity CVE в `axios` (GHSA-3w6x-2g7m-8v23, GHSA-q8qp-cvcw-x6jj). Фикс — `npm audit fix` (минорный апгрейд, без breaking changes).

### B2 🟨 СРЕДНЕЕ — JWT в localStorage уязвим к XSS

`src/store/useAuthStore.js:26` хранит токен в `localStorage`. Любой XSS = угон сессии. Это стандартный tradeoff для SPA, но документируем как accepted risk.

Mitigation: убедиться, что нет XSS sink'ов (см. B3), либо переехать на httpOnly cookies (потребует серверной CSRF-защиты и поменяет архитектуру).

### B3 🟦 НИЗКОЕ — `dangerouslySetInnerHTML` в `ShinyButton`

`src/components/ui/ShinyButton.jsx:192` — рендерит **статическую** CSS-строку `SHINY_CSS`, без участия пользовательского ввода. Безопасно.

### B4 🟦 НИЗКОЕ — содержимое `VITE_*` уходит в бандл

Все `VITE_*` env-переменные публичны (попадают в собранный JS). Сейчас там только URL'ы и числа (`VITE_API_URL`, `VITE_COMPANIONS_MIN/MAX`) — это норма. Главное — никогда не класть туда секреты (типа JWT-секрета или API-ключей).

---

## C. CMS (Strapi v5)

### C1 ✅ OK — admin закрыт регистрацией

`/admin/init` отвечает `{"hasAdmin":true}` — первичный super-admin создан, повторная регистрация заблокирована.

### C2 ✅ OK — public role даёт только read

`POST /cms/api/practices` → 403, `POST /cms/api/upload` → 403. Анонимный пользователь может только `find` / `findOne` на трёх content-types. Это соответствует задумке (фронт читает, клиент пишет через admin).

### C3 ✅ OK — security headers выставлены

Strapi отдаёт `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `CSP`, `Referrer-Policy` — `koa-helmet` дефолт.

### C4 🟧 ВЫСОКОЕ — admin-логин по HTTP

Та же проблема, что A2: пароль админа Strapi уходит по plaintext. Закрывается одновременно с A2 (домен + HTTPS).

### C5 🟨 СРЕДНЕЕ — лимиты на upload не проверены

Strapi по умолчанию принимает до **200 MB** в одном файле. Для mp3 практик это многовато, но не катастрофа. Стоит ограничить до 50 MB через `config/plugins.js`:

```js
upload: {
  config: {
    sizeLimit: 50 * 1024 * 1024,
    providerOptions: { localServer: { maxage: 300000 } },
  },
},
```

### C6 🟦 НИЗКОЕ — MIME-фильтрация при загрузке

Сейчас Strapi принимает любые типы. Стоит ограничить только аудио (`audio/mpeg, audio/mp4, audio/wav`) и изображения — через middleware на upload. Не критично, потому что доступ к upload только у админов.

### C7 🟦 НИЗКОЕ — публичные uploads без подписи

Загруженные mp3 раздаются с публичных URL `/uploads/...`. Кто угодно может скачать. Для премиальных практик ("Авторский" блок) это значит: один залогиненный пользователь может расшарить URL. Решается S3 + signed URLs на этапе перехода в прод (см. todo C5).

---

## D. Инфраструктура

### D1 🟥 КРИТИЧНО — нет бэкапов БД

Postgres с пользовательскими данными живёт на одном VPS, без cron-бэкапов и без репликации. Падение диска = потеря всего.

Фикс — простейший:
```bash
# /etc/cron.daily/pg-backup
0 3 * * * pg_dump meditation_app | gzip > /backup/$(date +\%F).sql.gz && find /backup -mtime +14 -delete
```

### D2 🟨 СРЕДНЕЕ — нет fail2ban на SSH

VPS открыт для SSH-bruteforce. Стандартная гигиена — `apt install fail2ban`, ban на 3 неудачные попытки.

### D3 🟨 СРЕДНЕЕ — root для приложений

`meditation-api.service` и `strapi.service` запущены от root. Должны быть отдельные unprivileged пользователи (`meditation`, `strapi`) с минимальными правами.

---

## Приоритезация (что сделать ДО передачи клиенту)

| # | Тяжесть | Действие | Эффорт |
|---|---|---|---|
| 1 | 🟥 | Апгрейд `@fastify/jwt` до 10.x | 30 мин |
| 2 | 🟧 | `npm audit fix` для axios | 5 мин |
| 3 | 🟧 | `@fastify/helmet` + `@fastify/rate-limit` | 1 час |
| 4 | 🟧 | CORS whitelist | 15 мин |
| 5 | 🟨 | Password complexity + email format в Joi | 30 мин |
| 6 | 🟥 | Cron `pg_dump` бэкапы | 30 мин |
| 7 | 🟧 | Strapi upload size limit | 15 мин |

Итого: ~3.5 часа работы для устранения всех 🟥/🟧.

🟥 HTTPS (A2/C4) и unprivileged users (D3) — после получения домена от клиента.

---

## Что НЕ нашёл (хорошие новости)

- Нет SQL-инъекций — везде Prisma с параметризованными запросами.
- Нет XSS-sink'ов в пользовательском коде (`dangerouslySetInnerHTML` только в одной статической CSS-вставке).
- Нет `eval` / `new Function` / `document.write`.
- Нет утечек секретов в git-истории (быстрая проверка `git log -S "JWT_SECRET"` — пусто).
- Strapi public-role конфигурация корректна — write-операции только админу.
- Prisma `onDelete: Cascade` правильно настроен — при удалении user'а вычистятся все его данные.
