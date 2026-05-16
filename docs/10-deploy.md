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

    # CMS — Strapi v5 at /cms/*
    handle_path /cms/* {
        reverse_proxy 127.0.0.1:1337
    }

    # Frontend — single-page React app
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
- `/` (любой путь, кроме `/cms/*`) — SPA-фолбэк на React `dist/index.html`.
- `/cms/admin` → Strapi admin UI.
- `/cms/api/*` → Strapi REST API.
- `/cms/uploads/*` → загруженные через Strapi медиа.

`handle_path /cms/*` режет префикс перед проксированием, поэтому
Strapi внутри живёт по дефолтным путям (`/admin`, `/api`, `/uploads`).
Чтобы он генерировал правильные ссылки наружу, в `.env` Strapi
прописаны `URL=http://188.137.177.136/cms` и `ADMIN_URL=/cms/admin`.

No HTTPS — the box has no domain. Browsers must type `http://` and
the explicit port. Once a domain is bought, change the site file's
listen address to `example.com` and Caddy will provision Let's
Encrypt automatically (port 443 needs to be open in the firewall).

## Stacks on the box

| Service | Path | Port | Manager |
|---|---|---|---|
| Frontend (React, dist) | `/opt/meditation-app/dist/` | 80 (via Caddy) | static — `npm run build` |
| Strapi CMS v5.46 | `/opt/meditation-cms/` | 1337 (loopback) | systemd: `meditation-cms.service`, logs `/var/log/meditation-cms.log` |
| Caddy 2.11.3 | `/etc/caddy/` | 80 | systemd: `caddy.service` |
| PostgreSQL 14.22 | DB `meditation_cms`, role `strapi` | 5432 (loopback) | systemd: `postgresql.service` |

## Deploy procedure

С макбука:

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
  # Caddy не нужно перезагружать — статика отдается с диска.
  # systemctl reload caddy — только если меняли /etc/caddy/sites/*.caddy.
EOF
```

CMS обновляется отдельно (когда меняем content-types / lifecycles):

```bash
ssh root@188.137.177.136 'bash -s' <<'EOF'
  cd /opt/meditation-cms
  npm install --no-audit --no-fund
  npm run build         # rebuild admin bundle (when content-types меняются)
  systemctl restart meditation-cms
EOF
```

## Credentials (важно!)

Хранятся на сервере, не в репо:
- `/root/.strapi_db_password` — пароль роли `strapi` в PostgreSQL.
- `/root/.strapi_admin_password` — пароль суперюзера Strapi
  (`admin@meditation.local`).
- `/root/.ssh/authorized_keys` — публичный ключ заказчика, можно
  логиниться без пароля.

## URLs

| Env | URL |
|---|---|
| Local dev | `http://localhost:5173/` (Vite) |
| Production | `http://188.137.177.136/` |
| CMS admin | `http://188.137.177.136/cms/admin` |
| CMS API (public) | `http://188.137.177.136/cms/api/practices` |

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
