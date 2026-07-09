"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DESKTOP_MQ = "(min-width: 768px)";

function useOverlayScrollLock(open: boolean, mobileOnly: boolean) {
  useEffect(() => {
    if (!open) return;

    const media = window.matchMedia(DESKTOP_MQ);

    function shouldLockViewport() {
      if (mobileOnly) return !media.matches;
      return true;
    }

    const previous = document.body.style.overflow;

    function sync() {
      document.body.style.overflow = shouldLockViewport() ? "hidden" : previous;
    }

    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      document.body.style.overflow = previous;
    };
  }, [open, mobileOnly]);
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-700/45 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="min-w-0">
        <p className="text-base font-bold text-brand-100 sm:text-lg">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-sm text-brand-500">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-700 bg-white/70 text-lg text-brand-500 transition hover:bg-white hover:text-brand-100"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

export function AdminMobileSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  mobileOnly = false,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  mobileOnly?: boolean;
  size?: "md" | "lg" | "xl";
}) {
  useOverlayScrollLock(open, mobileOnly);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const desktopWidth =
    size === "xl" ? "max-w-5xl" : size === "md" ? "max-w-2xl" : "max-w-4xl";

  const mobileSheet = (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-brand-900/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92vh,900px)] flex-col rounded-t-3xl border border-brand-700/80 bg-[#faf6ef] shadow-[0_-18px_48px_-12px_rgba(15,23,42,0.35)]">
        <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
      </div>
    </div>
  );

  const desktopModal = (
    <div
      className="fixed inset-0 z-[80] hidden items-center justify-center p-4 sm:p-6 md:flex"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-brand-900/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={cn(
          "relative flex max-h-[min(92vh,920px)] w-full flex-col overflow-hidden rounded-3xl border border-brand-700/70 bg-[#faf6ef] shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)]",
          desktopWidth
        )}
      >
        <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );

  if (mobileOnly) {
    return typeof document !== "undefined" ? createPortal(mobileSheet, document.body) : null;
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {desktopModal}
      {mobileSheet}
    </>,
    document.body
  );
}
