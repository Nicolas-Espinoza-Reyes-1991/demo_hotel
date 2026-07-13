"use client";

import { useState } from "react";
import { GuestContactInfo } from "@/components/admin/GuestContactInfo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

export type MobileCalendarReservation = {
  id: string;
  confirmationCode: string;
  roomId: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestDocumentType?: string | null;
  guestRut?: string | null;
  guestPassport?: string | null;
  guestBirthDate?: string | null;
  checkIn: string;
  checkOut: string;
  paymentStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  historical?: boolean;
  updatedAt?: string;
};

type PaymentBadge = {
  variant: "paid" | "pending" | "cancelled" | "refunded";
  label: string;
};

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void copyCode();
      }}
      className="rounded-lg border border-brand-600 bg-brand-800 px-2.5 py-1 text-[11px] font-semibold text-brand-100"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function MobilePeriodList({
  rows,
  roomCodeById,
  formatShortDate,
  getPaymentBadge,
  periodPage,
  periodTotalPages,
  onPrevPage,
  onNextPage,
  onOpenReservation,
}: {
  rows: MobileCalendarReservation[];
  roomCodeById: Map<string, string>;
  formatShortDate: (iso: string) => string;
  getPaymentBadge: (reservation: MobileCalendarReservation) => PaymentBadge;
  periodPage: number;
  periodTotalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenReservation?: (target: { id: string; confirmationCode: string }) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((reservation) => {
        const roomCode = roomCodeById.get(reservation.roomId) ?? "—";
        const paymentBadge = getPaymentBadge(reservation);

        return (
          <article
            key={reservation.id}
            className={cn(
              "rounded-xl border border-brand-700 bg-white/75 p-4",
              reservation.historical && "opacity-90"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-brand-100">{reservation.guestName}</p>
              <StatusBadge variant={paymentBadge.variant} label={paymentBadge.label} />
            </div>
            <p className="mt-1 text-xs text-brand-500">
              Hab. {roomCode} · {formatShortDate(reservation.checkIn)} → {formatShortDate(reservation.checkOut)}
            </p>
            <div className="mt-2">
              <GuestContactInfo
                email={reservation.guestEmail}
                phone={reservation.guestPhone}
                documentType={reservation.guestDocumentType}
                rut={reservation.guestRut}
                passport={reservation.guestPassport}
                birthDate={reservation.guestBirthDate}
                compact
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="select-all break-all rounded-md bg-brand-800 px-2 py-1 font-mono text-xs text-brand-100">
                {reservation.confirmationCode}
              </code>
              <CopyCodeButton code={reservation.confirmationCode} />
            </div>
            {onOpenReservation ? (
              <button
                type="button"
                onClick={() =>
                  onOpenReservation({
                    id: reservation.id,
                    confirmationCode: reservation.confirmationCode,
                  })
                }
                className="btn-primary mt-3 min-h-10 w-full text-sm"
              >
                Ver en Reservas
              </button>
            ) : null}
          </article>
        );
      })}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={onPrevPage}
          disabled={periodPage <= 1}
        >
          Anterior
        </button>
        <span className="text-xs text-brand-500">
          {periodPage} / {periodTotalPages}
        </span>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={onNextPage}
          disabled={periodPage >= periodTotalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
