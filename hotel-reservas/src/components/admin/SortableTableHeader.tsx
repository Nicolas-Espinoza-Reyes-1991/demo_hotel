"use client";

import type { SortDirection } from "@/hooks/useTableSort";
import { cn } from "@/lib/utils";

type SortableThProps<K extends string> = {
  label: string;
  columnKey: K;
  sortKey: K | null;
  sortDirection: SortDirection;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
};

export function SortableTh<K extends string>({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onSort,
  className,
  align = "left",
}: SortableThProps<K>) {
  const active = sortKey === columnKey;

  return (
    <th className={cn(className, align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex max-w-full items-center gap-1 transition",
          align === "right" && "ml-auto",
          active ? "text-brand-100" : "text-brand-500 hover:text-brand-100"
        )}
        aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        <span className="shrink-0 text-[10px] opacity-75" aria-hidden>
          {active ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </button>
    </th>
  );
}
