import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CartaMenuView } from "@/components/CartaMenuView";
import { AdminComingSoonPanel } from "@/components/admin/AdminComingSoonPanel";
import { AdkinCredit } from "@/components/AdkinCredit";
import { HOTEL_NAME } from "@/lib/brand";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LOCKED_MODULE_COPY } from "@/lib/locked-modules";
import { buildPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: `Carta | ${HOTEL_NAME}`,
  description: `Comida, bar y productos de ${HOTEL_NAME}. Consultá y pedí por WhatsApp.`,
  path: "/carta",
  ogTitle: `Carta · ${HOTEL_NAME}`,
  ogDescription: "Descubrí la carta del hotel y consultá por WhatsApp.",
});

export default function CartaPage() {
  const enabled = isFeatureEnabled("menu");
  const locked = LOCKED_MODULE_COPY.menu;

  return (
    <>
      <AppHeader />
      <main className="carta-page">
        <div className="carta-page__glow" aria-hidden />

        <div className="carta-page__inner">
          <Link href="/" className="carta-page__back">
            ← Reservas
          </Link>

          {enabled ? (
            <>
              <header className="carta-hero animate-fade-in">
                <p className="carta-hero__brand">{HOTEL_NAME}</p>
                <h1 className="carta-hero__title">Carta</h1>
                <p className="carta-hero__lead">
                  Comida, bar y productos del hotel. Elegí y consultanos por WhatsApp.
                </p>
              </header>
              <CartaMenuView />
            </>
          ) : (
            locked && (
              <div className="mt-6">
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
