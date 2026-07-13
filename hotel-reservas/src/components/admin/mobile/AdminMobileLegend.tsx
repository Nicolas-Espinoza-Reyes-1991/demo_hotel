"use client";

import { useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";

function LegendSwatch({
  variant,
}: {
  variant:
    | "paid"
    | "partial"
    | "pending"
    | "history"
    | "refunded"
    | "block"
    | "weekend"
    | "today"
    | "unavailable";
}) {
  const styles = {
    paid: "bg-gradient-to-r from-emerald-700 to-emerald-500",
    partial: "bg-gradient-to-r from-amber-300 to-yellow-200",
    pending: "border border-dashed border-orange-400 bg-orange-100",
    history: "border border-dashed border-slate-400 bg-slate-200",
    refunded: "border border-dashed border-violet-400 bg-violet-100",
    block: "bg-gradient-to-r from-rose-900 to-stone-700",
    weekend: "bg-slate-300/50",
    today: "bg-honey/60 ring-2 ring-highlight/50",
    unavailable: "bg-brand-700/70",
  };

  return <span className={cn("inline-block h-3 w-5 shrink-0 rounded-sm", styles[variant])} />;
}

const LEGEND_ITEMS = [
  { variant: "paid" as const, label: "Pagado" },
  { variant: "partial" as const, label: "Abonado" },
  { variant: "pending" as const, label: "Pendiente" },
  { variant: "history" as const, label: "Cancelada" },
  { variant: "refunded" as const, label: "Reembolsada" },
  { variant: "block" as const, label: "Bloqueo" },
  { variant: "weekend" as const, label: "Fin de semana" },
  { variant: "today" as const, label: "Hoy" },
  { variant: "unavailable" as const, label: "No disponible" },
];

export function AdminMobileLegend({ helpText }: { helpText: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-brand-700/40 bg-brand-800/20 px-3 py-2 md:hidden">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          aria-expanded={open}
        >
          <span className="text-[11px] font-semibold text-brand-100">Leyenda</span>
          <span className="text-xs text-brand-500">{open ? "Ocultar" : "Ver"}</span>
        </button>
        <InfoTooltip label={helpText} variant="accent" width={272} />
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] text-brand-500">
          {LEGEND_ITEMS.map((item) => (
            <span key={item.variant} className="inline-flex items-center gap-1.5">
              <LegendSwatch variant={item.variant} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
