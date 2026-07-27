# 39 — Пуши «всем, кто в боте»: подписчики бота как источник аудитории (2026-07-27)

SUPPORT-заход (billable, после сдачи 10.06). Смена модели доставки пушей по
требованию клиента: **слать всем, кто есть в боте, а не только привязанным к
аккаунту через `tgUserId`** — с учётом настроек пушей в самом приложении.

## Проблема со старой моделью (doc 37)

Notifier и Telegram-рассылка выбирали получателей по `User.tgUserId`. Это поле
проставлялось только через привязку к аккаунту (легаси tg-init / deep-link /
авто-capture). Люди, которые просто нажали Start в боте, но не привязали
аккаунт, в выборку не попадали. Клиент: «tgUserId — тестовая привязка, надо
слать всем, кто в боте».

Плюс базовое ограничение платформы (подтверждено доками core.telegram.org):
у `sendMessage` параметр `chat_id` — **обязательный**, метода «отправить всем
пользователям» в Telegram нет. Значит «всем» = хранить chat_id каждого, кто
писал боту. Раньше этот список нигде не сохранялся — вебхук на `/start` просто
отвечал приветствием и **не персистил** chat_id.

## Решение — таблица подписчиков бота `TgSubscriber`

Новая сущность = ИСТОЧНИК аудитории пушей. Один `chat_id` = один подписчик.

- `chatId` (unique), `enabled` (доставлять ли), `timezone`, `lastSlotKey`
  (антидубль фазы), `userId?` (привязка к аккаунту), `username/firstName`,
  `lastSeenAt`.
- Миграция `sql/008_tg_subscribers.sql` — создаёт таблицу + FK на User (SET
  NULL) + **бэкфилл**: все существующие `User.tgUserId` становятся
  подписчиками (enabled/timezone из их `NotifyPrefs`). Идемпотентно.

### Кто попадает в подписчики
- **Вебхук `routes/tg.js`** — `touchSubscriber()` апсертит подписчика на **любое
  входящее сообщение**. `/start` → `enabled=true` (вкл), `/stop` → `enabled=false`
  (отписка для тех, у кого нет аппки), прочее — не трогает `enabled`.
- **Авто-capture `POST /notify/tg-capture`** — при запуске Mini App: `chat_id =
  tgId`, привязывает `userId`, enabled/timezone из `NotifyPrefs`.
- **Deep-link `/start link_<code>`** — `linkTelegramByCode` привязывает `userId`
  и включает доставку.

### Как учитываются настройки пушей из приложения
- Тумблер «Напоминания» и таймзона (`PATCH /notify/prefs`) **зеркалятся** в
  привязанного подписчика (`enabled`, `timezone`) — настройки в апп авторитетны
  для доставки.
- `audience` (free/paid) для выбора фразы считается по подписке **привязанного**
  аккаунта; у **bot-only** подписчиков (`userId=null`) — дефолт МСК / `free`.
  Решение клиента: bot-only юзерам **слать по умолчанию** (отписка — `/stop`).

## Изменённые места

- **`prisma/schema.prisma`** — модель `TgSubscriber` + relation `User.tgSubscriber`.
- **`backend/sql/008_tg_subscribers.sql`** — миграция + бэкфилл.
- **`utils/tgBot.js`** — `call()` прокидывает `error_code`/`description`;
  `isDeadChatError()` (403 / «bot was blocked» / «user is deactivated» / «chat
  not found»).
- **`routes/tg.js`** — `touchSubscriber()`, `/stop`, `/start` re-enable,
  привязка подписчика в `linkTelegramByCode`.
- **`routes/notify.js`** — `tg-capture` создаёт/привязывает подписчика; `PATCH
  /prefs` зеркалит enabled/timezone в подписчика.
- **`jobs/notifier.js`** — итерирует `TgSubscriber where enabled=true` (не
  `User.tgUserId`), audience по привязанному аккаунту, кэш фраз на тик, гасит
  подписчика при `isDeadChatError`.
- **`routes/admin/broadcast.js`** — `buildEmailWhere` (User) + `buildTgSubscriberWhere`
  (подписчики) + `countAudience`. Telegram-охват теперь = подписчики бота.
- **`jobs/broadcastWorker.js`** — telegram-ветка шлёт по `TgSubscriber.chatId`.
  Мёртвые чаты в рассылке НЕ гасим (иначе `skip/offset`-пагинация съедет и
  пропустит живых) — их вычищает notifier по фазам.
- **`cms/pages/Broadcasts.jsx`** — подпись охвата: «все, кто в боте (не нажимал
  /stop)».

`tgUserId` остаётся — но только для авто-логина в Mini App, **больше не условие
доставки пуша**.

## Деплой (zero-downtime, лендинг НЕ билдим)

```bash
ssh med-prod
cd /opt/meditation-app
git rev-parse HEAD > /tmp/deploy_prev_commit.txt
pg_dump "$DATABASE_URL" | gzip > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql.gz
git pull --ff-only
psql "$DATABASE_URL" -f backend/sql/006_push_phases.sql       # если ещё не прогнан
psql "$DATABASE_URL" -f backend/sql/007_broadcast_channel.sql # если ещё не прогнан
psql "$DATABASE_URL" -f backend/sql/008_tg_subscribers.sql    # новое
cd backend && npm install && npx prisma generate && cd ..
systemctl restart meditation-api
cd application && npm install && npm run build && cd ..
cd cms && npm install && npm run build && cd ..
# ЛЕНДИНГ НЕ БИЛДИТЬ — затрёт заглушку /promo/
```

## Что сказать людям, чтобы шли пуши
- **Кто в Telegram**: открыть Mini App внутри Telegram один раз (авто-capture),
  ИЛИ просто нажать Start в боте — оба варианта делают получателем. Настройки —
  Профиль → Напоминания. Отписка — `/stop` в боте.
- Перезапускать бота не нужно — важно, что после деплоя список подписчиков
  начинает наполняться и notifier/рассылка шлют по нему.

## Проверка после деплоя
1. `SELECT count(*) FROM "TgSubscriber" WHERE enabled;` — до/после, растёт по
   мере того, как люди пишут боту / открывают Mini App.
2. Написать боту `/start` с другого аккаунта → в таблице новый подписчик
   enabled=true → дождаться фазы (или `PUSH_*_HOUR`=текущий час) → пуш дошёл.
3. `/stop` → enabled=false → пуши прекратились.
4. CMS → Пуш/email рассылка → Telegram, аудитория «Все» → охват = число
   подписчиков (а не 1).

## Проверено локально
`npx prisma generate` ок, `node --check` по всем изменённым файлам ок, `cms`
собирается. E2E на живой БД — на деплое (embedded-postgres харнес не гонял).
