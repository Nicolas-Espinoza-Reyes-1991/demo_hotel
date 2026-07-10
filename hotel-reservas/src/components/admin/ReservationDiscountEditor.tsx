"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type ReservationDiscountFields = {
  id: string;
  totalAmount: number;
  listTotalAmount?: number;
  hasDiscount?: boolean;
  discountReason?: string | null;
  discountAppliedBy?: string | null;
  paymentStatus: string;
  paymentProvider?: string | null;
  status: string;
};

type ReservationDiscountEditorProps = {
  row: ReservationDiscountFields;
  saving?: boolean;
  compact?: boolean;
  onApply: (patch: {
    totalAmount?: number;
    discountReason?: string;
    clearDiscount?: boolean;
  }) => Promise<void> | void;
};

function canEditDiscount(row: ReservationDiscountFields): boolean {
  if (row.status === "CANCELLED") return false;
  if (row.paymentStatus === "CANCELLED" || row.paymentStatus === "REFUNDED") return false;
  if (row.paymentStatus === "PAID" && row.paymentProvider === "MERCADO_PAGO") return false;
  return true;
}

export function ReservationAmountCell({ row }: { row: ReservationDiscountFields }) {
  const list = row.listTotalAmount ?? row.totalAmount;
  const discounted = Boolean(row.hasDiscount) || row.totalAmount < list - 0.009;

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-accent sm:text-sm">{formatCurrency(row.totalAmount)}</p>
      {discounted && (
        <p className="text-[10px] text-brand-500 line-through">{formatCurrency(list)}</p>
      )}
      {discounted && (
        <span className="inline-block rounded-full bg-emerald-100/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800">
          Descuento
        </span>
      )}
    </div>
  );
}

export function ReservationDiscountEditor({
  row,
  saving,
  compact,
  onApply,
}: ReservationDiscountEditorProps) {
  const list = row.listTotalAmount ?? row.totalAmount;
  const editable = canEditDiscount(row);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(row.totalAmount));
  const [reason, setReason] = useState(row.discountReason ?? "");

  useEffect(() => {
    setAmount(String(row.totalAmount));
    setReason(row.discountReason ?? "");
  }, [row.id, row.totalAmount, row.discountReason]);

  if (!editable) {
    return (
      <div className={cn("space-y-1", compact && "text-sm")}>
        <ReservationAmountCell row={row} />
        {row.hasDiscount && row.discountReason && (
          <p className="text-[11px] text-brand-500">Motivo: {row.discountReason}</p>
        )}
        {row.paymentStatus === "PAID" && row.paymentProvider === "MERCADO_PAGO" && (
          <p className="text-[11px] text-brand-500">
            Pagada por Mercado Pago: el monto no se puede ajustar aquí.
          </p>
        )}
      </div>
    );
  }

  async function submit() {
    const charged = Number(amount.replace(",", "."));
    if (!Number.isFinite(charged) || charged <= 0) return;
    if (Math.abs(charged - list) <= 0.009) {
      await onApply({ clearDiscount: true });
      setOpen(false);
      return;
    }
    await onApply({ totalAmount: charged, discountReason: reason.trim() });
    setOpen(false);
  }

  async function clear() {
    await onApply({ clearDiscount: true });
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <ReservationAmountCell row={row} />
      {row.hasDiscount && row.discountReason && !open && (
        <p className="text-[11px] leading-snug text-brand-500">
          {row.discountReason}
          {row.discountAppliedBy ? ` · ${row.discountAppliedBy}` : ""}
        </p>
      )}

      {!open ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(true)}
          className="text-[11px] font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-50"
        >
          {row.hasDiscount ? "Editar descuento" : "Aplicar descuento"}
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-brand-700/40 bg-white/70 p-2.5">
          <p className="text-[11px] text-brand-500">
            Precio de lista: <strong className="text-brand-100">{formatCurrency(list)}</strong>
          </p>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-brand-500">Monto cobrado</span>
            <input
              type="number"
              min={0.01}
              max={list}
              step="1"
              value={amount}
              disabled={saving}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field min-h-9 w-full py-1.5 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-brand-500">Motivo</span>
            <input
              type="text"
              maxLength={200}
              value={reason}
              disabled={saving}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: cliente frecuente, promo WhatsApp…"
              className="input-field min-h-9 w-full py-1.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="btn-primary min-h-9 flex-1 px-3 text-xs"
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="btn-secondary min-h-9 px-3 text-xs"
            >
              Cancelar
            </button>
            {row.hasDiscount && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void clear()}
                className="min-h-9 w-full rounded-lg px-3 text-xs font-semibold text-[#a33] hover:bg-red-50"
              >
                Quitar descuento
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
