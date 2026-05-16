# 15 — Strapi CMS implementation log

Живой лог выкатки Strapi для медитационного приложения. Обновляется
по ходу работ: что сделано, что упало, что заблокировано.

Дата старта: 2026-05-05.
Конечная цель: админ через `http://<host>/cms/admin` может заливать
аудио (практики, голос, музыка) — и контент сразу появляется в
приложении на `http://<host>/`.

См. также:
- [13-client-brief.md](13-client-brief.md) — что просили у клиента.
- [14-work-plan.md](14-work-plan.md) — план работ, поток 2 (Strapi).

---

## Архитектура (целевая)

```
                          Caddy (port 8081)
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
        /  (default)      /cms/admin/*      /cms/api/*
              │            /cms/uploads/*
              │                 │                 │
         React-фронт          ┌─┴─────────────────┴─┐
         (dist/)              │  Strapi v5 :1337    │
                              └─────────┬───────────┘
                                        │
                              ┌─────────┴───────────┐
                              │ Postgres :5432      │
                              │   db: meditation_cms │
                              └─────────────────────┘
```

Кастомный Node-бэк (auth, прогрессия, ЮKassa) — отдельный поток 1,
здесь не трогаем.

## Контент-модель (целевая)

**Practice**
- `title` — string, required
- `block` — enum: `relaxation` / `awareness` / `author`, required
- `audio` — media, single, required, mime: `audio/*`
- `duration_sec` — integer, заполняется лайфсайклом из mp3-метаданных
- `description` — text, optional
- `price` — integer, optional (только для `author`)
- `order` — integer, default 0 (сортировка внутри блока)
- `month_slot` — integer, optional (для месячной ротации Осознанности)
- `published_at` — стандартное Strapi-поле draft/publish

**Voice**
- `name` — string, required (например «Мужской», «Женский»)
- `code` — string, required, unique (например `male`, `female` — фронт
  читает по нему)
- `audio_full` — media, single, required
- `audio_preview` — media, single, required (5–10 сек)
- `active` — boolean, default true
- `order` — integer

**Music**
- `title` — string, required
- `audio_full` — media, single, required
- `audio_preview` — media, single, required (5–10 сек)
- `active` — boolean, default true
- `order` — integer

## Public-роль permissions (целевые)

| Content type | find | findOne | create | update | delete |
|---|---|---|---|---|---|
| Practice | ✔ | ✔ | — | — | — |
| Voice | ✔ | ✔ | — | — | — |
| Music | ✔ | ✔ | — | — | — |
| Upload (`/api/upload/files`) | ✔ | ✔ | — | — | — |

Все mutations — только за залогиненным Editor/Super Admin в `/cms/admin`.

---

## Чеклист выполнения

Каждый пункт обновляется на месте: `[ ]` → `[~]` (в процессе) →
`[x]` (готово). Если упало — `[!]` + строка с причиной.

### Phase 0 — Prep
- [x] Создан этот лог.
- [x] Подтянуты актуальные доки Strapi v5 (установка + Postgres).
  - Команда установки: `npx create-strapi@latest --dbclient postgres --skip-cloud --non-interactive`
  - Min Node: v20 (имеем v22 на VPS).
  - Min Postgres: 14.0 (рекомендуют 17).
  - Env-vars: `DATABASE_CLIENT=postgres`, `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD`, опц. `DATABASE_SCHEMA`, `DATABASE_SSL`.
- [!] VPS-пробинг — **заблокирован**: `sshpass` дал `Permission denied`
  после серии попыток. Возможен fail2ban-лок IP или ротация пароля.
  Ждём отклик пользователя.

### Phase 0.5 — Локальный стейджинг (пока ждём VPS)
- [x] `cms-stage/src/api/practice/content-types/practice/schema.json`
- [x] `cms-stage/src/api/voice/content-types/voice/schema.json`
- [x] `cms-stage/src/api/music-track/content-types/music-track/schema.json`
  (singular `music-track`, plural `music-tracks` — чтобы не получить
  кривое `musics` от автопрала Strapi).
- [x] `cms-stage/src/api/practice/.../lifecycles.js` — auto-detect
  `duration_sec` через `music-metadata`, knex-update минуя
  entity-service (защита от рекурсии).
- [x] `cms-stage/README.md` — как применить после установки Strapi
  + permissions для public-роли + список эндпоинтов.
- [x] `src/api/cms.js` — обёртка над Strapi REST (`fetchPractices`,
  `fetchPractice`, `fetchVoices`, `fetchMusic`). База — `VITE_CMS_URL`
  с дефолтом `/cms`. Нормализует Strapi-ответ в шейп `mockPractices`.
- [x] `src/api/practices.js` — добавлен слой `USE_CMS` поверх
  старого `USE_MOCK`. 60-сек in-memory cache. Фронт переключается
  одним env-флагом `VITE_USE_CMS=true`.
- [x] `npm run build` — зелёный после правок.

### Phase 1 — Server side
- [ ] Установлен PostgreSQL (если не было).
- [ ] Создана БД `meditation_cms` + роль `strapi` со своим паролем.
- [ ] `npx create-strapi-app@latest /opt/meditation-cms`
      (postgres, no quickstart, no cloud).
- [ ] Перенесён `JWT_SECRET / ADMIN_JWT_SECRET / APP_KEYS` в `.env`
      (генерируются автоматом установщиком — фиксируем, чтобы при
      перезапуске не потерять админов).
- [ ] `config/server.js` — `url: 'http://212.43.148.208:8081/cms'`.
- [ ] systemd-юнит `/etc/systemd/system/meditation-cms.service`,
      `systemctl enable --now meditation-cms`.
- [ ] Caddy site `/etc/caddy/sites/meditation-cms.caddy`:
      handle_path `/cms/*` → reverse_proxy :1337.
- [ ] Создан первый суперюзер админки.
- [ ] Открыт `http://212.43.148.208:8081/cms/admin` → видна форма
      логина.

### Phase 2 — Content
- [ ] Schema-файлы для Practice / Voice / Music положены в
      `src/api/<type>/content-types/<type>/schema.json`.
- [ ] `npm install music-metadata`.
- [ ] Лайфсайкл-хук `src/api/practice/content-types/practice/lifecycles.js`
      — `afterCreate` / `afterUpdate` читают `audio.url`, дёргают
      `music-metadata`, пишут `duration_sec`.
- [ ] Public-роль permissions выставлены через UI или
      bootstrap-скрипт.
- [ ] Сидинг: 3 relaxation + 6 awareness + 2 author + 2 voice +
      3 music. Placeholder-mp3 — текущий `mockAudioUrl` (10 мин
      silence) до прихода клиентских файлов.

### Phase 3 — Frontend integration
- [ ] `src/api/cms.js` — обёртка над `fetch('/cms/api/...')`.
      Нормализует Strapi-ответ (вытащить из `attributes`, развернуть
      `data.media.url`).
- [ ] Переключаемая обёртка в `src/api/practices.js`: если
      `VITE_USE_CMS=true` — берём из `cms.js`, иначе fallback на
      `mock.js`.
- [ ] Аналогично — для `usePlayerStore` голос/музыка (читаем из
      `/cms/api/voices`, `/cms/api/music`).
- [ ] Smoke: открыть Home, увидеть карточки практик из CMS, нажать
      play → услышать аудио с `/cms/uploads/...`.

### Phase 4 — Polish
- [ ] Editor-роль (не Super Admin) — отдельный аккаунт для клиента.
- [ ] Бэкап БД: ежедневный `pg_dump` в `/var/backups/cms/*.sql.gz`.
- [ ] README в `/opt/meditation-cms/README.md` — как обновлять,
      перезапускать, бэкапить.
- [ ] Запись в `docs/14-work-plan.md` — поток 2 ✅.
- [ ] Запись в `docs/99-session-changelog.md` — Phase 19.

---

## Сноски / решения по ходу

(Раздел будет дописываться по мере выкатки. Сюда складываем любые
неочевидные моменты: на что наткнулись, как решили, что отложили.)
