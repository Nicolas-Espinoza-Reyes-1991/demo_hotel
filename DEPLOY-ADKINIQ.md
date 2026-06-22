# Deploy Adkin IQ — hotel.adkiniq.cl + reservas.adkiniq.cl

## URLs

| URL | Contenido |
|-----|-----------|
| `https://www.adkiniq.cl` | Web corporativa Adkin IQ (fuera de este repo) |
| `https://hotel.adkiniq.cl` | Landing del hotel (`propuesta-7-casona-futrono.html`) |
| `https://reservas.adkiniq.cl` | Motor de reservas + admin (Docker) |

---

## Solución definitiva: bug `KeyError: 'ContainerConfig'`

### Qué es el bug

En el VPS tenés **docker-compose 1.29.2** (Python, comando con **guión**). Esa versión es **incompatible** con Docker Engine moderno. Al recrear contenedores, falla con:

```
KeyError: 'ContainerConfig'
```

Los parches (`docker rm -f …`, `--force-recreate`) **no lo arreglan** — solo limpian el desastre de un intento fallido.

### Solución real: instalar Docker Compose v2

`apt install docker-compose-plugin` **no funciona** en Ubuntu estándar (paquete no está en esos repos).  
Instalá el binario oficial de GitHub (una sola vez):

```bash
cd /var/www/demo_hotel/hotel-reservas
git pull origin main
sh scripts/install-docker-compose-v2.sh
```

Verificá:

```bash
docker compose version
# Debe mostrar v2.x — NO "docker-compose version 1.29.2"
```

Opcional — quitar el compose viejo para no confundirte:

```bash
sudo apt remove -y docker-compose
```

### Deploy normal (con Compose v2 — no borra la BD)

**Importante:** la landing (`propuesta-7-casona-futrono.html`) se actualiza con `git pull`.  
El motor de reservas (`/reservas/`) vive en **Docker** y requiere **rebuild** para ver logo, colores y preloader.

```bash
cd /var/www/demo_hotel
git pull origin main
sh scripts/deploy-site.sh
```

Solo reservas (sin tocar landing):

```bash
cd /var/www/demo_hotel/hotel-reservas
sh scripts/deploy-safe.sh
```

Alternativa manual:

```bash
cd /var/www/demo_hotel
git pull origin main
cd hotel-reservas
docker compose up -d --build
```

**No uses** `docker-compose down -v` (borra la base de datos).  
**No uses** `prisma db seed` salvo reset demo a propósito.

También podés usar el wrapper del repo (elige v2 o v1 solo):

```bash
sh scripts/dc.sh up -d --build
```

---

## Parche temporal (solo si aún no instalaste v2)

```bash
docker-compose down
docker ps -aq --filter "name=hotel-reservas" | xargs -r docker rm -f
docker-compose up -d --build --force-recreate --remove-orphans
```

Si vuelve a fallar → **instalá Compose v2** (arriba). No sigas parcheando.

---

## `.env.production`

No va en Git. Generar **una sola vez**:

```bash
sh scripts/bootstrap-production-env.sh
```

**No uses `--force`** si ya tenés datos en producción (puede cambiar contraseñas y obligarte a `down -v`).

---

## Verificar

```bash
docker compose ps
curl -s http://127.0.0.1:3000/reservas/api/health
curl -s http://127.0.0.1/reservas/api/health   # vía nginx
```

Login: `admin` / `boye2026!` → `http://178.104.214.147/reservas/login`

---

## Backup y seed

Backup (antes de deploy):

```bash
sh scripts/backup-db.sh
```

Seed demo (**borra reservas** — solo demo):

```bash
docker compose exec app npx prisma db seed
```

---

## Nginx (landing + /reservas en puerto 80)

```bash
sudo cp /var/www/demo_hotel/deploy/nginx/landing-ip.conf /etc/nginx/sites-available/hotel-landing
sudo ln -sf /etc/nginx/sites-available/hotel-landing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
