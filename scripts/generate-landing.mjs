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
      "description": ${jsonld(s.jsonLdDescription)},
      "url": "${site}/",
      "telephone": ${jsonld(cfg.contact.phoneE164)},
      "email": ${jsonld(cfg.contact.email)},
      "logo": "${logoAbs}",
      "image": "${ogImageAbs}",
      "priceRange": ${jsonld(s.priceRange)},
      "starRating": { "@type": "Rating", "ratingValue": ${jsonld(s.starRating)} },
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

  const outLanding = join(ROOT, "propuesta-7-casona-futrono.html");
  writeFileSync(outLanding, html, "utf8");

  const outModuleDir = join(ROOT, "hotel-reservas", "src", "config");
  mkdirSync(outModuleDir, { recursive: true });
  const outModule = join(outModuleDir, "hotel.generated.json");
  writeFileSync(outModule, JSON.stringify(cfg, null, 2) + "\n", "utf8");

  const outCss = writeModuleTheme();

  console.log("✓ Landing generada:", outLanding);
  console.log("✓ Config de módulo:", outModule);
  console.log("✓ Tema del módulo:", outCss);
}

main();
