# Meditation API

Fastify + Prisma + Postgres back-end for the meditation web app.
Lives on the VPS at `/opt/meditation-api/`, served on
`127.0.0.1:3001`, exposed publicly via Caddy at
`http://188.137.177.136/api/*`.

## Local dev

```bash
cp .env.example .env
# edit DATABASE_URL + JWT_SECRET
npm install
npx prisma db push          # apply schema
npm run dev                 # node --watch src/index.js
```

## Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | public |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/verify` | public (501 — SMS not wired) |
| POST | `/api/auth/reset` | public (no-op stub) |
| GET | `/api/auth/me` | bearer |
| GET | `/api/progress` | bearer |
| POST | `/api/practices/:id/complete` | bearer |
| POST | `/api/checkin` | bearer |
| POST | `/api/deep-analysis` | bearer |
| POST | `/api/subscription` | bearer |
| DELETE | `/api/subscription` | bearer |

## Deploy

The deployed service runs under systemd as `meditation-api.service`.
Update flow:

```bash
ssh root@188.137.177.136 'bash -s' <<'EOF'
cd /opt/meditation-api
git pull --ff-only   # if syncing from /opt/meditation-app/backend
npm ci --no-audit --no-fund
npx prisma db push   # only when schema changes
systemctl restart meditation-api
EOF
```

In practice the deploy script copies the `backend/` folder out of
`/opt/meditation-app/` into `/opt/meditation-api/` and then runs the
above — see `docs/10-deploy.md`.

## Notes

- Prisma migrations are NOT used yet — first push was via
  `prisma db push`. Once schema starts evolving in prod we'll switch
  to `prisma migrate dev` locally + `prisma migrate deploy` in prod.
- `prisma/migrations/` is gitignored for now; the schema source of
  truth is `prisma/schema.prisma`.
- `.env` is gitignored. Only `.env.example` ships.
