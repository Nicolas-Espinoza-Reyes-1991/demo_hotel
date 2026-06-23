import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.APP_URL?.trim() ||
  "https://lacasonadefutrono.cl";

const reservasUrl = `${siteUrl}/reservas`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [`${reservasUrl}/`, `${reservasUrl}/terminos`, `${reservasUrl}/privacidad`],
        disallow: [
          `${reservasUrl}/admin`,
          `${reservasUrl}/login`,
          `${reservasUrl}/mi-reserva`,
          `${reservasUrl}/api/`,
        ],
      },
    ],
    sitemap: `${reservasUrl}/sitemap.xml`,
  };
}
