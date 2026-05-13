#!/usr/bin/env bash
# Daily Postgres backup. Designed to be invoked by cron (Phase B-2).
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/db \
#   BACKUP_DIR=/var/backups/rfac \
#   ./scripts/backup_db.sh
#
# Optional S3 upload (requires aws CLI configured):
#   BACKUP_S3_BUCKET=s3://my-bucket/rfac-backups
#
# Retention: 30 days locally, lifecycle policy on S3 side for archival.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rfac}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$BACKUP_DIR/rfac-$TS.sql.gz"

echo "[$TS] dumping to $OUT"
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-privileges \
  | gzip -9 > "$OUT"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "[$TS] uploading to $BACKUP_S3_BUCKET"
  aws s3 cp "$OUT" "$BACKUP_S3_BUCKET/" --storage-class STANDARD_IA
fi

# Local pruning
find "$BACKUP_DIR" -name 'rfac-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[$TS] done"
