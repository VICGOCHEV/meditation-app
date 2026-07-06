# Деплой: +inside.alena@gmail.com в алерты watchdog — 2026-07-06

## Контекст
06.07 прод-сервер лёг из-за неоплаты Selectel. Ни self-watchdog (cron на
выключенном сервере не стартует), ни письмо от UptimeRobot не пришли.
Добавляем `inside.alena@gmail.com` третьим получателем алертов.

- **UptimeRobot** (внешний пинг, ловит «сервер выключен целиком») —
  контакт добавлен вручную через дашборд. ✅ сделано.
- **watchdog.sh** (внутренний, ловит частичные падения при живом сервере) —
  правка в репо, деплой ниже.

## Что изменилось в коде
`deploy/watchdog.sh`:
- добавлена переменная `INSIDE_EMAIL="inside.alena@gmail.com"`;
- адрес добавлен в JSON-массив `to` для `/internal/alert` и в fallback `mail`.

## Деплой

> ВАЖНО: на проде скрипт крутится из копии `/usr/local/bin/relaxme-watchdog`,
> а не напрямую из репо. `git pull` его НЕ обновит — копию нужно переложить.

```bash
# 1. Локально — закоммитить и запушить
git add deploy/watchdog.sh docs/36-watchdog-alert-recipient-2026-07-06.md
git commit -m "watchdog: +inside.alena@gmail.com в получатели алертов"
git push

# 2. На проде — подтянуть и переложить копию
ssh root@87.228.61.44 'cd /opt/meditation-app && git pull --ff-only && \
  cp deploy/watchdog.sh /usr/local/bin/relaxme-watchdog && \
  chmod +x /usr/local/bin/relaxme-watchdog'
```

## Проверка

```bash
# Прогнать вручную и глянуть, что не сломалось (jq обязателен на сервере)
ssh root@87.228.61.44 '/usr/local/bin/relaxme-watchdog; tail -3 /var/log/relaxme-watchdog.log'
```

Ожидаем в логе строку вида `ok: health=200 db=true disk=..% load=.. free=..MB`.
Ложный алерт с пустым body = не установлен `jq` (`apt install jq`).

## Первопричина (НЕ чинится мониторингом)
Падение было из-за неоплаты, а не из-за кода. Настроить **автоплатёж или
уведомление о списании в биллинге Selectel** — иначе сервер ляжет снова
независимо от алертов.
