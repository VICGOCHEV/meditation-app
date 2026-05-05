# 10 — Deploy

## Repository

GitHub: https://github.com/VICGOCHEV/meditation-app

Author identity is passed inline per commit (`-c user.name=…
-c user.email=…`) — the global `~/.gitconfig` is intentionally untouched.

## Production server

| | |
|---|---|
| Provider | Hostkey (Blitz Intel NL-3) |
| Host | `89.105.213.173` (IPv4) |
| OS | Ubuntu 22.04.5 LTS |
| Resources | 1 vCPU · 3.5 GB RAM · 20 GB SSD · 250 Mbps |
| Auth | SSH key (Mac's `~/.ssh/id_ed25519` already in `authorized_keys`) |

A previous server `188.137.239.182` was IPv6-only and got replaced with
this IPv4 box. Password auth still works but the SSH key path is
preferred. The user has been advised to rotate the password (it was
posted in chat).

## Stack on the box

```
Node.js 20.20  (NodeSource apt repo)
Caddy 2.11     (cloudsmith apt repo)
git 2.34
```

App lives at `/opt/meditation-app/`. `dist/` is the build output served
by Caddy.

## Caddy configuration

`/etc/caddy/Caddyfile`:

```
:80 {
    root * /opt/meditation-app/dist
    encode gzip zstd
    try_files {path} /index.html
    file_server

    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    header /index.html Cache-Control "no-cache"
}
```

- `try_files {path} /index.html` — SPA fallback.
- gzip + zstd encoding.
- Hashed `/assets/*` get a 1-year immutable cache.
- `/index.html` is no-cache so deploys flip immediately.

No HTTPS yet — the box has no domain. `https://...` requests get
`ERR_CONNECTION_REFUSED` because port 443 is closed; users must explicitly
type `http://`. Once a domain is bought, change `:80` to
`example.com` and Caddy will provision Let's Encrypt automatically.

## Deploy procedure

From the developer's Mac, all in one shell run:

```bash
git -C ~/Desktop/MED/APP add .
git -C ~/Desktop/MED/APP -c user.name=… -c user.email=… commit -m "..."
git -C ~/Desktop/MED/APP push

ssh root@89.105.213.173 "
  cd /opt/meditation-app
  git pull --ff-only
  npm ci --no-audit --no-fund --silent   # only when package.json changed
  npm run build
  systemctl reload caddy
"
```

`npm ci` is skipped on most deploys; `git pull && npm run build` is
typically enough.

## URLs

| Env | URL |
|---|---|
| Local dev | `http://localhost:5173/` (Vite) |
| Local network | `http://192.168.0.220:5173/` (varies) |
| Production | `http://89.105.213.173/` |

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
