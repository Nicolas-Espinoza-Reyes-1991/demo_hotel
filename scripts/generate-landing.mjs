#!/usr/bin/env node
/**
 * Generador de la landing estática a partir de hotel.config.json.
 *
 * Fuente:  assets/landing.template.html  (plantilla con token {{HEAD_META}})
 * Config:  hotel.config.json             (única fuente de verdad de la marca)
 * Salida:  propuesta-7-casona-futrono.html            (artefacto servido por nginx)
 *          hotel-reservas/src/config/hotel.generated.json  (consumido por el módulo)
 *
 * Uso:  node scripts/generate-landing.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const cfg = JSON.parse(readFileSync(join(ROOT, "hotel.config.json"), "utf8"));

const site = cfg.urls.site.replace(/\/$/, "");
const reservas = cfg.urls.reservas.replace(/\/$/, "");
const abs = (path) => site + "/" + String(path).replace(/^\.?\//, "");
const ogImageAbs = abs(cfg.assets.ogImagePath);
const logoAbs = abs(cfg.assets.logoPng);
const mapQ = cfg.address.mapQuery.replace(/ /g, "+");
const jsonld = (v) => JSON.stringify(v); // escapa comillas correctamente

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStars(rating) {
  const full = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return Array.from({ length: 5 }, (_, index) => {
    const on = index < full;
    return `<span class="casona-star${on ? " casona-star--on" : ""}" aria-hidden="true">★</span>`;
  }).join("");
}

const GOOGLE_G_SVG = `<svg class="casona-reviews-box__g" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>`;

/** Bloque compacto de reseñas Google con carrusel automático. */
function buildReviewsSection() {
  const reviews = cfg.reviews;
  if (!reviews?.items?.length) {
    return "";
  }

  const rating = Number(reviews.aggregateRating ?? cfg.seo.starRating ?? 5);
  const count = Number(reviews.reviewCount ?? reviews.items.length);
  const mapsUrl = reviews.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapQ}`;
  const source = reviews.source || "Google";

  const slides = reviews.items
    .map((item, index) => {
      const author = escapeHtml(item.author || "Huésped");
      const location = item.location ? ` · ${escapeHtml(item.location)}` : "";
      const text = escapeHtml(item.text || "");
      const active = index === 0 ? " casona-reviews-box__slide--active" : "";

      return `                <article class="casona-reviews-box__slide${active}" data-reviews-slide>
                  <header class="casona-reviews-box__author">
                    <span class="casona-reviews-box__avatar" aria-hidden="true">${author.charAt(0).toUpperCase()}</span>
                    <div class="casona-reviews-box__author-meta">
                      <p class="casona-reviews-box__name">${author}${location}</p>
                      <div class="casona-reviews-box__stars" role="img" aria-label="${item.rating || 5} de 5 estrellas">
                        ${renderStars(item.rating ?? 5)}
                      </div>
                    </div>
                  </header>
                  <blockquote class="casona-reviews-box__quote">
                    <p>${text}</p>
                  </blockquote>
                </article>`;
    })
    .join("\n");

  const dots = reviews.items
    .map((_, index) => {
      const active = index === 0 ? " casona-reviews-box__dot--active" : "";
      return `<button type="button" class="casona-reviews-box__dot${active}" data-reviews-dot aria-label="Reseña ${index + 1} de ${reviews.items.length}"></button>`;
    })
    .join("");

  return `            <aside class="casona-reviews-box" aria-label="Reseñas en ${escapeHtml(source)}">
              <div class="casona-reviews-box__card">
                <header class="casona-reviews-box__header">
                  <div class="casona-reviews-box__brand">
                    ${GOOGLE_G_SVG}
                    <span>${escapeHtml(source)}</span>
                  </div>
                  <div class="casona-reviews-box__scoreline" aria-label="Calificación ${rating.toFixed(1)} de 5, basada en ${count} reseñas">
                    <strong class="casona-reviews-box__score">${rating.toFixed(1)}</strong>
                    <span class="casona-reviews-box__stars casona-reviews-box__stars--summary">${renderStars(rating)}</span>
                    <span class="casona-reviews-box__count">${count}+ reseñas</span>
                  </div>
                </header>
                <div class="casona-reviews-box__carousel" data-reviews-carousel>
                  <div class="casona-reviews-box__viewport">
${slides}
                  </div>
                  <div class="casona-reviews-box__controls">
                    <button type="button" class="casona-reviews-box__nav" data-reviews-prev aria-label="Reseña anterior">‹</button>
                    <div class="casona-reviews-box__dots" role="tablist" aria-label="Seleccionar reseña">
                      ${dots}
                    </div>
                    <button type="button" class="casona-reviews-box__nav" data-reviews-next aria-label="Siguiente reseña">›</button>
                  </div>
                </div>
                <a class="casona-reviews-box__link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">
                  Ver todas en Google
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </aside>`;
}

/** Construye el bloque <head> de SEO idéntico en formato al original. */
function buildHead() {
  const s = cfg.seo;
  const a = cfg.address;
  const amenities = (s.amenities || [])
    .map(
      (name) =>
        `        { "@type": "LocationFeatureSpecification", "name": ${jsonld(name)}, "value": true }`
    )
    .join(",\n");
  const sameAs = [cfg.social.instagram, cfg.social.facebook]
    .filter(Boolean)
    .map((u) => `        ${jsonld(u)}`)
    .join(",\n");

  const reviews = cfg.reviews;
  const aggregateRating =
    reviews?.aggregateRating != null
      ? `,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ${jsonld(String(reviews.aggregateRating))},
        "reviewCount": ${Number(reviews.reviewCount ?? reviews.items?.length ?? 0)},
        "bestRating": "5",
        "worstRating": "1"
      }`
      : "";

  return `<title>${s.title}</title>
    <meta name="description" content="${s.description}" />
    <meta name="keywords" content="${s.keywords}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="theme-color" content="${cfg.theme.themeColor}" />
    <meta name="author" content="${cfg.brand.author}" />
    <link rel="canonical" href="${site}/" />
    <link rel="icon" type="image/png" href="${cfg.assets.faviconPng}" />
    <link rel="apple-touch-icon" href="${cfg.assets.faviconPng}" />
    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${cfg.brand.name}" />
    <meta property="og:title" content="${s.ogTitle}" />
    <meta property="og:description" content="${s.ogDescription}" />
    <meta property="og:image" content="${ogImageAbs}" />
    <meta property="og:image:alt" content="${s.ogImageAlt}" />
    <meta property="og:image:width" content="${cfg.assets.ogImageWidth}" />
    <meta property="og:image:height" content="${cfg.assets.ogImageHeight}" />
    <meta property="og:url" content="${site}/" />
    <meta property="og:locale" content="${cfg.brand.locale}" />
    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${s.twitterTitle}" />
    <meta name="twitter:description" content="${s.twitterDescription}" />
    <meta name="twitter:image" content="${ogImageAbs}" />
    <!-- JSON-LD: Hotel + LocalBusiness -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": ["Hotel", "LodgingBusiness"],
      "name": ${jsonld(cfg.brand.name)},
      "alternateName": ${jsonld(s.alternateNames ?? ["Casona Futrono", "Hotel " + cfg.brand.name])},
      "description": ${jsonld(s.jsonLdDescription)},
      "keywords": ${jsonld(s.keywords)},
      "url": "${site}/",
      "telephone": ${jsonld(cfg.contact.phoneE164)},
      "email": ${jsonld(cfg.contact.email)},
      "logo": "${logoAbs}",
      "image": "${ogImageAbs}",
      "priceRange": ${jsonld(s.priceRange)},
      "starRating": { "@type": "Rating", "ratingValue": ${jsonld(s.starRating)} }${aggregateRating},
      "checkinTime": ${jsonld(s.checkinTime)},
      "checkoutTime": ${jsonld(s.checkoutTime)},
      "address": {
        "@type": "PostalAddress",
        "streetAddress": ${jsonld(a.street)},
        "addressLocality": ${jsonld(a.locality)},
        "addressRegion": ${jsonld(a.region)},
        "postalCode": ${jsonld(a.postalCode)},
        "addressCountry": ${jsonld(a.countryCode)}
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": ${a.latitude},
        "longitude": ${a.longitude}
      },
      "hasMap": "https://maps.google.com/maps?q=${mapQ}",
      "amenityFeature": [
${amenities}
      ],
      "sameAs": [
${sameAs}
      ],
      "potentialAction": {
        "@type": "ReserveAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "${reservas}/",
          "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
        },
        "result": { "@type": "LodgingReservation", "name": ${jsonld("Reserva en " + cfg.brand.name)} }
      }
    }
    </script>`;
}

/** Mapa de variables CSS de la landing (casona-demo.css) → clave de color en config. */
const CASONA_VARS = [
  ["--casona-wood-dark", "woodDark"],
  ["--casona-wood", "wood"],
  ["--casona-wood-soft", "woodSoft"],
  ["--casona-bronze", "bronze"],
  ["--casona-copper", "copper"],
  ["--casona-gold", "gold"],
  ["--casona-gold-light", "goldLight"],
  ["--casona-honey", "honey"],
  ["--casona-cream", "cream"],
  ["--casona-parchment", "parchment"],
  ["--casona-paper", "paper"],
  ["--casona-stone", "stone"],
  ["--casona-stone-light", "stoneLight"],
  ["--casona-ink", "ink"],
];

/** Bloque <style> inyectado en la landing para sobrescribir la paleta desde config. */
function buildThemeStyle() {
  const colors = cfg.theme.colors;
  const lines = CASONA_VARS.map(([cssVar, key]) => `        ${cssVar}: ${colors[key]};`).join("\n");
  return `<style id="hotel-theme">
      :root {
${lines}
      }
    </style>`;
}

/** Bloque de tokens de marca de Tailwind (@theme) del módulo, generado desde config. */
function buildModuleTheme() {
  const c = cfg.theme.colors;
  return [
    `  --color-brand-950: ${c.cream};`,
    `  --color-brand-900: ${c.paper};`,
    `  --color-brand-800: ${c.parchment};`,
    `  --color-brand-700: ${c.goldLight};`,
    `  --color-brand-600: ${c.copper};`,
    `  --color-brand-500: ${c.stone};`,
    `  --color-brand-100: ${c.ink};`,
    ``,
    `  --color-accent: ${c.wood};`,
    `  --color-accent-hover: ${c.woodDark};`,
    `  --color-accent-bright: ${c.woodSoft};`,
    `  --color-highlight: ${c.gold};`,
    `  --color-honey: ${c.honey};`,
    `  --color-gold: ${c.bronze};`,
    `  --color-bronze: ${c.bronze};`,
  ].join("\n");
}

/** Reescribe la región marcada de tokens de marca en globals.css del módulo. */
function writeModuleTheme() {
  const cssPath = join(ROOT, "hotel-reservas", "src", "app", "globals.css");
  const css = readFileSync(cssPath, "utf8");
  const re = /\/\* HOTEL_THEME_START \*\/[\s\S]*?\/\* HOTEL_THEME_END \*\//;
  if (!re.test(css)) {
    throw new Error("globals.css no contiene los marcadores HOTEL_THEME_START/END.");
  }
  const block = `/* HOTEL_THEME_START */\n${buildModuleTheme()}\n  /* HOTEL_THEME_END */`;
  const next = css.replace(re, () => block);
  writeFileSync(cssPath, next, "utf8");
  return cssPath;
}

/** Reemplazos deterministas del cuerpo. Orden importa. */
function applyBody(html) {
  const c = cfg.contact;
  const a = cfg.address;
  const b = cfg.brand;
  const encName = encodeURIComponent(b.name);
  const addressText = `${a.street}<br />${a.postalCode} ${a.locality}, ${a.regionShort}, ${a.country}`;

  const replacements = [
    // Contacto / enlaces (incluye correcciones de datos inconsistentes)
    [/href="tel:\+56998218978"/g, `href="tel:${c.phoneE164}"`],
    [/>\+56 9 9821 8978</g, `>${c.phoneDisplay}<`],
    [/wa\.me\/56998218978/g, `wa.me/${c.whatsapp}`],
    [/La%20Casona%20de%20Futrono/g, encName],
    [/mailto:reservas@hotelboyehouse\.cl/g, `mailto:${c.email}`],
    [/>reservas@hotelboyehouse\.cl</g, `>${c.email}<`],
    [/href="https:\/\/www\.instagram\.com\/"/g, `href="${cfg.social.instagram}"`],
    [/href="https:\/\/www\.facebook\.com\/"/g, `href="${cfg.social.facebook}"`],
    [
      /Almirante Barroso 243<br \/>5180000 Futrono, Los Ríos, Chile/g,
      addressText,
    ],
    [/Almirante\+Barroso\+243,\+Futrono,\+Los\+Rios,\+Chile/g, mapQ],
    // Marca partida en spans (header + hero)
    [
      /<span class="casona-header__wordmark-main">La Casona<\/span>/g,
      `<span class="casona-header__wordmark-main">${b.nameLine1}</span>`,
    ],
    [
      /<span class="casona-header__wordmark-sub">de Futrono<\/span>/g,
      `<span class="casona-header__wordmark-sub">${b.nameLine2}</span>`,
    ],
    [
      /<span class="casona-hero__brand-line">La Casona<\/span>/g,
      `<span class="casona-hero__brand-line">${b.nameLine1}</span>`,
    ],
    [
      /<span class="casona-hero__brand-line casona-hero__brand-line--accent">de Futrono<\/span>/g,
      `<span class="casona-hero__brand-line casona-hero__brand-line--accent">${b.nameLine2}</span>`,
    ],
    [
      /<p class="casona-hero__eyebrow">Hotel de Turismo · Futrono · Los Ríos<\/p>/g,
      `<p class="casona-hero__eyebrow">${cfg.hero.eyebrow}</p>`,
    ],
    [
      /<p class="casona-hero__tagline">Un refugio de calma en el sur<\/p>/g,
      `<p class="casona-hero__tagline">${cfg.hero.tagline}</p>`,
    ],
    [
      /<p class="casona-hero__lead">\s*[\s\S]*?<\/p>/,
      `<p class="casona-hero__lead">\n            ${cfg.hero.lead || "Hotel boutique en Futrono, entre bosque nativo y Lago Ranco. Descanso honesto, madera cálida y una hospitalidad que invita a quedarse."}\n          </p>`,
    ],
    [/<a href="#nosotros">La Casona<\/a>/g, `<a href="#nosotros">${b.shortName}</a>`],
    // Copyright (año + nombre) antes del reemplazo global del nombre
    [/© 2026 La Casona de Futrono/g, `© ${b.copyrightYear} ${b.name}`],
    // Reemplazo global del nombre completo restante (alt, aria-label, títulos)
    [/La Casona de Futrono/g, b.name],
    // Dominio absoluto que pudiera quedar en el cuerpo
    [new RegExp("https://lacasonadefutrono\\.cl", "g"), site],
  ];

  for (const [pattern, value] of replacements) {
    // Función de reemplazo para evitar la interpretación de "$" (p. ej. "$$").
    html = html.replace(pattern, () => value);
  }
  return html;
}

function writeSeoFiles() {
  const reservasPath = (() => {
    try {
      const pathname = new URL(reservas).pathname.replace(/\/$/, "");
      return pathname || "/reservas";
    } catch {
      return "/reservas";
    }
  })();

  const today = new Date().toISOString().slice(0, 10);
  const publicUrls = [
    { loc: `${site}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${site}${reservasPath}/`, changefreq: "weekly", priority: "0.9" },
    { loc: `${site}${reservasPath}/terminos`, changefreq: "yearly", priority: "0.3" },
    { loc: `${site}${reservasPath}/privacidad`, changefreq: "yearly", priority: "0.3" },
  ];

  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Rutas privadas del motor de reservas",
    `Disallow: ${reservasPath}/admin`,
    `Disallow: ${reservasPath}/admin/`,
    `Disallow: ${reservasPath}/login`,
    `Disallow: ${reservasPath}/login/`,
    `Disallow: ${reservasPath}/mi-reserva`,
    `Disallow: ${reservasPath}/mi-reserva/`,
    `Disallow: ${reservasPath}/api/`,
    "",
    `Sitemap: ${site}/sitemap.xml`,
    "",
  ].join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicUrls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  writeFileSync(join(ROOT, "robots.txt"), robots, "utf8");
  writeFileSync(join(ROOT, "sitemap.xml"), sitemap, "utf8");
}

function main() {
  const templatePath = join(ROOT, "assets", "landing.template.html");
  const template = readFileSync(templatePath, "utf8");
  if (!template.includes("{{HEAD_META}}")) {
    throw new Error("La plantilla no contiene el token {{HEAD_META}}.");
  }

  const head = "    " + buildHead();
  let html = template.replace("    {{HEAD_META}}", () => head);
  html = html.replace("    {{THEME_STYLE}}", () => "    " + buildThemeStyle());
  html = applyBody(html);
  html = html.replace("            {{REVIEWS_SECTION}}", () => buildReviewsSection());

  const outLanding = join(ROOT, "propuesta-7-casona-futrono.html");
  writeFileSync(outLanding, html, "utf8");

  const outModuleDir = join(ROOT, "hotel-reservas", "src", "config");
  mkdirSync(outModuleDir, { recursive: true });
  const outModule = join(outModuleDir, "hotel.generated.json");
  writeFileSync(outModule, JSON.stringify(cfg, null, 2) + "\n", "utf8");

  const outCss = writeModuleTheme();
  writeSeoFiles();

  console.log("✓ Landing generada:", outLanding);
  console.log("✓ Config de módulo:", outModule);
  console.log("✓ Tema del módulo:", outCss);
  console.log("✓ SEO:", join(ROOT, "robots.txt"), "+", join(ROOT, "sitemap.xml"));
}

main();
