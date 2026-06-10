"use client";

import { formatCurrency } from "@/lib/dates";
import type { BankTransferConfig } from "@/types/payments";

type BankTransferCheckoutProps = {
  config: BankTransferConfig;
  confirmationCode?: string;
  totalAmount: number;
  guestEmail: string;
  loading: boolean;
  onConfirm: () => void;
};

function CopyRow({ label, value }: { label: string; value: string }) {
  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard no disponible
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-700 bg-brand-800 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">{label}</p>
        <p className="mt-0.5 break-all font-mono text-sm text-brand-100">{value}</p>
      </div>
      <button
        type="button"
        onClick={copyValue}
        className="shrink-0 rounded-lg border border-brand-700 bg-brand-900 px-2 py-1 text-[11px] font-semibold text-brand-500 hover:text-accent"
      >
        Copiar
      </button>
    </div>
  );
}

export function BankTransferCheckout({
  config,
  confirmationCode,
  totalAmount,
  guestEmail,
  loading,
  onConfirm,
}: BankTransferCheckoutProps) {
  return (
    <div className="space-y-4">
      <p className="alert-info text-xs leading-relaxed">
        Transfiere <strong>{formatCurrency(totalAmount)}</strong>
        {confirmationCode ? (
          <>
            {" "}
            y usa el código <strong className="font-mono">{confirmationCode}</strong> como referencia
            o concepto.
          </>
        ) : (
          <> y usa el código de confirmación que recibirás al registrar la reserva.</>
        )}{" "}
        El hotel confirmará tu pago manualmente en un plazo de {config.deadlineHours} horas.
      </p>

      <div className="space-y-2">
        <CopyRow label="Banco" value={config.bankName} />
        <CopyRow label="Titular" value={config.accountHolder} />
        <CopyRow label="Tipo de cuenta" value={config.accountType} />
        <CopyRow label="Número de cuenta" value={config.accountNumber} />
        {config.cbu && <CopyRow label="CBU / CVU" value={config.cbu} />}
        {config.alias && <CopyRow label="Alias" value={config.alias} />}
        {config.swift && <CopyRow label="SWIFT / BIC" value={config.swift} />}
        {confirmationCode && <CopyRow label="Referencia obligatoria" value={confirmationCode} />}
        <CopyRow label="Monto exacto" value={formatCurrency(totalAmount)} />
      </div>

      {config.notes && (
        <p className="rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-xs text-brand-500">
          {config.notes}
        </p>
      )}

      {config.contactEmail && (
        <p className="text-xs text-brand-500">
          Envía el comprobante a{" "}
          <a href={`mailto:${config.contactEmail}`} className="font-semibold text-accent hover:underline">
            {config.contactEmail}
          </a>{" "}
          indicando tu código y el email <strong className="text-brand-100">{guestEmail}</strong>.
        </p>
      )}

      <button type="button" disabled={loading} onClick={onConfirm} className="btn-primary w-full">
        {loading ? "Registrando reserva..." : "Confirmar reserva con transferencia"}
      </button>
    </div>
  );
}
