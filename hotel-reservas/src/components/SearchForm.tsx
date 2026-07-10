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
      className="booking-search-bar grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,10rem)_auto] lg:items-end lg:gap-0"
    >
      {/* Entrada */}
      <label className="booking-search-bar__field block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent sm:text-xs">
          Entrada
        </span>
        <input
          type="date"
          value={checkIn}
          min={today}
          onChange={(e) => handleCheckInChange(e.target.value)}
          className="input-field min-h-10 py-2"
          required
        />
      </label>

      {/* Salida */}
      <label className="booking-search-bar__field block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent sm:text-xs">
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
          className="input-field min-h-10 py-2"
          required
        />
      </label>

      {/* Huéspedes */}
      <label className="booking-search-bar__field col-span-2 block space-y-1 md:col-span-1 lg:col-span-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent sm:text-xs">
          Huéspedes
        </span>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="input-field min-h-10 py-2"
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "huésped" : "huéspedes"}
            </option>
          ))}
        </select>
      </label>

      {/* Botón */}
      <div className="booking-search-bar__submit col-span-2 flex flex-col justify-end gap-1.5 md:col-span-2 lg:col-span-1 lg:pl-3">
        <button type="submit" disabled={loading} className="btn-primary min-h-10 w-full whitespace-nowrap py-2.5 text-sm shadow-md">
          {loading ? "Buscando..." : "Buscar disponibilidad"}
        </button>
        {checkIn && checkOut && (
          <p className="hidden text-[10px] leading-tight text-brand-500 lg:block">
            {format(new Date(checkIn + "T12:00:00"), "d MMM", { locale: es })} →{" "}
            {format(new Date(checkOut + "T12:00:00"), "d MMM yyyy", { locale: es })}
          </p>
        )}
      </div>

      {error && (
        <p className="alert-error col-span-2 text-sm md:col-span-2 lg:col-span-4">{error}</p>
      )}

      {checkIn && checkOut && (
        <p className="col-span-2 text-[11px] text-brand-500 md:col-span-2 lg:hidden">
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
