import { ADKINIQ_NAME, ADKINIQ_URL } from "@/lib/adkiniq";
import { cn } from "@/lib/utils";

type AdkinCreditProps = {
  className?: string;
};

/** Crédito discreto de desarrollo — visible en todas las vistas del sistema. */
export function AdkinCredit({ className }: AdkinCreditProps) {
  return (
    <p className={cn("text-center text-[11px] leading-relaxed text-brand-500/65", className)}>
      Desarrollado por{" "}
      <a
        href={ADKINIQ_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-500/85 transition hover:text-accent hover:underline"
      >
        {ADKINIQ_NAME}
      </a>
    </p>
  );
}
