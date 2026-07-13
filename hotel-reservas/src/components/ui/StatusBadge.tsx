import { cn } from "@/lib/utils";

type BadgeVariant =
  | "available"
  | "pending"
  | "partial"
  | "paid"
  | "maintenance"
  | "blocked"
  | "cancelled"
  | "refunded";

const styles: Record<BadgeVariant, string> = {
  available: "bg-accent/15 text-accent-hover ring-accent/30",
  paid: "bg-emerald-100 text-emerald-900 ring-emerald-600/35",
  partial: "bg-amber-100 text-amber-950 ring-amber-500/45",
  pending: "bg-orange-50 text-orange-950 ring-orange-400/35",
  maintenance: "bg-brand-700 text-brand-100 ring-brand-600",
  blocked: "bg-red-900/15 text-red-900 ring-red-700/30",
  cancelled: "bg-red-900/15 text-red-900 ring-red-700/30",
  refunded: "bg-violet-900/15 text-violet-950 ring-violet-700/30",
};

const labels: Record<BadgeVariant, string> = {
  available: "Disponible",
  paid: "Pagado",
  partial: "Abonado",
  pending: "Pendiente",
  maintenance: "Mantenimiento",
  blocked: "Bloqueado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        styles[variant],
        className
      )}
    >
      {label ?? labels[variant]}
    </span>
  );
}
