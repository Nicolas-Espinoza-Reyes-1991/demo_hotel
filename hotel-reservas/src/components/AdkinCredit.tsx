import { ADKINIQ_NAME, ADKINIQ_URL } from "@/lib/adkiniq";
import { cn } from "@/lib/utils";

type AdkinCreditProps = {
  className?: string;
};

/** Crédito de desarrollo — visible en todas las vistas del sistema. */
export function AdkinCredit({ className }: AdkinCreditProps) {
  return (
    <p className={cn("text-center text-xs leading-relaxed text-brand-500 sm:text-[13px]", className)}>
      Desarrollado por{" "}
      <a
        href={ADKINIQ_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-accent underline decoration-highlight/50 underline-offset-2 transition hover:text-accent-hover hover:decoration-accent"
      >
        {ADKINIQ_NAME}
      </a>
    </p>
  );
}
