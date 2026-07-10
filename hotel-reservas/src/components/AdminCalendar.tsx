"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MobilePeriodList } from "@/components/admin/AdminCalendarMobile";
import { AdminMobileFilterScroll } from "@/components/admin/mobile/AdminMobilePrimitives";
import { AdminMobileLegend } from "@/components/admin/mobile/AdminMobileLegend";
import { AdminWeekStrip, dayKey } from "@/components/admin/mobile/AdminWeekStrip";
import { ADMIN_CALENDAR_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { SortableTh } from "@/components/admin/SortableTableHeader";
import { GuestContactInfo } from "@/components/admin/GuestContactInfo";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTableSort } from "@/hooks/useTableSort";
import { paymentStatusLabel } from "@/lib/reservation-history";
import { cn } from "@/lib/utils";
import { apiPath } from "@/lib/api-path";

type CalendarRoom = {
  id: string;
  code: string;
  name: string;
  status: "AVAILABLE" | "MAINTENANCE" | "BLOCKED";
};

type CalendarReservation = {
  id: string;
  confirmationCode: string;
  roomId: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestDocumentType?: string | null;
  guestRut?: string | null;
  guestPassport?: string | null;
  guestBirthDate?: string | null;
  checkIn: string;
  checkOut: string;
  paymentStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  status?: string;
  updatedAt?: string;
  historical?: boolean;
};

type CalendarData = {
  year: number;
  month: number;
  daysInMonth: number;
  rooms: CalendarRoom[];
  reservations: CalendarReservation[];
  historyReservations?: CalendarReservation[];
};

type VisibleDay = { year: number; month: number; day: number };
type ViewMode = "month" | "week";
type PanelView = "calendar" | "list";
type PaymentFilter = "active" | "paid" | "pending" | "history" | "all";
type PeriodSortKey = "guest" | "room" | "checkIn" | "payment" | "code";

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

function roomStatusVariant(status: CalendarRoom["status"]) {
  if (status === "AVAILABLE") return "available" as const;
  if (status === "MAINTENANCE") return "maintenance" as const;
  return "blocked" as const;
}

function toDateOnlyParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, date: new Date(y, m - 1, d) };
}

function visibleDayDate(day: VisibleDay) {
  return new Date(day.year, day.month - 1, day.day);
}

function getDayMeta(day: VisibleDay) {
  const date = visibleDayDate(day);
  const weekday = date.getDay();
  return {
    weekday,
    weekdayLabel: WEEKDAY_LABELS[weekday],
    isWeekend: weekday === 0 || weekday === 6,
  };
}

function formatShortDate(iso: string) {
  const { y, m, d } = toDateOnlyParts(iso);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function formatBarDateRange(checkIn: string, checkOut: string) {
  const start = toDateOnlyParts(checkIn);
  const end = toDateOnlyParts(checkOut);
  if (start.y === end.y && start.m === end.m) {
    return `${start.d}→${end.d}`;
  }
  return `${formatShortDate(checkIn)} → ${formatShortDate(checkOut)}`;
}

function countNights(checkIn: string, checkOut: string) {
  const start = toDateOnlyParts(checkIn).date;
  const end = toDateOnlyParts(checkOut).date;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function getMondayAnchor(date: Date) {
  const anchor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = anchor.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  anchor.setDate(anchor.getDate() + diff);
  return anchor;
}

function buildVisibleDays(viewMode: ViewMode, year: number, month: number, weekAnchor: Date): VisibleDay[] {
  if (viewMode === "month") {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => ({
      year,
      month,
      day: index + 1,
    }));
  }

  const monday = getMondayAnchor(weekAnchor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  });
}

function reservationOverlapsDay(
  reservation: CalendarReservation,
  day: VisibleDay
): boolean {
  const { date: checkIn } = toDateOnlyParts(reservation.checkIn);
  const { date: checkOut } = toDateOnlyParts(reservation.checkOut);
  const dayStart = visibleDayDate(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return checkIn < dayEnd && checkOut > dayStart;
}

function getBarPosition(reservation: CalendarReservation, visibleDays: VisibleDay[]) {
  const rangeDays = visibleDays.length;

  let startIndex = -1;
  let endIndex = -1;

  visibleDays.forEach((day, index) => {
    if (!reservationOverlapsDay(reservation, day)) return;
    if (startIndex === -1) startIndex = index;
    endIndex = index + 1;
  });

  if (startIndex === -1 || endIndex === -1) return null;

  const spanDays = Math.max(1, endIndex - startIndex);
  const dayWidthPercent = 100 / rangeDays;
  const leftPercent = startIndex * dayWidthPercent;
  const widthPercent = spanDays * dayWidthPercent;

  return { leftPercent, widthPercent, startIndex, endIndex, spanDays };
}

function assignReservationLanes(reservations: CalendarReservation[], visibleDays: VisibleDay[]) {
  const positioned = reservations
    .map((reservation) => {
      const position = getBarPosition(reservation, visibleDays);
      if (!position) return null;
      return { reservation, ...position };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);

  const laneEnds: number[] = [];

  return positioned.map((item) => {
    let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd <= item.startIndex);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(item.endIndex);
    } else {
      laneEnds[laneIndex] = item.endIndex;
    }

    return { ...item, laneIndex };
  });
}

function reservationBarStyles(reservation: CalendarReservation) {
  if (reservation.historical) {
    if (reservation.paymentStatus === "REFUNDED") {
      return "border-violet-400/60 border-dashed bg-violet-100/90 text-violet-950 shadow-violet-900/10 opacity-90";
    }
    return "border-slate-400/60 border-dashed bg-slate-200/90 text-slate-700 shadow-slate-900/10 opacity-85";
  }
  if (reservation.paymentStatus === "PAID") {
    return "border-accent/40 bg-gradient-to-r from-accent to-highlight text-brand-900 shadow-accent-hover/20";
  }
  if (reservation.paymentStatus === "PENDING") {
    return "border-amber-500/60 border-dashed bg-gradient-to-r from-amber-100 to-amber-50 text-amber-950 shadow-amber-900/10";
  }
  return "border-brand-600 bg-brand-800 text-brand-500";
}

function calendarPaymentBadge(reservation: CalendarReservation) {
  if (reservation.paymentStatus === "PAID") {
    return { variant: "paid" as const, label: "Pagado" };
  }
  if (reservation.paymentStatus === "REFUNDED") {
    return { variant: "refunded" as const, label: "Reembolsado" };
  }
  if (reservation.paymentStatus === "CANCELLED") {
    return { variant: "cancelled" as const, label: "Cancelado" };
  }
  return { variant: "pending" as const, label: paymentStatusLabel(reservation.paymentStatus) };
}

function guestInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function LegendSwatch({
  variant,
}: {
  variant: "paid" | "pending" | "history" | "refunded" | "weekend" | "today" | "unavailable";
}) {
  const styles = {
    paid: "bg-gradient-to-r from-accent to-highlight",
    pending: "border border-dashed border-amber-500 bg-amber-100",
    history: "border border-dashed border-slate-400 bg-slate-200",
    refunded: "border border-dashed border-violet-400 bg-violet-100",
    weekend: "bg-slate-300/50",
    today: "bg-honey/60 ring-2 ring-highlight/50",
    unavailable: "bg-brand-700/70",
  };

  return <span className={cn("inline-block h-3 w-5 shrink-0 rounded-sm", styles[variant])} />;
}

function CalendarStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "paid" | "pending";
}) {
  const valueClass =
    tone === "paid" ? "text-accent" : tone === "pending" ? "text-amber-800" : "text-brand-100";

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-brand-500">{label}</span>
      <strong className={cn("text-sm font-bold", valueClass)}>{value}</strong>
    </span>
  );
}

const CALENDAR_LANE_HEIGHT_MIN = 72;
const CALENDAR_LANE_HEIGHT_MAX = 96;
const CALENDAR_ROW_MIN_HEIGHT = 100;
const PERIOD_LIST_PAGE_SIZE = 10;

function useCalendarLayout(rangeDays: number, viewMode: ViewMode, ready: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    roomColumnWidth: 148,
    laneHeight: 68,
    headerHeight: 56,
  });

  useEffect(() => {
    function updateLayout() {
      const viewportWidth = containerRef.current?.clientWidth ?? window.innerWidth;
      const roomColumnWidth = viewportWidth < 480 ? 104 : viewportWidth < 768 ? 128 : 148;
      const availableWidth = Math.max(240, viewportWidth - roomColumnWidth);
      const cellWidth = availableWidth / Math.max(rangeDays, 1);

      let laneHeight: number;
      if (viewMode === "week") {
        laneHeight = viewportWidth < 480 ? 76 : viewportWidth < 768 ? 84 : 92;
      } else {
        laneHeight = Math.round(
          Math.min(CALENDAR_LANE_HEIGHT_MAX, Math.max(CALENDAR_LANE_HEIGHT_MIN, cellWidth * 1.05))
        );
      }

      setLayout({
        roomColumnWidth,
        laneHeight,
        headerHeight: Math.max(56, laneHeight + 4),
      });
    }

    updateLayout();
    const node = containerRef.current;
    const observer = node ? new ResizeObserver(updateLayout) : null;
    if (node) observer?.observe(node);
    window.addEventListener("resize", updateLayout);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [rangeDays, viewMode, ready]);

  return { containerRef, ...layout };
}

function CalendarDayCell({
  day,
  variant,
  today,
  isWeekend,
  outsideMonth,
  roomUnavailable = false,
  showDayLabel = true,
  showWeekday = false,
}: {
  day: VisibleDay;
  variant: "header" | "body";
  today: boolean;
  isWeekend: boolean;
  outsideMonth: boolean;
  roomUnavailable?: boolean;
  showDayLabel?: boolean;
  showWeekday?: boolean;
}) {
  const { weekdayLabel } = getDayMeta(day);
  const monthShort = outsideMonth
    ? visibleDayDate(day).toLocaleDateString("es-AR", { month: "short" })
    : null;

  const surfaceClasses = cn(
    "h-full w-full min-w-0 border-b border-r border-brand-700/45",
    variant === "header"
      ? cn(
          isWeekend && "bg-slate-300/30",
          today && "bg-honey/40",
          outsideMonth && "bg-brand-700/15",
          !today && !isWeekend && !outsideMonth && "bg-brand-800"
        )
      : cn(
          roomUnavailable ? "bg-brand-700/40" : "bg-brand-900",
          isWeekend && !roomUnavailable && "bg-slate-300/12",
          today && !roomUnavailable && "bg-honey/25",
          outsideMonth && !roomUnavailable && "bg-brand-800/40"
        )
  );

  const headerWeekdayClasses = cn(
    "text-[8px] font-medium uppercase tracking-wide sm:text-[9px]",
    today ? "text-accent/90" : "text-brand-500/55"
  );

  const headerDayClasses = cn(
    "tabular-nums leading-none",
    today ? "text-xs font-semibold text-accent sm:text-sm" : "text-[10px] font-medium text-brand-500/65 sm:text-[11px]"
  );

  const bodyDayClasses = cn(
    "pointer-events-none absolute left-1 top-1 tabular-nums leading-none select-none",
    today ? "text-[9px] font-medium text-accent/75" : "text-[9px] font-normal text-brand-600/30 sm:text-[10px]"
  );

  if (variant === "header") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1.5 px-1", surfaceClasses)}>
        <span className={headerWeekdayClasses}>{weekdayLabel}</span>
        <span className={headerDayClasses}>{day.day}</span>
        {monthShort && <span className="text-[8px] font-medium uppercase text-brand-500/50">{monthShort}</span>}
      </div>
    );
  }

  return (
    <div className={cn("relative", surfaceClasses)}>
      {showDayLabel && <span className={bodyDayClasses}>{day.day}</span>}
      {showWeekday && showDayLabel && (
        <span className="pointer-events-none absolute right-1 top-1 text-[8px] font-normal uppercase text-brand-600/25">
          {weekdayLabel}
        </span>
      )}
    </div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void copyCode();
      }}
      className="rounded-lg border border-brand-600 bg-brand-800 px-2.5 py-1 text-[11px] font-semibold text-brand-100 transition hover:bg-brand-700"
    >
      {copied ? "Copiado" : "Copiar código"}
    </button>
  );
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_HEIGHT = 236;
const TOOLTIP_MARGIN = 12;

function useFloatingPanelPosition(
  anchorRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openBelow = spaceBelow >= TOOLTIP_HEIGHT + TOOLTIP_MARGIN || spaceBelow >= spaceAbove;

      let top = openBelow ? rect.bottom + 8 : rect.top - TOOLTIP_HEIGHT - 8;
      top = Math.max(
        TOOLTIP_MARGIN,
        Math.min(top, window.innerHeight - TOOLTIP_HEIGHT - TOOLTIP_MARGIN)
      );

      let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      left = Math.max(
        TOOLTIP_MARGIN,
        Math.min(left, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN)
      );

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, anchorRef]);

  return position;
}

function ReservationDetailCard({
  reservation,
  roomCode,
  pinned,
  onClose,
}: {
  reservation: CalendarReservation;
  roomCode?: string;
  pinned?: boolean;
  onClose?: () => void;
}) {
  const nights = countNights(reservation.checkIn, reservation.checkOut);
  const paymentBadge = calendarPaymentBadge(reservation);

  return (
    <div
      className={cn(
        "rounded-xl border border-brand-600 bg-white px-3 py-3 text-left shadow-xl ring-1 ring-black/5",
        pinned && "pointer-events-auto"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-brand-100">{reservation.guestName}</p>
          {roomCode && <p className="mt-0.5 text-[11px] font-medium text-brand-500">Hab. {roomCode}</p>}
        </div>
        {pinned && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-1.5 text-brand-500 transition hover:bg-brand-800 hover:text-brand-100"
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        )}
      </div>

      <p className="mt-1.5 text-xs text-brand-500">
        {formatShortDate(reservation.checkIn)} → {formatShortDate(reservation.checkOut)} · {nights}{" "}
        {nights === 1 ? "noche" : "noches"}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <StatusBadge variant={paymentBadge.variant} label={paymentBadge.label} />
        {reservation.historical && reservation.updatedAt && (
          <span className="text-[10px] text-brand-500">
            Actualizado{" "}
            {new Date(reservation.updatedAt).toLocaleString("es-AR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-brand-700 bg-brand-950/40 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">Contacto</p>
        <div className="mt-1.5">
          <GuestContactInfo
            email={reservation.guestEmail}
            phone={reservation.guestPhone}
            documentType={reservation.guestDocumentType}
            rut={reservation.guestRut}
            passport={reservation.guestPassport}
            birthDate={reservation.guestBirthDate}
            compact
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-brand-700 bg-brand-950/40 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">Código único</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="select-all break-all font-mono text-xs font-bold text-brand-100">
            {reservation.confirmationCode}
          </code>
          <CopyCodeButton code={reservation.confirmationCode} />
        </div>
      </div>
    </div>
  );
}

function ReservationBar({
  reservation,
  roomCode,
  leftPercent,
  widthPercent,
  laneIndex,
  spanDays,
  rangeDays,
  laneHeight,
  pinnedId,
  onTogglePin,
}: {
  reservation: CalendarReservation;
  roomCode: string;
  leftPercent: number;
  widthPercent: number;
  laneIndex: number;
  spanDays: number;
  rangeDays: number;
  laneHeight: number;
  pinnedId: string | null;
  onTogglePin: (id: string | null) => void;
}) {
  const barRef = useRef<HTMLButtonElement>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const nights = countNights(reservation.checkIn, reservation.checkOut);
  const isHistorical = Boolean(reservation.historical);
  const isPaid = !isHistorical && reservation.paymentStatus === "PAID";
  const isPending = !isHistorical && reservation.paymentStatus === "PENDING";
  const isCompact = spanDays <= 3;
  const isPinned = pinnedId === reservation.id;
  const isOpen = isPinned || hoverOpen;
  const position = useFloatingPanelPosition(barRef, isOpen);
  const barHeight = laneHeight - 16;
  const barTop = laneIndex * laneHeight + 8;
  const visibleDaySpan = (widthPercent / 100) * rangeDays;
  const showInlineText = !isCompact && visibleDaySpan >= 2.2;

  function closeTooltip() {
    setHoverOpen(false);
    if (isPinned) onTogglePin(null);
  }

  const tooltip =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[9999]"
            style={{ top: position.top, left: position.left, width: TOOLTIP_WIDTH }}
            onMouseEnter={() => setHoverOpen(true)}
            onMouseLeave={() => {
              if (!isPinned) setHoverOpen(false);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <ReservationDetailCard
              reservation={reservation}
              roomCode={roomCode}
              pinned={isPinned}
              onClose={closeTooltip}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className="absolute"
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: `${100 / rangeDays}%`,
        top: barTop,
        height: barHeight,
        zIndex: isPinned ? 40 : laneIndex + 1,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={barRef}
        type="button"
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => {
          if (!isPinned) setHoverOpen(false);
        }}
        onClick={() => onTogglePin(isPinned ? null : reservation.id)}
        className={cn(
          "relative flex h-full w-full items-center overflow-hidden rounded-lg border px-2 text-xs font-semibold shadow-sm transition-all duration-150",
          "hover:z-30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/50",
          isPinned && "z-40 ring-2 ring-highlight/60",
          reservationBarStyles(reservation)
        )}
        aria-expanded={isOpen}
        aria-label={`Reserva ${reservation.guestName}, código ${reservation.confirmationCode}`}
      >
        {isCompact ? (
          <div className="flex w-full flex-col items-center justify-center gap-0.5 px-0.5">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                isPaid
                  ? "bg-white/20 text-white"
                  : isPending
                    ? "bg-amber-500/15 text-amber-900"
                    : "bg-slate-500/15 text-slate-800"
              )}
            >
              {guestInitials(reservation.guestName)}
            </span>
            <span
              className={cn(
                "text-[9px] font-bold leading-none",
                isPaid ? "text-white/90" : isPending ? "text-amber-900" : "text-slate-700"
              )}
            >
              {formatBarDateRange(reservation.checkIn, reservation.checkOut)}
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden px-2">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                isPaid ? "bg-white/90" : isPending ? "bg-amber-500" : "bg-slate-500"
              )}
              aria-hidden
            />
            {showInlineText ? (
              <div className="min-w-0 overflow-hidden leading-tight">
                <span className="block truncate">{reservation.guestName}</span>
                <span
                  className={cn(
                    "block truncate text-[10px] font-medium",
                    isPaid ? "text-white/85" : isPending ? "text-amber-800" : "text-slate-700"
                  )}
                >
                  {formatBarDateRange(reservation.checkIn, reservation.checkOut)} · {nights}
                  {nights === 1 ? " noche" : " noches"}
                </span>
              </div>
            ) : (
              <span className="truncate px-1 text-[10px]">
                {formatBarDateRange(reservation.checkIn, reservation.checkOut)} · {nights}n
              </span>
            )}
          </div>
        )}
      </button>
      {tooltip}
    </div>
  );
}

function CalendarDepthTabs({
  panelView,
  onSelect,
}: {
  panelView: PanelView;
  onSelect: (view: PanelView) => void;
}) {
  const items: { id: PanelView; label: string }[] = [
    { id: "calendar", label: "Calendario" },
    { id: "list", label: "Lista" },
  ];

  return (
    <div className="calendar-depth-tabs" role="tablist" aria-label="Vista del calendario">
      {items.map((item) => {
        const active = panelView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={cn(
              "calendar-depth-tab",
              active ? "calendar-depth-tab--front" : "calendar-depth-tab--back"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminCalendar() {
  const now = new Date();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [panelView, setPanelView] = useState<PanelView>("calendar");
  const [weekAnchor, setWeekAnchor] = useState(now);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("active");
  const [pinnedReservationId, setPinnedReservationId] = useState<string | null>(null);
  const [periodSearch, setPeriodSearch] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [periodPage, setPeriodPage] = useState(1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    sortKey: periodSortKey,
    sortDirection: periodSortDirection,
    toggleSort: togglePeriodSort,
    sortRows: sortPeriodRows,
  } = useTableSort<PeriodSortKey>("checkIn", "asc");

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const visibleDays = useMemo(
    () => buildVisibleDays(viewMode, year, month, weekAnchor),
    [viewMode, year, month, weekAnchor]
  );

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monthsToLoad = new Set<string>([`${year}-${month}`]);
      if (viewMode === "week") {
        buildVisibleDays("week", year, month, weekAnchor).forEach((day) => {
          monthsToLoad.add(`${day.year}-${day.month}`);
        });
      }

      const responses = await Promise.all(
        [...monthsToLoad].map(async (key) => {
          const [y, m] = key.split("-").map(Number);
          const response = await fetch(`${apiPath("/api/calendar")}?year=${y}&month=${m}`);
          const json = await response.json();
          if (!response.ok) throw new Error(json.error ?? "Error al cargar calendario.");
          return json as CalendarData;
        })
      );

      const merged: CalendarData = {
        year,
        month,
        daysInMonth: new Date(year, month, 0).getDate(),
        rooms: responses[0]?.rooms ?? [],
        reservations: responses.flatMap((item) => item.reservations),
        historyReservations: responses.flatMap((item) => item.historyReservations ?? []),
      };

      const uniqueActive = new Map<string, CalendarReservation>();
      merged.reservations.forEach((reservation) => {
        uniqueActive.set(reservation.id, { ...reservation, historical: false });
      });
      merged.reservations = [...uniqueActive.values()];

      const uniqueHistory = new Map<string, CalendarReservation>();
      merged.historyReservations?.forEach((reservation) => {
        uniqueHistory.set(reservation.id, { ...reservation, historical: true });
      });
      merged.historyReservations = [...uniqueHistory.values()];

      setData(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [year, month, viewMode, weekAnchor]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (isMobile && viewMode === "month") {
      setViewMode("week");
    }
  }, [isMobile, viewMode]);

  useEffect(() => {
    setPinnedReservationId(null);
    setSelectedDayKey(null);
  }, [year, month, viewMode, weekAnchor, paymentFilter]);

  const allReservations = useMemo(() => {
    if (!data) return [];
    return [...data.reservations, ...(data.historyReservations ?? [])];
  }, [data]);

  const filteredReservations = useMemo(() => {
    if (!data) return [];
    return allReservations.filter((reservation) => {
      if (paymentFilter === "history") return reservation.historical;
      if (paymentFilter === "all") return true;
      if (reservation.historical) return false;
      if (paymentFilter === "paid") return reservation.paymentStatus === "PAID";
      if (paymentFilter === "pending") return reservation.paymentStatus === "PENDING";
      return true;
    });
  }, [allReservations, data, paymentFilter]);

  const visibleReservations = useMemo(() => {
    return filteredReservations.filter((reservation) =>
      visibleDays.some((day) => reservationOverlapsDay(reservation, day))
    );
  }, [filteredReservations, visibleDays]);

  const roomCodeById = useMemo(() => {
    const map = new Map<string, string>();
    data?.rooms.forEach((room) => map.set(room.id, room.code));
    return map;
  }, [data?.rooms]);

  const periodReservations = useMemo(() => {
    const q = periodSearch.trim().toLowerCase();
    let filtered = visibleReservations.slice();

    if (selectedDayKey) {
      const [y, m, d] = selectedDayKey.split("-").map(Number);
      const filterDay: VisibleDay = { year: y, month: m, day: d };
      filtered = filtered.filter((reservation) => reservationOverlapsDay(reservation, filterDay));
    }

    if (!q) return filtered;

    return filtered.filter((reservation) => {
      const roomCode = (roomCodeById.get(reservation.roomId) ?? "").toLowerCase();
      return (
        reservation.guestName.toLowerCase().includes(q) ||
        (reservation.guestEmail ?? "").toLowerCase().includes(q) ||
        (reservation.guestPhone ?? "").toLowerCase().includes(q) ||
        (reservation.guestRut ?? "").toLowerCase().includes(q) ||
        (reservation.guestPassport ?? "").toLowerCase().includes(q) ||
        (reservation.guestBirthDate ?? "").toLowerCase().includes(q) ||
        reservation.confirmationCode.toLowerCase().includes(q) ||
        roomCode.includes(q) ||
        formatShortDate(reservation.checkIn).toLowerCase().includes(q) ||
        formatShortDate(reservation.checkOut).toLowerCase().includes(q)
      );
    });
  }, [visibleReservations, periodSearch, roomCodeById, selectedDayKey]);

  const sortedPeriodReservations = useMemo(
    () =>
      sortPeriodRows(periodReservations, (reservation, key) => {
        switch (key) {
          case "guest":
            return reservation.guestName;
          case "room":
            return roomCodeById.get(reservation.roomId) ?? "";
          case "checkIn":
            return reservation.checkIn;
          case "payment":
            return reservation.paymentStatus;
          case "code":
            return reservation.confirmationCode;
          default:
            return "";
        }
      }),
    [periodReservations, sortPeriodRows, roomCodeById]
  );

  const mobileWeekDays = useMemo(() => {
    if (visibleDays.length === 7) return visibleDays;
    return buildVisibleDays("week", year, month, weekAnchor);
  }, [visibleDays, year, month, weekAnchor]);

  const mobileOccupiedByDay = useMemo(() => {
    const map = new Map<string, number>();
    const active = visibleReservations.filter((reservation) => !reservation.historical);

    mobileWeekDays.forEach((day) => {
      const key = dayKey(day);
      const roomsOccupied = new Set<string>();
      active.forEach((reservation) => {
        if (reservationOverlapsDay(reservation, day)) {
          roomsOccupied.add(reservation.roomId);
        }
      });
      map.set(key, roomsOccupied.size);
    });

    return map;
  }, [mobileWeekDays, visibleReservations]);

  const mobileTodayKey = useMemo(() => {
    const today = mobileWeekDays.find(
      (day) => day.year === todayYear && day.month === todayMonth && day.day === todayDay
    );
    return today ? dayKey(today) : null;
  }, [mobileWeekDays, todayYear, todayMonth, todayDay]);

  const isCurrentWeek = useMemo(() => {
    return mobileWeekDays.some(
      (day) => day.year === todayYear && day.month === todayMonth && day.day === todayDay
    );
  }, [mobileWeekDays, todayYear, todayMonth, todayDay]);

  const periodTotalPages = Math.max(1, Math.ceil(sortedPeriodReservations.length / PERIOD_LIST_PAGE_SIZE));

  const periodPageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, periodPage), periodTotalPages);
    const start = (safePage - 1) * PERIOD_LIST_PAGE_SIZE;
    return sortedPeriodReservations.slice(start, start + PERIOD_LIST_PAGE_SIZE);
  }, [sortedPeriodReservations, periodPage, periodTotalPages]);

  useEffect(() => {
    setPeriodPage(1);
  }, [periodSearch, year, month, viewMode, weekAnchor, paymentFilter, selectedDayKey, periodSortKey, periodSortDirection]);

  useEffect(() => {
    if (periodPage > periodTotalPages) {
      setPeriodPage(periodTotalPages);
    }
  }, [periodPage, periodTotalPages]);

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });
    }

    const start = visibleDays[0];
    const end = visibleDays[6];

    if (start.month === end.month && start.year === end.year) {
      const monthYear = visibleDayDate(end).toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });
      return `${start.day} – ${end.day} de ${monthYear}`;
    }

    const startLabel = visibleDayDate(start).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    });
    const endLabel = visibleDayDate(end).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }, [viewMode, year, month, visibleDays]);

  const stats = useMemo(() => {
    if (!data) return null;

    const activeVisible = visibleReservations.filter((reservation) => !reservation.historical);
    const occupiedNights = activeVisible.reduce((sum, reservation) => {
      const position = getBarPosition(reservation, visibleDays);
      return sum + (position?.spanDays ?? 0);
    }, 0);
    const totalCapacity = data.rooms.length * visibleDays.length;
    const occupancy = totalCapacity > 0 ? Math.round((occupiedNights / totalCapacity) * 100) : 0;
    const paidCount = activeVisible.filter((r) => r.paymentStatus === "PAID").length;
    const pendingCount = activeVisible.filter((r) => r.paymentStatus === "PENDING").length;
    const historyCount = visibleReservations.filter((r) => r.historical).length;

    return { occupiedNights, occupancy, paidCount, pendingCount, historyCount };
  }, [data, visibleReservations, visibleDays]);

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
    setWeekAnchor(date);
  }

  function shiftWeek(delta: number) {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + delta * 7);
    setWeekAnchor(next);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  function goToToday() {
    setYear(todayYear);
    setMonth(todayMonth);
    setWeekAnchor(now);
  }

  function isToday(day: VisibleDay) {
    return day.year === todayYear && day.month === todayMonth && day.day === todayDay;
  }

  const todayColumnIndex = useMemo(
    () => visibleDays.findIndex((day) => isToday(day)),
    [visibleDays, todayYear, todayMonth, todayDay]
  );

  const rangeDays = visibleDays.length;
  const { containerRef, roomColumnWidth, laneHeight, headerHeight } = useCalendarLayout(
    rangeDays,
    viewMode,
    Boolean(data)
  );
  const showWeekdayInCells = viewMode === "week";
  const dayGridStyle = {
    gridTemplateColumns: `repeat(${rangeDays}, minmax(0, 1fr))`,
  } as const;

  function roomGridStyle(laneCount: number, laneRowHeight: number) {
    return {
      ...dayGridStyle,
      gridTemplateRows: `repeat(${laneCount}, ${laneRowHeight}px)`,
    };
  }

  if (loading && !data) {
    return (
      <div className="glass-panel space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-brand-800" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-brand-800" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-brand-800" />
      </div>
    );
  }

  if (error) {
    return <div className="alert-error">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-3" onClick={() => setPinnedReservationId(null)}>
      <div className="glass-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-brand-700/50 px-3 pb-3 pt-2 sm:px-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <CalendarDepthTabs panelView={panelView} onSelect={setPanelView} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
                {panelView === "list"
                  ? "Lista del período"
                  : viewMode === "month"
                    ? "Calendario mensual"
                    : "Calendario semanal"}
              </p>
              <AdminHintLabel
                as="h2"
                hint={ADMIN_CALENDAR_HELP.section}
                className="hidden text-xl font-bold capitalize text-brand-100 sm:text-2xl md:block"
              >
                {periodLabel}
              </AdminHintLabel>
              <p className="text-sm font-semibold text-brand-500 md:hidden">
                {panelView === "calendar"
                  ? "Usá los controles de abajo para cambiar de semana"
                  : "Buscá huéspedes, códigos o habitaciones del período"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:pb-0.5">
            {panelView === "calendar" && (
              <>
                <div className="hidden overflow-hidden rounded-lg border border-brand-700 md:flex">
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={() => setViewMode("month")}
                      className={cn(
                        "min-h-9 px-3 text-xs font-semibold transition",
                        viewMode === "month" ? "bg-amber-200/60 text-amber-950" : "bg-brand-800 text-brand-500 hover:bg-brand-700"
                      )}
                    >
                      Mes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={cn(
                      "min-h-9 px-3 text-xs font-semibold transition",
                      !isMobile && "border-l border-brand-700",
                      viewMode === "week" || isMobile ? "bg-amber-200/60 text-amber-950" : "bg-brand-800 text-brand-500 hover:bg-brand-700"
                    )}
                  >
                    Semana
                  </button>
                </div>

                <div className="hidden overflow-hidden rounded-lg border border-brand-700 md:flex">
                  <button
                    type="button"
                    onClick={() => (viewMode === "week" ? shiftWeek(-1) : shiftMonth(-1))}
                    className="min-h-9 border-r border-brand-700 bg-brand-800 px-2.5 text-sm font-semibold text-brand-100 transition hover:bg-brand-700"
                    aria-label={viewMode === "week" ? "Semana anterior" : "Mes anterior"}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => (viewMode === "week" ? shiftWeek(1) : shiftMonth(1))}
                    className="min-h-9 bg-brand-800 px-2.5 text-sm font-semibold text-brand-100 transition hover:bg-brand-700"
                    aria-label={viewMode === "week" ? "Semana siguiente" : "Mes siguiente"}
                  >
                    ›
                  </button>
                </div>
              </>
            )}

            <button type="button" onClick={goToToday} className="btn-secondary min-h-9 px-3 text-xs">
              Hoy
            </button>
            <button
              type="button"
              onClick={loadCalendar}
              disabled={loading}
              className="btn-secondary min-h-9 px-3 text-xs disabled:opacity-60"
            >
              {loading ? "…" : "Actualizar"}
            </button>
          </div>
        </div>

        {stats && (
          <div className="flex flex-col gap-2 border-b border-brand-700/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs md:flex">
              <CalendarStat label="Hab." value={data.rooms.length} />
              <span className="hidden text-brand-700/40 sm:inline">·</span>
              <CalendarStat label="Reservas" value={visibleReservations.length} />
              <span className="hidden text-brand-700/40 sm:inline">·</span>
              <CalendarStat label="Pagadas" value={stats.paidCount} tone="paid" />
              <span className="hidden text-brand-700/40 sm:inline">·</span>
              <CalendarStat label="Pendientes" value={stats.pendingCount} tone="pending" />
            </div>
            <p className="text-[11px] text-brand-500 md:hidden">
              {data.rooms.length} hab. · {visibleReservations.length} res. · {stats.occupancy}% ocupación
            </p>
            <div className="hidden min-w-[10rem] items-center gap-2 sm:flex sm:max-w-xs sm:flex-1 sm:justify-end">
              <span className="shrink-0 text-[11px] font-medium text-brand-500">Ocupación</span>
              <div className="h-1.5 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-brand-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-highlight transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.occupancy)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-bold text-brand-100">{stats.occupancy}%</span>
            </div>
          </div>
        )}

        <div className="border-b border-brand-700/40 px-3 py-2 sm:px-4">
          <span className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-500 md:mb-0 md:mr-1">
            Filtros
            <InfoTooltip label={ADMIN_CALENDAR_HELP.filters} variant="accent" width={260} />
          </span>
          <AdminMobileFilterScroll className="md:hidden">
            {(
              [
                { id: "active", label: "Activas" },
                { id: "paid", label: "Pagadas" },
                { id: "pending", label: "Pendientes" },
                { id: "history", label: "Historial" },
                { id: "all", label: "Todas" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPaymentFilter(item.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                  paymentFilter === item.id
                    ? "border-accent/40 bg-honey/40 text-accent-hover"
                    : "border-brand-700 bg-white/55 text-brand-500"
                )}
              >
                {item.label}
              </button>
            ))}
          </AdminMobileFilterScroll>
          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
            {(
              [
                { id: "active", label: "Activas" },
                { id: "paid", label: "Pagadas" },
                { id: "pending", label: "Pendientes" },
                { id: "history", label: "Historial" },
                { id: "all", label: "Todas" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPaymentFilter(item.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  paymentFilter === item.id
                    ? "border-accent/40 bg-honey/40 text-accent-hover"
                    : "border-brand-700 bg-white/55 text-brand-500 hover:border-brand-600 hover:bg-white/75 hover:text-brand-100"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {panelView === "calendar" && (
          <AdminMobileLegend helpText={ADMIN_CALENDAR_HELP.legend} />
        )}

        {panelView === "calendar" && (
        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 border-t border-brand-700/40 bg-brand-800/25 px-3 py-1.5 text-[10px] text-brand-500 sm:px-4 md:flex">
          <span className="inline-flex items-center gap-1 font-semibold text-brand-100">
            Leyenda
            <InfoTooltip label={ADMIN_CALENDAR_HELP.legend} variant="accent" width={272} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="paid" /> Pagado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="pending" /> Pendiente
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="history" /> Cancelada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="refunded" /> Reembolsada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="weekend" /> Fin de semana
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="today" /> Hoy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch variant="unavailable" /> No disponible
          </span>
          {!isMobile && (
            <span className="ml-auto hidden text-[10px] italic text-brand-500/90 lg:inline">
              Clic en una reserva para ver detalle
            </span>
          )}
        </div>
        )}
      </div>

      {panelView === "calendar" && (
      <div className="space-y-3 md:hidden">
        <AdminWeekStrip
          days={mobileWeekDays}
          periodLabel={periodLabel}
          occupiedByDay={mobileOccupiedByDay}
          totalRooms={data.rooms.length}
          todayKey={mobileTodayKey}
          selectedDayKey={selectedDayKey}
          isCurrentWeek={isCurrentWeek}
          loading={loading}
          onSelectDay={setSelectedDayKey}
          onPrevWeek={() => shiftWeek(-1)}
          onNextWeek={() => shiftWeek(1)}
          onGoToday={goToToday}
        />
      </div>
      )}

      {panelView === "list" && (
      <div className="space-y-3 md:hidden">
        <div className="rounded-2xl border border-brand-700 bg-white/72 p-4 shadow-sm">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-500">
            Agenda del período
          </label>
          <input
            value={periodSearch}
            onChange={(event) => setPeriodSearch(event.target.value)}
            className="input-field"
            placeholder="Huésped, habitación, código..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            name="search-mobile-period"
          />
          <p className="mt-2 text-xs text-brand-500">
            {periodReservations.length} en este período
            {selectedDayKey ? " (día seleccionado)" : ""}
          </p>
        </div>

        {periodReservations.length === 0 ? (
          <div className="rounded-2xl border border-brand-700 bg-white/72 px-4 py-10 text-center text-sm text-brand-500">
            No hay reservas en este período con el filtro actual.
          </div>
        ) : (
          <MobilePeriodList
            rows={periodPageRows}
            roomCodeById={roomCodeById}
            formatShortDate={formatShortDate}
            getPaymentBadge={calendarPaymentBadge}
            periodPage={periodPage}
            periodTotalPages={periodTotalPages}
            onPrevPage={() => setPeriodPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setPeriodPage((prev) => Math.min(periodTotalPages, prev + 1))}
          />
        )}
      </div>
      )}

      {panelView === "calendar" && (
      <div
        ref={containerRef}
        className="hidden w-full overflow-visible rounded-2xl border border-brand-700 bg-white/72 shadow-md backdrop-blur-[1px] md:block"
      >
        <div className="w-full">
          <div className="flex w-full border-b border-brand-700 bg-brand-800/65">
            <div
              className="flex shrink-0 items-center border-r border-brand-700 px-2 sm:px-3"
              style={{ width: roomColumnWidth, height: headerHeight }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500/70 sm:text-xs">
                Hab.
              </span>
            </div>

            <div
              className="grid min-w-0 flex-1"
              style={{ ...dayGridStyle, gridTemplateRows: `${headerHeight}px` }}
            >
              {visibleDays.map((day) => {
                const { isWeekend } = getDayMeta(day);
                const today = isToday(day);
                const outsideMonth = viewMode === "month" ? false : day.month !== month || day.year !== year;

                return (
                  <CalendarDayCell
                    key={`${day.year}-${day.month}-${day.day}`}
                    day={day}
                    variant="header"
                    today={today}
                    isWeekend={isWeekend}
                    outsideMonth={outsideMonth}
                  />
                );
              })}
            </div>
          </div>

          {data.rooms.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-brand-500">No hay habitaciones configuradas.</div>
          ) : (
            data.rooms.map((room, rowIndex) => {
              const roomReservations = visibleReservations.filter((r) => r.roomId === room.id);
              const lanes = assignReservationLanes(roomReservations, visibleDays);
              const laneCount = lanes.reduce((max, item) => Math.max(max, item.laneIndex + 1), 1);
              const rowHeight = Math.max(laneCount * laneHeight, CALENDAR_ROW_MIN_HEIGHT);
              const laneRowHeight = rowHeight / laneCount;
              const roomUnavailable = room.status !== "AVAILABLE";

              return (
                <div
                  key={room.id}
                  className={cn(
                    "flex w-full items-stretch border-b border-brand-700/80 last:border-b-0",
                    rowIndex % 2 === 1 && "bg-white/35"
                  )}
                >
                  <div
                    className="flex shrink-0 flex-col justify-center gap-2 border-r border-brand-700 bg-brand-800/55 px-3 py-3 sm:px-4 sm:py-3.5"
                    style={{ width: roomColumnWidth, height: rowHeight }}
                  >
                    <p className="text-xs font-bold leading-snug text-brand-100 sm:text-sm">{room.code}</p>
                    <p className="line-clamp-2 text-[10px] leading-snug text-brand-500">{room.name}</p>
                    <div>
                      <StatusBadge variant={roomStatusVariant(room.status)} />
                    </div>
                  </div>

                  <div className="relative min-w-0 flex-1" style={{ height: rowHeight }}>
                    {todayColumnIndex >= 0 && (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-[2] w-px bg-highlight/50"
                        style={{ left: `${((todayColumnIndex + 0.5) / rangeDays) * 100}%` }}
                        aria-hidden
                      />
                    )}

                    <div className="grid h-full w-full" style={roomGridStyle(laneCount, laneRowHeight)}>
                      {Array.from({ length: laneCount }, (_, laneRow) =>
                        visibleDays.map((day) => {
                          const { isWeekend } = getDayMeta(day);
                          const today = isToday(day);
                          const outsideMonth =
                            viewMode === "month" ? false : day.month !== month || day.year !== year;

                          return (
                            <CalendarDayCell
                              key={`${room.id}-${laneRow}-${day.year}-${day.month}-${day.day}`}
                              day={day}
                              variant="body"
                              today={today}
                              isWeekend={isWeekend}
                              outsideMonth={outsideMonth}
                              roomUnavailable={roomUnavailable}
                              showDayLabel={laneRow === 0}
                              showWeekday={showWeekdayInCells && laneRow === 0}
                            />
                          );
                        })
                      ).flat()}
                    </div>

                    {lanes.map(({ reservation, leftPercent, widthPercent, laneIndex, spanDays }) => (
                      <ReservationBar
                        key={reservation.id}
                        reservation={reservation}
                        roomCode={room.code}
                        leftPercent={leftPercent}
                        widthPercent={widthPercent}
                        laneIndex={laneIndex}
                        spanDays={spanDays}
                        rangeDays={rangeDays}
                        laneHeight={laneRowHeight}
                        pinnedId={pinnedReservationId}
                        onTogglePin={setPinnedReservationId}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {panelView === "list" && (
      <div className="glass-panel hidden overflow-hidden md:block">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-700 px-3 py-2.5 sm:px-4">
          <AdminHintLabel as="h3" hint={ADMIN_CALENDAR_HELP.periodList} className="text-sm font-bold text-brand-100">
            Lista del período
          </AdminHintLabel>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-xl">
            <input
              value={periodSearch}
              onChange={(event) => setPeriodSearch(event.target.value)}
              className="input-field min-w-[12rem] flex-1 py-2 text-sm"
              placeholder="Buscar huésped, habitación, código…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              name="search-period-list"
            />
            <span className="shrink-0 text-xs text-brand-500">{periodReservations.length} resultados</span>
          </div>
        </div>

        {periodReservations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-brand-500">No hay reservas en este período con el filtro actual.</div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand-800 text-xs uppercase tracking-wide text-brand-500">
                  <tr>
                    <SortableTh
                      label="Huésped"
                      columnKey="guest"
                      sortKey={periodSortKey}
                      sortDirection={periodSortDirection}
                      onSort={togglePeriodSort}
                      className="px-4 py-3"
                    />
                    <th className="px-4 py-3 font-semibold">Contacto</th>
                    <SortableTh
                      label="Habitación"
                      columnKey="room"
                      sortKey={periodSortKey}
                      sortDirection={periodSortDirection}
                      onSort={togglePeriodSort}
                      className="px-4 py-3"
                    />
                    <SortableTh
                      label="Fechas"
                      columnKey="checkIn"
                      sortKey={periodSortKey}
                      sortDirection={periodSortDirection}
                      onSort={togglePeriodSort}
                      className="px-4 py-3"
                    />
                    <SortableTh
                      label="Estado"
                      columnKey="payment"
                      sortKey={periodSortKey}
                      sortDirection={periodSortDirection}
                      onSort={togglePeriodSort}
                      className="px-4 py-3"
                    />
                    <SortableTh
                      label="Código"
                      columnKey="code"
                      sortKey={periodSortKey}
                      sortDirection={periodSortDirection}
                      onSort={togglePeriodSort}
                      className="px-4 py-3"
                    />
                  </tr>
                </thead>
                <tbody>
                  {periodPageRows.map((reservation) => (
                    <tr key={reservation.id} className="border-t border-brand-700/80">
                      <td className="px-4 py-3 font-medium text-brand-100">{reservation.guestName}</td>
                      <td className="px-4 py-3">
                        <GuestContactInfo
                          email={reservation.guestEmail}
                          phone={reservation.guestPhone}
                          documentType={reservation.guestDocumentType}
                          rut={reservation.guestRut}
                          passport={reservation.guestPassport}
                          birthDate={reservation.guestBirthDate}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3 text-brand-500">{roomCodeById.get(reservation.roomId) ?? "—"}</td>
                      <td className="px-4 py-3 text-brand-500">
                        {formatShortDate(reservation.checkIn)} → {formatShortDate(reservation.checkOut)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const badge = calendarPaymentBadge(reservation);
                          return <StatusBadge variant={badge.variant} label={badge.label} />;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="select-all rounded-md bg-brand-800 px-2 py-1 font-mono text-xs text-brand-100">
                            {reservation.confirmationCode}
                          </code>
                          <CopyCodeButton code={reservation.confirmationCode} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 pb-3">
              <button
                type="button"
                className="btn-secondary min-h-9 px-3 text-xs"
                onClick={() => setPeriodPage((prev) => Math.max(1, prev - 1))}
                disabled={periodPage <= 1}
              >
                Anterior
              </button>
              <span className="text-xs text-brand-500">
                Página {periodPage} de {periodTotalPages}
              </span>
              <button
                type="button"
                className="btn-secondary min-h-9 px-3 text-xs"
                onClick={() => setPeriodPage((prev) => Math.min(periodTotalPages, prev + 1))}
                disabled={periodPage >= periodTotalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
