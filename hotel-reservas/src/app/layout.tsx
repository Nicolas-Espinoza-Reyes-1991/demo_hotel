import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Playfair_Display } from "next/font/google";
import { CasonaInitialPreloader } from "@/components/CasonaPreloader";
import { SiteFooter } from "@/components/SiteFooter";
import { apiPath } from "@/lib/api-path";
import { getHotelName } from "@/lib/brand";
import { hotelConfig } from "@/config/hotel";
import { buildRootMetadata } from "@/lib/seo-metadata";
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

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  themeColor: hotelConfig.theme.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bgReception = `url('${apiPath("/bg-recepcion.webp")}')`;

  return (
    <html lang={hotelConfig.brand.htmlLang}>
      <body
        className={`${inter.variable} ${playfair.variable} ${cormorant.variable} min-h-dvh`}
        style={{ ["--bg-reception-url" as string]: bgReception }}
      >
        <CasonaInitialPreloader hotelName={getHotelName()} />
        <div className="flex min-h-dvh flex-col pb-[var(--site-footer-offset)]">
          <div className="flex-1">{children}</div>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
