#!/bin/sh
set -e

echo "[entrypoint] Aplicando migraciones..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando aplicación..."
exec node server.js
