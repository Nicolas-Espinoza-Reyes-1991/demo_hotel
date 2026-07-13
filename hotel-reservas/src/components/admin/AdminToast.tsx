"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type AdminToastMessage = {
  type: "success" | "error";
  text: string;
};

type AdminToastProps = {
  message: AdminToastMessage | null;
  onDismiss: () => void;
  /** Auto-cierre éxito (ms). */
  successMs?: number;
  /** Auto-cierre error (ms). */
  errorMs?: number;
};

/**
 * Toast fijo del panel admin. Se cierra solo y con el botón ×.
 * Usar en lugar de alert-success/error estáticos que se pierden al scrollear.
 */
export function AdminToast({
  message,
  onDismiss,
  successMs = 4000,
  errorMs = 8000,
}: AdminToastProps) {
  const [mounted, setMounted] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!message) return;
    const ms = message.type === "success" ? successMs : errorMs;
    const timer = window.setTimeout(() => onDismissRef.current(), ms);
    return () => window.clearTimeout(timer);
  }, [message?.type, message?.text, successMs, errorMs]);

  if (!mounted || !message) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end sm:p-6"
      aria-live={message.type === "error" ? "assertive" : "polite"}
    >
      <div
        role={message.type === "error" ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_16px_40px_-12px_rgba(44,35,28,0.35)] backdrop-blur-md animate-fade-in-up",
          message.type === "success"
            ? "border-emerald-300/70 bg-[#f4faf6]/95 text-emerald-950"
            : "border-red-300/70 bg-[#fdf4f4]/95 text-red-950"
        )}
      >
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{message.text}</p>
        <button
          type="button"
          onClick={() => onDismissRef.current()}
          className="shrink-0 rounded-lg px-2 py-0.5 text-lg leading-none opacity-70 transition hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}
