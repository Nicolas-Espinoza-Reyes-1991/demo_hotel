import { cn } from "@/lib/utils";

type BadgeVariant =
  | "available"
  | "pending"
  | "paid"
  | "maintenance"
  | "blocked"
  | "cancelled"
  | "refunded";

const styles: Record<BadgeVariant, string> = {
  available: "bg-teal-900/15 text-teal-900 ring-teal-700/30",
  paid: "bg-teal-900/15 text-teal-900 ring-teal-700/30",
  pending: "bg-amber-900/15 text-amber-950 ring-amber-700/30",
  maintenance: "bg-brand-700 text-brand-100 ring-brand-600",
  blocked: "bg-red-900/15 text-red-900 ring-red-700/30",
  cancelled: "bg-red-900/15 text-red-900 ring-red-700/30",
  refunded: "bg-violet-900/15 text-violet-950 ring-violet-700/30",
};

const labels: Record<BadgeVariant, string> = {
  available: "Disponible",
  paid: "Pagado",
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
