"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ADMIN_REPORTS_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import {
  AdminMobileCard,
  AdminMobileField,
  AdminMobileFilterScroll,
} from "@/components/admin/mobile/AdminMobilePrimitives";
import { formatCurrency, formatDateOnlyUTC } from "@/lib/dates";
import { apiPath } from "@/lib/api-path";
import { paymentStatusLabelEs } from "@/lib/reservation-payment";
import { toCsv, type AdminReportsResult } from "@/lib/admin-reports";
import { cn } from "@/lib/utils";

type ReportsTab = "summary" | "revenue" | "occupancy" | "rooms" | "balances";

const REPORT_TOOLTIP_MS = 3500;
const REPORT_TOOLTIP_WIDTH = 260;

const REPORTS: {
  id: ReportsTab;
  label: string;
  shortLabel: string;
  criterion: string;
  description: string;
}[] = [
  {
    id: "summary",
    label: "Resumen ejecutivo",
    shortLabel: "Resumen",
    criterion: "Plata, ocupación y saldos del período de un vistazo.",
    description:
      "Vista general del período: cobrado, comprometido, ocupación, saldos y cantidad de llegadas.",
  },
  {
    id: "revenue",
    label: "Ingresos",
    shortLabel: "Ingresos",
    criterion: "Cobrado y comprometido por llegada (check-in).",
    description:
      "Muestra cuánto se cobró y cuánto está comprometido según la fecha de llegada, día a día y por medio de pago.",
  },
  {
    id: "occupancy",
    label: "Ocupación",
    shortLabel: "Ocupación",
    criterion: "Porcentaje diario según noches dentro del rango.",
    description:
      "Indica qué tan lleno estuvo el hotel: porcentaje de ocupación y noches vendidas por cada día del rango.",
  },
  {
    id: "rooms",
    label: "Habitaciones",
    shortLabel: "Habitaciones",
    criterion: "Ranking de cabañas por noches e ingreso.",
    description:
      "Ranking de cabañas: cuáles vendieron más noches y generaron más ingreso en el período.",
  },
  {
    id: "balances",
    label: "Saldos pendientes",
    shortLabel: "Saldos",
    criterion: "Quién debe plata (abono o pendiente).",
    description:
      "Lista quiénes todavía deben plata: reservas con abono parcial o pago pendiente y el monto por cobrar.",
  },
];

function ReportHoverTip({
  message,
  children,
  className,
}: {
  message: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  function clearCloseTimer() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function showTip() {
    clearCloseTimer();
    setOpen(true);
    closeTimer.current = window.setTimeout(() => setOpen(false), REPORT_TOOLTIP_MS);
  }

  function hideTip() {
    clearCloseTimer();
    setOpen(false);
  }

  useEffect(() => () => clearCloseTimer(), []);

  useLayoutEffect(() => {
    if (!open) return;

    function reposition() {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 10;
      const left = Math.max(
        margin,
        Math.min(rect.left + rect.width / 2 - REPORT_TOOLTIP_WIDTH / 2, window.innerWidth - REPORT_TOOLTIP_WIDTH - margin)
      );
      const preferBelow = rect.bottom + 8;
      const tipHeight = 88;
      const top =
        preferBelow + tipHeight > window.innerHeight - margin
          ? Math.max(margin, rect.top - tipHeight - 8)
          : preferBelow;
      setCoords({ top, left });
    }

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={cn("relative inline-flex w-full", className)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") showTip();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") hideTip();
      }}
      onFocus={showTip}
      onBlur={hideTip}
    >
      {children}
      {open &&
        mounted &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            id={tipId}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: REPORT_TOOLTIP_WIDTH,
            }}
            className="pointer-events-none z-[70] rounded-xl border border-highlight/30 bg-[#3d2b1f] px-3 py-2.5 text-xs font-normal leading-relaxed text-brand-900 shadow-xl shadow-accent/30"
          >
            {message}
          </span>,
          document.body
        )}
    </span>
  );
}

function monthRange(offsetMonths = 0): { from: string; to: string } {
  const now = new Date();
  const base = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offsetMonths, 1, 12));
  const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 12));
  const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12));
  return { from: formatDateOnlyUTC(from), to: formatDateOnlyUTC(to) };
}

function lastNDays(days: number): { from: string; to: string } {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - (days - 1));
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;
  return { from, to };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "muted";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-800"
      : tone === "warn"
        ? "text-amber-900"
        : tone === "muted"
          ? "text-brand-500"
          : "text-brand-100";

  return (
    <div className="rounded-2xl border border-brand-700/60 bg-white/75 px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-bold tabular-nums leading-tight sm:text-[1.65rem]", valueClass)}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-brand-500">{hint}</p> : null}
    </div>
  );
}

function BarRow({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="min-w-0 break-words font-medium text-brand-100">{label}</span>
        <span className="shrink-0 text-right text-xs tabular-nums text-brand-500 sm:text-sm">{display}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-800/25">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-highlight" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ReportBlock({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("glass-panel space-y-4 p-4 sm:p-6", className)}>
      <h3 className="text-base font-bold text-brand-100">{title}</h3>
      {children}
    </div>
  );
}

function SegmentChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold transition",
        active
          ? "border-accent bg-accent/15 text-brand-100 shadow-sm"
          : "border-brand-700/70 bg-white/70 text-brand-500 hover:border-brand-600 hover:text-brand-100",
        className
      )}
    >
      {children}
    </button>
  );
}

export function AdminReportsPanel() {
  const initial = monthRange(0);
  const [reportType, setReportType] = useState<ReportsTab>("summary");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedType, setAppliedType] = useState<ReportsTab>("summary");
  const [data, setData] = useState<AdminReportsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<"thisMonth" | "lastMonth" | "last30" | null>("thisMonth");
  const resultRef = useRef<HTMLElement | null>(null);

  const selectedReport = REPORTS.find((item) => item.id === reportType) ?? REPORTS[0];
  const viewedReport = REPORTS.find((item) => item.id === appliedType) ?? REPORTS[0];
  const filtersDirty =
    hasGenerated && (reportType !== appliedType || from !== appliedFrom || to !== appliedTo);

  const load = useCallback(async (nextFrom: string, nextTo: string, nextType: ReportsTab) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ from: nextFrom, to: nextTo });
      const response = await fetch(`${apiPath("/api/admin/reports")}?${query.toString()}`);
      const json = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Error al cargar reportes.");
      }
      setData(json as AdminReportsResult);
      setAppliedFrom(nextFrom);
      setAppliedTo(nextTo);
      setAppliedType(nextType);
      setHasGenerated(true);
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initial.from, initial.to, "summary");
    // Solo carga inicial del mes actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxDailyCollected = useMemo(
    () => Math.max(1, ...(data?.revenueByDay.map((day) => day.collected) ?? [1])),
    [data]
  );
  const maxDailyOccupancy = useMemo(
    () => Math.max(1, ...(data?.occupancyByDay.map((day) => day.occupiedNights) ?? [1])),
    [data]
  );
  const maxRoomCommitted = useMemo(
    () => Math.max(1, ...(data?.roomRanking.map((room) => room.committed) ?? [1])),
    [data]
  );
  const maxProviderCollected = useMemo(
    () => Math.max(1, ...(data?.byProvider.map((item) => item.collected) ?? [1])),
    [data]
  );

  function applyPreset(kind: "thisMonth" | "lastMonth" | "last30") {
    const range =
      kind === "thisMonth" ? monthRange(0) : kind === "lastMonth" ? monthRange(-1) : lastNDays(30);
    setFrom(range.from);
    setTo(range.to);
    setActivePreset(kind);
  }

  function generateReport(event?: FormEvent) {
    event?.preventDefault();
    if (!from || !to || to < from) {
      setError("Revisá el rango de fechas.");
      return;
    }
    void load(from, to, reportType);
  }

  function exportCurrent() {
    if (!data) return;
    if (appliedType === "rooms") {
      downloadCsv(
        `reporte-habitaciones-${data.from}_${data.to}.csv`,
        toCsv(
          data.roomRanking.map((room) => ({
            code: room.roomCode,
            name: room.roomName,
            nights: room.nightsSold,
            committed: room.committed,
            collected: room.collected,
            adr: room.adr,
            reservations: room.reservations,
          })),
          [
            { key: "code", label: "Código" },
            { key: "name", label: "Habitación" },
            { key: "nights", label: "Noches" },
            { key: "committed", label: "Comprometido" },
            { key: "collected", label: "Cobrado" },
            { key: "adr", label: "ADR" },
            { key: "reservations", label: "Reservas" },
          ]
        )
      );
      return;
    }
    if (appliedType === "balances") {
      downloadCsv(
        `reporte-saldos-${data.from}_${data.to}.csv`,
        toCsv(
          data.balances.map((row) => ({
            code: row.confirmationCode,
            room: row.roomCode,
            guest: row.guestFullName,
            checkIn: row.checkIn,
            status: paymentStatusLabelEs(row.paymentStatus),
            total: row.totalAmount,
            paid: row.amountPaid,
            balance: row.balanceDue,
          })),
          [
            { key: "code", label: "Código" },
            { key: "room", label: "Habitación" },
            { key: "guest", label: "Huésped" },
            { key: "checkIn", label: "Check-in" },
            { key: "status", label: "Pago" },
            { key: "total", label: "Total" },
            { key: "paid", label: "Abonado" },
            { key: "balance", label: "Saldo" },
          ]
        )
      );
      return;
    }
    downloadCsv(
      `reporte-diario-${data.from}_${data.to}.csv`,
      toCsv(
        data.revenueByDay.map((day) => ({
          date: day.date,
          arrivals: day.arrivals,
          collected: day.collected,
          committed: day.committed,
          occupiedNights: day.occupiedNights,
          occupancyPercent: day.occupancyPercent,
        })),
        [
          { key: "date", label: "Fecha" },
          { key: "arrivals", label: "Llegadas" },
          { key: "collected", label: "Cobrado" },
          { key: "committed", label: "Comprometido" },
          { key: "occupiedNights", label: "Noches ocupadas" },
          { key: "occupancyPercent", label: "Ocupación %" },
        ]
      )
    );
  }

  return (
    <div className="w-full space-y-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:space-y-6 lg:pb-10">
      <form onSubmit={generateReport} className="glass-panel space-y-5 p-4 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <AdminHintLabel as="h2" hint={ADMIN_REPORTS_HELP.section} className="text-lg font-semibold text-brand-100 sm:text-xl">
              Reportes
            </AdminHintLabel>
            <p className="mt-1 max-w-2xl text-sm text-brand-500">{ADMIN_REPORTS_HELP.summary}</p>
          </div>
          {filtersDirty ? (
            <p className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 lg:shrink-0">
              Cambiaste filtros. Tocá <span className="font-bold">Ver reporte</span> para actualizar.
            </p>
          ) : null}
        </div>

        {/* Tipo de reporte */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">Tipo de reporte</p>

          {/* Móvil: chips horizontales */}
          <div className="lg:hidden">
            <AdminMobileFilterScroll>
              {REPORTS.map((report) => (
                <ReportHoverTip key={report.id} message={report.description} className="w-auto shrink-0">
                  <SegmentChip active={reportType === report.id} onClick={() => setReportType(report.id)}>
                    {report.shortLabel}
                  </SegmentChip>
                </ReportHoverTip>
              ))}
            </AdminMobileFilterScroll>
            <p className="mt-2 text-xs leading-relaxed text-brand-500">{selectedReport.description}</p>
          </div>

          {/* Escritorio: fila de opciones a ancho completo */}
          <div className="hidden gap-2 lg:grid lg:grid-cols-5">
            {REPORTS.map((report) => (
              <ReportHoverTip key={report.id} message={report.description}>
                <button
                  type="button"
                  onClick={() => setReportType(report.id)}
                  className={cn(
                    "min-h-[4.25rem] w-full rounded-2xl border px-3 py-3 text-left transition",
                    reportType === report.id
                      ? "border-accent bg-accent/12 shadow-sm ring-1 ring-accent/30"
                      : "border-brand-700/60 bg-white/65 hover:border-brand-600 hover:bg-white/90"
                  )}
                >
                  <span className="block text-sm font-bold text-brand-100">{report.label}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-brand-500 line-clamp-2">
                    {report.criterion}
                  </span>
                </button>
              </ReportHoverTip>
            ))}
          </div>
        </div>

        {/* Período */}
        <div className="space-y-3 border-t border-brand-700/35 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">Período</p>

          <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap">
            <SegmentChip
              active={activePreset === "thisMonth"}
              onClick={() => applyPreset("thisMonth")}
              className="w-full justify-center px-2 text-xs sm:text-sm lg:w-auto lg:px-4"
            >
              Este mes
            </SegmentChip>
            <SegmentChip
              active={activePreset === "lastMonth"}
              onClick={() => applyPreset("lastMonth")}
              className="w-full justify-center px-2 text-xs sm:text-sm lg:w-auto lg:px-4"
            >
              Mes ant.
            </SegmentChip>
            <SegmentChip
              active={activePreset === "last30"}
              onClick={() => applyPreset("last30")}
              className="w-full justify-center px-2 text-xs sm:text-sm lg:w-auto lg:px-4"
            >
              30 días
            </SegmentChip>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end lg:gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-brand-500">Desde</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset(null);
                }}
                className="input-field min-h-12 text-base sm:text-sm"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-brand-500">Hasta</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset(null);
                }}
                className="input-field min-h-12 text-base sm:text-sm"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary hidden min-h-12 w-full min-w-[11rem] lg:inline-flex"
            >
              {loading ? "Generando…" : filtersDirty ? "Actualizar reporte" : "Ver reporte"}
            </button>
          </div>
        </div>
      </form>

      {error ? <p className="alert-error">{error}</p> : null}

      {!hasGenerated && !loading ? (
        <div className="rounded-2xl border border-dashed border-brand-700/70 bg-white/55 px-6 py-14 text-center text-sm text-brand-500">
          Elegí el tipo de reporte y el período, después tocá <strong className="text-brand-100">Ver reporte</strong>.
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-2xl border border-brand-700/50 bg-white/60 px-6 py-14 text-center text-sm text-brand-500">
          Generando reporte…
        </div>
      ) : null}

      {hasGenerated && data ? (
        <section ref={resultRef} className="space-y-4 scroll-mt-20 lg:space-y-6" aria-labelledby="report-result-title">
          <div className="glass-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 lg:p-6">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">Resultado</p>
              <h3 id="report-result-title" className="mt-0.5 text-xl font-bold text-brand-100 sm:text-2xl">
                {viewedReport.label}
              </h3>
              <p className="mt-1 text-sm text-brand-500">
                <span className="font-medium text-brand-100">
                  {appliedFrom} → {appliedTo}
                </span>
                <span className="mx-1.5 hidden text-brand-700 sm:inline">·</span>
                <span className="mt-0.5 block sm:mt-0 sm:inline">{viewedReport.criterion}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={exportCurrent}
              disabled={loading}
              className="btn-secondary min-h-11 w-full shrink-0 px-4 text-sm disabled:opacity-60 sm:w-auto"
            >
              Exportar CSV
            </button>
          </div>

          {appliedType === "summary" && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
              <KpiCard label="Cobrado" value={formatCurrency(data.summary.collected)} tone="good" />
              <KpiCard label="Comprometido" value={formatCurrency(data.summary.committed)} />
              <KpiCard
                label="Ocupación"
                value={`${data.summary.occupancyPercent}%`}
                hint={`${data.summary.nightsSold} noches`}
              />
              <KpiCard
                label="Saldo por cobrar"
                value={formatCurrency(data.summary.balanceDue)}
                tone={data.summary.balanceDue > 0 ? "warn" : "muted"}
              />
              <KpiCard label="Llegadas" value={String(data.summary.arrivalsCount)} />
              <KpiCard label="Reservas creadas" value={String(data.summary.createdCount)} />
              <KpiCard label="ADR" value={formatCurrency(data.summary.adr)} />
              <KpiCard
                label="Pagos (P / A / Pend.)"
                value={`${data.summary.paidCount} / ${data.summary.partialCount} / ${data.summary.pendingCount}`}
              />
            </div>
          )}

          {appliedType === "revenue" && (
            <div className="space-y-4 lg:space-y-5">
              <div className="grid gap-3 sm:grid-cols-3 xl:gap-4">
                <KpiCard label="Cobrado" value={formatCurrency(data.summary.collected)} tone="good" />
                <KpiCard label="Comprometido" value={formatCurrency(data.summary.committed)} />
                <KpiCard
                  label="Pendiente de cobro"
                  value={formatCurrency(Math.max(0, data.summary.committed - data.summary.collected))}
                  tone="warn"
                />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <ReportBlock title="Cobrado por día">
                  <div className="max-h-[28rem] space-y-3.5 overflow-y-auto pr-1">
                    {data.revenueByDay.map((day) => (
                      <BarRow
                        key={day.date}
                        label={day.date}
                        value={day.collected}
                        max={maxDailyCollected}
                        display={`${formatCurrency(day.collected)} · ${day.arrivals} lleg.`}
                      />
                    ))}
                  </div>
                </ReportBlock>
                <ReportBlock title="Por medio de pago">
                  {data.byProvider.length === 0 ? (
                    <p className="text-sm text-brand-500">Sin cobros en el período.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {data.byProvider.map((bucket) => (
                        <BarRow
                          key={bucket.provider}
                          label={bucket.provider}
                          value={bucket.collected}
                          max={maxProviderCollected}
                          display={`${formatCurrency(bucket.collected)} · ${bucket.reservations} res.`}
                        />
                      ))}
                    </div>
                  )}
                </ReportBlock>
              </div>
            </div>
          )}

          {appliedType === "occupancy" && (
            <div className="space-y-4 lg:space-y-5">
              <div className="grid gap-3 sm:grid-cols-3 xl:gap-4">
                <KpiCard label="Ocupación" value={`${data.summary.occupancyPercent}%`} />
                <KpiCard label="Noches vendidas" value={String(data.summary.nightsSold)} />
                <KpiCard
                  label="Capacidad"
                  value={`${data.roomCount * data.daysInPeriod} noches`}
                  hint={`${data.roomCount} hab. × ${data.daysInPeriod} días`}
                />
              </div>
              <ReportBlock title="Ocupación diaria">
                <div className="max-h-[32rem] space-y-3.5 overflow-y-auto pr-1 lg:max-h-none lg:columns-2 lg:gap-x-10 [&>*]:break-inside-avoid">
                  {data.occupancyByDay.map((day) => (
                    <div key={day.date} className="mb-3.5">
                      <BarRow
                        label={day.date}
                        value={day.occupiedNights}
                        max={maxDailyOccupancy}
                        display={`${day.occupancyPercent}% · ${day.occupiedNights}/${data.roomCount}`}
                      />
                    </div>
                  ))}
                </div>
              </ReportBlock>
            </div>
          )}

          {appliedType === "rooms" && (
            <div className="space-y-4 lg:space-y-5">
              <div className="grid gap-3 sm:grid-cols-3 xl:gap-4">
                <KpiCard
                  label="Mejor cabaña"
                  value={data.roomRanking[0]?.roomCode ?? "—"}
                  hint={data.roomRanking[0] ? formatCurrency(data.roomRanking[0].committed) : undefined}
                />
                <KpiCard label="Noches vendidas" value={String(data.summary.nightsSold)} />
                <KpiCard label="ADR" value={formatCurrency(data.summary.adr)} />
              </div>

              <div className="space-y-3 lg:hidden">
                {data.roomRanking.length === 0 ? (
                  <div className="rounded-2xl border border-brand-700 bg-white/70 px-4 py-10 text-center text-sm text-brand-500">
                    Sin ocupación en el período.
                  </div>
                ) : (
                  data.roomRanking.map((room, index) => (
                    <AdminMobileCard key={room.roomId}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-brand-500">#{index + 1}</p>
                          <p className="mt-0.5 text-base font-bold text-brand-100">
                            {room.roomCode}
                            <span className="ml-1.5 font-medium text-brand-500">{room.roomName}</span>
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-brand-100">
                          {formatCurrency(room.committed)}
                        </p>
                      </div>
                      <div className="mt-3 border-t border-brand-700/40 pt-2">
                        <AdminMobileField label="Noches">{room.nightsSold}</AdminMobileField>
                        <AdminMobileField label="Reservas">{room.reservations}</AdminMobileField>
                        <AdminMobileField label="Cobrado">{formatCurrency(room.collected)}</AdminMobileField>
                        <AdminMobileField label="ADR">{formatCurrency(room.adr)}</AdminMobileField>
                      </div>
                      <div className="mt-3">
                        <BarRow
                          label="Comprometido"
                          value={room.committed}
                          max={maxRoomCommitted}
                          display={formatCurrency(room.committed)}
                        />
                      </div>
                    </AdminMobileCard>
                  ))
                )}
              </div>

              <div className="admin-table-shell hidden lg:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="admin-table-head text-xs uppercase text-brand-500">
                    <tr>
                      <th className="px-5 py-3.5">Habitación</th>
                      <th className="px-5 py-3.5">Noches</th>
                      <th className="px-5 py-3.5">Reservas</th>
                      <th className="px-5 py-3.5">Comprometido</th>
                      <th className="px-5 py-3.5">Cobrado</th>
                      <th className="px-5 py-3.5">ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roomRanking.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-brand-500">
                          Sin ocupación en el período.
                        </td>
                      </tr>
                    ) : (
                      data.roomRanking.map((room) => (
                        <tr key={room.roomId} className="admin-table-row">
                          <td className="px-5 py-3.5 text-brand-100">
                            {room.roomCode}
                            <span className="block text-xs text-brand-500">{room.roomName}</span>
                          </td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{room.nightsSold}</td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{room.reservations}</td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{formatCurrency(room.committed)}</td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{formatCurrency(room.collected)}</td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{formatCurrency(room.adr)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {appliedType === "balances" && (
            <div className="space-y-4 lg:space-y-5">
              <div className="grid gap-3 sm:grid-cols-3 xl:gap-4">
                <KpiCard
                  label="Saldo total"
                  value={formatCurrency(data.summary.balanceDue)}
                  tone={data.summary.balanceDue > 0 ? "warn" : "muted"}
                />
                <KpiCard label="Reservas con saldo" value={String(data.balances.length)} />
                <KpiCard
                  label="Abonadas / Pendientes"
                  value={`${data.summary.partialCount} / ${data.summary.pendingCount}`}
                />
              </div>

              <div className="space-y-3 lg:hidden">
                {data.balances.length === 0 ? (
                  <div className="rounded-2xl border border-brand-700 bg-white/70 px-4 py-10 text-center text-sm text-brand-500">
                    No hay saldos pendientes en este recorte.
                  </div>
                ) : (
                  data.balances.map((row) => (
                    <AdminMobileCard key={row.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-brand-100">{row.guestFullName}</p>
                          <p className="mt-0.5 font-mono text-xs text-brand-500">{row.confirmationCode}</p>
                        </div>
                        <p className="shrink-0 text-base font-bold tabular-nums text-amber-900">
                          {formatCurrency(row.balanceDue)}
                        </p>
                      </div>
                      <div className="mt-3 border-t border-brand-700/40 pt-2">
                        <AdminMobileField label="Habitación">{row.roomCode}</AdminMobileField>
                        <AdminMobileField label="Estadía">
                          {row.checkIn} → {row.checkOut}
                        </AdminMobileField>
                        <AdminMobileField label="Pago">{paymentStatusLabelEs(row.paymentStatus)}</AdminMobileField>
                        <AdminMobileField label="Total">{formatCurrency(row.totalAmount)}</AdminMobileField>
                        <AdminMobileField label="Abonado">{formatCurrency(row.amountPaid)}</AdminMobileField>
                      </div>
                    </AdminMobileCard>
                  ))
                )}
              </div>

              <div className="admin-table-shell hidden lg:block">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="admin-table-head text-xs uppercase text-brand-500">
                    <tr>
                      <th className="px-5 py-3.5">Código</th>
                      <th className="px-5 py-3.5">Huésped</th>
                      <th className="px-5 py-3.5">Hab.</th>
                      <th className="px-5 py-3.5">Check-in</th>
                      <th className="px-5 py-3.5">Pago</th>
                      <th className="px-5 py-3.5">Total</th>
                      <th className="px-5 py-3.5">Abonado</th>
                      <th className="px-5 py-3.5">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.balances.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-brand-500">
                          No hay saldos pendientes en este recorte.
                        </td>
                      </tr>
                    ) : (
                      data.balances.map((row) => (
                        <tr key={row.id} className="admin-table-row">
                          <td className="px-5 py-3.5 font-mono text-xs text-brand-100">{row.confirmationCode}</td>
                          <td className="px-5 py-3.5 text-brand-100">{row.guestFullName}</td>
                          <td className="px-5 py-3.5 text-brand-100">{row.roomCode}</td>
                          <td className="px-5 py-3.5 text-brand-100">{row.checkIn}</td>
                          <td className="px-5 py-3.5 text-brand-100">{paymentStatusLabelEs(row.paymentStatus)}</td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-5 py-3.5 tabular-nums text-brand-100">{formatCurrency(row.amountPaid)}</td>
                          <td className="px-5 py-3.5 tabular-nums font-semibold text-amber-900">
                            {formatCurrency(row.balanceDue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* CTA fijo en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-700/50 bg-white/95 px-3 pt-3 shadow-[0_-8px_24px_rgba(40,28,18,0.12)] backdrop-blur-md lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => generateReport()} disabled={loading} className="btn-primary min-h-12 w-full text-base">
          {loading ? "Generando…" : filtersDirty ? "Actualizar reporte" : "Ver reporte"}
        </button>
      </div>
    </div>
  );
}
