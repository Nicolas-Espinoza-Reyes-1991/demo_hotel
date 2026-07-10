"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useAdminReservationAlerts,
  type ReservationAlert,
} from "@/hooks/useAdminReservationAlerts";

type AdminAlertsBellProps = {
  onOpenReservation?: () => void;
};

function formatStay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Pagada";
    case "PENDING":
      return "Pendiente";
    case "CANCELLED":
      return "Cancelada";
    case "REFUNDED":
      return "Reembolso";
    default:
      return status;
  }
}

function AlertRow({
  alert,
  unread,
  onClick,
}: {
  alert: ReservationAlert;
  unread: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition",
        unread ? "bg-[#f5ebe0]" : "hover:bg-[#faf6f0]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-bold text-[#2c231c]">{alert.guestFullName}</p>
        {unread && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c45c26]" aria-hidden />
        )}
      </div>
      <p className="truncate text-xs text-[#6d5e54]">
        {alert.roomCode} · {alert.roomName}
      </p>
      <p className="text-[11px] text-[#8b7355]">
        {formatStay(alert.checkIn)} → {formatStay(alert.checkOut)} · {paymentLabel(alert.paymentStatus)}
      </p>
      <p className="text-[10px] text-[#a89078]">{formatWhen(alert.createdAt)}</p>
    </button>
  );
}

export function AdminAlertsBell({ onOpenReservation }: AdminAlertsBellProps) {
  const {
    alerts,
    unreadCount,
    unreadIds,
    soundEnabled,
    soundReady,
    error,
    enableSound,
    disableSound,
    markAllRead,
    markOneRead,
    clearPanel,
  } = useAdminReservationAlerts();

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadSet = new Set(unreadIds);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggleSound() {
    if (soundEnabled && soundReady) {
      disableSound();
      return;
    }
    await enableSound();
  }

  function handleAlertClick(alert: ReservationAlert) {
    markOneRead(alert.id);
    setOpen(false);
    onOpenReservation?.();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-white text-[#5c4033] shadow-sm transition",
          unreadCount > 0
            ? "border-[#c45c26]/35 animate-[adminAlertPulse_1.6s_ease-in-out_infinite]"
            : "border-[rgba(61,43,31,0.12)] hover:bg-[#faf6f0]",
          open && "bg-[#faf6f0]"
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          unreadCount > 0
            ? `Alertas: ${unreadCount} reserva${unreadCount === 1 ? "" : "s"} nueva${unreadCount === 1 ? "" : "s"}`
            : "Alertas de reservas"
        }
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1-.5 1H5c-.5 0-.8-.6-.5-1C5.2 13.6 6 12.2 6 9Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M10 18a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c45c26] px-1 text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Alertas de reservas"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[rgba(61,43,31,0.12)] bg-white shadow-[0_18px_40px_rgba(44,35,28,0.18)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(61,43,31,0.08)] px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-[#2c231c]">Reservas nuevas</p>
              <p className="text-[11px] text-[#8b7355]">Actualización cada ~12 s</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void toggleSound()}
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                  soundEnabled && soundReady
                    ? "bg-[#3d2b1f] text-[#f0e6d8]"
                    : "bg-[#f5ebe0] text-[#5c4033] hover:bg-[#ead9c4]"
                )}
                title={
                  soundEnabled
                    ? "Desactivar sonido"
                    : "Activar sumido (requiere un clic)"
                }
              >
                {soundEnabled && soundReady ? "Sonido on" : "Activar sonido"}
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {error && (
              <p className="px-3 py-2 text-xs text-[#a33]">{error}</p>
            )}
            {!error && alerts.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-[#8b7355]">
                Sin reservas nuevas por ahora.
              </p>
            )}
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                unread={unreadSet.has(alert.id)}
                onClick={() => handleAlertClick(alert)}
              />
            ))}
          </div>

          {(alerts.length > 0 || unreadCount > 0) && (
            <div className="flex gap-2 border-t border-[rgba(61,43,31,0.08)] px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  markAllRead();
                }}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-[#5c4033] hover:bg-[#faf6f0]"
              >
                Marcar leídas
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPanel();
                  setOpen(false);
                }}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-[#8b7355] hover:bg-[#faf6f0]"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
