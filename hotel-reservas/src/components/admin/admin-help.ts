export const ADMIN_MODULE_HELP = {
  panel:
    "Centro de gestión del hotel: ocupación, reservas, habitaciones, bloqueos y usuarios del panel.",
  calendar:
    "Vista visual de ocupación por habitación y fecha. Tocá o hacé clic en una reserva para ver detalle y copiar el código.",
  reservations:
    "Listado operativo de reservas. Podés buscar huéspedes y cambiar estado de pago o estadía manualmente.",
  rooms:
    "Inventario de habitaciones: precios, fotos, capacidad y estado. No se eliminan si tienen reservas asociadas.",
  blocks:
    "Bloqueos por fechas para sacar habitaciones de la venta (mantenimiento, eventos, cierres temporales).",
  users:
    "Mantenedor de accesos al panel. Solo el administrador puede crear usuarios y cambiar contraseñas.",
  experiences:
    "Módulo de turismo y partners: cabalgatas, botes y actividades para huéspedes. Próximamente.",
  menu: "Carta digital de comida, licores y productos del hotel. Próximamente.",
  reports: "Reportes de reservas, ocupación e ingresos con gráficos. Próximamente.",
} as const;

export const ADMIN_USERS_HELP = {
  section:
    "Administrá quién puede entrar al panel. Administradores gestionan usuarios; trabajadores operan el día a día.",
  form: "Completá los datos del usuario. La contraseña debe cumplir todas las reglas de seguridad.",
} as const;

export const ADMIN_CALENDAR_HELP = {
  section:
    "Calendario de ocupación del hotel. Las barras muestran reservas; el color indica si está pagada, pendiente o en historial.",
  filters:
    "Filtra reservas en el calendario: Activas (vigentes), Pagadas, Pendientes de pago, Historial (canceladas/reembolsadas) o Todas.",
  legend:
    "Colores del calendario: dorado = pagado, ámbar = pendiente, gris = cancelada, violeta = reembolsada.",
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
    "Administrá el catálogo de habitaciones que ven los huéspedes en la web. Los cambios de precio aplican a reservas nuevas.",
  form: "Datos, fotos y precio de una habitación. La primera foto es la imagen principal en la landing y reservas.",
} as const;

export const ADMIN_BLOCKS_HELP = {
  section:
    "Impedí reservas en fechas concretas para una habitación. Útil para mantenimiento o uso interno del hotel.",
  list: "Bloqueos activos y futuros. Eliminá uno si la habitación vuelve a estar disponible antes.",
} as const;
