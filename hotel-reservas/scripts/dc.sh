#!/bin/sh
# Wrapper: usa Docker Compose v2 si está instalado, si no compose v1 (legacy).
if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
fi
if command -v docker-compose >/dev/null 2>&1; then
  echo "[dc] AVISO: usando docker-compose 1.29.x (legacy). Instalá v2: sh scripts/install-docker-compose-v2.sh" >&2
  exec docker-compose "$@"
fi
echo "[dc] ERROR: no hay docker compose ni docker-compose." >&2
exit 1
