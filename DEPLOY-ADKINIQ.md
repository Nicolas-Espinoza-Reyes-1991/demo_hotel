# Deploy Adkin IQ — hotel.adkiniq.cl + reservas.adkiniq.cl

## URLs

| URL | Contenido |
|-----|-----------|
| `https://www.adkiniq.cl` | Web corporativa Adkin IQ (fuera de este repo) |
| `https://hotel.adkiniq.cl` | Landing del hotel (`propuesta-7-casona-futrono.html`) |
| `https://reservas.adkiniq.cl` | Motor de reservas + admin (Docker) |

## En el VPS — actualizar `.env.production`

```bash
cd /ruta/hotel-reservas
cp .env.production.example .env.production   # si aún no existe
nano .env.production
```

Completar **solo** los valores `CAMBIAR_*` (contraseñas, secretos, Mercado Pago, Resend, banco, WhatsApp).

Luego:

```bash
docker compose up -d --build
```

## Subir landing actualizada

Desde tu PC (carpeta del repo):

```bash
rsync -avz --exclude node_modules --exclude .git \
  ./ usuario@IP_VPS:/opt/demo_para_hotel/
```

O `git pull` en el VPS si el repo está clonado ahí.

Nginx `hotel.adkiniq.cl` debe tener `root` en esa carpeta (donde está `propuesta-7-casona-futrono.html` y `assets/adkiniq-env.js`).

## Verificar

```bash
curl https://reservas.adkiniq.cl/api/health
curl -I https://hotel.adkiniq.cl
```

Abrir `https://hotel.adkiniq.cl` → habitaciones cargan → “Reservar ahora” abre `reservas.adkiniq.cl`.
