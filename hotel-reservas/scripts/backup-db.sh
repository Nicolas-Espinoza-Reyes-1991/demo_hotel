#!/bin/sh
# Backup PostgreSQL del contenedor db.
# Uso: cd hotel-reservas && sh scripts/backup-db.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DC="sh scripts/dc.sh"

BACKUP_DIR="$ROOT/backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/hotel_reservas_${STAMP}.sql"

if ! $DC ps -q db | grep -q .; then
  echo "[backup] ERROR: contenedor db no está corriendo."
  echo "[backup] Ejecutá: sh scripts/dc.sh up -d"
  exit 1
fi

$DC exec -T db pg_dump -U postgres hotel_reservas > "$FILE"
echo "[backup] Guardado: $FILE ($(wc -c < "$FILE" | tr -d ' ') bytes)"
