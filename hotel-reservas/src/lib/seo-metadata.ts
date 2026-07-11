import type { Metadata } from "next";
import { hotelConfig } from "@/config/hotel";
import { HOTEL_NAME, LOGO_PATH } from "@/lib/brand";
import { getReservasBasePath, getReservasOrigin, getSiteOrigin } from "@/lib/seo-site";

const basePath = () => {
  const value = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || getReservasBasePath();
  return value === "/" ? "" : value;
};

export function getOgImageAbsoluteUrl(): string {
  const path = hotelConfig.assets.ogImagePath.startsWith("/")
    ? hotelConfig.assets.ogImagePath
    : `/${hotelConfig.assets.ogImagePath}`;
  return `${getSiteOrigin()}${path}`;
}

export function buildPageMetadata(options: {
  title: string;
  description: string;
  path?: string;
  index?: boolean;
  ogTitle?: string;
  ogDescription?: string;
}): Metadata {
  const reservasOrigin = getReservasOrigin();
  const path = options.path ?? "/";
  const canonicalPath = path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const canonical = `${reservasOrigin}${canonicalPath === "/" ? "/" : canonicalPath}`;
  const index = options.index ?? true;
  const ogImage = getOgImageAbsoluteUrl();
  const ogTitle = options.ogTitle ?? options.title;
  const ogDescription = options.ogDescription ?? options.description;

  return {
    title: options.title,
    description: options.description,
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
      : { index: false, follow: false },
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: hotelConfig.brand.locale,
      url: canonical,
      siteName: HOTEL_NAME,
      title: ogTitle,
      description: ogDescription,
      images: [
        {
          url: ogImage,
          width: hotelConfig.assets.ogImageWidth,
          height: hotelConfig.assets.ogImageHeight,
          alt: hotelConfig.seo.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}

/** Metadata raíz del módulo de reservas (App Router). */
export function buildRootMetadata(): Metadata {
  const siteOrigin = getSiteOrigin();
  const reservasOrigin = getReservasOrigin();
  const ogImage = getOgImageAbsoluteUrl();
  const prefix = basePath();

  return {
    metadataBase: new URL(`${reservasOrigin}/`),
    title: {
      default: `${HOTEL_NAME} | Reservas directas online`,
      template: `%s | ${HOTEL_NAME}`,
    },
    description: hotelConfig.seo.description,
    keywords: hotelConfig.seo.keywords.split(",").map((item) => item.trim()).filter(Boolean),
    authors: [{ name: HOTEL_NAME, url: siteOrigin }],
    creator: HOTEL_NAME,
    publisher: HOTEL_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    alternates: {
      canonical: `${reservasOrigin}/`,
    },
    openGraph: {
      type: "website",
      locale: hotelConfig.brand.locale,
      url: `${reservasOrigin}/`,
      siteName: HOTEL_NAME,
      title: hotelConfig.seo.ogTitle,
      description: hotelConfig.seo.ogDescription,
      images: [
        {
          url: ogImage,
          width: hotelConfig.assets.ogImageWidth,
          height: hotelConfig.assets.ogImageHeight,
          alt: hotelConfig.seo.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: hotelConfig.seo.twitterTitle,
      description: hotelConfig.seo.twitterDescription,
      images: [ogImage],
    },
    manifest: `${prefix}/manifest.webmanifest`,
    icons: {
      icon: `${prefix}${LOGO_PATH}`,
      apple: `${prefix}${LOGO_PATH}`,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: HOTEL_NAME,
    },
  };
}
