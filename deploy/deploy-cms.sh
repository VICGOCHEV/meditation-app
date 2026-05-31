#!/usr/bin/env bash
# Боевой деплой своей CMS. Запускать НА ПРОДЕ (87.228.61.44) от root.
# Идемпотентен — можно гонять повторно. Полный гайд: docs/27-cms-deploy.
#
#   ssh root@87.228.61.44
#   cd /opt/meditation-app && bash deploy/deploy-cms.sh
#
# После него — вручную (см. docs/27 §B.2, §B.5-6):
#   1) seed первого админа   2) migrate-from-strapi   3) cutover фронта
set -euo pipefail

ROOT="${ROOT:-/opt/meditation-app}"
cd "$ROOT"

step() { printf '\n\033[1;35m▸ %s\033[0m\n' "$1"; }

step "git pull"
git pull --ff-only

step "backend: зависимости"
cd "$ROOT/backend"
npm install

step "backend: применяю SQL CMS (идемпотентно, zero-downtime)"
: "${DATABASE_URL:?DATABASE_URL не задан в окружении/backend/.env}"
psql "$DATABASE_URL" -f sql/001_cms_tables.sql

step "backend: prisma generate"
npx prisma generate

step "backend: папка загрузок"
mkdir -p "${UPLOAD_DIR:-$ROOT/uploads}"

step "backend: рестарт API"
systemctl restart meditation-api
sleep 2
curl -fsS localhost:3001/api/health >/dev/null && echo "  health ok" || { echo "  ✗ health не ответил"; exit 1; }

step "cms: сборка SPA"
cd "$ROOT/cms"
npm install
npm run build
echo "  → $ROOT/cms/dist"

step "caddy: проверка и reload"
if caddy validate --config /etc/caddy/Caddyfile; then
  systemctl reload caddy
  echo "  caddy reloaded"
else
  echo "  ✗ Caddyfile невалиден — вставь блоки из deploy/cms.Caddyfile и повтори"
  exit 1
fi

cat <<'EOF'

✅ CMS задеплоена. Открой https://all-relaxme.ru/admin/ — должен быть логин.

Осталось вручную (docs/27):
  1. Создать админа:
       cd /opt/meditation-app/backend
       ADMIN_EMAIL=client@all-relaxme.ru ADMIN_PASSWORD='...' ADMIN_ROLE=admin \
         node prisma/seed-admin.js
  2. Перенести контент из Strapi:
       STRAPI_BASE=https://all-relaxme.ru/cms node scripts/migrate-from-strapi.js
  3. Cutover фронта аппки на /api/content/* (docs/27 §C) + smoke-тест плеера.
  4. Погасить Strapi после успешного теста.
EOF
