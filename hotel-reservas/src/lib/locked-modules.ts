import type { AdminNavId } from "@/components/admin/AdminNav";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const LOCKED_MODULE_COPY: Partial<
  Record<AdminNavId, { title: string; summary: string; highlights: string[] }>
> = {
  experiences: {
    title: "Experiencias y turismo",
    summary:
      "Publicá cabalgatas, paseos en bote y actividades de partners para que tus huéspedes las descubran y consulten fácil.",
    highlights: [
      "Carga de actividades con precio, duración y contacto del operador",
      "Vitrina pública para huéspedes con consulta por WhatsApp",
      "Gestión de partners y disponibilidad desde el panel",
    ],
  },
  menu: {
    title: "Carta del hotel",
    summary:
      "Armá una carta digital de comida, licores y productos para mostrar a tus clientes y facilitar pedidos o consultas.",
    highlights: [
      "Catálogo por categorías: comida, bar, snacks y más",
      "Precios, fotos y disponibilidad en tiempo real",
      "Carta visible para huéspedes con contacto directo al hotel",
    ],
  },
  reports: {
    title: "Reportes del hotel",
    summary:
      "Consultá ocupación, ingresos cobrados, ranking de cabañas y saldos pendientes en un solo lugar.",
    highlights: [
      "Reportes por período con exportable a CSV",
      "Ingresos, ocupación y saldos alineados a lo cobrado",
      "Vista clara para administración y toma de decisiones",
    ],
  },
};

/** Tabs que deben mostrar AdminComingSoonPanel según flags */
export function getLockedAdminTab(tab: AdminNavId): (typeof LOCKED_MODULE_COPY)[AdminNavId] | null {
  if (tab === "menu" && !isFeatureEnabled("menu")) return LOCKED_MODULE_COPY.menu ?? null;
  if (tab === "experiences" && !isFeatureEnabled("experiences")) {
    return LOCKED_MODULE_COPY.experiences ?? null;
  }
  if (tab === "reports" && !isFeatureEnabled("reports")) return LOCKED_MODULE_COPY.reports ?? null;
  return null;
}
