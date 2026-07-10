import { formatNightsLabel, formatStayRange } from "@/lib/dates";
import type { SearchParams } from "@/components/SearchForm";

export function BookingResultsSummary({
  search,
  count,
  nights,
}: {
  search: SearchParams;
  count: number;
  nights?: number;
}) {
  const roomLabel = count === 1 ? "habitación disponible" : "habitaciones disponibles";
  const guestLabel = search.guests === 1 ? "1 huésped" : `${search.guests} huéspedes`;

  return (
    <p className="booking-results-summary" role="status">
      <strong className="text-brand-100">
        {count} {roomLabel}
      </strong>
      <span className="booking-results-summary__sep" aria-hidden="true">
        ·
      </span>
      <span className="text-brand-100/85">{formatStayRange(search.checkIn, search.checkOut)}</span>
      {nights != null && nights > 0 ? (
        <>
          <span className="booking-results-summary__sep" aria-hidden="true">
            ·
          </span>
          <span className="text-brand-100/85">{formatNightsLabel(nights)}</span>
        </>
      ) : null}
      <span className="booking-results-summary__sep" aria-hidden="true">
        ·
      </span>
      <span className="text-brand-100/85">{guestLabel}</span>
    </p>
  );
}
