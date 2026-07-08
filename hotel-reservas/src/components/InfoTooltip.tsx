"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  label: string;
  className?: string;
};

const TOOLTIP_WIDTH = 224;

/**
 * Icono de ayuda accesible. Abre por hover/focus en escritorio y por tap en
 * móvil (toggle). El globo se renderiza en un portal con posición fija para no
 * recortarse dentro de contenedores con scroll (como el modal de reserva).
 */
export function InfoTooltip({ label, className }: InfoTooltipProps) {
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
          rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
          window.innerWidth - TOOLTIP_WIDTH - margin
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (btnRef.current && !btnRef.current.contains(event.target as Node)) {
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
        onClick={() => setOpen((value) => !value)}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand-700 bg-brand-800 text-[10px] font-bold leading-none text-brand-600 transition hover:border-highlight hover:text-accent"
      >
        i
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
              width: TOOLTIP_WIDTH,
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
