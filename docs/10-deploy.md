# 10 — Deploy

## Repository

GitHub: https://github.com/VICGOCHEV/meditation-app

Author identity is passed inline per commit (`-c user.name=…
-c user.email=…`) — the global `~/.gitconfig` is intentionally untouched.

## Production server

| | |
|---|---|
| Host | `212.43.148.208` (current) |
| OS | Ubuntu 22.04 |
| Node | 22.x (preinstalled) |
| Auth | password during bootstrap; rotate or `ssh-copy-id` after |
| Port | **8081** (port 80 is taken by another agent's Next.js project on this shared box) |

Earlier hosts (legacy, may be torn down):
- `89.105.213.173` — Hostkey IPv4, Caddy on port 80, full stack we built
  out across the original session.
- `188.137.239.182` — IPv6-only, replaced by `89.105.213.173`.

The current box is **shared**: another agent runs a Next.js app on
`:80`. We coexist by giving each project its own port + its own
Caddy site file (see Caddy section below). Nobody touches the other's
config; both can deploy independently.

## Stack on the box

```
Node.js 20.20  (NodeSource apt repo)
Caddy 2.11     (cloudsmith apt repo)
git 2.34
```

App lives at `/opt/meditation-app/`. `dist/` is the build output served
by Caddy.

## Caddy configuration (modular)

Because the box is shared, we run Caddy in **modular** mode: the main
`/etc/caddy/Caddyfile` only imports per-site fragments, and each
project owns one fragment. Nobody overwrites anyone else's config.

`/etc/caddy/Caddyfile`:

```
import /etc/caddy/sites/*.caddy
```

`/etc/caddy/sites/meditation.caddy`:

```
:8081 {
    root * /opt/meditation-app/dist
    encode gzip zstd
    try_files {path} /index.html
    file_server

    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    header /index.html Cache-Control "no-cache"
}
```

- Listens on `:8081`. Public URL: `http://212.43.148.208:8081/`.
- `try_files {path} /index.html` — SPA fallback.
- gzip + zstd encoding.
- Hashed `/assets/*` get a 1-year immutable cache.
- `/index.html` is no-cache so deploys flip immediately.

Other projects on this box drop their own file in
`/etc/caddy/sites/` and pick a different port. `caddy validate
--config /etc/caddy/Caddyfile` checks that the merged config is sane;
`systemctl reload caddy` applies it without dropping connections.

No HTTPS — the box has no domain. Browsers must type `http://` and
the explicit port. Once a domain is bought, change the site file's
listen address to `example.com` and Caddy will provision Let's
Encrypt automatically (port 443 needs to be open in the firewall).

## Deploy procedure

From the developer's Mac:

```bash
git -C ~/Desktop/MED/APP add .
git -C ~/Desktop/MED/APP commit -m "..."
git -C ~/Desktop/MED/APP push

ssh root@212.43.148.208 'bash -s' <<'EOF'
  set -euo pipefail
  cd /opt/meditation-app
  git pull --ff-only
  npm ci --no-audit --no-fund --silent   # skip if package.json unchanged
  npm run build
  systemctl reload caddy
EOF
```

Most deploys — `git pull && npm run build && systemctl reload caddy`
is enough; `npm ci` only when dependencies change.

## URLs

| Env | URL |
|---|---|
| Local dev | `http://localhost:5173/` (Vite) |
| Local network | `http://192.168.0.220:5173/` (varies) |
| Production | `http://212.43.148.208:8081/` |

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
