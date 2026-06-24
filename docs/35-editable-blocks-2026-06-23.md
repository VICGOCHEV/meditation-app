# Редактируемые блоки на главной + второй блок «Осознанность» — 2026-06-23

## Что сделано

### 1. Второй блок «Осознанность» (`awareness2`)
Добавлен третий контент-блок на главной — структурная копия первого блока
осознанности, закрытый по подписке. Записи добавляются через CMS («Практики» →
блок «Осознанность · 2»). Секция не рендерится в аппке, пока в блоке нет ни
одной опубликованной практики.

`block` в Prisma — свободная строка, миграция БД для нового блока не нужна.

Затронуто:
- `cms/src/lib/format.js` — `BLOCKS` += `awareness2`
- `cms/src/pages/PracticeEditor.jsx` — `monthSlot` и валидация аудио теперь и для `awareness2`
- `backend/src/routes/content.js` — группировка `groups.awareness2`
- `application/src/api/mock.js`, `api/practices.js` — `awareness2` в моке и плоском поиске
- `application/src/pages/Home/index.jsx` — секция «03» (скрыта при пустом блоке)

### 2. Заголовки блоков редактируются в CMS («Блоки»)
Тексты секций главной (eyebrow / title / sub / chip) вынесены из хардкода в БД.
Владелец правит их в новом разделе CMS «Блоки» — изменения видны без деплоя.

**Модель `BlockMeta`** (`key` unique = `relaxation|awareness|awareness2|author`,
+ eyebrow/title/sub/chip/order). Строки может не быть — тогда отдаётся дефолт
из `backend/src/utils/blockDefaults.js`. Строка создаётся при первом сохранении.

API:
- `GET /api/content/blocks` (публичный) — merged дефолты + БД
- `GET /api/admin/blocks`, `PUT /api/admin/blocks/:key` (admin)

Фронт:
- `application/src/api/blocks.js` — `fetchBlocks()` + `BLOCK_DEFAULTS` (мгновенная отрисовка, fallback при ошибке/моке)
- Home читает заголовки из стейта `blocks`

CMS:
- `cms/src/pages/Blocks.jsx` + роут `/blocks` + пункт меню «Блоки» (группа «Контент»)

`key` структурный, не редактируется. Внутренние названия категорий в списке
«Практики» (`BLOCKS.title` в `format.js`) — отдельные стабильные ярлыки, их
правка не требуется.

## Деплой (важно)

Перед `git pull` на проде накатить миграцию таблицы:

```bash
# backend/sql/004_block_meta.sql — идемпотентно (CREATE TABLE IF NOT EXISTS)
psql "$DATABASE_URL" -f /opt/meditation-app/backend/sql/004_block_meta.sql
```

Затем обычный деплой (`git pull` + сборки application/cms + restart meditation-api).
Локально: `npx prisma db push` (или `migrate dev`) чтобы создать таблицу в dev-БД.
Без таблицы `/api/content/blocks` и `/api/admin/blocks` упадут — аппка переживёт
(fallback на дефолты), но CMS-страница «Блоки» покажет ошибку загрузки.
