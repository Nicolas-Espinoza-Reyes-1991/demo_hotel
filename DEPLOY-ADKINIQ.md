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
docker compose --env-file deploy/env.production down
docker compose --env-file deploy/env.production up -d --build
```

Variables de producción en **`hotel-reservas/deploy/env.production`** (van en el repo).  
Editá ahí solo los `CAMBIAR_*` (Resend, Mercado Pago, banco) y volvé a hacer `git pull` en el servidor.

Si cambiaste `POSTGRES_PASSWORD` y la BD ya existía con otra clave:

```bash
docker compose --env-file deploy/env.production down -v
docker compose --env-file deploy/env.production up -d --build
```

Nginx `hotel.adkiniq.cl` debe tener `root` en esa carpeta (donde está `propuesta-7-casona-futrono.html` y `assets/adkiniq-env.js`).

## Verificar

```bash
curl https://reservas.adkiniq.cl/api/health
curl -I https://hotel.adkiniq.cl
```

Abrir `https://hotel.adkiniq.cl` → habitaciones cargan → “Reservar ahora” abre `reservas.adkiniq.cl`.
