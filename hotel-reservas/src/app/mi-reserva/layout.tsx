import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Consultar mi reserva",
  description: "Consultá el estado de tu reserva en La Casona de Futrono con tu código de confirmación.",
  path: "/mi-reserva",
  index: false,
});

export default function MiReservaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
