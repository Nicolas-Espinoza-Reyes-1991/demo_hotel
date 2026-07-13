import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ExperiencesGridView } from "@/components/ExperiencesGridView";
import { AdminComingSoonPanel } from "@/components/admin/AdminComingSoonPanel";
import { AdkinCredit } from "@/components/AdkinCredit";
import { HOTEL_NAME } from "@/lib/brand";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LOCKED_MODULE_COPY } from "@/lib/locked-modules";
import { buildPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: `Experiencias | ${HOTEL_NAME}`,
  description: `Actividades y turismo local cerca de ${HOTEL_NAME}. Cabalgatas, navegación, trekking y más.`,
  path: "/experiencias",
  ogTitle: `Experiencias · ${HOTEL_NAME}`,
  ogDescription: "Descubrí actividades de operadores locales y contactalos por WhatsApp.",
});

export default function ExperienciasPage() {
  const enabled = isFeatureEnabled("experiences");
  const locked = LOCKED_MODULE_COPY.experiences;

  return (
    <>
      <AppHeader />
      <main className="exp-page">
        <div className="exp-page__glow" aria-hidden />
        <div className="exp-page__inner">
          <Link href="/" className="carta-page__back">
            ← Reservas
          </Link>

          {enabled ? (
            <>
              <header className="exp-hero animate-fade-in">
                <p className="exp-hero__brand">{HOTEL_NAME}</p>
                <h1 className="exp-hero__title">Experiencias</h1>
                <p className="exp-hero__lead">
                  Actividades con operadores locales del sur. Elegí una y contactalos directo por
                  WhatsApp.
                </p>
              </header>
              <ExperiencesGridView />
            </>
          ) : (
            locked && (
              <div className="mt-6 max-w-2xl">
                <AdminComingSoonPanel
                  title={locked.title}
                  summary={locked.summary}
                  highlights={locked.highlights}
                />
              </div>
            )
          )}

          <footer className="carta-page__footer">
            <AdkinCredit />
          </footer>
        </div>
      </main>
    </>
  );
}
