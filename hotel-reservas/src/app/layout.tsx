import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Playfair_Display } from "next/font/google";
import { CasonaInitialPreloader } from "@/components/CasonaPreloader";
import { SiteFooter } from "@/components/SiteFooter";
import { apiPath } from "@/lib/api-path";
import { getHotelName, HOTEL_NAME, LOGO_PATH } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
  style: ["normal", "italic"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  || process.env.APP_URL?.trim()
  || "https://lacasonadefutrono.cl";
const reservasUrl = `${siteUrl}/reservas`;
const ogImage = `${siteUrl}/fotos_web/arquitectura_hotel_vista/WhatsApp%20Image%202026-06-08%20at%2011.07.34.jpeg`;

export const metadata: Metadata = {
  metadataBase: new URL(reservasUrl),
  title: {
    default: `${HOTEL_NAME} | Reservas directas online`,
    template: `%s | ${HOTEL_NAME}`,
  },
  description: `Reserva tu estadía en ${HOTEL_NAME}, hotel boutique en Futrono, Región de Los Ríos. Disponibilidad en tiempo real, pago online seguro y atención por WhatsApp.`,
  keywords: ["hotel Futrono", "reservas Lago Ranco", "alojamiento Futrono", "hotel Los Ríos", "La Casona de Futrono"],
  authors: [{ name: HOTEL_NAME, url: siteUrl }],
  creator: HOTEL_NAME,
  publisher: HOTEL_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: `${reservasUrl}/`,
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: `${reservasUrl}/`,
    siteName: HOTEL_NAME,
    title: `${HOTEL_NAME} | Reserva tu estadía`,
    description: `Reserva en línea en ${HOTEL_NAME}, hotel boutique en Futrono a orillas del Lago Ranco.`,
    images: [{ url: ogImage, width: 1200, height: 630, alt: `Vista exterior de ${HOTEL_NAME}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${HOTEL_NAME} | Reserva tu estadía`,
    description: `Hotel boutique en Futrono, Los Ríos. Casona de madera nativa y Lago Ranco.`,
    images: [ogImage],
  },
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}${LOGO_PATH}`,
    apple: `${basePath}${LOGO_PATH}`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: HOTEL_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#3d2b1f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bgReception = `url('${apiPath("/bg-reception.png")}')`;

  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${playfair.variable} ${cormorant.variable} min-h-dvh`}
        style={{ ["--bg-reception-url" as string]: bgReception }}
      >
        <CasonaInitialPreloader hotelName={getHotelName()} />
        <div className="flex min-h-dvh flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
