"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiPath } from "@/lib/api-path";
import { ADMIN_BANK_HELP, ADMIN_MODULE_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { AdminToast } from "@/components/admin/AdminToast";

type BankFormState = {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  taxId: string;
  cbu: string;
  alias: string;
  swift: string;
  contactEmail: string;
  deadlineHours: string;
  notes: string;
};

const EMPTY_FORM: BankFormState = {
  enabled: true,
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  accountType: "Cuenta corriente",
  taxId: "",
  cbu: "",
  alias: "",
  swift: "",
  contactEmail: "",
  deadlineHours: "48",
  notes: "",
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function AdminBankTransferPanel() {
  const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [source, setSource] = useState<"database" | "environment">("environment");
  const [persisted, setPersisted] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiPath("/api/admin/bank-transfer"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los datos bancarios.");

      const settings = data.settings ?? {};
      setForm({
        enabled: Boolean(settings.enabled),
        bankName: settings.bankName ?? "",
        accountHolder: settings.accountHolder ?? "",
        accountNumber: settings.accountNumber ?? "",
        accountType: settings.accountType ?? "Cuenta corriente",
        taxId: settings.taxId ?? "",
        cbu: settings.cbu ?? "",
        alias: settings.alias ?? "",
        swift: settings.swift ?? "",
        contactEmail: settings.contactEmail ?? "",
        deadlineHours: String(settings.deadlineHours ?? 48),
        notes: settings.notes ?? "",
      });
      setSource(data.source === "database" ? "database" : "environment");
      setPersisted(Boolean(data.persisted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos bancarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateField<K extends keyof BankFormState>(key: K, value: BankFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const deadlineHours = Number(form.deadlineHours);
      const response = await fetch(apiPath("/api/admin/bank-transfer"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          bankName: form.bankName,
          accountHolder: form.accountHolder,
          accountNumber: form.accountNumber,
          accountType: form.accountType || "Cuenta corriente",
          taxId: form.taxId || null,
          cbu: form.cbu || null,
          alias: form.alias || null,
          swift: form.swift || null,
          contactEmail: form.contactEmail || null,
          deadlineHours: Number.isFinite(deadlineHours) ? deadlineHours : 48,
          notes: form.notes || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron guardar los datos.");

      setSuccess(data.message ?? "Datos bancarios actualizados.");
      setSource("database");
      setPersisted(true);

      const settings = data.settings ?? {};
      setForm({
        enabled: Boolean(settings.enabled),
        bankName: settings.bankName ?? "",
        accountHolder: settings.accountHolder ?? "",
        accountNumber: settings.accountNumber ?? "",
        accountType: settings.accountType ?? "Cuenta corriente",
        taxId: settings.taxId ?? "",
        cbu: settings.cbu ?? "",
        alias: settings.alias ?? "",
        swift: settings.swift ?? "",
        contactEmail: settings.contactEmail ?? "",
        deadlineHours: String(settings.deadlineHours ?? 48),
        notes: settings.notes ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    form.bankName.trim().length > 0 &&
    form.accountHolder.trim().length > 0 &&
    form.accountNumber.trim().length > 0 &&
    form.accountType.trim().length > 0;

  return (
    <section className="space-y-4">
      <div>
        <AdminHintLabel as="h2" hint={ADMIN_BANK_HELP.section} className="text-lg font-bold text-brand-100">
          Datos bancarios
        </AdminHintLabel>
        <p className="mt-1 max-w-2xl text-sm text-brand-500">{ADMIN_MODULE_HELP.bank}</p>
      </div>

      <AdminToast
        message={
          error
            ? { type: "error", text: error }
            : success
              ? { type: "success", text: success }
              : null
        }
        onDismiss={() => {
          setError(null);
          setSuccess(null);
        }}
      />

      {loading ? (
        <p className="text-sm text-brand-500">Cargando datos bancarios…</p>
      ) : (
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-4 rounded-2xl border border-brand-700/70 bg-brand-800/20 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-700/60 bg-brand-900/40 px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-brand-100">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => updateField("enabled", event.target.checked)}
                className="size-4 rounded border-brand-600"
              />
              Transferencia bancaria habilitada
            </label>
            <p className="text-xs text-brand-500">
              Origen actual:{" "}
              <strong className="text-brand-300">
                {persisted || source === "database" ? "base de datos" : "variables de entorno"}
              </strong>
            </p>
          </div>

          <p className="text-sm text-brand-500">{ADMIN_BANK_HELP.form}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Banco" required>
              <input
                value={form.bankName}
                onChange={(event) => updateField("bankName", event.target.value)}
                className="input-field min-h-11"
                required
                autoComplete="off"
              />
            </Field>
            <Field label="Titular" required>
              <input
                value={form.accountHolder}
                onChange={(event) => updateField("accountHolder", event.target.value)}
                className="input-field min-h-11"
                required
                autoComplete="off"
              />
            </Field>
            <Field label="Número de cuenta" required>
              <input
                value={form.accountNumber}
                onChange={(event) => updateField("accountNumber", event.target.value)}
                className="input-field min-h-11 font-mono"
                required
                autoComplete="off"
              />
            </Field>
            <Field label="Tipo de cuenta" required>
              <input
                value={form.accountType}
                onChange={(event) => updateField("accountType", event.target.value)}
                className="input-field min-h-11"
                required
                autoComplete="off"
              />
            </Field>
            <Field label="RUT">
              <input
                value={form.taxId}
                onChange={(event) => updateField("taxId", event.target.value)}
                className="input-field min-h-11 font-mono"
                autoComplete="off"
              />
            </Field>
            <Field label="Email de comprobantes">
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) => updateField("contactEmail", event.target.value)}
                className="input-field min-h-11"
                autoComplete="off"
              />
            </Field>
            <Field label="Plazo (horas)">
              <input
                type="number"
                min={1}
                max={168}
                value={form.deadlineHours}
                onChange={(event) => updateField("deadlineHours", event.target.value)}
                className="input-field min-h-11"
              />
            </Field>
            <Field label="CBU / CVU">
              <input
                value={form.cbu}
                onChange={(event) => updateField("cbu", event.target.value)}
                className="input-field min-h-11 font-mono"
                autoComplete="off"
              />
            </Field>
            <Field label="Alias">
              <input
                value={form.alias}
                onChange={(event) => updateField("alias", event.target.value)}
                className="input-field min-h-11"
                autoComplete="off"
              />
            </Field>
            <Field label="SWIFT / BIC">
              <input
                value={form.swift}
                onChange={(event) => updateField("swift", event.target.value)}
                className="input-field min-h-11 font-mono"
                autoComplete="off"
              />
            </Field>
          </div>

          <Field label="Notas para el huésped">
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="input-field min-h-24"
              rows={3}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => void loadSettings()}
              className="btn-secondary"
              disabled={saving}
            >
              Recargar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !canSave}>
              {saving ? "Guardando…" : "Guardar datos bancarios"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
