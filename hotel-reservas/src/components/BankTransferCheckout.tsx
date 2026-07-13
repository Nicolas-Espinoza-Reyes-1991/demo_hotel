"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
        onClick={() => void copyValue()}
        aria-label={`Copiar ${label}`}
        className="shrink-0 rounded-lg border border-brand-700 bg-brand-900 px-2 py-0.5 text-[11px] font-semibold text-brand-500 hover:text-accent"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function BankTransferCheckout({
  config,
  confirmationCode,
  totalAmount,
  guestEmail: _guestEmail,
  loading,
  onConfirm,
  showConfirmButton = true,
}: BankTransferCheckoutProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs leading-snug text-brand-500">
        {confirmationCode ? (
          <>
            Transfiere <strong className="text-brand-100">{formatCurrency(totalAmount)}</strong> usando el
            código <strong className="font-mono text-brand-100">{confirmationCode}</strong> como referencia.
            El hotel confirma en ~{config.deadlineHours} h.
          </>
        ) : (
          <>
            Primero confirma la reserva abajo. Después recibirás tu{" "}
            <strong className="text-brand-100">código de reserva</strong> para usarlo como referencia al
            transferir <strong className="text-brand-100">{formatCurrency(totalAmount)}</strong>. Tendrás{" "}
            <strong className="text-brand-100">~{config.deadlineHours} horas</strong> para enviar el
            comprobante.
          </>
        )}
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

      <p className="text-[11px] text-brand-500">
        Envía el comprobante a{" "}
        <strong className="text-brand-100">{config.contactEmail ?? "recepción del hotel"}</strong>
        {confirmationCode ? (
          <>
            {" "}
            indicando el código <span className="font-mono">{confirmationCode}</span>.
          </>
        ) : (
          <> indicando tu código cuando lo tengas.</>
        )}
      </p>

      {showConfirmButton ? (
        <button type="button" disabled={loading} onClick={onConfirm} className="btn-primary w-full min-h-11">
          {loading ? "Registrando…" : confirmationCode ? "Ya transferí" : "Confirmar y obtener código"}
        </button>
      ) : null}
    </div>
  );
}
