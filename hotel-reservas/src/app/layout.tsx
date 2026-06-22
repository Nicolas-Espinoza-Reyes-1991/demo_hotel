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

export const metadata: Metadata = {
  title: `${HOTEL_NAME} | Reservas`,
  description:
    `Sistema de reservas de ${HOTEL_NAME} con disponibilidad en línea y panel administrativo.`,
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
