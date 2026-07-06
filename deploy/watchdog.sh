#!/bin/bash
# RELAX ME · server watchdog
# Запускается cron'ом каждые 5 минут на проде. Проверяет реальное состояние
# системы и шлёт ОДИН email-алерт клиенту+админу когда что-то ушло за порог.
# Чтобы не спамить — между алертами одного и того же типа должно пройти
# минимум COOLDOWN_MIN минут (state-файлы в STATE_DIR).
#
# Что мониторим (по убыванию важности):
#   1. Бэк жив и отвечает 200 на /api/health/full с db.ok=true
#   2. systemd сервисы meditation-api, postgresql, caddy живы (CMS — статика за caddy)
#   3. Свободно > 10% места на диске
#   4. Load average 1-min < 8
#   5. Free RAM > 200 MB
#   6. Postgres процесс жив

set -u
STATE_DIR=/var/lib/relaxme-watchdog
COOLDOWN_MIN=30
LOG=/var/log/relaxme-watchdog.log

CLIENT_EMAIL="rasslablenieiosoznanost@mail.ru"
ADMIN_EMAIL="gochev.v.o@gmail.com"
INSIDE_EMAIL="inside.alena@gmail.com"

mkdir -p "$STATE_DIR"

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

# Cooldown'ом давим спам: для каждого alert-кода держим файл-timestamp.
# Если файл свежее чем COOLDOWN_MIN — не шлём.
should_alert() {
  local key="$1"
  local f="$STATE_DIR/$key"
  if [ -f "$f" ]; then
    local age_min=$(( ( $(date +%s) - $(stat -c %Y "$f") ) / 60 ))
    [ "$age_min" -lt "$COOLDOWN_MIN" ] && return 1
  fi
  touch "$f"
  return 0
}

# Шлём через локальный sendmail-альтернативу из meditation-api (Selectel SMTP).
# Простейший путь: дёргаем endpoint /api/_internal/alert который локально POST'ит
# мейлеру. Если бэк лежит — fallback на mail / mailx.
send_alert() {
  local subject="$1"
  local body="$2"
  log "ALERT: $subject"
  # Пытаемся через бэк (Selectel SMTP уже настроен в .env):
  curl -sS --max-time 10 -X POST http://127.0.0.1:3001/internal/alert \
    -H 'Content-Type: application/json' \
    -H "X-Internal-Secret: ${INTERNAL_SECRET:-}" \
    -d "$(jq -nc --arg s "$subject" --arg b "$body" --arg c "$CLIENT_EMAIL" --arg a "$ADMIN_EMAIL" --arg i "$INSIDE_EMAIL" \
        '{subject:$s, body:$b, to:[$c,$a,$i]}')" >/dev/null 2>&1
  local rc=$?
  if [ $rc -ne 0 ]; then
    # Fallback на системный mail (нужен mailutils + настроенный smarthost)
    printf '%s\n' "$body" | mail -s "$subject" "$CLIENT_EMAIL" "$ADMIN_EMAIL" "$INSIDE_EMAIL" 2>/dev/null || true
  fi
}

# Загружаем INTERNAL_SECRET из backend/.env:
if [ -f /opt/meditation-app/backend/.env ]; then
  INTERNAL_SECRET=$(grep -E '^INTERNAL_ALERT_SECRET=' /opt/meditation-app/backend/.env | cut -d= -f2-)
fi

# === Проверки ===

# 1. Health endpoint
HEALTH=$(curl -sS --max-time 10 -o /tmp/health.json -w '%{http_code}' \
  http://127.0.0.1:3001/api/health/full 2>/dev/null)
DB_OK=$(jq -r '.db.ok' /tmp/health.json 2>/dev/null || echo "false")
if [ "$HEALTH" != "200" ] || [ "$DB_OK" != "true" ]; then
  if should_alert "backend_down"; then
    send_alert "RELAX ME · бэк не отвечает" \
      "Что: GET /api/health/full вернул HTTP $HEALTH, db.ok=$DB_OK
Когда: $(date '+%F %T %Z')
Сервер: $(hostname)
Что делать: ничего, разработчик уже знает. Если 30 мин не вернётся — позвонить."
  fi
fi

# 2. Сервисы
# NB: CMS — это статика, которую раздаёт Caddy (нет systemd-юнита meditation-cms),
# поэтому проверяем только реальные сервисы. Живость CMS = живость caddy.
for svc in meditation-api postgresql caddy; do
  if ! systemctl is-active --quiet "$svc"; then
    if should_alert "svc_$svc"; then
      send_alert "RELAX ME · сервис $svc остановлен" \
        "Сервис $svc не active.
$(systemctl status "$svc" --no-pager 2>/dev/null | head -10)
$(date '+%F %T %Z')"
    fi
  fi
done

# 3. Диск
DISK_USE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USE" -gt 90 ]; then
  if should_alert "disk_full"; then
    send_alert "RELAX ME · диск $DISK_USE%" \
      "Свободно: $(df -h / | awk 'NR==2 {print $4}'). Топ-5 каталогов:
$(du -sh /opt/* /var/log 2>/dev/null | sort -hr | head -5)"
  fi
fi

# 4. Load average
LOAD1=$(awk '{print int($1)}' /proc/loadavg)
CPU=$(nproc)
LOAD_LIMIT=$((CPU * 2))
if [ "$LOAD1" -gt "$LOAD_LIMIT" ]; then
  if should_alert "high_load"; then
    send_alert "RELAX ME · нагрузка $LOAD1 (порог $LOAD_LIMIT)" \
      "1-min load: $LOAD1, ядер: $CPU. Топ процессов:
$(ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -8)"
  fi
fi

# 5. Память
FREE_MB=$(free -m | awk '/^Mem:/ {print $7}')
if [ "$FREE_MB" -lt 200 ]; then
  if should_alert "low_mem"; then
    send_alert "RELAX ME · мало RAM ($FREE_MB MB)" \
      "Free: $FREE_MB MB. Топ по памяти:
$(ps -eo pid,pmem,rss,comm --sort=-pmem | head -8)"
  fi
fi

log "ok: health=$HEALTH db=$DB_OK disk=$DISK_USE% load=$LOAD1 free=${FREE_MB}MB"
