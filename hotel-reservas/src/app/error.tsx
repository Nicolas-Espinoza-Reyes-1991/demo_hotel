"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight">Error</p>
      <h1 className="mt-3 text-3xl font-bold text-brand-100">Algo salió mal</h1>
      <p className="mt-3 text-sm text-brand-500">Ocurrió un error inesperado. Puedes reintentar o volver al inicio.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary min-w-36">
          Reintentar
        </button>
        <Link href="/" className="btn-secondary inline-flex min-w-36 items-center justify-center">
          Inicio
        </Link>
      </div>
    </main>
  );
}
