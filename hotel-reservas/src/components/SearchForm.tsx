"use client";

import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

export type SearchParams = {
  checkIn: string;
  checkOut: string;
  guests: number;
};

export function SearchForm({
  onSearch,
  loading,
}: {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState<string | null>(null);

  // Lanzar búsqueda automáticamente con los valores por defecto al montar
  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current) return;
    autoSearched.current = true;
    onSearch({ checkIn: today, checkOut: tomorrow, guests: 2 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nextDay(value: string): string {
    return format(addDays(new Date(`${value}T12:00:00`), 1), "yyyy-MM-dd");
  }

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    setError(null);
    if (!checkOut || checkOut <= value) {
      setCheckOut(nextDay(value));
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (checkOut <= checkIn) {
      setError("La fecha de salida debe ser posterior a la entrada.");
      return;
    }
    setError(null);
    onSearch({ checkIn, checkOut, guests });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel-elevated grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-5 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end lg:gap-3"
    >
      {/* Entrada */}
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Entrada
        </span>
        <input
          type="date"
          value={checkIn}
          min={today}
          onChange={(e) => handleCheckInChange(e.target.value)}
          className="input-field"
          required
        />
      </label>

      {/* Salida */}
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Salida
        </span>
        <input
          type="date"
          value={checkOut}
          min={checkIn ? nextDay(checkIn) : tomorrow}
          onChange={(e) => {
            setCheckOut(e.target.value);
            setError(null);
          }}
          className="input-field"
          required
        />
      </label>

      {/* Huéspedes */}
      <label className="block space-y-1.5 col-span-2 md:col-span-1 lg:col-span-1">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Huéspedes
        </span>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="input-field"
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "huésped" : "huéspedes"}
            </option>
          ))}
        </select>
      </label>

      {/* Botón */}
      <div className="flex items-end col-span-2 md:col-span-2 lg:col-span-1">
        <button type="submit" disabled={loading} className="btn-primary w-full whitespace-nowrap">
          {loading ? "Buscando..." : "Buscar disponibilidad"}
        </button>
      </div>

      {error && (
        <p className="alert-error text-sm col-span-2 md:col-span-2 lg:col-span-4">{error}</p>
      )}

      {checkIn && checkOut && (
        <p className="text-xs text-brand-500 col-span-2 md:col-span-2 lg:col-span-4">
          Estadía del{" "}
          <strong className="text-highlight">
            {format(new Date(checkIn + "T12:00:00"), "d MMM yyyy", { locale: es })}
          </strong>{" "}
          al{" "}
          <strong className="text-highlight">
            {format(new Date(checkOut + "T12:00:00"), "d MMM yyyy", { locale: es })}
          </strong>
        </p>
      )}
    </form>
  );
}
