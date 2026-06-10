import Link from "next/link";
import { AdkinCredit } from "@/components/AdkinCredit";

export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-brand-700/40 bg-brand-900/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-brand-500">
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
        <AdkinCredit />
      </div>
    </footer>
  );
}
