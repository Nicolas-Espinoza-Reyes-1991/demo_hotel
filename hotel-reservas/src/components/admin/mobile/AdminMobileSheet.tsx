"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function AdminMobileSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  mobileOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  mobileOnly?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const sheet = (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-brand-900/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92vh,900px)] flex-col rounded-t-3xl border border-brand-700/80 bg-[#faf6ef] shadow-[0_-18px_48px_-12px_rgba(15,23,42,0.35)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-700/45 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-base font-bold text-brand-100">{title}</p>
            {subtitle && <p className="mt-0.5 truncate text-sm text-brand-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-700 bg-white/70 text-lg text-brand-500 transition hover:bg-white"
            aria-label="Cerrar formulario"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
      </div>
    </div>
  );

  if (mobileOnly) {
    return typeof document !== "undefined" ? createPortal(sheet, document.body) : null;
  }

  return (
    <>
      <div className="hidden md:contents">{children}</div>
      {typeof document !== "undefined" && createPortal(sheet, document.body)}
    </>
  );
}
