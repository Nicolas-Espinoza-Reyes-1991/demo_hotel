import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-3xl font-bold text-brand-100">Página no encontrada</h1>
      <p className="mt-3 text-sm text-brand-500">La ruta que buscas no existe o fue movida.</p>
      <Link href="/" className="btn-primary mt-8 inline-flex min-w-40 justify-center">
        Volver al inicio
      </Link>
    </main>
  );
}
