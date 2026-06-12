#!/bin/sh
# Backup PostgreSQL del contenedor db (docker-compose v1 en el VPS).
# Uso: cd hotel-reservas && sh scripts/backup-db.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="$ROOT/backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/hotel_reservas_${STAMP}.sql"

if ! docker-compose ps -q db | grep -q .; then
  echo "[backup] ERROR: contenedor db no está corriendo."
  echo "[backup] Ejecutá: docker-compose up -d db"
  exit 1
fi

docker-compose exec -T db pg_dump -U postgres hotel_reservas > "$FILE"
echo "[backup] Guardado: $FILE ($(wc -c < "$FILE" | tr -d ' ') bytes)"
