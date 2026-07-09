"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminMobileCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-xl border border-brand-700 bg-white/75 p-4 shadow-sm", className)}>
      {children}
    </article>
  );
}

export function AdminMobileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
        {label}
      </span>
      <div className="min-w-0 text-right text-sm text-brand-100">{children}</div>
    </div>
  );
}

export function AdminMobilePagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        className="btn-secondary min-h-10 px-3 text-xs"
        onClick={onPrev}
        disabled={page <= 1}
      >
        Anterior
      </button>
      <span className="text-xs text-brand-500">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className="btn-secondary min-h-10 px-3 text-xs"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Siguiente
      </button>
    </div>
  );
}

export function AdminMobileFilterScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminMobileCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void copyCode();
      }}
      className="min-h-9 shrink-0 rounded-lg border border-brand-600 bg-brand-800 px-2.5 text-[11px] font-semibold text-brand-100"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function AdminMobileSelect({
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input-field min-h-11 w-full py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
