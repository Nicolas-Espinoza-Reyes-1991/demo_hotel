import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Política de privacidad",
  description:
    "Cómo La Casona de Futrono trata tus datos personales (nombre, email y teléfono) para gestionar reservas conforme a la Ley 19.628.",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Volver a reservas
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-brand-100">Política de privacidad</h1>
      <div className="prose prose-invert mt-6 space-y-4 text-sm text-brand-500">
        <h2 className="text-lg font-bold text-brand-100">Datos que recopilamos</h2>
        <p>
          Recopilamos nombre, email y teléfono para gestionar reservas hoteleras. Los datos se usan únicamente
          para confirmar estadías, procesar pagos y comunicarnos contigo sobre tu reserva.
        </p>
        <h2 className="text-lg font-bold text-brand-100">Finalidad y conservación</h2>
        <p>
          Conservamos la información el tiempo necesario para operar la reserva y cumplir obligaciones legales.
          No vendemos tus datos a terceros.
        </p>
        <h2 className="text-lg font-bold text-brand-100">Tus derechos</h2>
        <p>
          Podés solicitar acceso, rectificación o eliminación de tus datos contactándonos por los canales
          publicados en el sitio web del hotel.
        </p>
      </div>
    </main>
  );
}
