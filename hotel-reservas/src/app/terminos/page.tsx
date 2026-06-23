import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de reserva, políticas de cancelación y pago en La Casona de Futrono.",
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Volver a reservas
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-brand-100">Términos y condiciones</h1>
      <div className="prose prose-invert mt-6 space-y-4 text-sm text-brand-500">
        <p>
          Al reservar aceptas las políticas de cancelación, horarios de check-in/check-out y tarifas vigentes del
          hotel. Las reservas impagadas pueden expirar automáticamente según el plazo indicado al reservar.
        </p>
        <p>
          Los pagos por transferencia deben enviarse dentro del plazo indicado, incluyendo el código de reserva
          como referencia.
        </p>
        <p>
          El hotel se reserva el derecho de cancelar reservas por errores de precio, fraude o indisponibilidad
          verificada.
        </p>
      </div>
    </main>
  );
}
