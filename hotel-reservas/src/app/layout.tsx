import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

export const metadata: Metadata = {
  title: "Hotel Boye House | Reservas",
  description:
    "Sistema de reservas de Hotel Boye House Futrono con disponibilidad en línea y panel administrativo.",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}/logo-bh.png`,
    apple: `${basePath}/logo-bh.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hotel Boye House",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6efe4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${playfair.variable} min-h-dvh`}>
        <div className="flex min-h-dvh flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
