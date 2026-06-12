# Deploy Adkin IQ — hotel.adkiniq.cl + reservas.adkiniq.cl

## URLs

| URL | Contenido |
|-----|-----------|
| `https://www.adkiniq.cl` | Web corporativa Adkin IQ (fuera de este repo) |
| `https://hotel.adkiniq.cl` | Landing del hotel (`propuesta-7-casona-futrono.html`) |
| `https://reservas.adkiniq.cl` | Motor de reservas + admin (Docker) |

## En el VPS — deploy con Git

```bash
cd /var/www/demo_hotel
git pull origin main
cd hotel-reservas

# Genera .env.production (no requiere Node.js en el servidor)
sh scripts/bootstrap-production-env.sh --force

docker-compose down
docker-compose up -d --build
```

**`.env.production` no va en Git.** El script `bootstrap-production-env.sh` sí.

Si cambiaste `POSTGRES_PASSWORD` y la BD ya existía con otra clave:

```bash
docker-compose down -v
docker-compose up -d --build
```

> En este VPS se usa **`docker-compose`** (con guión), no `docker compose --env-file`.

## Verificar

```bash
curl -s http://127.0.0.1/reservas/api/health
curl -I http://178.104.214.147/reservas/login
```

Login: `admin` / `boye2026!` en `http://178.104.214.147/reservas/login`

## Reinicio rápido (si la web no responde)

```bash
cd /var/www/demo_hotel/hotel-reservas
sh scripts/restart-production.sh
```

## Cargar 8 habitaciones (Ejemplo 1 … Ejemplo 8)

**Borra reservas y habitaciones existentes** y crea 8 habitaciones demo:

```bash
cd /var/www/demo_hotel/hotel-reservas
docker-compose up -d --build
docker-compose exec app npx prisma db seed
```

> Si cambiaste `prisma/seed.ts`, **rebuild obligatorio** antes del seed (el contenedor no usa los archivos del host).

Verificar: `curl -s http://127.0.0.1:3000/api/public/rooms | head -c 400`

## Login admin no funciona

```bash
curl -s http://127.0.0.1:3000/api/health
# Debe incluir "adminAuthConfigured":true
```

```bash
grep -E '^ADMIN_' .env.production
docker-compose exec app sh -c 'echo USER=$ADMIN_USERNAME PASS_SET=$([ -n "$ADMIN_PASSWORD" ] && echo yes || echo no)'
```

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"boye2026!"}'
```
