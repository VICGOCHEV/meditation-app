# Security hardening — deploy bundle

Готовые файлы для применения исправлений из
[../../docs/20-security-review-2026-05-19.md](../../docs/20-security-review-2026-05-19.md).

Применять в одном maintenance-окне; общая длительность — около 20 минут.

---

## 1. Backend (Fastify) — уже в репо

В `backend/` уже сделано:

- `@fastify/jwt` обновлён с 9.x до 10.x — закрывает 6 CVE в `fast-jwt`
  (включая JWT auth-bypass).
- Добавлены `@fastify/helmet` (security headers), `@fastify/rate-limit`
  (5 req/min на `/auth/*`, 120 req/min глобально).
- CORS сужен до allow-list через `CORS_ORIGINS` в `.env`.
- bcrypt: 10 → 12 раундов (можно переопределить через `BCRYPT_ROUNDS`).
- Email-формат и password-complexity (min 8, буква + цифра/символ)
  валидируются на регистрации.
- На login время bcrypt-сверки одинаковое для существующего и
  несуществующего email — закрывает timing-enumeration.
- `JWT_SECRET` короче 32 символов теперь падает на старте.

Деплой на VPS:

```bash
cd /opt/meditation-api
git pull
npm ci --omit=dev
# Поправить .env — добавить:
#   CORS_ORIGINS=http://212.43.148.208:8081
#   BCRYPT_ROUNDS=12
sudo systemctl restart meditation-api
```

Проверка:

```bash
curl -I http://188.137.177.136/api/health
# должны появиться: X-Frame-Options, X-Content-Type-Options,
# Strict-Transport-Security, Referrer-Policy

# CORS теперь не отражает evil.com:
curl -X OPTIONS -H "Origin: https://evil.com" \
  http://188.137.177.136/api/auth/login -i
# Origin not allowed → 500 с фастифай-сообщением (или нет ACAO-хедера)

# Rate-limit:
for i in 1 2 3 4 5 6 7; do
  curl -X POST -s -o /dev/null -w "%{http_code} " \
    http://188.137.177.136/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"identifier":"x@y.z","password":"wrongpass1"}'
done
# первые 5 → 401, 6-й → 429
```

## 2. Strapi CMS — два файла

Скопировать на VPS:

```bash
scp deploy/security-hardening/cms-config-plugins.js \
    root@188.137.177.136:/opt/meditation-cms/config/plugins.js

scp deploy/security-hardening/cms-config-middlewares.js \
    root@188.137.177.136:/opt/meditation-cms/config/middlewares.js

ssh root@188.137.177.136 'systemctl restart meditation-cms'
```

После рестарта проверить:

```bash
# Попробовать залить >50 МБ файл — должен отказать с 413.
# Попробовать залить .txt — должен отказать с 415.
```

## 3. Postgres backups — `pg-backup.sh`

```bash
scp deploy/security-hardening/pg-backup.sh root@188.137.177.136:/tmp/
ssh root@188.137.177.136 '
  cp /tmp/pg-backup.sh /usr/local/bin/pg-backup.sh
  chmod +x /usr/local/bin/pg-backup.sh
  mkdir -p /var/backups/postgres
  echo "0 3 * * * root /usr/local/bin/pg-backup.sh" > /etc/cron.d/pg-backup
  # Прогон вручную чтобы убедиться, что работает:
  /usr/local/bin/pg-backup.sh
  ls -lah /var/backups/postgres/
'
```

---

## Что остаётся ОТКРЫТЫМ после этого деплоя

| # | Тяжесть | Тема | Когда чинится |
|---|---|---|---|
| A2 / C4 | 🟥 | HTTPS | После получения домена от клиента |
| D2 | 🟨 | fail2ban на SSH | Можно сделать сейчас вручную |
| D3 | 🟨 | Unprivileged users для сервисов | Можно сделать в отдельный maintenance |
| B2 | 🟦 | JWT в localStorage (XSS-readable) | Accepted risk для SPA |
| A8 | 🟨 | Whitelist practiceId | После того как CMS-схема стабилизируется |

Все 🟥/🟧 после этого деплоя — закрыты, кроме блокированного клиентом HTTPS.
