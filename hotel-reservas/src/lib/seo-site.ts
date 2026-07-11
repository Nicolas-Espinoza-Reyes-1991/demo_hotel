import type { MetadataRoute } from "next";
import { hotelConfig } from "@/config/hotel";

/** Origen del sitio institucional (sin barra final). */
export function getSiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  const raw = (fromEnv || hotelConfig.urls.site).replace(/\/$/, "");
  // Si APP_URL viene con /reservas, quedarnos solo con el origen del dominio.
  return raw.replace(/\/reservas\/?$/i, "") || hotelConfig.urls.site.replace(/\/$/, "");
}

/** Prefijo público del motor de reservas (ej. /reservas). */
export function getReservasBasePath(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  if (fromEnv && fromEnv !== "/") {
    return fromEnv.endsWith("/") ? fromEnv.slice(0, -1) : fromEnv;
  }
  try {
    const pathname = new URL(hotelConfig.urls.reservas).pathname.replace(/\/$/, "");
    return pathname || "/reservas";
  } catch {
    return "/reservas";
  }
}

export function getReservasOrigin(): string {
  return `${getSiteOrigin()}${getReservasBasePath()}`;
}

export type PublicSeoRoute = {
  /** Ruta relativa al origen del sitio, empieza con / */
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

/**
 * URLs públicas indexables del hotel (landing + módulo de reservas).
 * No incluir admin, login, mi-reserva ni APIs.
 */
export function getPublicSeoRoutes(): PublicSeoRoute[] {
  const reservas = getReservasBasePath();
  return [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: `${reservas}/`, changeFrequency: "weekly", priority: 0.9 },
    { path: `${reservas}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { path: `${reservas}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];
}

/** Rutas a bloquear en robots.txt (paths desde la raíz del dominio). */
export function getRobotsDisallowPaths(): string[] {
  const reservas = getReservasBasePath();
  return [
    `${reservas}/admin`,
    `${reservas}/admin/`,
    `${reservas}/login`,
    `${reservas}/login/`,
    `${reservas}/mi-reserva`,
    `${reservas}/mi-reserva/`,
    `${reservas}/api/`,
  ];
}

/** Paths relativos al basePath de Next (sin prefijo /reservas) para MetadataRoute.Robots. */
export function getNextRobotsDisallowPaths(): string[] {
  return ["/admin", "/login", "/mi-reserva", "/api/"];
}

export function buildSitemapEntries(lastModified = new Date()): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  return getPublicSeoRoutes().map((route) => ({
    url: `${origin}${route.path === "/" ? "/" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

export function buildRobotsTxt(options?: {
  sitemapUrl?: string;
}): string {
  const disallow = getRobotsDisallowPaths();
  const sitemapUrl = options?.sitemapUrl ?? `${getSiteOrigin()}/sitemap.xml`;
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...disallow.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${sitemapUrl}`,
    "",
  ];
  return lines.join("\n");
}

export function buildSitemapXml(lastModified = new Date()): string {
  const stamp = lastModified.toISOString().slice(0, 10);
  const urls = buildSitemapEntries(lastModified)
    .map(
      (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${stamp}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${Number(entry.priority).toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
