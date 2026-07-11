import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Términos y condiciones",
  description:
    "Condiciones de reserva, cancelación, check-in/check-out y pago en La Casona de Futrono, hotel boutique en Futrono, Los Ríos.",
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Volver a reservas
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-brand-100">Términos y condiciones</h1>
      <div className="prose prose-invert mt-6 space-y-4 text-sm text-brand-500">
        <h2 className="text-lg font-bold text-brand-100">Reservas y pago</h2>
        <p>
          Al reservar aceptas las políticas de cancelación, horarios de check-in/check-out y tarifas vigentes del
          hotel. Las reservas impagadas pueden expirar automáticamente según el plazo indicado al reservar.
        </p>
        <h2 className="text-lg font-bold text-brand-100">Check-in y check-out</h2>
        <p>
          El horario de ingreso y salida se informa en la confirmación de tu reserva. Ante cambios de horario,
          contactanos por WhatsApp con tu código de confirmación.
        </p>
        <h2 className="text-lg font-bold text-brand-100">Cancelaciones</h2>
        <p>
          Las condiciones de cancelación y reembolso dependen del tipo de tarifa y del medio de pago utilizado.
          Conservá tu código de reserva para gestionar cualquier solicitud.
        </p>
      </div>
    </main>
  );
}
