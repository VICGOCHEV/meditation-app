# 10 — Deploy

## Repository

GitHub: https://github.com/VICGOCHEV/meditation-app

Author identity is passed inline per commit (`-c user.name=…
-c user.email=…`) — the global `~/.gitconfig` is intentionally untouched.

## Production server

| | |
|---|---|
| Host | `188.137.177.136` (current — dedicated for the project) |
| OS | Ubuntu 22.04 LTS |
| Node | 22.x (NodeSource apt repo) |
| Postgres | 14.22 (Ubuntu default) |
| Caddy | 2.11.3 |
| Auth | password during bootstrap, client's pubkey in `authorized_keys` |
| Port | **80** (no other apps competing on this box) |

Legacy hosts:
- `212.43.148.208:8081` — shared with another agent's Next.js project
  on `:80`. Used as our test sandbox earlier in the session; still up,
  но не основной.
- `89.105.213.173` — Hostkey IPv4 от первой версии MVP, может быть
  снесена.
- `188.137.239.182` — IPv6-only, давно заменён.

Текущий бокс **выделен под нас**. Caddy слушает `:80`, разводит трафик
по двум маршрутам: `/cms/*` → Strapi на 127.0.0.1:1337, всё остальное
→ статика React (`/opt/meditation-app/dist`).

## Stack on the box

```
Node.js 20.20  (NodeSource apt repo)
Caddy 2.11     (cloudsmith apt repo)
git 2.34
```

App lives at `/opt/meditation-app/`. `dist/` is the build output served
by Caddy.

## Caddy configuration (modular)

Caddy runs в **modular** режиме: главный `/etc/caddy/Caddyfile`
только импортирует фрагменты. Поведение полезное, если на бокс
заедет ещё один проект — у каждого свой файл, не затирают друг
друга.

`/etc/caddy/Caddyfile`:

```
import /etc/caddy/sites/*.caddy
```

`/etc/caddy/sites/meditation.caddy`:

```
:80 {
    encode gzip zstd

    # Our custom backend (Fastify): auth, progression, subscription.
    # No strip — Fastify routes register under /api prefix.
    handle /api* {
        reverse_proxy 127.0.0.1:3001
    }

    # Strapi-managed paths. The admin SPA (/admin) loads plugin
    # APIs at their own top-level paths (/content-manager,
    # /upload, /users-permissions, /content-type-builder, etc).
    @strapi path \
        /admin* \
        /content-manager* \
        /content-type-builder* \
        /content-releases* \
        /upload* \
        /users-permissions* \
        /i18n* \
        /email* \
        /review-workflows* \
        /documentation* \
        /webhooks*
    handle @strapi {
        reverse_proxy 127.0.0.1:1337
    }

    # CMS public REST + uploads — frontend reads via VITE_CMS_URL=/cms.
    handle_path /cms/* {
        reverse_proxy 127.0.0.1:1337
    }

    # Everything else — single-page React app.
    handle {
        root * /opt/meditation-app/dist
        try_files {path} /index.html
        file_server

        @assets path /assets/*
        header @assets Cache-Control "public, max-age=31536000, immutable"
        header /index.html Cache-Control "no-cache"
    }
}
```

Маршруты:
- `@strapi` matcher → Strapi (`/admin` + плагинные API на их
  собственных корневых путях: `/content-manager`, `/upload`,
  `/users-permissions`, `/content-type-builder` и т. д.).
- `/cms/api/*` → Strapi REST для фронта (через `handle_path` со
  strip префикса).
- `/cms/uploads/*` → загруженные через Strapi медиа (тот же strip).
- `/` (всё остальное) → SPA-фолбэк на React `dist/index.html`.

**Грабли, которые не нужно повторять:**

1. **Не запихивать admin под `/cms/admin`** через `config/admin.js`.
   Strapi 5 при изменении `admin.url` сдвигает И SPA, И admin API на
   новый путь. Тогда либо ассеты ломаются (если Caddy strip), либо
   ломается admin/init API (если no-strip).
2. **Не забывать про плагинные маршруты.** В Strapi 5 admin-SPA
   подгружает данные с API, который живёт НЕ под `/admin/*`, а на
   собственных корневых путях типа `/content-manager/content-types`,
   `/upload/files`, `/users-permissions/...`. Если Caddy не проксирует
   эти пути — SPA-фолбэк отдаёт HTML вместо JSON и любой контент-менеджер
   крутит загрузчик навсегда. Поэтому список путей в `@strapi` matcher.

No HTTPS — the box has no domain. Browsers must type `http://` and
the explicit port. Once a domain is bought, change the site file's
listen address to `example.com` and Caddy will provision Let's
Encrypt automatically (port 443 needs to be open in the firewall).

## Stacks on the box

| Service | Path | Port | Manager |
|---|---|---|---|
| Frontend (React, dist) | `/opt/meditation-app/dist/` | 80 (via Caddy) | static — `npm run build` |
| Strapi CMS v5.46 | `/opt/meditation-cms/` | 1337 (loopback) | systemd: `meditation-cms.service`, logs `/var/log/meditation-cms.log` |
| Meditation API (Fastify + Prisma) | `/opt/meditation-api/` | 3001 (loopback) | systemd: `meditation-api.service`, logs `/var/log/meditation-api.log` |
| Caddy 2.11.3 | `/etc/caddy/` | 80 | systemd: `caddy.service` |
| PostgreSQL 14.22 | DBs `meditation_cms` (role `strapi`), `meditation_app` (role `api`) | 5432 (loopback) | systemd: `postgresql.service` |

## Deploy procedure

С макбука:

**Frontend** (типичный деплой):

```bash
git -C ~/Desktop/MED/APP add .
git -C ~/Desktop/MED/APP commit -m "..."
git -C ~/Desktop/MED/APP push

ssh root@188.137.177.136 'bash -s' <<'EOF'
  set -euo pipefail
  cd /opt/meditation-app
  git pull --ff-only
  npm ci --no-audit --no-fund --silent   # skip if package.json unchanged
  npm run build                          # пишет в dist/, Caddy сразу видит
EOF
```

**Custom API** (когда меняем код в `backend/`):

```bash
ssh root@188.137.177.136 'bash -s' <<'EOF'
  set -euo pipefail
  # Sync backend/ из git-репо на актуальный путь сервиса
  rsync -a --delete --exclude=node_modules --exclude=.env --exclude=prisma/migrations \
    /opt/meditation-app/backend/ /opt/meditation-api/
  cd /opt/meditation-api
  npm ci --no-audit --no-fund --silent   # skip if package.json unchanged
  npx prisma db push --skip-generate     # only if prisma/schema.prisma changed
  npx prisma generate                    # regenerate client on schema change
  systemctl restart meditation-api
EOF
```

**CMS** обновляется отдельно (когда меняем content-types / lifecycles):

```bash
ssh root@188.137.177.136 'bash -s' <<'EOF'
  cd /opt/meditation-cms
  npm install --no-audit --no-fund
  npm run build         # rebuild admin bundle
  systemctl restart meditation-cms
EOF
```

## Credentials (важно!)

Хранятся на сервере, не в репо:
- `/root/.strapi_db_password` — пароль роли `strapi` в PostgreSQL (CMS).
- `/root/.api_db_password` — пароль роли `api` в PostgreSQL (наш API).
- `/root/.strapi_admin_password` — пароль суперюзера Strapi
  (`admin@meditation.local`).
- `/opt/meditation-api/.env` — `JWT_SECRET` нашего API + `DATABASE_URL`.
- `/root/.ssh/authorized_keys` — публичный ключ заказчика, можно
  логиниться без пароля.

## URLs

| Env | URL |
|---|---|
| Local dev | `http://localhost:5173/` (Vite) |
| Production | `http://188.137.177.136/` |
| CMS admin | `http://188.137.177.136/admin` |
| CMS API (public) | `http://188.137.177.136/cms/api/practices` |
| Backend API | `http://188.137.177.136/api/health` |

## Bundle stats (current)

```
dist/index.html                 0.84 kB │ gzip:  0.45 kB
dist/assets/index-*.css        ~21 kB   │ gzip:  ~4.8 kB
dist/assets/index-*.js (small) ~50 kB   │ gzip:  ~14 kB
dist/assets/index-*.js (main) ~1.2 MB   │ gzip: ~350 kB
```

The 1.2 MB chunk is dominated by Three.js. The `Player` page is
`React.lazy`'d so Three only loads on first navigation to a `/player/...`
URL. (Currently lazy-loaded chunk and main bundle share the Three.js
modules via Vite's auto chunk splitting.)

The `chunk size warning > 500 kB` is logged but accepted — deferring
deeper chunking would only matter once a real audio backend ships and
removes the silent 10-minute dummy mp3.
