#!/usr/bin/env bash
# Daily Postgres backup for meditation_app DB.
#
# Install on the VPS:
#   sudo cp pg-backup.sh /usr/local/bin/pg-backup.sh
#   sudo chmod +x /usr/local/bin/pg-backup.sh
#   sudo mkdir -p /var/backups/postgres
#   # cron — daily 03:00, prune after 14 days:
#   echo '0 3 * * * root /usr/local/bin/pg-backup.sh' | sudo tee /etc/cron.d/pg-backup
#
# Restore (example):
#   gunzip -c /var/backups/postgres/2026-05-20.sql.gz | psql meditation_app

set -euo pipefail

DB_NAME="${DB_NAME:-meditation_app}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F)"
OUT="$BACKUP_DIR/$STAMP.sql.gz"

# pg_dump runs as the postgres OS user; redirect stderr to syslog
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"

# Prune anything older than retention window
find "$BACKUP_DIR" -name '*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -delete

# Log a tiny success marker
echo "$(date -Iseconds) pg-backup ok -> $OUT ($(du -h "$OUT" | cut -f1))" \
  >> /var/log/pg-backup.log
