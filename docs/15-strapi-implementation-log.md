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

### Phase 1 — Server side (**ДЕПЛОЕНО на 188.137.177.136**)
- [x] PostgreSQL 14.22 установлен.
- [x] БД `meditation_cms` + роль `strapi` с автогенерированным паролем
      (хранится в `/root/.strapi_db_password` на сервере).
- [x] `npx create-strapi@latest /opt/meditation-cms` со всеми
      DB-флагами, `--js`, `--no-run`, `--no-git-init`, `--skip-cloud`.
- [x] `.env` сгенерён установщиком (APP_KEYS / ADMIN_JWT_SECRET /
      TRANSFER_TOKEN_SALT / API_TOKEN_SALT). Доустановили вручную:
      `JWT_SECRET` (для users-permissions plugin), `URL=http://188.137.177.136/cms`,
      `ADMIN_URL=/cms/admin`, `HOST=127.0.0.1`.
- [x] `config/plugins.js` — wired `users-permissions.jwtSecret` к
      env-vars.
- [x] systemd-юнит `/etc/systemd/system/meditation-cms.service`,
      enabled+started. Логи: `/var/log/meditation-cms.log`.
- [x] Caddy: главный `/etc/caddy/Caddyfile` — только `import`,
      сайт-конфиг `/etc/caddy/sites/meditation.caddy` слушает `:80`,
      `handle_path /cms/*` → `reverse_proxy 127.0.0.1:1337`,
      все остальные пути → `/opt/meditation-app/dist` (SPA fallback).
- [x] Суперюзер создан через `npx strapi admin:create-user` —
      `admin@meditation.local` / пароль в `/root/.strapi_admin_password`.
- [x] `http://188.137.177.136/cms/admin` отвечает 200.

### Phase 2 — Content
- [x] Schema-файлы для Practice / Voice / Music-track положены в
      `src/api/<type>/content-types/<type>/schema.json`.
- [x] Boilerplate factories: `controllers/<type>.js`,
      `routes/<type>.js`, `services/<type>.js` для всех трёх типов.
      Без них Strapi не регистрирует REST-эндпоинты —
      `/api/practices` отдавал 404.
- [x] `npm install music-metadata` в /opt/meditation-cms.
- [x] Лайфсайкл-хук
      `src/api/practice/content-types/practice/lifecycles.js` —
      `afterCreate` / `afterUpdate` читают `audio.url`, дёргают
      `music-metadata.parseFile`, пишут `duration_sec` через knex
      (минуя entity-service, защита от рекурсии).
- [x] Public-роль permissions — через `src/index.js` bootstrap hook
      идемпотентно гарантирует 6 разрешений (find/findOne × 3 типа).
      Подтверждено в БД через SQL JOIN.
- [ ] Сидинг: НЕ делали. Реальный клиент сделает через `/cms/admin`
      UI — это и есть основной use-case CMS. Когда зальёт аудио,
      duration подтянется лайфсайкл-хуком.

### Phase 3 — Frontend integration
- [x] `src/api/cms.js` — обёртка над `fetch('/cms/api/...')`.
      Группирует practices по блоку, разворачивает media URL,
      форматирует duration.
- [x] `src/api/practices.js` — переключаемая обёртка: `VITE_USE_CMS=true`
      берёт из cms.js, иначе fallback на mock.
- [x] **Refactor Home и Player**: раньше импортировали `mockPractices`
      и `findPractice` напрямую из `mock.js`, минуя wrapper —
      `cms.js` отрезался tree-shaker'ом. Теперь:
      - `Home` — initial state = mockPractices, useEffect зовёт
        fetchPractices(), при непустом ответе свапает state.
      - `Player` — initial state = findFromMock(id), useEffect зовёт
        fetchPractice(id), при непустом ответе свапает.
      - `audioUrl` падает на `mockAudioUrl` если CMS-запись пустая.
      - DA остаётся на mock (unlock-callouts завязаны на mock-id
        `a1..a6`; их разрулим когда поднимем user-progression бэк).
- [x] `.env` на сервере: `VITE_USE_CMS=true`, `VITE_CMS_URL=/cms`.
- [x] Smoke external: `/`, `/cms/admin`, `/cms/api/practices`
      → все 200. `/cms/uploads/test.mp3` → 404 (нет файлов; reverse-proxy
      прошёл — это не 502).

### Phase 4 — Polish
- [ ] Editor-роль (не Super Admin) — отдельный аккаунт для клиента.
- [ ] Бэкап БД: ежедневный `pg_dump` в `/var/backups/cms/*.sql.gz`.
- [ ] README в `/opt/meditation-cms/README.md` — как обновлять,
      перезапускать, бэкапить.
- [x] Запись в `docs/14-work-plan.md` — поток 2 в процессе (CMS уже
      онлайн, остался сидинг и polish).
- [ ] Запись в `docs/99-session-changelog.md` — Phase 19.

---

## Сноски / решения по ходу

### Сервер сменили на 188.137.177.136

Изначально CMS планировалась на 212.43.148.208:8081 (там жил фронт +
другой Next.js проект другого агента). Заказчик дал новый чистый бокс
`188.137.177.136` — Ubuntu 22.04, Node/Postgres/Caddy не было, /opt
пустой. Все деплои перенеслись сюда; старый бокс пока живой как
архив.

### Caddy сел прямо на :80

Бокс наш только, никто не конкурирует — Caddy слушает :80 без портов
в URL. Внутри modular config: главный Caddyfile = только `import
/etc/caddy/sites/*.caddy`, сайт = один файл meditation.caddy.

### Strapi missing jwtSecret

Strapi 5.46 installer не сгенерировал `JWT_SECRET` для
users-permissions plugin → сервис падал на bootstrap. Чинится
руками: `JWT_SECRET=$(node -e "...")` в `.env` + `config/plugins.js`
с `'users-permissions': { config: { jwtSecret: env('JWT_SECRET') } }`.

### Schema без routes/controllers/services = 404

Положить только `schema.json` мало — Strapi 5 не регистрирует
REST-эндпоинты, пока нет factory-файлов routes/controllers/services.
Минимальный boilerplate из 3 строк каждый, через
`factories.createCoreRouter('api::<type>.<type>')` и т. п.

### URL/ADMIN_URL под reverse-proxy

С `handle_path /cms/*` Caddy режет `/cms` префикс перед проксированием.
Strapi внутри слушает `/admin`, `/api`, `/uploads`. Чтобы Strapi
генерировал URLs с правильным префиксом — выставлены `URL=http://188.137.177.136/cms`
и `ADMIN_URL=/cms/admin`. Browser получает HTML/JSON со ссылками
`/cms/admin/*` и `/cms/uploads/*`, которые Caddy корректно проксирует
обратно.

### Frontend impractices.js обходился стороной

Home/Player/DeepAnalysis импортировали `mockPractices` / `findPractice`
прямо из `mock.js`. Wrapper `practices.js` с `USE_CMS`-флагом был dead
code → Vite его выкидывал. Решено: рефактор Home + Player на пару
"initial=mock, swap on CMS resolve". DA пока на mock (unlock-callouts
завязаны на статичные `a1..a6`, ждут user-progression бэк).

### Доступ к админке

`http://188.137.177.136/cms/admin`
Email: `admin@meditation.local`
Пароль: лежит в `/root/.strapi_admin_password` на сервере (не в репо!).
Через эту админку клиент сам заливает практики/голос/музыку — это и
есть основной use-case CMS.

### Caddy + admin URL: финальная конфигурация после трёх итераций

Пытались упаковать админку под `/cms/admin`. Итерации:

1. **`handle_path /cms/*` со strip всего** + дефолтный admin на /admin.
   Открыли /cms/admin → пришёл HTML, но `<script src>` указал
   `/admin/strapi-X.js` — этот путь поймал SPA-фолбэк, отдал
   index.html, MIME-mismatch, белый экран.
2. **Добавили `admin.url='/cms/admin'`** + пересобрали бандл. Теперь
   `<script src>` указывает `/cms/admin/strapi-X.js`. Но Strapi сдвинул
   и SPA, И admin API на путь `/cms/admin`. Со strip в Caddy —
   `/cms/admin` → Strapi `/admin` → 404.
3. **Split: admin no-strip + cms/* strip** + `STRAPI_ADMIN_BACKEND_URL=/cms`.
   Admin bundle стал звать API по `/cms/admin/init` (вместо
   `/admin/init`), а у Strapi с admin.url=/cms/admin API сидит ровно
   там же, где SPA — и `/cms/admin/init` возвращал HTML, не JSON.
   Browser получал HTML вместо JSON ответа `hasAdmin: true` → парс
   ломался → показывался экран первого запуска.

**4-я итерация (финальная).** После предыдущей правки Content Manager
показал спиннер навечно. По логам — SPA вызывал
`/content-manager/content-types`, а у нас в Caddy этого пути не было,
и SPA-фолбэк отдавал HTML вместо JSON. JSON-парс падал, react-query
ретраил → loader.

**Финал.** Все плагинные роуты Strapi проксируются через
матчер `@strapi`:

```
@strapi path /admin* /content-manager* /content-type-builder*
             /content-releases* /upload* /users-permissions*
             /i18n* /email* /review-workflows* /documentation*
             /webhooks*
handle @strapi { reverse_proxy 127.0.0.1:1337 }
handle_path /cms/* { reverse_proxy 127.0.0.1:1337 }
handle { /* React SPA */ }
```

**Урок на будущее:** Strapi 5 НЕ позволяет независимо сконфигурировать
путь для admin-SPA и admin-API — они привязаны друг к другу через
`admin.url`. И главное — admin SPA вызывает плагинные API не под
`/admin/*`, а на собственных корневых путях. Список путей в `@strapi`
matcher нужно держать актуальным при добавлении новых плагинов.
