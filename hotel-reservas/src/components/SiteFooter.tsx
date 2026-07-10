"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdkinCredit } from "@/components/AdkinCredit";

/** Footer público — oculto en el panel admin (tiene su propio layout). */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[11px] font-medium text-brand-500/90 sm:justify-start">
          <Link href="/mi-reserva" className="hover:text-brand-100 hover:underline">
            Consultar mi reserva
          </Link>
          <Link href="/terminos" className="hover:text-brand-100 hover:underline">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-brand-100 hover:underline">
            Privacidad
          </Link>
        </nav>
        <AdkinCredit className="!text-[11px] sm:!text-xs" />
      </div>
    </footer>
  );
}
