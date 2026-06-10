# Guía de deploy a producción — Hotel Reservas

Esta guía cubre el despliegue recomendado (**Docker en VPS**) y una alternativa (**Vercel + PostgreSQL externo**).

---

## Requisitos previos

- Dominio con HTTPS (Let's Encrypt / Caddy / Nginx)
- Cuenta **Resend** (o SMTP) con dominio verificado
- Cuenta **Mercado Pago** en modo producción
- Servidor Linux (VPS) con Docker y Docker Compose **o** plataforma PaaS

---

## Opción A — Docker en VPS (recomendada)

### 1. Preparar el servidor

```bash
# En el VPS (Ubuntu/Debian)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
```

### 2. Clonar y configurar

```bash
git clone <tu-repo> /opt/hotel-reservas
cd /opt/hotel-reservas/hotel-reservas

cp .env.production.example .env.production
nano .env.production   # Completar TODAS las variables
```

### 3. Variables obligatorias (`.env.production`)

| Variable | Descripción |
|----------|-------------|
| `APP_URL` | URL pública HTTPS, ej. `https://reservas.tuhotel.com` |
| `AUTH_SECRET` | 32+ chars aleatorios |
| `ADMIN_PASSWORD` | Contraseña admin fuerte |
| `CRON_SECRET` | Secreto para `/api/cron/expire-holds` |
| `POSTGRES_PASSWORD` | Password de la BD |
| `SMTP_*` | Credenciales Resend/SMTP |
| `MERCADOPAGO_*` | Claves de producción MP |
| `MERCADOPAGO_WEBHOOK_SECRET` | Desde panel MP → Webhooks |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número sin +, ej. `54911...` |

Generar secretos:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Levantar producción

```bash
docker compose up -d --build
```

El contenedor aplica migraciones automáticamente (`prisma migrate deploy`) al iniciar.

### 5. Cargar datos iniciales (solo primera vez)

```bash
docker compose exec app npx prisma db seed
```

> **No ejecutar seed en producción** si ya hay reservas reales (borra datos).

### 6. HTTPS con Nginx (ejemplo)

```nginx
server {
    listen 443 ssl http2;
    server_name reservas.tuhotel.com;

    ssl_certificate     /etc/letsencrypt/live/reservas.tuhotel.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reservas.tuhotel.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Actualizar `APP_URL=https://reservas.tuhotel.com` y reiniciar: `docker compose up -d`.

### 7. Cron — expirar reservas impagadas

Programar cada **5–10 minutos** en el VPS:

```bash
crontab -e
```

```
*/5 * * * * cd /opt/hotel-reservas/hotel-reservas && /usr/bin/node scripts/cron-expire-holds.mjs >> /var/log/hotel-cron.log 2>&1
```

Requiere `APP_URL` y `CRON_SECRET` en el entorno del cron (exportar en el script o usar `.env.production`).

### 8. Backup diario de PostgreSQL

```bash
# Manual
npm run backup:db

# Cron diario 3:00 AM
0 3 * * * cd /opt/hotel-reservas/hotel-reservas && /usr/bin/node scripts/backup-db.mjs
```

Backups en `backups/*.sql`.

### 9. Mercado Pago — webhook

En el panel de MP configurar:

- **URL:** `https://reservas.tuhotel.com/api/webhooks/mercadopago`
- **Eventos:** `payment`
- Copiar el **secreto** a `MERCADOPAGO_WEBHOOK_SECRET`

### 10. Verificación post-deploy

```bash
curl https://reservas.tuhotel.com/api/health
# → {"status":"ok",...}
```

Checklist manual:

- [ ] Buscar habitaciones y crear reserva de prueba
- [ ] Recibir email de confirmación
- [ ] Pago MP o transferencia
- [ ] Login admin `/login`
- [ ] Cron expira holds (probar con reserva impaga > 30 min)

---

## Opción B — Vercel + PostgreSQL externo

> Adecuado si preferís serverless. Requiere BD externa (Neon, Supabase, Railway Postgres).

1. Crear proyecto en **Neon** o **Supabase** → copiar `DATABASE_URL`
2. Importar repo en **Vercel** → root: `hotel-reservas`
3. Variables de entorno: copiar desde `.env.production.example`
4. Build command: `npx prisma migrate deploy && npm run build`
5. Cron Vercel (`vercel.json`):

```json
{
  "crons": [{
    "path": "/api/cron/expire-holds",
    "schedule": "*/5 * * * *"
  }]
}
```

Agregar header `Authorization: Bearer CRON_SECRET` vía middleware o proteger con secret en query (menos seguro).

**Limitación:** Mercado Pago webhook y cron requieren URL pública estable; Vercel funciona bien para ambos.

---

## Desarrollo local (PostgreSQL)

Antes usábamos SQLite; ahora el proyecto usa **PostgreSQL** en todos los entornos.

```bash
cd hotel-reservas

# 1. Levantar Postgres local
docker compose -f docker-compose.dev.yml up -d

# 2. Configurar .env
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_reservas?schema=public"

# 3. Migrar y seed
npm run db:setup

# 4. Dev
npm run dev:clean
```

---

## Comandos útiles

| Comando | Uso |
|---------|-----|
| `npm run db:setup` | Postgres local + migrate + seed |
| `npm run db:migrate:deploy` | Aplicar migraciones (prod) |
| `npm run docker:prod` | `docker compose up -d --build` |
| `npm run backup:db` | Backup SQL de PostgreSQL |
| `npm run cron:expire` | Expirar reservas impagadas |

---

## Qué NO hacer en producción

- No usar `admin/admin123` ni secretos del `.env.example`
- No ejecutar `npm run db:seed` con datos reales
- No dejar `ALLOW_SIMULATED_PAYMENT=true`
- No correr `npm run build` mientras `npm run dev` está activo (corrompe `.next`)

---

## Soporte

- Health check: `GET /api/health`
- Logs Docker: `docker compose logs -f app`
- Prisma Studio (debug): `docker compose exec app npx prisma studio`
