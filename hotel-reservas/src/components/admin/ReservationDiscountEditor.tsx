"use client";

import { useEffect, useState } from "react";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
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
  const [amount, setAmount] = useState(String(Math.round(row.totalAmount)));
  const [reason, setReason] = useState(row.discountReason ?? "");

  useEffect(() => {
    setAmount(String(Math.round(row.totalAmount)));
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

  const title = row.hasDiscount ? "Editar descuento" : "Aplicar descuento";
  const chargedPreview = Number(amount.replace(",", "."));
  const previewValid = Number.isFinite(chargedPreview) && chargedPreview > 0;
  const savings =
    previewValid && chargedPreview < list - 0.009
      ? Math.round((list - chargedPreview) * 100) / 100
      : 0;

  return (
    <div className="space-y-2">
      <ReservationAmountCell row={row} />
      {row.hasDiscount && row.discountReason && (
        <p className="text-[11px] leading-snug text-brand-500">
          {row.discountReason}
          {row.discountAppliedBy ? ` · ${row.discountAppliedBy}` : ""}
        </p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-50"
      >
        {row.hasDiscount ? "Editar descuento" : "Aplicar descuento"}
      </button>

      <AdminMobileSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={`Precio de lista ${formatCurrency(list)}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-700/40 bg-white/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              Precio de lista
            </p>
            <p className="mt-1 text-xl font-bold text-brand-100">{formatCurrency(list)}</p>
            {savings > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-800">
                Ahorro: {formatCurrency(savings)}
              </p>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-brand-100">Monto cobrado</span>
            <input
              type="number"
              min={0.01}
              max={list}
              step="1"
              value={amount}
              disabled={saving}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field min-h-12 w-full text-base"
              inputMode="decimal"
              autoFocus
            />
            <span className="text-xs text-brand-500">
              Debe ser menor o igual al precio de lista. Si lo igualás, se quita el descuento.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-brand-100">Motivo</span>
            <input
              type="text"
              maxLength={200}
              value={reason}
              disabled={saving}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: cliente frecuente, promo WhatsApp…"
              className="input-field min-h-12 w-full text-base"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="btn-primary min-h-12 w-full px-4 text-sm sm:min-w-[8rem] sm:flex-1"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="btn-secondary min-h-12 w-full px-4 text-sm sm:min-w-[8rem] sm:flex-1"
            >
              Cancelar
            </button>
          </div>

          {row.hasDiscount && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void clear()}
              className="min-h-12 w-full rounded-xl border border-red-200 bg-red-50/80 px-4 text-sm font-semibold text-[#a33] transition hover:bg-red-100 disabled:opacity-50"
            >
              Quitar descuento
            </button>
          )}
        </div>
      </AdminMobileSheet>
    </div>
  );
}
