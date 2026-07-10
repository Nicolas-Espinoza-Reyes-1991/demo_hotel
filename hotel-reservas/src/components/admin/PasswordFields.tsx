"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  evaluatePassword,
  passwordsMatch,
  type PasswordStrength,
} from "@/lib/password-policy";

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  empty: "Ingresá una contraseña",
  weak: "Débil",
  medium: "Media",
  strong: "Fuerte",
};

const STRENGTH_BAR: Record<PasswordStrength, string> = {
  empty: "bg-brand-700",
  weak: "bg-danger w-1/3",
  medium: "bg-warning w-2/3",
  strong: "bg-emerald-600 w-full",
};

type PasswordFieldsProps = {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  disabled,
  autoFocus,
}: PasswordFieldsProps) {
  const baseId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const evaluation = useMemo(() => evaluatePassword(password), [password]);
  const match = passwordsMatch(password, confirmPassword);
  const confirmTouched = confirmPassword.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${baseId}-password`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-500">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id={`${baseId}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus={autoFocus}
            disabled={disabled}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="input-field w-full pr-20"
            placeholder="Mínimo 8 caracteres"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-brand-500 hover:text-accent"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Fortaleza</p>
          <p
            className={cn(
              "text-xs font-semibold",
              evaluation.strength === "strong" && "text-emerald-700",
              evaluation.strength === "medium" && "text-warning",
              evaluation.strength === "weak" && "text-danger",
              evaluation.strength === "empty" && "text-brand-500"
            )}
          >
            {STRENGTH_LABEL[evaluation.strength]}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-800">
          <div className={cn("h-full rounded-full transition-all", STRENGTH_BAR[evaluation.strength])} />
        </div>
      </div>

      <ul className="grid gap-1.5 rounded-xl border border-brand-700/60 bg-brand-800/40 p-3 sm:grid-cols-2">
        {evaluation.results.map((rule) => (
          <li key={rule.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                rule.ok ? "bg-emerald-100 text-emerald-700" : "bg-brand-700/80 text-brand-500"
              )}
              aria-hidden
            >
              {rule.ok ? "✓" : "·"}
            </span>
            <span className={cn(rule.ok ? "text-brand-100" : "text-brand-500")}>{rule.label}</span>
          </li>
        ))}
      </ul>

      <div>
        <label htmlFor={`${baseId}-confirm`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-500">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id={`${baseId}-confirm`}
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            disabled={disabled}
            value={confirmPassword}
            onChange={(event) => onConfirmChange(event.target.value)}
            className={cn(
              "input-field w-full pr-20",
              confirmTouched && !match && "border-danger focus:border-danger"
            )}
            placeholder="Repetí la misma contraseña"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((value) => !value)}
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-brand-500 hover:text-accent"
          >
            {showConfirm ? "Ocultar" : "Ver"}
          </button>
        </div>
        {confirmTouched && (
          <p className={cn("mt-1.5 text-xs font-medium", match ? "text-emerald-700" : "text-danger")}>
            {match ? "Las contraseñas coinciden." : "Las contraseñas no coinciden."}
          </p>
        )}
      </div>
    </div>
  );
}

export function isPasswordFormValid(password: string, confirmPassword: string): boolean {
  return evaluatePassword(password).valid && passwordsMatch(password, confirmPassword);
}
