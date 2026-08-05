"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "admin-billing-notice-seen";

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Aviso de regularización / saldo pendiente.
 * Se muestra una vez por día al entrar al panel admin.
 */
export function AdminBillingNotice() {
  const titleId = useId();
  const descId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === todayKey()) return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => okRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* ignore quota / private mode */
    }
    setOpen(false);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="absolute inset-0 bg-brand-900/55 backdrop-blur-[3px]" aria-hidden />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-amber-700/40 bg-[#faf6ef] shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:rounded-3xl">
        <div className="border-b border-amber-700/30 bg-amber-100/50 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
            Aviso importante
          </p>
          <p id={titleId} className="mt-1 text-lg font-bold text-brand-100">
            Regularización de servicios
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div id={descId} className="space-y-3 text-sm leading-relaxed text-brand-100">
            <p>
              Este sitio web se encuentra en proceso de regularización de servicios y traspaso
              técnico.
            </p>
            <p>
              Recordamos a la administración que el plazo límite para saldar el saldo pendiente y
              evitar la suspensión temporal del servicio es el{" "}
              <strong className="font-bold text-amber-950">viernes a las 18:00 hrs</strong>.
            </p>
            <p>
              Si ya realizaste la transferencia, por favor envía el comprobante a tu ejecutivo de
              Adkiniq para validar el pago.
            </p>
          </div>

          <button
            ref={okRef}
            type="button"
            onClick={dismiss}
            className="min-h-11 w-full rounded-xl border border-amber-400/70 bg-amber-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
