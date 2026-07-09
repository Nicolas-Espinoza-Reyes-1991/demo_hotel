"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  label: string;
  className?: string;
  variant?: "default" | "accent";
  /** Evita activar controles padre (p. ej. pestañas del admin). */
  stopPropagation?: boolean;
  width?: number;
};

const DEFAULT_TOOLTIP_WIDTH = 224;

/**
 * Icono de ayuda accesible. Abre por hover/focus en escritorio y por tap en
 * móvil (toggle). El globo se renderiza en un portal con posición fija para no
 * recortarse dentro de contenedores con scroll (como el modal de reserva).
 */
export function InfoTooltip({
  label,
  className,
  variant = "default",
  stopPropagation = false,
  width = DEFAULT_TOOLTIP_WIDTH,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;

    function reposition() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const margin = 10;
      const left = Math.max(
        margin,
        Math.min(
          rect.left + rect.width / 2 - width / 2,
          window.innerWidth - width - margin
        )
      );
      setCoords({ top: rect.bottom + 8, left });
    }

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={cn("inline-flex align-middle", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label="Más información"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          setOpen((value) => !value);
        }}
        onPointerDown={(event) => {
          if (stopPropagation) event.stopPropagation();
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border font-bold leading-none transition",
          variant === "accent"
            ? "h-5 w-5 border-2 border-gold bg-accent-hover text-brand-900 shadow-[0_1px_4px_rgba(61,43,31,0.3)] hover:border-highlight hover:bg-accent hover:shadow-md"
            : "h-[18px] w-[18px] border border-brand-700 bg-brand-800 text-[10px] text-brand-600 hover:border-highlight hover:text-accent"
        )}
      >
        {variant === "accent" ? (
          <span className="font-serif text-[11px] font-extrabold not-italic leading-none" aria-hidden="true">
            i
          </span>
        ) : (
          "i"
        )}
      </button>
      {open &&
        mounted &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: width,
            }}
            className="z-[60] rounded-xl border border-highlight/30 bg-[#3d2b1f] px-3 py-2 text-xs font-normal leading-relaxed text-brand-900 shadow-xl shadow-accent/30"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
