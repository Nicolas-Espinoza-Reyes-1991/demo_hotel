"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger" | "warn";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal de confirmación alineado al panel admin (overlay + panel crema).
 * Sustituye window.confirm en acciones críticas.
 */
export function AdminConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const confirmClass =
    tone === "danger"
      ? "min-h-11 flex-1 rounded-xl border border-red-300/80 bg-red-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:opacity-60"
      : tone === "warn"
        ? "min-h-11 flex-1 rounded-xl border border-amber-400/70 bg-amber-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60"
        : "btn-primary min-h-11 flex-1";

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-brand-900/55 backdrop-blur-[3px]"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-label="Cerrar"
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-brand-700/70 bg-[#faf6ef] shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:rounded-3xl"
        )}
      >
        <div className="border-b border-brand-700/45 px-5 py-4">
          <p id={titleId} className="text-lg font-bold text-brand-100">
            {title}
          </p>
          {detail ? <p className="mt-1 truncate text-sm text-brand-500">{detail}</p> : null}
        </div>

        <div className="space-y-4 px-5 py-5">
          <p id={descId} className="text-sm leading-relaxed text-brand-100">
            {message}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="btn-secondary min-h-11 flex-1 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={confirmClass}
            >
              {busy ? "Guardando…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
