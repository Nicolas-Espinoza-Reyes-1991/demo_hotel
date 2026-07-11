import type { MetadataRoute } from "next";
import {
  getReservasBasePath,
  getRobotsDisallowPaths,
  getSiteOrigin,
} from "@/lib/seo-site";

/**
 * robots.txt del módulo Next (publicado en /reservas/robots.txt con basePath).
 * Disallow usa paths absolutos desde la raíz del dominio (/reservas/...).
 * El robots canónico del sitio sigue siendo /robots.txt (nginx / raíz del repo).
 */
export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();
  const reservasPath = getReservasBasePath();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", `${reservasPath}/`],
        disallow: getRobotsDisallowPaths(),
      },
    ],
    sitemap: [`${siteOrigin}/sitemap.xml`, `${siteOrigin}${reservasPath}/sitemap.xml`],
  };
}
