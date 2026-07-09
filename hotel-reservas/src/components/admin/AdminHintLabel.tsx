import type { ElementType, ReactNode } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";

type AdminHintLabelProps = {
  children: ReactNode;
  hint: string;
  className?: string;
  as?: ElementType;
};

/** Título de sección admin + icono ℹ que muestra ayuda solo al pasar el mouse. */
export function AdminHintLabel({
  children,
  hint,
  className,
  as: Tag = "span",
}: AdminHintLabelProps) {
  return (
    <Tag className={cn("inline-flex items-center gap-1.5", className)}>
      {children}
      <InfoTooltip label={hint} variant="accent" stopPropagation />
    </Tag>
  );
}
