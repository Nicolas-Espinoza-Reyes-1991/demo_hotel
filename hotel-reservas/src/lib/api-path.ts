/** Prefija rutas con NEXT_PUBLIC_BASE_PATH (API y archivos en /public). */
export function apiPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base || base === "/") return normalized;
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}${normalized}`;
}

/** URL pública para imágenes y estáticos (respeta basePath y codifica espacios). */
export function publicAssetUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withBase = apiPath(normalized);
  return withBase
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(decodeURIComponent(segment)) : segment))
    .join("/");
}
