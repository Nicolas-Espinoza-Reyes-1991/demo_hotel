import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo-site";

/** Sitemap dinámico: landing + rutas públicas de reservas (sin admin/login/API). */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(new Date());
}
