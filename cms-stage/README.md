# `cms-stage/` — pre-baked Strapi content types

Этот каталог содержит схемы content-types и лайфсайкл-хук для Strapi,
готовые к копированию в свежеустановленный проект Strapi.

**Где это будет жить в проде:** `/opt/meditation-cms/` на VPS.
Эту директорию (`cms-stage/`) в этот путь **не разворачивать целиком**.
Только три подпапки `src/api/practice|voice|music-track/` копируем
поверх сгенерированной Strapi-структуры.

## Когда применять

После того как на сервере отработала команда

```bash
cd /opt && npx create-strapi@latest meditation-cms \
  --dbclient postgres --skip-cloud --non-interactive \
  --dbhost localhost --dbport 5432 \
  --dbname meditation_cms --dbusername strapi --dbpassword <DB_PASS> \
  --no-run --typescript=false --use-npm
```

(флаг `--no-run` — чтобы не запускать `npm run develop` сразу;
`--typescript=false` — мы пишем JS-схемы; `--use-npm` — пакетный
менеджер).

## Что копировать

```
cms-stage/src/api/practice/      →  /opt/meditation-cms/src/api/practice/
cms-stage/src/api/voice/         →  /opt/meditation-cms/src/api/voice/
cms-stage/src/api/music-track/   →  /opt/meditation-cms/src/api/music-track/
```

После копирования внутри `/opt/meditation-cms/`:

```bash
npm install music-metadata
npm run build       # пересоберёт админку, чтобы новые типы появились в UI
systemctl restart meditation-cms
```

Strapi подцепит content-types автоматически. Они появятся:
- в Content Manager (для добавления записей);
- в Content-Type Builder (там можно править — потом надо
  пересинхронизировать обратно в этот файл).

## Лайфсайкл-хук — что делает

`practice/content-types/practice/lifecycles.js`:
- На `afterCreate` и `afterUpdate` записи Practice — читает
  `audio.url`, преобразует в абсолютный путь
  `<public>/uploads/<file>`, прогоняет через `music-metadata`
  (`mm.parseFile`), и пишет округлённое `duration_sec`.
- Через knex напрямую (минуя entity-service), чтобы не запустить
  рекурсивный `afterUpdate`.
- Логирует в `strapi.log` каждое успешное обновление.

## Public-роль permissions (выставить вручную в UI)

`Settings → Users & Permissions plugin → Roles → Public`:

| Content type | find | findOne |
|---|---|---|
| Practice | ✔ | ✔ |
| Voice | ✔ | ✔ |
| Music-track | ✔ | ✔ |

Это даёт фронту доступ к публичному API без токена. Никаких
`create/update/delete` для Public — только Authenticated/Editor через
админку.

## Эндпоинты (после деплоя)

| Action | Method | URL |
|---|---|---|
| List practices | GET | `/cms/api/practices?populate=audio&sort=order:asc` |
| Get practice | GET | `/cms/api/practices/:documentId?populate=audio` |
| List voices | GET | `/cms/api/voices?populate=*&sort=order:asc` |
| List music | GET | `/cms/api/music-tracks?populate=*&sort=order:asc` |
| Admin login | GET | `/cms/admin` |
