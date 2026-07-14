export const ADMIN_MODULE_HELP = {
  panel:
    "Centro de gestión del hotel: ocupación, reservas, habitaciones, bloqueos y usuarios del panel.",
  calendar:
    "Vista visual de ocupación por habitación y fecha. Tocá o hacé clic en una reserva para ver detalle y copiar el código.",
  reservations:
    "Listado operativo de reservas. Podés buscar huéspedes y cambiar estado de pago o estadía manualmente.",
  rooms:
    "Inventario de habitaciones: precios, fotos, capacidad y estado. No se eliminan si tienen reservas asociadas.",
  rates:
    "Tarifas por temporada y fechas especiales. Cada cabaña puede tener un precio distinto en un rango programado.",
  blocks:
    "Bloqueos por fechas para sacar habitaciones de la venta (mantenimiento, eventos, cierres temporales).",
  users:
    "Mantenedor de accesos al panel. Solo el administrador puede crear usuarios y cambiar contraseñas.",
  bank:
    "Datos de la cuenta para transferencia bancaria. Solo el administrador puede verlos y editarlos; se muestran a los huéspedes al pagar.",
  experiences:
    "Partners de turismo local y sus actividades. Lo publicado se ve en /experiencias para que el huésped contacte al operador.",
  menu: "Administrá categorías y productos de la carta digital. Lo publicado se ve en /carta para huéspedes.",
  reports: "Reportes de ocupación, ingresos cobrados, ranking de cabañas y saldos pendientes.",
} as const;

export const ADMIN_USERS_HELP = {
  section:
    "Administrá quién puede entrar al panel. Administradores gestionan usuarios; trabajadores operan el día a día.",
  form: "Completá los datos del usuario. La contraseña debe cumplir todas las reglas de seguridad.",
} as const;

export const ADMIN_BANK_HELP = {
  section:
    "Cuenta bancaria que ven los huéspedes al elegir pago por transferencia. Los cambios aplican de inmediato en la web y en los emails.",
  form: "Completá banco, titular y número de cuenta. El email de comprobantes es a dónde debe enviar el huésped el voucher.",
} as const;

export const ADMIN_CALENDAR_HELP = {
  section:
    "Calendario de ocupación del hotel. Las barras muestran reservas y bloqueos; el color indica pago, historial o bloqueo manual.",
  filters:
    "Filtra reservas en el calendario: Activas (vigentes), Pagadas, Pendientes de pago, Historial (canceladas/reembolsadas) o Todas. Los bloqueos se muestran siempre.",
  legend:
    "Colores: verde = pagado, amarillo = abonado, naranja = pendiente, gris = cancelada, violeta = reembolsada, rojo = bloqueo de habitación.",
  periodList:
    "Tabla rápida del período visible. Útil para buscar códigos y datos de contacto sin recorrer el calendario.",
} as const;

export const ADMIN_RESERVATIONS_HELP = {
  section:
    "Gestión de reservas del hotel. Actualizá pago, estado y descuentos opcionales para que los reportes cuadren con lo cobrado.",
  scope:
    "Activas: reservas del día a día. Historial: canceladas o reembolsadas. Todas: listado completo sin filtrar.",
  table:
    "Cambiá el estado de pago cuando recibas una transferencia y el estado de estadía al hacer check-in o check-out. El descuento es opcional: si no lo aplicás, se respeta el precio de lista.",
} as const;

export const ADMIN_ROOMS_HELP = {
  section:
    "Administrá el catálogo de habitaciones que ven los huéspedes en la web. El precio base aplica cuando no hay tarifa de temporada.",
  form: "Datos, fotos y precio base de una habitación. Las temporadas se gestionan en Tarifas. La primera foto es la imagen principal.",
} as const;

export const ADMIN_BLOCKS_HELP = {
  section:
    "Impedí reservas en fechas concretas para una habitación. Útil para mantenimiento o uso interno del hotel.",
  list: "Bloqueos activos y futuros. Eliminá uno si la habitación vuelve a estar disponible antes.",
} as const;

export const ADMIN_RATES_HELP = {
  section:
    "Creá temporadas con fechas y precios por cabaña. Filtrá por año para mantener el listado ordenado.",
  form: "Paso 1: nombre y fechas. Paso 2: elegí cabañas y precios. Podés subir un % sobre el base.",
  list: "Cada tarjeta es una temporada. Filtrá por año (primera noche), “Vigentes” o “Todas”. Usá “Copiar +1 año” para renovarla.",
} as const;

export const ADMIN_REPORTS_HELP = {
  section:
    "Elegí el tipo, el período y generá el reporte. En el celular el botón queda fijo abajo.",
  summary: "Tipo → fechas → Ver reporte. El resultado se muestra abajo y se puede exportar a CSV.",
  definitions:
    "Ingresos (plata): por llegada. Ocupación: por noches del rango. Cobrado = amountPaid. Comprometido = totalAmount.",
} as const;
