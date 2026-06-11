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
docker compose --env-file .env.production down
docker compose --env-file .env.production up -d --build
```

**`.env.production` no va en Git** (secretos). Solo en el servidor:

```bash
# Primera vez (o si falta el archivo):
cp .env.production.example .env.production
nano .env.production   # Completar CAMBIAR_* y contraseñas
```

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
