#!/bin/sh
set -e

echo "[entrypoint] Aplicando migraciones..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando aplicación..."
exec node server.js
