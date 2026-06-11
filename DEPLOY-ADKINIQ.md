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

# Genera .env.production (no va en Git). --force reemplaza el archivo viejo con CAMBIAR_PASSWORD.
node scripts/bootstrap-production-env.mjs --force

docker compose --env-file .env.production down
docker compose --env-file .env.production up -d --build
```

**`.env.production` no va en Git.** El script `bootstrap-production-env.mjs` sí: lo corre en el servidor después del `git pull`.

Si cambiaste `POSTGRES_PASSWORD` y la BD ya existía con otra clave:

```bash
docker compose --env-file .env.production down -v
docker compose --env-file .env.production up -d --build
```

Nginx `hotel.adkiniq.cl` debe tener `root` en esa carpeta (donde está `propuesta-7-casona-futrono.html` y `assets/adkiniq-env.js`).

## Verificar

```bash
curl https://reservas.adkiniq.cl/api/health
curl -I https://hotel.adkiniq.cl
```

Abrir `https://hotel.adkiniq.cl` → habitaciones cargan → “Reservar ahora” abre `reservas.adkiniq.cl`.

## Login admin no funciona

```bash
curl -s http://127.0.0.1:3000/api/health
# Debe incluir "adminAuthConfigured":true
```

Si es `false`, el contenedor **no tiene** `ADMIN_PASSWORD` cargado. En el servidor:

```bash
cd /var/www/demo_hotel/hotel-reservas
grep -E '^ADMIN_' .env.production
docker compose --env-file .env.production exec app sh -c 'echo USER=$ADMIN_USERNAME PASS_SET=$([ -n "$ADMIN_PASSWORD" ] && echo yes || echo no)'
```

Asegurate de tener (sin comillas, sin espacios al final):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=boye2026!
SESSION_COOKIE_SECURE=false
APP_URL=http://178.104.214.147:3000
```

Luego: `docker compose --env-file .env.production up -d --build`

Probar login:

```bash
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"boye2026!"}'
```
