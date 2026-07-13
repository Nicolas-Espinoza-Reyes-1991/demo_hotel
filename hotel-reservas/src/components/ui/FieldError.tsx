"use client";

type FieldErrorProps = {
  id?: string;
  message?: string;
  className?: string;
};

/** Error de campo con anuncio para lectores de pantalla. */
export function FieldError({ id, message, className = "text-xs text-red-700" }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={className}>
      {message}
    </p>
  );
}

/** Props a11y para un input con error opcional. */
export function fieldA11yProps(errorId: string, error?: string) {
  return {
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error ? errorId : undefined,
  } as const;
}
