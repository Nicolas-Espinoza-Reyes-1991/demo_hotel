"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatNightsLabel } from "@/lib/dates";
import { firstZodErrorMessage } from "@/lib/zod-form-errors";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { apiPath } from "@/lib/api-path";

type LookupResult = {
  confirmationCode: string;
  guestName: string;
  roomCode: string;
  roomName: string;
  stayLabel: string;
  nights: number;
  guestsCount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentStatusLabel: string;
  status: string;
};

function paymentBadgeVariant(status: string) {
  if (status === "PAID") return "paid" as const;
  if (status === "REFUNDED") return "refunded" as const;
  if (status === "CANCELLED") return "cancelled" as const;
  return "pending" as const;
}

export default function MiReservaPage() {
  const [confirmationCode, setConfirmationCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(apiPath("/api/public/reservations/lookup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode, email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(firstZodErrorMessage(data.details, data.error ?? "No se pudo consultar."));
      }

      setResult(data.reservation as LookupResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Volver a reservas
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-brand-100">Consultar mi reserva</h1>
        <p className="mt-2 text-sm text-brand-500">
          Ingresá el código de confirmación y el email con el que reservaste.
        </p>

        <form onSubmit={handleSubmit} className="glass-panel mt-6 space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-brand-100">Código de confirmación</span>
            <input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
              className="input-field font-mono uppercase"
              placeholder="BH-20260610-A3F2"
              required
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-brand-100">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
              autoComplete="email"
            />
          </label>

          {error && <p className="alert-error text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Buscando..." : "Consultar reserva"}
          </button>
        </form>

        {result && (
          <div className="glass-panel mt-6 space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Código</p>
              <p className="mt-1 font-mono text-lg font-bold text-highlight">{result.confirmationCode}</p>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-brand-500">Huésped</dt>
                <dd className="text-right font-medium text-brand-100">{result.guestName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-500">Habitación</dt>
                <dd className="text-right text-brand-100">
                  {result.roomCode} · {result.roomName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-500">Estadía</dt>
                <dd className="text-right text-brand-100">
                  {result.stayLabel}
                  <span className="block text-xs text-brand-500">{formatNightsLabel(result.nights)}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-500">Huéspedes</dt>
                <dd className="text-brand-100">{result.guestsCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-500">Total</dt>
                <dd className="font-bold text-accent">{formatCurrency(result.totalAmount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-brand-500">Pago</dt>
                <dd>
                  <StatusBadge
                    variant={paymentBadgeVariant(result.paymentStatus)}
                    label={result.paymentStatusLabel}
                  />
                </dd>
              </div>
            </dl>

            <WhatsAppSupport
              variant="compact"
              confirmationCode={result.confirmationCode}
              guestName={result.guestName}
              roomName={result.roomName}
            />
          </div>
        )}
      </main>
    </>
  );
}
