# Hotel Reservas — Sistema PWA

Sistema moderno de reservas hoteleras **mobile-first**, escalable desde 8 habitaciones hacia inventarios mayores.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| Backend | API Routes REST nativas de Next.js |
| ORM / DB | Prisma + PostgreSQL (compatible SQL Server) |
| Validación | Zod + transacciones Serializable (anti double-booking) |

## Estructura del proyecto

```
hotel-reservas/
├── prisma/
│   ├── schema.prisma      # Modelos: Room, Guest, Reservation, RoomBlock
│   └── seed.ts            # 9 habitaciones demo + reserva ejemplo
├── src/
│   ├── app/
│   │   ├── page.tsx       # Vista cliente (búsqueda + tarjetas)
│   │   ├── admin/page.tsx # Dashboard calendario Gantt
│   │   └── api/
│   │       ├── rooms/route.ts
│   │       ├── availability/route.ts
│   │       ├── reservations/route.ts
│   │       ├── reservations/[id]/route.ts
│   │       └── calendar/route.ts
│   ├── components/        # UI: SearchForm, RoomCard, BookingModal, AdminCalendar
│   └── lib/
│       ├── prisma.ts
│       ├── availability.ts   # Lógica crítica de solapamiento
│       ├── validations.ts
│       └── dates.ts
├── public/manifest.webmanifest  # PWA
└── .env.example
```

## Modelo de datos

- **Room**: inventario físico (código, tipo, precio/noche, estado, amenidades)
- **Guest**: clientes (nombre, email, teléfono)
- **Reservation**: reserva (fechas, pago, total, relación room + guest)
- **RoomBlock**: bloqueos admin (mantenimiento programado)

### Regla anti double-booking

Antes de persistir, el servidor verifica:

```
newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
```

Solo aplica a reservas activas (`CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`).  
La creación usa transacción Prisma con `isolationLevel: Serializable`.

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/rooms` | Lista inventario |
| `GET` | `/api/availability?checkIn&checkOut&guests` | Habitaciones disponibles |
| `POST` | `/api/reservations` | Crear reserva (validación servidor) |
| `GET` | `/api/reservations` | Listar reservas (admin) |
| `GET` | `/api/reservations/[id]` | Detalle reserva |
| `PATCH` | `/api/reservations/[id]` | Actualizar estado/pago |
| `POST` | `/api/reservations/[id]/validate` | Re-validar fechas |
| `GET` | `/api/calendar?year&month` | Datos Gantt admin |

## Instalación

```bash
cd hotel-reservas
cp .env.example .env
# Editar DATABASE_URL con tu PostgreSQL

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) (cliente) y [http://localhost:3000/admin](http://localhost:3000/admin) (panel).

### Acceso admin

Configura en `.env`:

- `AUTH_SECRET` — mínimo 32 caracteres (secreto para firmar sesiones)
- `ADMIN_USERNAME` — usuario del panel (default: `admin`)
- `ADMIN_PASSWORD` — contraseña del panel

Credenciales demo por defecto: **admin / admin123**

Si entras a `/admin` sin sesión, se redirige a `/login`.

### Mercado Pago

Configura en `.env`:

- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` — clave pública (frontend)
- `MERCADOPAGO_ACCESS_TOKEN` — token de acceso (backend, privado)
- `MERCADOPAGO_CURRENCY` — moneda (`USD`, `ARS`, etc.)
- `APP_URL` — URL pública del sitio (webhooks)

Sin esas variables, el checkout usa **pago simulado** (solo demo).

Flujo: reserva pendiente → el cliente elige **pago online** (Mercado Pago) o **transferencia bancaria** → webhook o confirmación manual en admin.

### Transferencia bancaria

Valores iniciales en `.env` (fallback):

- `BANK_NAME`, `BANK_ACCOUNT_HOLDER`, `BANK_ACCOUNT_NUMBER`
- `BANK_CBU` / `BANK_ALIAS` (opcional, según país)
- `BANK_CONTACT_EMAIL` — email para recibir comprobantes
- `BANK_TRANSFER_DEADLINE_HOURS` — plazo para transferir (default 48 h)
- `BANK_TRANSFER_ENABLED=false` — desactiva la opción (kill switch)

En producción, el **administrador** puede editarlos desde el panel → **Transferencia**. Al guardar, la base de datos tiene prioridad sobre el `.env`.

El admin marca la reserva como **Pagado** cuando recibe la transferencia.

## SQL Server (opcional)

En `prisma/schema.prisma` cambiar:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

## Próximos pasos sugeridos

- [x] Autenticación admin (login + sesión JWT en cookie)
- [x] Pasarela de pago Mercado Pago (Card Payment Brick + webhook)
- [ ] Notificaciones email/WhatsApp
- [ ] Service Worker completo para PWA offline
- [ ] Rate limiting en API pública

---

Desarrollado como base production-ready para AdkinIQ demos.
