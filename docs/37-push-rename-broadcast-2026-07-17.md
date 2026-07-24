# 37 — Пуши для всех, фазы дня, Пуш/email рассылка, rename (2026-07-17)

SUPPORT-заход (billable, после сдачи 10.06). Пять связанных задач по жалобе
«пуши приходят только разработчику» + расширение CMS. Момент старта приложения
НЕ трогали.

## 1. Пуши доходят ВСЕМ, а не только разработчику

**Диагноз (не баг notifier'а):** `notifier.js` шлёт на `user.tgUserId`. Хардкода
chat_id разработчика НЕТ. У @gochev пуши шли потому, что только у него `tgUserId`
проставлен (легаси со старой эры). У остальных `tgUserId = null` → нет получателей.
Стартовый `/start`-пуш приходил всем, потому что webhook отвечает на `msg.chat.id`
напрямую — это echo на команду, а не запланированный пуш. Запланированные (по фазам)
требуют привязанный `tgUserId`.

**Фикс — авто-привязка при запуске Mini App:**
- Бэк: `POST /api/notify/tg-capture {initData}` (`routes/notify.js`) — проверяет
  HMAC-подпись initData через `TG_BOT_TOKEN` (`verifyTgInitData`) и ставит
  `tgUserId` ТЕКУЩЕМУ залогиненному юзеру (в транзакции отвязывает от чужого
  авто-шелла, включает `NotifyPrefs`).
- Фронт: `hooks/usePlatformAuth.js` — после TG SDK `ready()` тихо (fire-and-forget)
  шлёт `captureTgUser(WebApp.initData)`. Ждёт появления `auth_token` до ~30с
  (логин обычно сразу), гуард `sessionStorage.tg_captured`. **Момент старта не
  меняется** — это фоновый эффект после рендера.
- Deep-link «Подключить Telegram» в Профиле остаётся как фолбэк (PWA-юзеры вне TG).

## 2. Фазы дня (утро/день/вечер) вместо 4 слотов

Было: 4 фиксированных слота 08/12/16/20, фраза жёстко в одном (выпадашка).
Стало: 3 фазы — **утро 09:00 / день 14:00 / вечер 20:00** (по TZ юзера), фраза
привязана к нескольким фазам через чекбоксы.

- Prisma `PushPhrase`: `slot` → nullable (legacy), добавлено `phases String`
  (comma-join `morning,day,evening`). `serializePhases/parsePhases/PHASES` — в
  `utils/pushPhases.js` (единый источник для notifier и admin-роута). Время фаз
  переопределяется env `PUSH_MORNING_HOUR/PUSH_DAY_HOUR/PUSH_EVENING_HOUR`.
- `notifier.js` итерирует фазы, `lastSlotKey = YYYY-MM-DD-<phase>`.
- CMS `pages/PushPhrases.jsx`: чекбоксы фаз в редакторе, чипы фаз в списке.

## 3. Пуш/email рассылка (новый раздел = расширенный старый)

Раздел «Email-рассылки» → **«Пуш/email рассылка»** (`cms/pages/Broadcasts.jsx`,
`Shell.jsx` nav + crumb). Два канала:
- **email** — фирменное HTML-письмо (как было).
- **telegram** — пуш об оффлайн-мероприятии по базе привязавших TG,
  **опционально с картинкой**.
- Prisma `BroadcastJob`: `channel String @default("email")`, `imageUrl String?`.
- `tgBot.js`: `sendPhoto(chatId, url, caption)`. `media.js`: `isAllowedImage` +
  `saveImageStream`. Аплоад: `POST /api/admin/broadcasts/image` → абсолютный
  https-URL (Telegram сам подтягивает картинку; база URL из `PUBLIC_APP_URL` /
  `TG_MINI_APP_URL`, дефолт `https://all-relaxme.ru`).
- `broadcastWorker.js`: ветка `channel==='telegram'` — рассылает `sendPhoto`/
  `sendMessage` пачками по 25/мин, аудитория считается по `tgUserId`.

## 4. Rename (только пользовательский текст, НЕ инфра)

Бренд `Meditation` → `Relax Me`, «медитаци…» → «расслаблени…». **Инфру не трогали**
(БД `meditation_app`, systemd `meditation-api`, `/opt/meditation-app`, npm/git —
их переименование сломало бы прод).
- `application/index.html` title, `public/manifest.webmanifest` (name/description),
  `pages/Auth/AuthShell.jsx`.
- `backend/routes/tg.js` WELCOME, `utils/emailTemplates.js` (все subject/тела),
  `jobs/broadcastWorker.js` футер письма.
- `landing/` (App/Footer/Faq/LoginOverlay/index.html) — **исходники** переименованы;
  прод отдаёт заглушку (`landing/dist/index.html`), реальный лендинг в
  `.bak.real`. `build:landing` перезапишет заглушку — при деплое лендинг НЕ
  билдить, либо восстановить заглушку после.

## Деплой (zero-downtime)

```bash
ssh root@87.228.61.44
cd /opt/meditation-app && git pull --ff-only
# 1. Миграции БД (идемпотентны)
psql "$DATABASE_URL" -f backend/sql/006_push_phases.sql
psql "$DATABASE_URL" -f backend/sql/007_broadcast_channel.sql
# 2. Backend: клиент Prisma + рестарт
cd backend && npm install && npx prisma generate && cd ..
# 3. Фронт + CMS (лендинг НЕ билдим — заглушка!)
cd application && npm install && npm run build && cd ..
cd cms && npm install && npm run build && cd ..
systemctl restart meditation-api
```

Env (опц.): `PUBLIC_APP_URL=https://all-relaxme.ru`, `TG_BOT_TOKEN` (уже есть).
Бэкфилл `006` переносит старые фразы: 08:00→утро, 12/16:00→день, 20:00→вечер.

## Автотесты (локально, до деплоя)

Прогнан E2E-харнесс на РЕАЛЬНОМ эфемерном Postgres (embedded-postgres) + фейковый
Telegram API + Fastify inject: **36/36 assert'ов зелёные**. Покрыто:
- tg-capture: валидный initData → tgUserId проставлен; подделка HMAC → 401; без
  токена → 401; перепривязка занятого tgId (unique не рушится).
- push-phrases: создание с чекбоксами фаз, пустой список → 400, невалидная фаза
  → 400, PUT меняет фазы, admin-гейт 401.
- notifier: фаза morning → реальная отправка на нужный chat_id с текстом фразы;
  антидубль по lastSlotKey; фаза без фраз → тишина.
- рассылка: preview по каналу; загрузка картинки → абс. URL; telegram-broadcast
  → sendPhoto с photo+caption получателю, sent/done; email → outbox, бренд «Relax
  Me», sent/done.
- миграция 006: бэкфилл 08→morning / 16→day / 20→evening; идемпотентность.

Харнесс временный (удалён после прогона), в репо не коммитился.

## E2E проверка после деплоя
1. Открыть Mini App в Telegram залогиненным → БД: `tgUserId` проставился →
   Профиль → «Тест-пуш» доходит.
2. CMS → Тексты пушей → создать фразу с чекбоксами утро+вечер → сохранить.
3. CMS → Пуш/email рассылка → Telegram + картинка → отправить на себя.
4. Дождаться фазы (или временно `PUSH_*_HOUR`=текущий час) → пуш «начало практики».
