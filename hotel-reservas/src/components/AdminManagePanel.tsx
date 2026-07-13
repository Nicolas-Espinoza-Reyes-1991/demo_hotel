"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { GuestContactInfo } from "@/components/admin/GuestContactInfo";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminCreateReservationForm } from "@/components/admin/AdminCreateReservationForm";
import { AdminToast } from "@/components/admin/AdminToast";
import { ADMIN_BLOCKS_HELP, ADMIN_RESERVATIONS_HELP, ADMIN_ROOMS_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { ReservationDiscountEditor } from "@/components/admin/ReservationDiscountEditor";
import { SortableTh } from "@/components/admin/SortableTableHeader";
import {
  AdminBlocksMobileList,
  AdminReservationManageSheet,
  AdminReservationsMobileList,
  AdminRoomsMobileList,
} from "@/components/admin/mobile/AdminManageMobile";
import { AdminMobileFab } from "@/components/admin/mobile/AdminMobileFab";
import { AdminMobileFilterScroll } from "@/components/admin/mobile/AdminMobilePrimitives";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, getDisplayCurrency } from "@/lib/dates";
import { paymentStatusLabel, type ReservationScope } from "@/lib/reservation-history";
import { cn } from "@/lib/utils";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { useTableSort } from "@/hooks/useTableSort";

type ReservationSortKey = "code" | "guest" | "room" | "checkIn" | "updatedAt" | "total" | "payment" | "status";
type RoomSortKey = "code" | "name" | "type" | "price" | "capacity" | "floor" | "status";
type BlockSortKey = "room" | "startDate" | "endDate" | "reason";

type ReservationRow = {
  id: string;
  confirmationCode: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  paymentProvider?: string | null;
  status: string;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  listTotalAmount?: number;
  hasDiscount?: boolean;
  discountReason?: string | null;
  discountAppliedBy?: string | null;
  discountAmount?: number;
  updatedAt?: string;
  guestFullName?: string;
  guestDocumentType?: string | null;
  guestRut?: string | null;
  guestPassport?: string | null;
  guestBirthDate?: string | null;
  room: { code: string; name: string };
  guest: {
    fullName: string;
    email: string;
    phone?: string | null;
    documentType?: string | null;
    rut?: string | null;
    passport?: string | null;
    birthDate?: string | null;
  };
};

const PAYMENT_OPTIONS = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PARTIAL", label: "Abonado (50%)" },
  { value: "PAID", label: "Pagado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "REFUNDED", label: "Reembolsado" },
];

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CHECKED_IN", label: "Check-in" },
  { value: "CHECKED_OUT", label: "Check-out" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No show" },
];

type ReservationUpdatePatch = {
  paymentStatus?: string;
  status?: string;
  totalAmount?: number;
  discountReason?: string;
  clearDiscount?: boolean;
  amountPaid?: number;
  registerDeposit?: boolean;
};

type ReservationConfirmCopy = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "default" | "danger" | "warn";
};

/** Pedir confirmación solo en acciones de pago/estado críticas. */
function reservationUpdateConfirmCopy(patch: ReservationUpdatePatch): ReservationConfirmCopy | null {
  if (patch.registerDeposit) {
    return {
      title: "Registrar abono",
      message: "Se registrará el abono del 50% en esta reserva. ¿Continuar?",
      confirmLabel: "Registrar abono",
      tone: "warn",
    };
  }
  if (patch.paymentStatus === "PAID") {
    return {
      title: "Marcar como pagada",
      message: "La reserva quedará marcada como pagada total. ¿Confirmar?",
      confirmLabel: "Marcar pagada",
      tone: "default",
    };
  }
  if (patch.paymentStatus === "CANCELLED") {
    return {
      title: "Cancelar pago",
      message: "Se cancelará el estado de pago de esta reserva. ¿Continuar?",
      confirmLabel: "Cancelar pago",
      tone: "danger",
    };
  }
  if (patch.paymentStatus === "REFUNDED") {
    return {
      title: "Marcar reembolso",
      message: "La reserva quedará marcada como reembolsada. ¿Confirmar?",
      confirmLabel: "Marcar reembolso",
      tone: "danger",
    };
  }
  if (patch.status === "CANCELLED") {
    return {
      title: "Cancelar reserva",
      message: "La reserva pasará a cancelada. Esta acción afecta la ocupación. ¿Confirmar?",
      confirmLabel: "Cancelar reserva",
      tone: "danger",
    };
  }
  if (patch.status === "NO_SHOW") {
    return {
      title: "Marcar no show",
      message: "La reserva se marcará como no show (el huésped no se presentó). ¿Confirmar?",
      confirmLabel: "Marcar no show",
      tone: "warn",
    };
  }
  return null;
}

type PendingReservationConfirm = {
  id: string;
  patch: ReservationUpdatePatch;
  copy: ReservationConfirmCopy;
  detail?: string;
};

type PanelMessage = { type: "success" | "error"; text: string };
const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 500;

function formatShortStayDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year.slice(2)}`;
}

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debounced;
}

const SCOPE_TABS: { id: ReservationScope; label: string }[] = [
  { id: "active", label: "Activas" },
  { id: "history", label: "Historial" },
  { id: "all", label: "Todas" },
];

export function AdminReservationsPanel({
  focusReservationId = null,
  focusCode = null,
  onFocusConsumed,
}: {
  focusReservationId?: string | null;
  focusCode?: string | null;
  onFocusConsumed?: () => void;
} = {}) {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [scope, setScope] = useState<ReservationScope>("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [managingReservationId, setManagingReservationId] = useState<string | null>(null);
  const [highlightReservationId, setHighlightReservationId] = useState<string | null>(null);
  const [message, setMessage] = useState<PanelMessage | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingReservationConfirm | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const pendingFocusIdRef = useRef<string | null>(null);
  const {
    sortKey: reservationSortKey,
    sortDirection: reservationSortDirection,
    toggleSort: toggleReservationSort,
    sortRows: sortReservationRows,
  } = useTableSort<ReservationSortKey>("checkIn", "asc");

  const sortedRows = useMemo(
    () =>
      sortReservationRows(rows, (row, key) => {
        switch (key) {
          case "code":
            return row.confirmationCode;
          case "guest":
            return row.guestFullName ?? row.guest.fullName;
          case "room":
            return row.room.code;
          case "checkIn":
            return row.checkIn;
          case "updatedAt":
            return row.updatedAt ?? "";
          case "total":
            return row.totalAmount;
          case "payment":
            return row.paymentStatus;
          case "status":
            return row.status;
          default:
            return "";
        }
      }),
    [rows, sortReservationRows]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
        scope,
      });
      if (debouncedSearch.trim()) query.set("q", debouncedSearch.trim());
      const response = await fetch(`${apiPath("/api/reservations")}?${query.toString()}`);
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) throw new Error(data.error);
      const list = Array.isArray(data.reservations) ? data.reservations : [];
      setRows(
        list.map((r: ReservationRow & { checkIn: string; checkOut: string }) => ({
          ...r,
          checkIn: String(r.checkIn).slice(0, 10),
          checkOut: String(r.checkOut).slice(0, 10),
        }))
      );
      setTotalPages(data.totalPages ?? 1);
      setTotalRows(data.total ?? data.count ?? 0);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al cargar reservas.",
      });
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, [page, debouncedSearch, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep-link desde alertas: buscar por código y abrir la reserva.
  useEffect(() => {
    if (!focusReservationId) return;
    pendingFocusIdRef.current = focusReservationId;
    setScope("all");
    setPage(1);
    if (focusCode) {
      setSearch(focusCode);
    }
  }, [focusReservationId, focusCode]);

  useEffect(() => {
    const pendingId = pendingFocusIdRef.current;
    if (!pendingId || loading) return;

    const found = rows.find((row) => row.id === pendingId);
    if (found) {
      setManagingReservationId(found.id);
      setHighlightReservationId(found.id);
      pendingFocusIdRef.current = null;
      onFocusConsumed?.();
      window.requestAnimationFrame(() => {
        document
          .querySelector(`[data-reservation-id="${found.id}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    if (!initialized) return;
    if (focusCode && debouncedSearch.trim().toLowerCase() === focusCode.trim().toLowerCase()) {
      pendingFocusIdRef.current = null;
      setMessage({
        type: "error",
        text: `No se encontró la reserva ${focusCode} en el listado.`,
      });
      onFocusConsumed?.();
    }
  }, [rows, loading, initialized, focusCode, debouncedSearch, onFocusConsumed]);

  async function applyReservationUpdate(id: string, patch: ReservationUpdatePatch) {
    setSavingId(id);
    setMessage(null);
    try {
      const response = await fetch(apiPath(`/api/reservations/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) throw new Error(data.error);
      setMessage({
        type: "success",
        text: typeof data.message === "string" ? data.message : "Estado actualizado.",
      });
      setPendingConfirm(null);
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar." });
      setPendingConfirm(null);
    } finally {
      setSavingId(null);
    }
  }

  async function updateReservation(id: string, patch: ReservationUpdatePatch) {
    const copy = reservationUpdateConfirmCopy(patch);
    if (copy) {
      const row = rows.find((item) => item.id === id);
      const guest = row?.guestFullName ?? row?.guest.fullName;
      setPendingConfirm({
        id,
        patch,
        copy,
        detail: row
          ? `${row.confirmationCode}${guest ? ` · ${guest}` : ""} · Hab. ${row.room.code}`
          : undefined,
      });
      return;
    }
    await applyReservationUpdate(id, patch);
  }

  if (loading && !initialized) {
    return <div className="glass-panel p-8 text-center text-brand-500">Cargando reservas...</div>;
  }

  return (
    <div className="space-y-4 pb-4 md:pb-0">
      <AdminConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.copy.title ?? ""}
        message={pendingConfirm?.copy.message ?? ""}
        detail={pendingConfirm?.detail}
        confirmLabel={pendingConfirm?.copy.confirmLabel}
        tone={pendingConfirm?.copy.tone}
        busy={pendingConfirm !== null && savingId === pendingConfirm.id}
        onCancel={() => {
          if (savingId) return;
          setPendingConfirm(null);
        }}
        onConfirm={() => {
          if (!pendingConfirm || savingId) return;
          void applyReservationUpdate(pendingConfirm.id, pendingConfirm.patch);
        }}
      />

      <AdminToast message={message} onDismiss={() => setMessage(null)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminHintLabel as="h2" hint={ADMIN_RESERVATIONS_HELP.section} className="text-base font-bold text-brand-100">
          Reservas
        </AdminHintLabel>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="btn-primary hidden min-h-10 px-4 text-sm md:inline-flex"
        >
          + Nueva reserva
        </button>
      </div>

      <AdminCreateReservationForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreated={(reservation) => {
          setShowCreateForm(false);
          setMessage({
            type: "success",
            text: `Reserva ${reservation.confirmationCode} creada.`,
          });
          setScope("all");
          setPage(1);
          setSearch(reservation.confirmationCode);
          pendingFocusIdRef.current = reservation.id;
          setHighlightReservationId(reservation.id);
          setManagingReservationId(reservation.id);
        }}
      />

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500">
          Vista
          <InfoTooltip label={ADMIN_RESERVATIONS_HELP.scope} variant="accent" width={260} />
        </span>
        <AdminMobileFilterScroll className="md:hidden">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setScope(tab.id);
                setPage(1);
              }}
              className={cn(
                "shrink-0 min-h-9 rounded-xl px-3 py-1.5 text-sm font-semibold transition",
                scope === tab.id
                  ? "tab-active-admin"
                  : "border border-brand-700 bg-white/55 text-brand-500"
              )}
            >
              {tab.label}
            </button>
          ))}
        </AdminMobileFilterScroll>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setScope(tab.id);
                setPage(1);
              }}
              className={cn(
                "min-h-9 rounded-xl px-3 py-1.5 text-sm font-semibold transition",
                scope === tab.id
                  ? "tab-active-admin"
                  : "border border-brand-700 bg-white/55 text-brand-500 hover:bg-white/75 hover:text-brand-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="input-field w-full max-w-md"
          placeholder="Buscar por código, huésped, email, teléfono, RUT o habitación..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          name="search-reservations"
        />
        <span className="text-xs text-brand-500">{totalRows} resultados</span>
      </div>

      <AdminReservationsMobileList
        rows={rows}
        scope={scope}
        managingId={managingReservationId}
        highlightId={highlightReservationId}
        savingId={savingId}
        paymentOptions={PAYMENT_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        page={page}
        totalPages={totalPages}
        searchQuery={debouncedSearch}
        onManage={setManagingReservationId}
        onUpdate={updateReservation}
        onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
      />

      <AdminReservationManageSheet
        row={rows.find((row) => row.id === managingReservationId) ?? null}
        open={managingReservationId !== null}
        scope={scope}
        saving={savingId === managingReservationId}
        paymentOptions={PAYMENT_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        onClose={() => setManagingReservationId(null)}
        onUpdate={updateReservation}
      />

      <div className="admin-table-shell hidden md:block">
        <div className="flex items-center gap-1.5 border-b border-brand-700/50 px-3 py-2 text-xs font-semibold text-brand-500">
          Detalle de reservas
          <InfoTooltip label={ADMIN_RESERVATIONS_HELP.table} variant="accent" width={272} />
        </div>
        <table className="admin-table admin-table--reservations w-full text-left text-xs sm:text-sm">
          <colgroup>
            {scope === "history" ? (
              <>
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
              </>
            ) : (
              <>
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[22%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[16%]" />
                <col className="w-[17%]" />
              </>
            )}
          </colgroup>
          <thead className="admin-table-head text-[11px] uppercase tracking-wide text-brand-500 sm:text-xs">
            <tr>
              <SortableTh
                label="Código"
                columnKey="code"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
              <SortableTh
                label="Huésped"
                columnKey="guest"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
              <th className="py-3">Contacto</th>
              <SortableTh
                label="Hab."
                columnKey="room"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
              <SortableTh
                label="Fechas"
                columnKey="checkIn"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
              {scope === "history" && (
                <SortableTh
                  label="Actualización"
                  columnKey="updatedAt"
                  sortKey={reservationSortKey}
                  sortDirection={reservationSortDirection}
                  onSort={toggleReservationSort}
                  className="py-3"
                />
              )}
              <SortableTh
                label="Total"
                columnKey="total"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
              <SortableTh
                label="Pago"
                columnKey="payment"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
              <SortableTh
                label="Estado"
                columnKey="status"
                sortKey={reservationSortKey}
                sortDirection={reservationSortDirection}
                onSort={toggleReservationSort}
                className="py-3"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={scope === "history" ? 9 : 8} className="px-4 py-8 text-center text-brand-500">
                  {debouncedSearch.trim()
                    ? `Sin resultados para “${debouncedSearch.trim()}”.`
                    : scope === "history"
                      ? "No hay reservas canceladas o reembolsadas."
                      : "No hay reservas registradas."}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr
                  key={row.id}
                  data-reservation-id={row.id}
                  className={cn(
                    "admin-table-row",
                    (row.paymentStatus === "CANCELLED" || row.paymentStatus === "REFUNDED") &&
                      "opacity-90",
                    highlightReservationId === row.id && "bg-accent/10 ring-2 ring-inset ring-accent/35"
                  )}
                >
                  <td className="align-middle font-mono text-[11px] text-gold sm:text-xs">
                    <span className="break-all" title={row.confirmationCode}>
                      {row.confirmationCode}
                    </span>
                  </td>
                  <td className="align-middle">
                    <p className="font-medium leading-snug text-brand-100">
                      {row.guestFullName ?? row.guest.fullName}
                    </p>
                  </td>
                  <td className="align-middle">
                    <GuestContactInfo
                      email={row.guest.email}
                      phone={row.guest.phone}
                      documentType={row.guestDocumentType ?? row.guest.documentType}
                      rut={row.guestRut ?? row.guest.rut}
                      passport={row.guestPassport ?? row.guest.passport}
                      birthDate={
                        row.guestBirthDate
                          ? String(row.guestBirthDate).slice(0, 10)
                          : row.guest.birthDate
                            ? String(row.guest.birthDate).slice(0, 10)
                            : null
                      }
                      dense
                    />
                  </td>
                  <td className="align-middle text-brand-100">
                    <span className="font-semibold">{row.room.code}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-brand-500">{row.room.name}</span>
                  </td>
                  <td className="align-middle text-[11px] leading-snug text-brand-100 sm:text-xs">
                    <span className="block">{formatShortStayDate(row.checkIn)}</span>
                    <span className="text-brand-500">→ {formatShortStayDate(row.checkOut)}</span>
                  </td>
                  {scope === "history" && (
                    <td className="align-middle text-[11px] leading-snug text-brand-500 sm:text-xs">
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  )}
                  <td className="align-middle">
                    <ReservationDiscountEditor
                      row={row}
                      saving={savingId === row.id}
                      compact
                      onApply={(patch) => updateReservation(row.id, patch)}
                    />
                  </td>
                  <td className="align-middle">
                    <div className="space-y-1.5">
                      {row.paymentProvider === "BANK_TRANSFER" && (
                        <span className="inline-block rounded-full bg-sky-100/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-700">
                          Transferencia
                        </span>
                      )}
                      {row.paymentProvider === "MERCADO_PAGO" && (
                        <span className="inline-block rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                          MP
                        </span>
                      )}
                      {(row.paymentStatus === "PARTIAL" || (row.amountPaid ?? 0) > 0) && (
                        <p className="text-[10px] leading-snug text-brand-500">
                          Abonado {formatCurrency(row.amountPaid ?? 0)}
                          {row.paymentStatus === "PARTIAL" && (
                            <> · Saldo {formatCurrency(row.balanceDue ?? Math.max(0, row.totalAmount - (row.amountPaid ?? 0)))}</>
                          )}
                        </p>
                      )}
                      <select
                        value={row.paymentStatus}
                        disabled={savingId === row.id}
                        onChange={(e) => updateReservation(row.id, { paymentStatus: e.target.value })}
                        className="input-field min-h-8 w-full min-w-0 py-1 text-[11px] sm:text-xs"
                      >
                        {PAYMENT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {(row.paymentStatus === "PENDING" || row.paymentStatus === "PARTIAL") && (
                        <div className="flex flex-wrap gap-1">
                          {row.paymentStatus === "PENDING" && (
                            <button
                              type="button"
                              disabled={savingId === row.id}
                              onClick={() => updateReservation(row.id, { registerDeposit: true })}
                              className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-950 ring-1 ring-amber-400/40 hover:bg-amber-200 disabled:opacity-50"
                            >
                              Abono 50%
                            </button>
                          )}
                          {row.paymentStatus === "PARTIAL" && (
                            <button
                              type="button"
                              disabled={savingId === row.id}
                              onClick={() => updateReservation(row.id, { paymentStatus: "PAID" })}
                              className="rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-900 ring-1 ring-emerald-500/35 hover:bg-emerald-200 disabled:opacity-50"
                            >
                              Marcar pagado total
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="align-middle">
                    <select
                      value={row.status}
                      disabled={savingId === row.id}
                      onChange={(e) => updateReservation(row.id, { status: e.target.value })}
                      className="input-field min-h-8 w-full min-w-0 py-1 text-[11px] sm:text-xs"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <span className="text-xs text-brand-500">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>
      </div>

      {!showCreateForm ? (
        <AdminMobileFab label="+ Nueva reserva" onClick={() => setShowCreateForm(true)} />
      ) : null}
    </div>
  );
}

const ROOM_TYPE_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "SUPERIOR", label: "Superior" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "SUITE", label: "Suite" },
  { value: "FAMILY", label: "Familiar" },
] as const;

const ROOM_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "BLOCKED", label: "Bloqueada" },
] as const;

const AMENITY_OPTIONS = [
  "WiFi",
  "A/C",
  "TV",
  "Minibar",
  "Escritorio",
  "Caja fuerte",
  "Balcón",
  "Terraza",
  "Cafetera",
  "Jacuzzi",
  "Cocina básica",
  "Sofá cama",
] as const;

type AdminRoom = {
  id: string;
  code: string;
  name: string;
  type: string;
  treeName: string | null;
  description: string | null;
  bedType: string | null;
  bathroomDetail: string | null;
  beds: Array<{ size: "SINGLE" | "DOUBLE" | "KING"; count: number }>;
  bathrooms: Array<{ type: "PRIVATE" | "SHARED"; count: number }>;
  pricePerNight: number;
  maxGuests: number;
  floor: number | null;
  status: string;
  imageUrl: string | null;
  photos: string[];
  amenities: string[];
};

type RoomFormState = {
  code: string;
  name: string;
  type: string;
  treeName: string;
  description: string;
  bedType: string;
  bathroomDetail: string;
  bedItems: Array<{ size: "SINGLE" | "DOUBLE" | "KING"; count: string }>;
  bathroomItems: Array<{ type: "PRIVATE" | "SHARED"; count: string }>;
  pricePerNight: string;
  maxGuests: string;
  floor: string;
  status: string;
  photos: string[];
  selectedAmenities: string[];
  otherAmenities: string;
};

const EMPTY_ROOM_FORM: RoomFormState = {
  code: "",
  name: "",
  type: "STANDARD",
  treeName: "",
  description: "",
  bedType: "",
  bathroomDetail: "",
  bedItems: [{ size: "KING", count: "1" }],
  bathroomItems: [{ type: "PRIVATE", count: "1" }],
  pricePerNight: "",
  maxGuests: "2",
  floor: "",
  status: "AVAILABLE",
  photos: [],
  selectedAmenities: [],
  otherAmenities: "",
};

function roomToForm(room: AdminRoom): RoomFormState {
  return {
    code: room.code,
    name: room.name,
    type: room.type,
    treeName: room.treeName ?? "",
    description: room.description ?? "",
    bedType: room.bedType ?? "",
    bathroomDetail: room.bathroomDetail ?? "",
    bedItems:
      room.beds.length > 0
        ? room.beds.slice(0, 3).map((item) => ({ size: item.size, count: String(item.count) }))
        : [{ size: "KING", count: "1" }],
    bathroomItems:
      room.bathrooms.length > 0
        ? [{ type: "PRIVATE", count: String(room.bathrooms[0]?.count ?? 1) }]
        : [{ type: "PRIVATE", count: "1" }],
    pricePerNight: String(room.pricePerNight),
    maxGuests: String(room.maxGuests),
    floor: room.floor != null ? String(room.floor) : "",
    status: room.status,
    photos:
      Array.isArray(room.photos) && room.photos.length > 0
        ? room.photos
        : room.imageUrl && !room.imageUrl.includes("images.unsplash.com")
          ? [room.imageUrl]
          : [],
    selectedAmenities: room.amenities.filter((item) =>
      AMENITY_OPTIONS.includes(item as (typeof AMENITY_OPTIONS)[number])
    ),
    otherAmenities: room.amenities
      .filter((item) => !AMENITY_OPTIONS.includes(item as (typeof AMENITY_OPTIONS)[number]))
      .join(", "),
  };
}

function formToPayload(form: RoomFormState) {
  const otherAmenities = form.otherAmenities
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const cleanedPhotos = form.photos.map((item) => item.trim()).filter(Boolean).slice(0, 20);

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    treeName: form.treeName.trim() || null,
    description: form.description.trim() || null,
    bedType: form.bedType.trim() || null,
    bathroomDetail: form.bathroomDetail.trim() || null,
    beds: form.bedItems
      .map((item) => ({ size: item.size, count: Number(item.count) }))
      .filter((item) => Number.isInteger(item.count) && item.count > 0 && item.count <= 3),
    bathrooms: form.bathroomItems
      .slice(0, 1)
      .map((item) => ({ type: "PRIVATE" as const, count: Number(item.count) }))
      .filter((item) => Number.isInteger(item.count) && item.count >= 1 && item.count <= 3),
    pricePerNight: Number(form.pricePerNight),
    maxGuests: Number(form.maxGuests),
    floor: form.floor.trim() ? Number(form.floor) : null,
    status: form.status,
    imageUrl: cleanedPhotos[0] ?? null,
    photos: cleanedPhotos,
    amenities: [...form.selectedAmenities, ...otherAmenities],
  };
}

function validateRoomForm(form: RoomFormState): string | null {
  if (!/^[A-Za-z0-9-]+$/.test(form.code.trim())) {
    return "El código solo puede usar letras, números o guiones.";
  }
  if (Number(form.pricePerNight) <= 0 || Number(form.pricePerNight) > 99999) {
    return "El precio debe ser mayor a 0 y menor a 99999.";
  }
  if (!Number.isInteger(Number(form.maxGuests)) || Number(form.maxGuests) < 1 || Number(form.maxGuests) > 20) {
    return "La capacidad debe ser un número entero entre 1 y 20.";
  }
  const validBeds = form.bedItems.filter(
    (item) =>
      ["SINGLE", "DOUBLE", "KING"].includes(item.size) &&
      Number.isInteger(Number(item.count)) &&
      Number(item.count) >= 1 &&
      Number(item.count) <= 3
  );
  if (validBeds.length === 0 || validBeds.length > 3) {
    return "Debes definir entre 1 y 3 camas válidas.";
  }

  const bathroomCount = Number(form.bathroomItems[0]?.count ?? 0);
  if (!Number.isInteger(bathroomCount) || bathroomCount < 1 || bathroomCount > 3) {
    return "La cantidad de baños debe estar entre 1 y 3.";
  }

  return null;
}

function roomStatusVariant(status: string) {
  if (status === "AVAILABLE") return "available" as const;
  if (status === "MAINTENANCE") return "maintenance" as const;
  return "blocked" as const;
}

export function AdminRoomsPanel() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>(EMPTY_ROOM_FORM);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const {
    sortKey: roomSortKey,
    sortDirection: roomSortDirection,
    toggleSort: toggleRoomSort,
    sortRows: sortRoomRows,
  } = useTableSort<RoomSortKey>("code", "asc");

  const sortedRooms = useMemo(
    () =>
      sortRoomRows(rooms, (room, key) => {
        switch (key) {
          case "code":
            return room.code;
          case "name":
            return room.name;
          case "type":
            return room.type;
          case "price":
            return room.pricePerNight;
          case "capacity":
            return room.maxGuests;
          case "floor":
            return room.floor ?? -1;
          case "status":
            return room.status;
          default:
            return "";
        }
      }),
    [rooms, sortRoomRows]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (debouncedSearch.trim()) query.set("q", debouncedSearch.trim());
      const response = await fetch(`${apiPath("/api/rooms")}?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error al cargar habitaciones.");
      setRooms(data.rooms ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalRows(data.total ?? data.count ?? 0);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al cargar habitaciones.",
      });
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_ROOM_FORM);
    setGalleryError(null);
    setShowForm(true);
    setMessage(null);
  }

  function openEditForm(room: AdminRoom) {
    setEditingId(room.id);
    setForm(roomToForm(room));
    setGalleryError(null);
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_ROOM_FORM);
    setGalleryError(null);
  }

  function updateField<K extends keyof RoomFormState>(key: K, value: RoomFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateBedItem(index: number, patch: Partial<RoomFormState["bedItems"][number]>) {
    setForm((prev) => ({
      ...prev,
      bedItems: prev.bedItems.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addBedItem() {
    setForm((prev) => {
      if (prev.bedItems.length >= 3) return prev;
      return { ...prev, bedItems: [...prev.bedItems, { size: "DOUBLE", count: "1" }] };
    });
  }

  function removeBedItem(index: number) {
    setForm((prev) => {
      if (prev.bedItems.length <= 1) return prev;
      return { ...prev, bedItems: prev.bedItems.filter((_, i) => i !== index) };
    });
  }

  function updateBathroomCount(count: string) {
    setForm((prev) => {
      const current = prev.bathroomItems[0] ?? { type: "PRIVATE" as const, count: "1" };
      return { ...prev, bathroomItems: [{ ...current, type: "PRIVATE", count }] };
    });
  }

  function toggleAmenity(value: string) {
    setForm((prev) => {
      const exists = prev.selectedAmenities.includes(value);
      return {
        ...prev,
        selectedAmenities: exists
          ? prev.selectedAmenities.filter((item) => item !== value)
          : [...prev.selectedAmenities, value],
      };
    });
  }

  async function uploadGalleryFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGalleryError(null);

    const remaining = 20 - form.photos.length;
    if (remaining <= 0) {
      setGalleryError("Máximo 20 fotos por habitación.");
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch(apiPath("/api/uploads/rooms"), {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error ?? `No se pudo subir ${file.name}.`);
        }
        if (uploadData.url) uploadedUrls.push(uploadData.url as string);
      }
      if (uploadedUrls.length > 0) {
        setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploadedUrls].slice(0, 20) }));
      }
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "No se pudieron subir las fotos.");
    } finally {
      setUploadingGallery(false);
    }
  }

  function removePhoto(index: number) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.photos.length) return prev;
      const next = [...prev.photos];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, photos: next };
    });
  }

  async function saveRoom(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const validationError = validateRoomForm(form);
      if (validationError) {
        throw new Error(validationError);
      }

      const payload = formToPayload(form);
      const response = await fetch(editingId ? apiPath(`/api/rooms/${editingId}`) : apiPath("/api/rooms"), {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la habitación.");

      if (editingId) {
        setRooms((prev) => prev.map((room) => (room.id === editingId ? data.room : room)));
      } else {
        setRooms((prev) => [...prev, data.room].sort((a, b) => a.code.localeCompare(b.code)));
      }

      setMessage({
        type: "success",
        text: data.message ?? (editingId ? "Habitación actualizada." : "Habitación creada."),
      });
      closeForm();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRoom(room: AdminRoom) {
    const confirmed = window.confirm(
      `¿Eliminar la habitación ${room.code} (${room.name})? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(room.id);
    setMessage(null);

    try {
      const response = await fetch(apiPath(`/api/rooms/${room.id}`), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar la habitación.");

      setRooms((prev) => prev.filter((item) => item.id !== room.id));
      if (editingId === room.id) closeForm();
      setMessage({ type: "success", text: data.message ?? "Habitación eliminada." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al eliminar.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !initialized) {
    return <div className="glass-panel p-8 text-center text-brand-500">Cargando habitaciones...</div>;
  }

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminHintLabel as="h2" hint={ADMIN_ROOMS_HELP.section} className="text-lg font-bold text-brand-100">
          Inventario de habitaciones
        </AdminHintLabel>
        <button
          type="button"
          onClick={openCreateForm}
          className="btn-primary hidden min-h-10 px-4 text-sm md:inline-flex"
        >
          + Nueva habitación
        </button>
      </div>

      <AdminToast message={message} onDismiss={() => setMessage(null)} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="input-field w-full max-w-md"
          placeholder="Buscar por código, nombre o descripción..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          name="search-rooms"
        />
        <span className="text-xs text-brand-500">{totalRows} resultados</span>
      </div>

      {showForm && (
        <AdminMobileSheet
          open={showForm}
          onClose={closeForm}
          title={editingId ? "Editar habitación" : "Nueva habitación"}
          subtitle={
            form.code.trim() || form.name.trim()
              ? `${form.code.trim() || "—"} · ${form.name.trim() || "Sin nombre"}`
              : undefined
          }
          size="xl"
        >
          <form onSubmit={saveRoom} className="space-y-4">
            <p className="rounded-xl border border-brand-700/45 bg-white/55 px-3 py-2 text-xs text-brand-500">
              {ADMIN_ROOMS_HELP.form}
            </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Código *</span>
              <input
                value={form.code}
                onChange={(e) => updateField("code", e.target.value)}
                className="input-field"
                placeholder="101"
                pattern="[A-Za-z0-9-]+"
                title="Usá letras, números o guiones."
                required
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-brand-500">Nombre *</span>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="input-field"
                placeholder="Standard Vista Jardín"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Tipo *</span>
              <select value={form.type} onChange={(e) => updateField("type", e.target.value)} className="input-field">
                {ROOM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Precio / noche ({getDisplayCurrency()}) *</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.pricePerNight}
                onChange={(e) => updateField("pricePerNight", e.target.value)}
                className="input-field"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Huéspedes máx. *</span>
              <input
                type="number"
                min="1"
                max="20"
                value={form.maxGuests}
                onChange={(e) => updateField("maxGuests", e.target.value)}
                className="input-field"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Piso</span>
              <input
                type="number"
                min="0"
                value={form.floor}
                onChange={(e) => updateField("floor", e.target.value)}
                className="input-field"
                placeholder="1"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Estado</span>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="input-field"
              >
                {ROOM_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-brand-500">Etiqueta / badge</span>
              <input
                value={form.treeName}
                onChange={(e) => updateField("treeName", e.target.value)}
                className="input-field"
                placeholder="Ej: Coihue"
                maxLength={60}
              />
              <span className="block text-[11px] text-brand-500">
                Texto corto que se muestra sobre la foto (opcional).
              </span>
            </label>
            <label className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-brand-500">Descripción</span>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="input-field min-h-20 py-2"
                placeholder="Detalle opcional de la habitación"
              />
            </label>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-brand-500">Camas (máx. 3)</span>
                <button
                  type="button"
                  onClick={addBedItem}
                  className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
                  disabled={form.bedItems.length >= 3}
                >
                  + Agregar cama
                </button>
              </div>
              <div className="grid gap-2">
                {form.bedItems.map((item, index) => (
                  <div key={`bed-${index}`} className="grid grid-cols-[1fr_120px_auto] gap-2">
                    <select
                      value={item.size}
                      onChange={(e) =>
                        updateBedItem(index, {
                          size: e.target.value as "SINGLE" | "DOUBLE" | "KING",
                        })
                      }
                      className="input-field"
                    >
                      <option value="SINGLE">1 plaza</option>
                      <option value="DOUBLE">2 plazas</option>
                      <option value="KING">King</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      value={item.count}
                      onChange={(e) => updateBedItem(index, { count: e.target.value })}
                      className="input-field"
                      placeholder="Cant."
                    />
                    <button
                      type="button"
                      onClick={() => removeBedItem(index)}
                      className="btn-secondary min-h-10 px-3 text-xs"
                      disabled={form.bedItems.length <= 1}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-brand-500">Baño propio (cantidad 1 a 3)</span>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  value="Baño propio"
                  className="input-field"
                  disabled
                  aria-label="Tipo de baño"
                />
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={form.bathroomItems[0]?.count ?? "1"}
                  onChange={(e) => updateBathroomCount(e.target.value)}
                  className="input-field"
                  placeholder="Cant."
                  aria-label="Cantidad de baños"
                />
              </div>
              <p className="text-[11px] text-brand-500">
                Texto libre opcional para mostrar en cards:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={form.bedType}
                  onChange={(e) => updateField("bedType", e.target.value)}
                  className="input-field"
                  placeholder="Ej: King + Sofá cama"
                  maxLength={120}
                />
                <input
                  value={form.bathroomDetail}
                  onChange={(e) => updateField("bathroomDetail", e.target.value)}
                  className="input-field"
                  placeholder="Ej: Baño privado con tina"
                  maxLength={120}
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-brand-500">
                  Fotos de la habitación ({form.photos.length}/20)
                </span>
              </div>
              <p className="text-[11px] text-brand-500">
                Se muestran en el carrusel de la habitación (sitio y reservas). La primera es la
                principal (portada); usa las flechas para reordenar. Formatos: JPG, PNG o WEBP (máx.
                8 MB).
              </p>
              <label className="block">
                <span className="sr-only">Subir fotos a la galería</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={uploadingGallery || form.photos.length >= 20}
                  onChange={(e) => {
                    void uploadGalleryFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent disabled:opacity-60"
                />
              </label>
              {uploadingGallery && (
                <p className="text-[11px] text-brand-500">Subiendo fotos…</p>
              )}
              {galleryError && <p className="alert-error text-xs">{galleryError}</p>}
              {form.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {form.photos.map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="group relative overflow-hidden rounded-xl border border-brand-700/60 bg-brand-900/30"
                    >
                      <Image
                        src={publicAssetUrl(photo) ?? photo}
                        alt={`Foto ${index + 1} de la galería de la habitación${form.name ? ` ${form.name}` : ""}`}
                        width={320}
                        height={192}
                        className="h-24 w-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-semibold text-brand-900">
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-brand-900/70 px-1.5 py-1">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => movePhoto(index, -1)}
                            disabled={index === 0}
                            className="rounded bg-brand-800/80 px-1.5 text-xs text-brand-100 disabled:opacity-40"
                            aria-label="Mover foto a la izquierda"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() => movePhoto(index, 1)}
                            disabled={index === form.photos.length - 1}
                            className="rounded bg-brand-800/80 px-1.5 text-xs text-brand-100 disabled:opacity-40"
                            aria-label="Mover foto a la derecha"
                          >
                            ›
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="rounded bg-red-900/80 px-1.5 text-xs font-semibold text-white"
                          aria-label="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {editingId && (
              <p className="alert-warning text-xs sm:col-span-2 lg:col-span-3">
                Cambiar el precio afecta solo búsquedas y reservas nuevas. Las reservas existentes
                conservan el total con el que fueron creadas.
              </p>
            )}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-brand-500">Amenities</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {AMENITY_OPTIONS.map((option) => {
                  const checked = form.selectedAmenities.includes(option);
                  return (
                    <label
                      key={option}
                      className="flex items-center gap-2 rounded-lg border border-brand-700/55 bg-brand-900/25 px-3 py-2 text-xs text-brand-500"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAmenity(option)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-brand-500">Otros (opcional, separados por coma)</span>
                <input
                  value={form.otherAmenities}
                  onChange={(e) => updateField("otherAmenities", e.target.value)}
                  className="input-field"
                  placeholder="Ej: Smart TV, Netflix, Calefacción central"
                />
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-brand-700/35 bg-[#faf6ef] px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <button
              type="submit"
              disabled={saving || uploadingGallery}
              className="btn-primary min-h-11 flex-1 px-4 text-sm disabled:opacity-60 sm:min-h-10 sm:flex-none"
            >
              {uploadingGallery
                ? "Subiendo fotos..."
                : saving
                  ? "Guardando…"
                  : editingId
                    ? "Guardar cambios"
                    : "Crear habitación"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="btn-secondary min-h-11 flex-1 px-4 text-sm sm:min-h-10 sm:flex-none"
            >
              Cancelar
            </button>
          </div>
          </form>
        </AdminMobileSheet>
      )}

      {rooms.length === 0 ? (
        <div className="glass-panel p-8 text-center text-sm text-brand-500">
          No hay habitaciones cargadas.{" "}
          <span className="md:hidden">Usá el botón flotante para crear la primera.</span>
          <span className="hidden md:inline">Creá la primera con el botón de arriba.</span>
        </div>
      ) : (
        <>
          <AdminRoomsMobileList
            rooms={rooms}
            editingId={editingId}
            typeLabels={Object.fromEntries(ROOM_TYPE_OPTIONS.map((option) => [option.value, option.label]))}
            deletingId={deletingId}
            onEdit={(room) => {
              const full = rooms.find((item) => item.id === room.id);
              if (full) openEditForm(full);
            }}
            onDelete={(room) => {
              const full = rooms.find((item) => item.id === room.id);
              if (full) void deleteRoom(full);
            }}
            page={page}
            totalPages={totalPages}
            onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
          <div className="admin-table-shell hidden md:block">
            <table className="admin-table w-full text-left text-sm">
              <thead className="admin-table-head text-xs uppercase tracking-wide text-brand-500">
                <tr>
                  <SortableTh
                    label="Código"
                    columnKey="code"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Nombre"
                    columnKey="name"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Tipo"
                    columnKey="type"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Precio"
                    columnKey="price"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Cap."
                    columnKey="capacity"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Piso"
                    columnKey="floor"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Estado"
                    columnKey="status"
                    sortKey={roomSortKey}
                    sortDirection={roomSortDirection}
                    onSort={toggleRoomSort}
                    className="px-4 py-3"
                  />
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map((room) => (
                  <tr
                    key={room.id}
                    className={cn(
                      "admin-table-row",
                      editingId === room.id && "bg-honey/15 ring-1 ring-inset ring-accent/25"
                    )}
                  >
                    <td className="px-4 py-3 font-bold text-brand-100">{room.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-100">{room.name}</p>
                      {room.amenities.length > 0 && (
                        <p className="mt-0.5 text-xs text-brand-500">{room.amenities.slice(0, 3).join(" · ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-500">
                      {ROOM_TYPE_OPTIONS.find((option) => option.value === room.type)?.label ?? room.type}
                    </td>
                    <td className="px-4 py-3 font-medium text-gold">{formatCurrency(room.pricePerNight)}</td>
                    <td className="px-4 py-3 text-brand-500">{room.maxGuests}</td>
                    <td className="px-4 py-3 text-brand-500">{room.floor ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={roomStatusVariant(room.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(room)}
                          className="btn-secondary min-h-9 px-3 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteRoom(room)}
                          disabled={deletingId === room.id}
                          className="min-h-9 rounded-xl border border-red-400/40 bg-red-100/50 px-3 text-xs font-semibold text-red-900 transition hover:bg-red-200/60 disabled:opacity-60"
                        >
                          {deletingId === room.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        </>
      )}
      <div className="hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <span className="text-xs text-brand-500">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>
      </div>

      {!showForm && <AdminMobileFab label="+ Nueva habitación" onClick={openCreateForm} />}
    </div>
  );
}

type RoomBlockRow = {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export function AdminRoomBlocksPanel() {
  const [blocks, setBlocks] = useState<RoomBlockRow[]>([]);
  const [rooms, setRooms] = useState<{ id: string; code: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [message, setMessage] = useState<PanelMessage | null>(null);
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
    sortKey: blockSortKey,
    sortDirection: blockSortDirection,
    toggleSort: toggleBlockSort,
    sortRows: sortBlockRows,
  } = useTableSort<BlockSortKey>("startDate", "asc");

  const sortedBlocks = useMemo(
    () =>
      sortBlockRows(blocks, (block, key) => {
        switch (key) {
          case "room":
            return block.roomCode;
          case "startDate":
            return block.startDate;
          case "endDate":
            return block.endDate;
          case "reason":
            return block.reason ?? "";
          default:
            return "";
        }
      }),
    [blocks, sortBlockRows]
  );

  const selectedRoom = rooms.find((room) => room.id === roomId);

  function openCreateBlockForm() {
    setStartDate("");
    setEndDate("");
    setReason("");
    setShowCreateForm(true);
    setMessage(null);
  }

  function closeCreateBlockForm() {
    setShowCreateForm(false);
  }

  function renderBlockFormFields() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-brand-100">Habitación</span>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input-field min-h-11" required>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.code} · {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-100">Desde</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate && endDate <= e.target.value) setEndDate("");
            }}
            className="input-field min-h-11"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-100">Hasta</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field min-h-11"
            required
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-brand-100">Motivo (opcional)</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field min-h-11"
            placeholder="Mantenimiento, evento privado..."
          />
        </label>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const blockQuery = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (debouncedSearch.trim()) blockQuery.set("q", debouncedSearch.trim());

      const [blocksRes, roomsRes] = await Promise.all([
        fetch(`${apiPath("/api/room-blocks")}?${blockQuery.toString()}`),
        fetch(`${apiPath("/api/rooms")}?page=1&pageSize=100`),
      ]);
      const blocksData = await blocksRes.json();
      const roomsData = await roomsRes.json();
      if (blocksRes.status === 401 || roomsRes.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!blocksRes.ok) throw new Error(blocksData.error);
      if (!roomsRes.ok) throw new Error(roomsData.error);
      setBlocks(blocksData.blocks ?? []);
      setRooms(roomsData.rooms ?? []);
      setRoomId((current) => current || roomsData.rooms?.[0]?.id || "");
      setTotalPages(blocksData.totalPages ?? 1);
      setTotalRows(blocksData.total ?? blocksData.count ?? 0);
    } catch {
      setMessage({ type: "error", text: "Error al cargar bloqueos." });
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  async function createBlock(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (endDate <= startDate) {
        throw new Error("La fecha de fin debe ser posterior al inicio.");
      }

      const response = await fetch(apiPath("/api/room-blocks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, startDate, endDate, reason: reason || undefined }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) throw new Error(data.error);
      setMessage({ type: "success", text: "Bloqueo creado." });
      setStartDate("");
      setEndDate("");
      setReason("");
      closeCreateBlockForm();
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al crear bloqueo.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteBlock(id: string) {
    if (!window.confirm("¿Eliminar este bloqueo?")) return;

    setDeletingId(id);
    setMessage(null);
    try {
      const response = await fetch(apiPath(`/api/room-blocks/${id}`), { method: "DELETE" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) throw new Error(data.error);
      setMessage({ type: "success", text: "Bloqueo eliminado." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al eliminar." });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !initialized) {
    return <div className="glass-panel p-8 text-center text-brand-500">Cargando bloqueos...</div>;
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <AdminToast message={message} onDismiss={() => setMessage(null)} />

      <div className="hidden md:block">
        <form onSubmit={createBlock} className="glass-panel space-y-4 p-5">
          <AdminHintLabel as="h2" hint={ADMIN_BLOCKS_HELP.section} className="text-lg font-semibold text-brand-100">
            Nuevo bloqueo por fechas
          </AdminHintLabel>
          {renderBlockFormFields()}
          <button type="submit" disabled={saving} className="btn-primary min-h-10">
            {saving ? "Guardando..." : "Crear bloqueo"}
          </button>
        </form>
      </div>

      <AdminMobileSheet
        open={showCreateForm}
        onClose={closeCreateBlockForm}
        title="Nuevo bloqueo"
        subtitle={selectedRoom ? `${selectedRoom.code} · ${selectedRoom.name}` : undefined}
        mobileOnly
      >
        <form onSubmit={createBlock} className="space-y-4">
          {renderBlockFormFields()}
          <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-brand-700/35 bg-[#faf6ef] px-4 py-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary min-h-11 flex-1 text-sm disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Crear bloqueo"}
            </button>
            <button
              type="button"
              onClick={closeCreateBlockForm}
              className="btn-secondary min-h-11 flex-1 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </AdminMobileSheet>

      <AdminHintLabel
        as="h2"
        hint={ADMIN_BLOCKS_HELP.section}
        className="text-lg font-semibold text-brand-100 md:hidden"
      >
        Bloqueos programados
      </AdminHintLabel>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="input-field w-full max-w-md"
          placeholder="Buscar por habitación o motivo..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          name="search-blocks"
        />
        <span className="text-xs text-brand-500">{totalRows} resultados</span>
      </div>

      <AdminBlocksMobileList
        blocks={blocks}
        deletingId={deletingId}
        onDelete={deleteBlock}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
      />

      <div className="admin-table-shell hidden md:block">
        <div className="flex items-center gap-1.5 border-b border-brand-700/50 px-3 py-2 text-xs font-semibold text-brand-500">
          Bloqueos programados
          <InfoTooltip label={ADMIN_BLOCKS_HELP.list} variant="accent" width={260} />
        </div>
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="admin-table-head text-xs uppercase text-brand-500">
            <tr>
              <SortableTh
                label="Habitación"
                columnKey="room"
                sortKey={blockSortKey}
                sortDirection={blockSortDirection}
                onSort={toggleBlockSort}
                className="px-4 py-3"
              />
              <SortableTh
                label="Desde"
                columnKey="startDate"
                sortKey={blockSortKey}
                sortDirection={blockSortDirection}
                onSort={toggleBlockSort}
                className="px-4 py-3"
              />
              <SortableTh
                label="Hasta"
                columnKey="endDate"
                sortKey={blockSortKey}
                sortDirection={blockSortDirection}
                onSort={toggleBlockSort}
                className="px-4 py-3"
              />
              <SortableTh
                label="Motivo"
                columnKey="reason"
                sortKey={blockSortKey}
                sortDirection={blockSortDirection}
                onSort={toggleBlockSort}
                className="px-4 py-3"
              />
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sortedBlocks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-500">
                  No hay bloqueos programados.
                </td>
              </tr>
            ) : (
              sortedBlocks.map((block) => (
                <tr key={block.id} className="admin-table-row">
                  <td className="px-4 py-3 text-brand-100">
                    {block.roomCode}
                    <span className="block text-xs text-brand-500">{block.roomName}</span>
                  </td>
                  <td className="px-4 py-3 text-brand-100">{block.startDate}</td>
                  <td className="px-4 py-3 text-brand-100">{block.endDate}</td>
                  <td className="px-4 py-3 text-brand-500">{block.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void deleteBlock(block.id)}
                      disabled={deletingId === block.id}
                      className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {deletingId === block.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <span className="text-xs text-brand-500">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>
      </div>

      {!showCreateForm && <AdminMobileFab label="+ Nuevo bloqueo" onClick={openCreateBlockForm} />}
    </div>
  );
}
