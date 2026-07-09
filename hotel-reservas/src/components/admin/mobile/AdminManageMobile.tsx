"use client";

import { useState } from "react";
import { GuestContactInfo } from "@/components/admin/GuestContactInfo";
import {
  AdminMobileCard,
  AdminMobileCopyButton,
  AdminMobilePagination,
  AdminMobileSelect,
} from "@/components/admin/mobile/AdminMobilePrimitives";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/dates";
import { paymentStatusLabel } from "@/lib/reservation-history";
import { cn } from "@/lib/utils";

type ReservationRow = {
  id: string;
  confirmationCode: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  paymentProvider?: string | null;
  status: string;
  totalAmount: number;
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

function paymentBadgeVariant(status: string) {
  if (status === "PAID") return "paid" as const;
  if (status === "REFUNDED") return "refunded" as const;
  if (status === "CANCELLED") return "cancelled" as const;
  return "pending" as const;
}

function formatShortStayDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year.slice(2)}`;
}

export function AdminReservationsMobileList({
  rows,
  scope,
  managingId,
  savingId,
  paymentOptions,
  statusOptions,
  page,
  totalPages,
  onManage,
  onUpdate,
  onPrevPage,
  onNextPage,
}: {
  rows: ReservationRow[];
  scope: string;
  managingId?: string | null;
  savingId: string | null;
  paymentOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  page: number;
  totalPages: number;
  onManage: (id: string) => void;
  onUpdate: (id: string, patch: { paymentStatus?: string; status?: string }) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-700 bg-white/72 px-4 py-10 text-center text-sm text-brand-500 md:hidden">
        {scope === "history"
          ? "No hay reservas canceladas o reembolsadas."
          : "No hay reservas registradas."}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <ReservationMobileCard
          key={row.id}
          row={row}
          scope={scope}
          isManaging={managingId === row.id}
          onManage={() => onManage(row.id)}
        />
      ))}
      <AdminMobilePagination page={page} totalPages={totalPages} onPrev={onPrevPage} onNext={onNextPage} />
    </div>
  );
}

function ReservationMobileCard({
  row,
  scope,
  isManaging,
  onManage,
}: {
  row: ReservationRow;
  scope: string;
  isManaging?: boolean;
  onManage: () => void;
}) {
  const [showContact, setShowContact] = useState(false);
  const guestName = row.guestFullName ?? row.guest.fullName;

  return (
    <AdminMobileCard
      className={cn(
        (row.paymentStatus === "CANCELLED" || row.paymentStatus === "REFUNDED") && "opacity-90",
        isManaging && "border-accent/45 bg-honey/20 ring-2 ring-accent/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-brand-100">{guestName}</p>
        <StatusBadge
          variant={paymentBadgeVariant(row.paymentStatus)}
          label={paymentStatusLabel(row.paymentStatus)}
        />
      </div>

      <p className="mt-1 text-xs text-brand-500">
        {row.room.code} · {row.room.name}
      </p>
      <p className="mt-0.5 text-xs text-brand-100">
        {formatShortStayDate(row.checkIn)} → {formatShortStayDate(row.checkOut)}
      </p>
      <p className="mt-1 text-sm font-bold text-accent">{formatCurrency(row.totalAmount)}</p>

      {scope === "history" && row.updatedAt && (
        <p className="mt-1 text-[11px] text-brand-500">
          Actualizado:{" "}
          {new Date(row.updatedAt).toLocaleString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowContact((value) => !value)}
        className="mt-2 text-[11px] font-semibold text-accent"
      >
        {showContact ? "Ocultar contacto" : "Ver contacto"}
      </button>
      {showContact && (
        <div className="mt-2 border-t border-brand-700/40 pt-2">
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
            compact
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md bg-brand-800 px-2 py-1 font-mono text-xs text-brand-100">
          {row.confirmationCode}
        </code>
        <AdminMobileCopyButton code={row.confirmationCode} />
      </div>

      <button
        type="button"
        onClick={onManage}
        className={cn(
          "btn-primary mt-3 min-h-11 w-full text-sm",
          isManaging && "bg-honey/80 text-accent-hover"
        )}
      >
        {isManaging ? "Gestionando…" : "Gestionar reserva"}
      </button>
    </AdminMobileCard>
  );
}

export function AdminReservationManageSheet({
  row,
  open,
  scope,
  saving,
  paymentOptions,
  statusOptions,
  onClose,
  onUpdate,
}: {
  row: ReservationRow | null;
  open: boolean;
  scope: string;
  saving: boolean;
  paymentOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  onClose: () => void;
  onUpdate: (id: string, patch: { paymentStatus?: string; status?: string }) => void;
}) {
  if (!row) return null;

  const guestName = row.guestFullName ?? row.guest.fullName;

  return (
    <AdminMobileSheet
      open={open}
      onClose={onClose}
      title={guestName}
      subtitle={`${row.room.code} · ${row.confirmationCode}`}
      mobileOnly
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-700/50 bg-white/60 p-3">
          <p className="text-xs text-brand-500">{row.room.name}</p>
          <p className="mt-1 text-sm text-brand-100">
            {formatShortStayDate(row.checkIn)} → {formatShortStayDate(row.checkOut)}
          </p>
          <p className="mt-2 text-lg font-bold text-accent">{formatCurrency(row.totalAmount)}</p>
          <div className="mt-2">
            <StatusBadge
              variant={paymentBadgeVariant(row.paymentStatus)}
              label={paymentStatusLabel(row.paymentStatus)}
            />
          </div>
        </div>

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
          compact
        />

        {scope === "history" && row.updatedAt && (
          <p className="text-[11px] text-brand-500">
            Actualizado:{" "}
            {new Date(row.updatedAt).toLocaleString("es-CL", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-md bg-brand-800 px-2 py-1 font-mono text-xs text-brand-100">
            {row.confirmationCode}
          </code>
          <AdminMobileCopyButton code={row.confirmationCode} />
        </div>

        <div className="space-y-3 border-t border-brand-700/40 pt-3">
          {(row.paymentProvider === "BANK_TRANSFER" || row.paymentProvider === "MERCADO_PAGO") && (
            <div className="flex flex-wrap gap-1.5">
              {row.paymentProvider === "BANK_TRANSFER" && (
                <span className="rounded-full bg-sky-100/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  Transferencia
                </span>
              )}
              {row.paymentProvider === "MERCADO_PAGO" && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  Mercado Pago
                </span>
              )}
            </div>
          )}
          <AdminMobileSelect
            label="Estado de pago"
            value={row.paymentStatus}
            disabled={saving}
            options={paymentOptions}
            onChange={(value) => onUpdate(row.id, { paymentStatus: value })}
          />
          <AdminMobileSelect
            label="Estado de la reserva"
            value={row.status}
            disabled={saving}
            options={statusOptions}
            onChange={(value) => onUpdate(row.id, { status: value })}
          />
          {saving && <p className="text-[11px] text-brand-500">Guardando cambios…</p>}
        </div>

        <button type="button" onClick={onClose} className="btn-secondary min-h-11 w-full text-sm">
          Cerrar
        </button>
      </div>
    </AdminMobileSheet>
  );
}

type AdminRoomListItem = {
  id: string;
  code: string;
  name: string;
  type: string;
  pricePerNight: number;
  maxGuests: number;
  floor: number | null;
  status: string;
  amenities: string[];
};

function roomStatusVariant(status: string) {
  if (status === "AVAILABLE") return "available" as const;
  if (status === "MAINTENANCE") return "maintenance" as const;
  return "blocked" as const;
}

export function AdminRoomsMobileList({
  rooms,
  editingId,
  typeLabels,
  deletingId,
  onEdit,
  onDelete,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}: {
  rooms: AdminRoomListItem[];
  editingId?: string | null;
  typeLabels: Record<string, string>;
  deletingId: string | null;
  onEdit: (room: AdminRoomListItem) => void;
  onDelete: (room: AdminRoomListItem) => void;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-700 bg-white/72 px-4 py-10 text-center text-sm text-brand-500 md:hidden">
        No hay habitaciones en esta página.
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {rooms.map((room) => {
        const isEditing = editingId === room.id;

        return (
        <AdminMobileCard
          key={room.id}
          className={cn(
            isEditing && "border-accent/45 bg-honey/20 ring-2 ring-accent/20"
          )}
        >
          {isEditing && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
              Editando ahora
            </p>
          )}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-brand-100">
                {room.code} · {room.name}
              </p>
              <p className="mt-0.5 text-xs text-brand-500">
                {typeLabels[room.type] ?? room.type} · {room.maxGuests} pers.
                {room.floor != null ? ` · Piso ${room.floor}` : ""}
              </p>
            </div>
            <StatusBadge variant={roomStatusVariant(room.status)} />
          </div>
          <p className="mt-2 text-base font-bold text-gold">{formatCurrency(room.pricePerNight)}</p>
          {room.amenities.length > 0 && (
            <p className="mt-1 text-xs text-brand-500">{room.amenities.slice(0, 5).join(" · ")}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(room)}
              className={cn(
                "btn-secondary min-h-10 flex-1 text-xs",
                isEditing && "border-accent/40 bg-honey/35 text-accent-hover"
              )}
            >
              {isEditing ? "Editando…" : "Editar"}
            </button>
            <button
              type="button"
              onClick={() => void onDelete(room)}
              disabled={deletingId === room.id}
              className="min-h-10 flex-1 rounded-xl border border-red-400/40 bg-red-100/50 text-xs font-semibold text-red-900 transition hover:bg-red-200/60 disabled:opacity-60"
            >
              {deletingId === room.id ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </AdminMobileCard>
        );
      })}
      <AdminMobilePagination page={page} totalPages={totalPages} onPrev={onPrevPage} onNext={onNextPage} />
    </div>
  );
}

type RoomBlockRow = {
  id: string;
  roomCode: string;
  roomName: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export function AdminBlocksMobileList({
  blocks,
  deletingId,
  onDelete,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}: {
  blocks: RoomBlockRow[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-700 bg-white/72 px-4 py-10 text-center text-sm text-brand-500 md:hidden">
        No hay bloqueos programados.
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {blocks.map((block) => (
        <AdminMobileCard key={block.id}>
          <p className="font-semibold text-brand-100">
            {block.roomCode} · {block.roomName}
          </p>
          <p className="mt-1 text-sm text-brand-100">
            {block.startDate} → {block.endDate}
          </p>
          <p className="mt-1 text-xs text-brand-500">{block.reason?.trim() || "Sin motivo indicado"}</p>
          <button
            type="button"
            onClick={() => void onDelete(block.id)}
            disabled={deletingId === block.id}
            className="btn-secondary mt-3 min-h-10 w-full text-xs disabled:opacity-60"
          >
            {deletingId === block.id ? "Eliminando…" : "Eliminar bloqueo"}
          </button>
        </AdminMobileCard>
      ))}
      <AdminMobilePagination page={page} totalPages={totalPages} onPrev={onPrevPage} onNext={onNextPage} />
    </div>
  );
}
