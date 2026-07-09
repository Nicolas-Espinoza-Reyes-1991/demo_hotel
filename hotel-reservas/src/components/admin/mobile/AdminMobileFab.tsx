"use client";

import { cn } from "@/lib/utils";

export function AdminMobileFab({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-5 right-4 z-[70] min-h-12 rounded-full border border-accent/30 bg-accent px-5 py-3 text-sm font-bold text-brand-900 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.45)] transition hover:bg-highlight md:hidden",
        className
      )}
    >
      {label}
    </button>
  );
}
