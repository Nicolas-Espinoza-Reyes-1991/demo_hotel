import { useCallback, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortableValue = string | number | boolean | null | undefined;

export function compareSortValues(a: SortableValue, b: SortableValue, direction: SortDirection): number {
  const mult = direction === "asc" ? 1 : -1;

  const normalize = (value: SortableValue): string | number => {
    if (value == null || value === "") return "";
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
  };

  const left = normalize(a);
  const right = normalize(b);

  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * mult;
  }

  return String(left).localeCompare(String(right), "es", { numeric: true, sensitivity: "base" }) * mult;
}

export function useTableSort<K extends string>(defaultKey?: K, defaultDirection: SortDirection = "asc") {
  const [sortKey, setSortKey] = useState<K | null>(defaultKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const toggleSort = useCallback(
    (key: K) => {
      if (sortKey === key) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(key);
      setSortDirection("asc");
    },
    [sortKey]
  );

  const sortRows = useCallback(
    <T,>(rows: T[], getValue: (row: T, key: K) => SortableValue): T[] => {
      if (!sortKey) return rows;
      const key = sortKey;
      const direction = sortDirection;
      return [...rows].sort((a, b) => compareSortValues(getValue(a, key), getValue(b, key), direction));
    },
    [sortKey, sortDirection]
  );

  return { sortKey, sortDirection, toggleSort, sortRows };
}
