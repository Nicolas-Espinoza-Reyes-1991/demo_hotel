"use client";

import { cn } from "@/lib/utils";

type VisibleDay = { year: number; month: number; day: number };

const WEEKDAY_SHORT = ["D", "L", "M", "X", "J", "V", "S"] as const;

function dayKey(day: VisibleDay) {
  return `${day.year}-${day.month}-${day.day}`;
}

export function AdminWeekStrip({
  days,
  occupiedByDay,
  totalRooms,
  todayKey,
  selectedDayKey,
  onSelectDay,
}: {
  days: VisibleDay[];
  occupiedByDay: Map<string, number>;
  totalRooms: number;
  todayKey: string | null;
  selectedDayKey: string | null;
  onSelectDay: (key: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-700 bg-white/72 p-3 shadow-sm md:hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Ocupación semanal</p>
        {selectedDayKey && (
          <button
            type="button"
            onClick={() => onSelectDay(null)}
            className="text-[11px] font-semibold text-accent"
          >
            Ver todos
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = dayKey(day);
          const date = new Date(day.year, day.month - 1, day.day);
          const weekday = date.getDay();
          const occupied = occupiedByDay.get(key) ?? 0;
          const ratio = totalRooms > 0 ? occupied / totalRooms : 0;
          const isToday = todayKey === key;
          const isSelected = selectedDayKey === key;
          const isWeekend = weekday === 0 || weekday === 6;

          let dotClass = "bg-brand-700/35";
          if (ratio >= 0.75) dotClass = "bg-accent";
          else if (ratio >= 0.4) dotClass = "bg-amber-400";
          else if (ratio > 0) dotClass = "bg-amber-200";

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(isSelected ? null : key)}
              className={cn(
                "flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border px-0.5 py-1 transition",
                isSelected
                  ? "border-accent/50 bg-honey/35"
                  : isToday
                    ? "border-highlight/50 bg-honey/20"
                    : isWeekend
                      ? "border-brand-700/40 bg-slate-200/35"
                      : "border-brand-700/30 bg-white/55"
              )}
              aria-pressed={isSelected}
            >
              <span className="text-[9px] font-semibold text-brand-500">{WEEKDAY_SHORT[weekday]}</span>
              <span className="text-sm font-bold text-brand-100">{day.day}</span>
              <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden />
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-brand-500">
        Tocá un día para filtrar la agenda · {totalRooms} habitaciones
      </p>
    </div>
  );
}

export { dayKey };
