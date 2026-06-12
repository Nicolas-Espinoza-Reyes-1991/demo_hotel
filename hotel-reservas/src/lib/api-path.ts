/** Prefija rutas API con NEXT_PUBLIC_BASE_PATH (ej. /reservas en producción por IP). */
export function apiPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base || base === "/") return normalized;
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}${normalized}`;
}
