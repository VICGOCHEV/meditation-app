# tg-relay — Cloudflare Worker для обхода блокировки api.telegram.org

С Selectel (и любого RU-хостинга) исходящие на `api.telegram.org` режутся
DPI. Этот Worker крутится на edge Cloudflare вне РФ и прозрачно
ретранслирует наши запросы к Telegram. Подробнее — `docs/30-tg-relay-2026-06-01.md`.

## Что внутри

- `worker.js` — код самого Worker'а (12 строк по сути, плюс комментарии)
- `wrangler.toml` — конфиг для CLI-деплоя через `wrangler`

## Путь A — Web UI (рекомендую для первого раза)

1. **dash.cloudflare.com** → войди под зарегистрированным email'ом
2. В левом меню: **Workers & Pages** → кнопка **Create application** → **Create Worker**
3. Имя: `tg-relay-meditation` (или своё) → **Deploy** (там пока hello world)
4. После деплоя жми **Edit code** (верх справа)
5. Удали всё содержимое редактора, скопируй `worker.js` целиком, вставь
6. Жми **Save and deploy** (верх справа)
7. Запиши URL — будет вида `https://tg-relay-meditation.<твой-username>.workers.dev`

### Защитный секрет

8. Вернись на главную страницу Worker'а
9. **Settings** → **Variables and Secrets** → **Add**
10. Type: **Secret**, Variable name: `RELAY_SECRET`, Value: любая длинная строка
    (например, сгенери: `openssl rand -hex 24` или просто отстучи 30 случайных символов)
11. **Save** → Cloudflare сразу применит

## Путь B — CLI через wrangler

```bash
npm install -g wrangler
cd deploy/tg-relay
wrangler login          # откроет браузер для авторизации в CF
wrangler deploy         # задеплоит worker.js
wrangler secret put RELAY_SECRET   # запросит значение в интерактиве
```

URL Worker'а wrangler выпишет в stdout.

## Прописать в backend `.env` на проде

```bash
ssh root@87.228.61.44
cat >> /opt/meditation-app/backend/.env <<EOF
TG_API_BASE=https://tg-relay-meditation.<твой-username>.workers.dev
TG_RELAY_SECRET=<тот же RELAY_SECRET, что в Worker>
EOF
systemctl restart meditation-api
```

## Smoke-тест

С прод-сервера:
```bash
ssh root@87.228.61.44
cd /opt/meditation-app/backend
node -e "
import('./src/utils/tgBot.js').then(async ({ getWebhookInfo }) => {
  console.log(await getWebhookInfo())
})
"
```

Должно вернуть JSON с текущим webhook'ом (или пустым). Если вернёт
`{ ok: false, ... }` — секрет неправильный или Worker не задеплоен.

Затем зарегистрируем webhook самого Telegram:
```bash
cd /opt/meditation-app/backend
TG_WEBHOOK_URL=https://all-relaxme.ru/api/tg/webhook node scripts/tg-set-webhook.js
```

Это должно отработать без `fetch failed`.

И финальный live-тест — напиши `/start` своему боту в Telegram. Должен прийти
ответ с inline-кнопкой «Открыть приложение».

## Стоимость

Free tier Cloudflare Workers: **100 000 запросов/день**. Наш потенциальный
расход (даже когда поднимем все пуши) — порядка 1000-2000/день. Не приблизимся
к лимиту. Платить не нужно, карту привязывать не нужно.

## Если что-то пошло не так

| Симптом | Что делать |
|---|---|
| `403 forbidden` | `RELAY_SECRET` в `.env` бэка не совпадает с тем что в Worker'е. Перепроверь оба, точно ли скопированы без пробелов |
| `relay fetch failed` в ответе | Worker сам не смог достучаться до TG. Очень редко (обычно CF→TG норм). Подожди минуту, повтори |
| `Unauthorized` от TG | `TG_BOT_TOKEN` в `.env` бэка кривой или бот удалён |
| `fetch failed` всё ещё с бэка | `TG_API_BASE` в `.env` не подхватился. `systemctl restart meditation-api` и `journalctl -u meditation-api -n 20` |
