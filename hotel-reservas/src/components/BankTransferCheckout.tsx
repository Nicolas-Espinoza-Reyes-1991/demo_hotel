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
  /** Cuando es false, el botón de confirmar se renderiza fuera (pie fijo del modal). */
  showConfirmButton?: boolean;
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
    <div className="flex items-center justify-between gap-2 px-3 py-1">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase leading-none tracking-wider text-brand-500">
          {label}
        </p>
        <p className="mt-0.5 break-all font-mono text-xs leading-none text-brand-100">{value}</p>
      </div>
      <button
        type="button"
        onClick={copyValue}
        aria-label={`Copiar ${label}`}
        className="shrink-0 rounded-lg border border-brand-700 bg-brand-900 px-2 py-0.5 text-[11px] font-semibold text-brand-500 hover:text-accent"
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
  showConfirmButton = true,
}: BankTransferCheckoutProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs leading-snug text-brand-500">
        Transfiere <strong className="text-brand-100">{formatCurrency(totalAmount)}</strong> con{" "}
        {confirmationCode ? (
          <>
            el código <strong className="font-mono text-brand-100">{confirmationCode}</strong>
          </>
        ) : (
          <>tu código de reserva</>
        )}{" "}
        como referencia. Confirmamos en ~{config.deadlineHours} h.
      </p>

      <div className="overflow-hidden rounded-xl border border-brand-700 bg-brand-800 divide-y divide-brand-700/60">
        <CopyRow label="Banco" value={config.bankName} />
        <CopyRow label="Titular" value={config.accountHolder} />
        {config.taxId && <CopyRow label="RUT" value={config.taxId} />}
        <CopyRow label="Tipo de cuenta" value={config.accountType} />
        <CopyRow label="Número de cuenta" value={config.accountNumber} />
        {config.cbu && <CopyRow label="CBU / CVU" value={config.cbu} />}
        {config.alias && <CopyRow label="Alias" value={config.alias} />}
        {config.swift && <CopyRow label="SWIFT / BIC" value={config.swift} />}
        {confirmationCode && <CopyRow label="Referencia obligatoria" value={confirmationCode} />}
      </div>

      {(config.notes || config.contactEmail) && (
        <p className="text-xs leading-snug text-brand-500">
          {config.notes ? `${config.notes} ` : null}
          {config.contactEmail && (
            <>
              Envía el comprobante a{" "}
              <a
                href={`mailto:${config.contactEmail}`}
                className="font-semibold text-accent hover:underline"
              >
                {config.contactEmail}
              </a>{" "}
              con tu código y <strong className="text-brand-100">{guestEmail}</strong>.
            </>
          )}
        </p>
      )}

      {showConfirmButton && (
        <button type="button" disabled={loading} onClick={onConfirm} className="btn-primary w-full">
          {loading ? "Registrando reserva..." : "Confirmar reserva con transferencia"}
        </button>
      )}
    </div>
  );
}
