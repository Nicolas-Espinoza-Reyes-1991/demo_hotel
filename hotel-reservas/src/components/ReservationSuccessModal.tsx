"use client";

import { formatCurrency, formatNightsLabel, formatStayRange } from "@/lib/dates";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import type { BankTransferConfig } from "@/types/payments";

export type SuccessReservation = {
  confirmationCode: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paymentStatus: string;
  roomName: string;
  roomCode: string;
  guestName: string;
  guestEmail: string;
  transactionId?: string;
  nights: number;
  paymentMethod?: "online" | "bank_transfer";
  bankTransfer?: BankTransferConfig;
  emailNotificationsEnabled?: boolean;
};

export function ReservationSuccessModal({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: SuccessReservation | null;
  onClose: () => void;
}) {
  if (!open || !data) return null;

  const isPaid = data.paymentStatus === "PAID";
  const isBankTransfer = data.paymentMethod === "bank_transfer";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-accent/40 bg-brand-900 shadow-2xl sm:rounded-3xl animate-fade-in-up"
      >
        <div className="bg-gradient-to-br from-brand-800 to-brand-900 px-6 pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 ring-2 ring-accent/30">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 id="success-title" className="text-2xl font-bold text-brand-100">
            {isBankTransfer && !isPaid ? "Reserva registrada" : "¡Reserva confirmada!"}
          </h2>
          <p className="mt-2 text-sm text-brand-500">
            {isPaid
              ? "Tu pago fue procesado correctamente."
              : isBankTransfer
                ? "Realiza la transferencia para confirmar tu estadía."
                : "Tu reserva quedó registrada. Completa el pago para confirmar."}
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-xl border border-brand-700 bg-brand-800 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
              Código de confirmación
            </p>
            <p className="mt-1 break-all font-mono text-lg font-extrabold text-highlight">{data.confirmationCode}</p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-500">Habitación</dt>
              <dd className="text-right font-medium text-brand-100">
                {data.roomCode} · {data.roomName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-500">Fechas</dt>
              <dd className="text-right text-brand-100">
                {formatStayRange(data.checkIn, data.checkOut)}
                <span className="block text-xs text-brand-500">{formatNightsLabel(data.nights)}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-500">Huésped</dt>
              <dd className="text-right text-brand-100">{data.guestName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-500">Total</dt>
              <dd className="text-lg font-bold text-accent">{formatCurrency(data.totalAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-brand-500">Estado del pago</dt>
              <dd>
                <StatusBadge
                  variant={isPaid ? "paid" : "pending"}
                  label={isBankTransfer && !isPaid ? "Pendiente · Transferencia" : undefined}
                />
              </dd>
            </div>
            {data.transactionId && isPaid && (
              <div className="flex justify-between gap-4">
                <dt className="text-brand-500">Transacción</dt>
                <dd className="font-mono text-xs text-brand-100">{data.transactionId}</dd>
              </div>
            )}
          </dl>

          {isBankTransfer && data.bankTransfer && !isPaid && (
            <div className="alert-info space-y-2 text-left text-xs">
              <p className="font-semibold">Datos para transferir</p>
              <p>
                Banco: <strong>{data.bankTransfer.bankName}</strong>
              </p>
              <p>
                Titular: <strong>{data.bankTransfer.accountHolder}</strong>
              </p>
              <p>
                Cuenta: <strong className="font-mono">{data.bankTransfer.accountNumber}</strong>
              </p>
              {data.bankTransfer.cbu && (
                <p>
                  CBU/CVU: <strong className="font-mono">{data.bankTransfer.cbu}</strong>
                </p>
              )}
              {data.bankTransfer.alias && (
                <p>
                  Alias: <strong className="font-mono">{data.bankTransfer.alias}</strong>
                </p>
              )}
              <p>
                Referencia: <strong className="font-mono">{data.confirmationCode}</strong>
              </p>
              <p>Plazo: {data.bankTransfer.deadlineHours} horas para enviar comprobante.</p>
            </div>
          )}

          <p
            className={
              data.emailNotificationsEnabled === false
                ? "alert-warning text-center text-xs"
                : "alert-success text-center text-xs"
            }
          >
            {isBankTransfer && !isPaid ? (
              <>
                Envía el comprobante a{" "}
                <strong>{data.bankTransfer?.contactEmail ?? "recepción del hotel"}</strong> con tu código{" "}
                <strong className="font-mono">{data.confirmationCode}</strong>.
                {data.emailNotificationsEnabled === false && (
                  <>
                    {" "}
                    No enviamos correos automáticos: guarda estos datos o consulta en{" "}
                    <strong>Mi reserva</strong>.
                  </>
                )}
              </>
            ) : data.emailNotificationsEnabled === false ? (
              <>
                Guarda tu código <strong className="font-mono">{data.confirmationCode}</strong>. No enviamos
                correos automáticos en este momento; podés consultar tu reserva en{" "}
                <strong>Mi reserva</strong> con tu email.
              </>
            ) : (
              <>
                Guarda tu código <strong className="font-mono">{data.confirmationCode}</strong>. Recibirás
                confirmación en <strong>{data.guestEmail}</strong>.
              </>
            )}
          </p>

          <WhatsAppSupport
            variant="banner"
            confirmationCode={data.confirmationCode}
            guestName={data.guestName}
            roomName={data.roomName}
          />

          <button type="button" onClick={onClose} className="btn-primary w-full">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
