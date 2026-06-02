# Telegram интеграция — состояние на 2026-06-02

**Статус:** инфра живая (бот отвечает, пуши пойдут), но **Mini App-логин на iPhone
залип** на `platform=unknown` + `initData=0b`. Решается через `/newapp` в BotFather
от клиента. Запаркован — продолжим когда клиент сделает.

Этот файл — **полный слепок** всего что сделано по TG, чтобы при возврате не
восстанавливать по обрывкам.

---

## 1. Что работает прямо сейчас

### Бот /start → welcome с inline-кнопкой
- Юзер пишет `/start` → бот отвечает приветственным сообщением + inline-кнопкой
  «Открыть приложение» (тип `web_app: { url }`)
- Webhook: `https://tg-relay-meditation.all-relaxme.workers.dev/api/tg/webhook`
- Telegram → CF Worker → наш бэк за 80-340мс

### Menu button у бота
- Тип: `web_app`
- Текст: «Начать расслабление»
- URL: `https://all-relaxme.ru/`
- Настроен через BotFather «Configure Mini App» / `/setmenubutton`

### Notifier (4 окна пушей)
- Cron на бэке каждую минуту
- Слоты: 08:00 / 12:00 / 16:00 / 20:00 по часовому поясу юзера
- Тексты: 4 free + 40 paid фраз (см. `backend/scripts/seed-push-phrases.js`)
- Profile: тумблер + dropdown TZ + тест-пуш

### Email/password логин
- Работает как раньше — `/auth/login` форма

---

## 2. Что НЕ работает

### iPhone Telegram Mini App: пустая `initData`
- Симптомы (debug блок Login.jsx):
  ```
  checked=true · tgCtx=false
  tgData: null
  WebApp: v=6.0 · platform=unknown · initData=0b
  hash: 7c · (empty)
  ```
- `platform=unknown` — Telegram открыл наш URL **НЕ в Mini App контексте**
- Шапка показывает «мини-приложение», но внутри Telegram не активирует Mini App API
- API version 6.0 — старая

### Корневая причина (гипотеза)
В BotFather у `@Pause_relax_bot` есть **«Simple Mini App»** (через `Configure
Mini App`), но **не зарегистрирован Direct Link Mini App** через `/newapp`.

Большинство современных клиентов работают со «Simple Mini App». Старые/web/macOS
App Store клиенты — нет. На iPhone тоже не работает (по-видимому, клиент юзера
не совсем актуальный, или Telegram считает что без `/newapp` Mini App
«неполноценный»).

### Что нужно сделать у клиента (когда вернёмся)
В чате с `@BotFather`:
1. `/newapp` → выбрать `@Pause_relax_bot`
2. **Title:** `Meditation`
3. **Description:** `Аудиопрактики расслабления и осознанности`
4. **Photo:** загрузить 640×360 PNG (любая)
5. **GIF:** `/empty` (пропустить)
6. **Web App URL:** `https://all-relaxme.ru/`
7. **Short name:** `Relaxme` (с большой R)

После этого:
- `t.me/Pause_relax_bot/Relaxme` станет настоящим Mini App link
- В коде уже захардкожен fallback под этот slug (см. `backend/src/utils/tgBot.js`
  старые версии), но мы откатились на `web_app: { url }`
- Можно вернуть `url: 't.me/Pause_relax_bot/Relaxme'` в inline-кнопке для бóльшей
  совместимости — но скорее всего `web_app:{url}` сам начнёт работать

---

## 3. Архитектура (как трафик ходит)

### Outgoing (наш бэк → Telegram API)
```
backend (Selectel, RU)
  ↓ HTTPS + X-Relay-Auth header
CF Worker (tg-relay-meditation.all-relaxme.workers.dev)
  ↓ HTTPS
api.telegram.org
```
Зачем: с Selectel TCP/443 к api.telegram.org режется DPI. Worker — релей вне РФ.

### Incoming (Telegram → наш бэк)
```
Telegram
  ↓ HTTPS POST с X-Telegram-Bot-Api-Secret-Token
CF Worker (тот же)
  ↓ HTTPS POST на BACKEND_BASE/api/tg/webhook
backend
```
Зачем: TCP вход от Telegram IP к нашему серверу тоже режется DPI.
Worker форвардит /api/* пути на BACKEND_BASE.

### Mini App открытие (что юзер видит)
```
Юзер в Telegram → жмёт menu button «Начать расслабление» (web_app type)
  ↓
Telegram открывает https://all-relaxme.ru/ в Mini App контексте
  ↓
Наш фронт должен прочитать window.Telegram.WebApp.initData
  ↓
POST /api/auth/tg-init с initData → бэк валидирует HMAC → JWT
  ↓
Юзер залогинен
```
**Где залипаем:** на шаге чтения initData — она пустая.

---

## 4. Конфигурация на проде

### `/opt/meditation-app/backend/.env` (TG-related)
```env
# Бот
TG_BOT_TOKEN=<секрет>

# CF Worker как двунаправленный relay
TG_API_BASE=https://tg-relay-meditation.all-relaxme.workers.dev
TG_RELAY_SECRET=kZ7mP3xQv9nR8tY5wL2sH4dF6gB1aJqV

# Webhook secret (Telegram добавит X-Telegram-Bot-Api-Secret-Token,
# бэк сверяет в tg.js)
TG_WEBHOOK_SECRET=<48 hex chars>

# Mini App URL для inline-кнопок welcome (default если не задан)
TG_MINI_APP_URL=https://all-relaxme.ru/
```

### CF Worker (`tg-relay-meditation.all-relaxme.workers.dev`)
Variables:
- `RELAY_SECRET=kZ7mP3xQv9nR8tY5wL2sH4dF6gB1aJqV` (Secret type)
- `BACKEND_BASE=https://all-relaxme.ru` (Text type)

Код: [deploy/tg-relay/worker.js](../deploy/tg-relay/worker.js)

### BotFather state
- Bot: `@Pause_relax_bot`, name «Meditation App»
- Simple Mini App: enabled, URL `https://all-relaxme.ru/`, Mode `Fullsize`
- Menu button: type `web_app`, text «Начать расслабление», URL `https://all-relaxme.ru/`
- **Direct Link Mini App (/newapp): НЕ создан** ← это и есть блокер

### Webhook у Telegram
- URL: `https://tg-relay-meditation.all-relaxme.workers.dev/api/tg/webhook`
- Secret token: set
- Allowed updates: message, callback_query

---

## 5. Код — где что лежит

### Backend
- [backend/src/utils/tgBot.js](../backend/src/utils/tgBot.js) — клиент TG API через relay,
  `webAppKeyboard`, `sendMessage`, `setWebhook`
- [backend/src/routes/tg.js](../backend/src/routes/tg.js) — webhook handler, `/start`,
  валидация secret_token
- [backend/src/routes/auth.js](../backend/src/routes/auth.js) — `/auth/tg-init` (HMAC проверка)
- [backend/src/jobs/notifier.js](../backend/src/jobs/notifier.js) — cron пуши
- [backend/scripts/tg-set-webhook.js](../backend/scripts/tg-set-webhook.js) — регистрация webhook
- [backend/scripts/seed-push-phrases.js](../backend/scripts/seed-push-phrases.js) — 4 free + 40 paid фраз

### Frontend
- [application/src/pages/Auth/Login.jsx](../application/src/pages/Auth/Login.jsx) —
  ShinyButton TG/VK + email fallback + polling детект + PlatformDebug
- [application/src/hooks/usePlatformAuth.js](../application/src/hooks/usePlatformAuth.js) —
  инициализация WebApp.ready/expand, header colors, BackButton (БЕЗ auto-login)
- [application/src/api/auth.js](../application/src/api/auth.js) — `tgInit(initData)`,
  `vkInit(searchParams)`

### CF Worker
- [deploy/tg-relay/worker.js](../deploy/tg-relay/worker.js) — двунаправленный relay
- [deploy/tg-relay/wrangler.toml](../deploy/tg-relay/wrangler.toml) — config для CLI деплоя
- [deploy/tg-relay/README.md](../deploy/tg-relay/README.md) — Web UI + CLI инструкции

---

## 6. Хронология коммитов 2026-06-01..02

| SHA | Что |
|---|---|
| `d29acfc` | TG-бот /start + SMTP-mailer + форма ОС (первоначальный деплой) |
| `e07c5ce` | TG_API_BASE env-override (готовлюсь к relay) |
| `0b02ed6` | CF Worker готов + secret-header в tgBot.js |
| `d79a19a` | Push-уведомления + копи формы ОС |
| `04fd217` | Login кнопки TG/VK + email fallback + логирование ошибок |
| `d7b4a40` | Login polling + видимый PlatformDebug |
| `d4ffa15` | Login debug: WebApp.platform/version + hash/search/tgWebAppData |
| `0f9f9c3` | TG: inline-кнопка через t.me deep link (потом откатили) |
| `e196e99` | Revert на web_app inline button (t.me link не валиден без /newapp) |
| `8a7578d` | Login: ShinyButton TG/VK + лоадер вместо мелькания |
| `542232f` | Login: TG-кнопка видна даже когда initData пустая + auto-login отключён |
| `7cfa4d6` | Login: SDK-first init + 3с polling + debug=1 |
| `bae8c69` | TEMP всегда показывать debug |
| `2bee737` | tgCtx только если реальный Telegram (platform не unknown) |

---

## 7. Что попробовать когда вернёмся

### Шаг 1 — Клиент делает /newapp в BotFather (см. секцию 2)

### Шаг 2 — Тест с iPhone после /newapp
- Закрыть Telegram → открыть → /start → жать inline-кнопку
- Ожидание: `platform=ios`, `initData=400+b`, кнопка «Войти через Telegram» работает

### Шаг 3 — Если всё ещё `platform=unknown`
- Попробовать `Change mode` в BotFather (Fullsize → Compact)
- Проверить версию Telegram на iPhone (нужно 10.0+)
- Возможно, перейти на `url: 'https://t.me/Pause_relax_bot/Relaxme'` инлайн-кнопку
  вместо `web_app: { url }` — после `/newapp` это сработает

### Шаг 4 — Когда залогинится
1. Profile → Напоминания → видна секция (не баннер «зайди через TG»)
2. «Прислать тестовый пуш» → пуш приходит в TG в течение пары секунд
3. Это закрывает весь TG-loop

### Шаг 5 — Прибраться
- Убрать `PlatformDebug` (или вернуть на `?debug=1`)
- Удалить `TG_MINI_APP_URL` если он совпадает с дефолтом
- Закоммитить с пометкой «TG login closed»

---

## 8. Что НЕ менять в коде до возврата

- `TG_API_BASE` и `TG_RELAY_SECRET` — relay уже работает, не трогать
- `TG_WEBHOOK_SECRET` — webhook регнут с ним, при изменении нужен ре-set
- CF Worker — код стабильный, не трогать без причины
- Notifier cron — работает, шлёт пуши тем кто залогинен через TG

---

## 9. Параллельные открытые вопросы (не TG)

- **SMTP через Selectel**: TCP/465 заблокирован. Юзер должен открыть тикет
  на разблокировку. См. диалог в чате.
- **ЮKassa боевые ключи**: ждём модерацию + клиент пришлёт shopId+secret_key
- **20:00 paid push: 10 вечерних фраз** — клиент дошлёт, обновим seed
