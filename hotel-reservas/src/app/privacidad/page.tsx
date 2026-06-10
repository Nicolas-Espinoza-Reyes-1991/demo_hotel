import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Volver a reservas
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-brand-100">Política de privacidad</h1>
      <div className="prose prose-invert mt-6 space-y-4 text-sm text-brand-500">
        <p>
          Recopilamos nombre, email y teléfono para gestionar reservas hoteleras. Los datos se usan únicamente
          para confirmar estadías, procesar pagos y comunicarnos contigo sobre tu reserva.
        </p>
        <p>
          No vendemos tus datos a terceros. Los proveedores de pago (Mercado Pago) procesan la información según
          sus propias políticas.
        </p>
        <p>
          Puedes solicitar acceso, corrección o eliminación de tus datos contactando al hotel o por WhatsApp desde
          la web de reservas.
        </p>
      </div>
    </main>
  );
}
