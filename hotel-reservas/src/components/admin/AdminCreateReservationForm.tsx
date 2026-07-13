"use client";

import { useMemo, useState } from "react";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
import { FieldError, fieldA11yProps } from "@/components/ui/FieldError";
import { formatCurrency, formatDateOnlyUTC } from "@/lib/dates";
import { apiPath } from "@/lib/api-path";
import {
  isValidChileanPhone,
  isValidChileanRut,
  type GuestDocumentType,
} from "@/lib/guest-identity";
import { cn } from "@/lib/utils";

type AvailableRoom = {
  id: string;
  code: string;
  name: string;
  maxGuests: number;
  pricePerNight: number;
  totalAmount?: number;
  nights?: number;
};

type PaymentOutcome = "PENDING" | "PARTIAL" | "PAID";

type AdminCreateReservationFormProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (reservation: { id: string; confirmationCode: string }) => void;
};

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateOnlyUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)));
}

function todayIso(): string {
  const d = new Date();
  return formatDateOnlyUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)));
}

export function AdminCreateReservationForm({ open, onClose, onCreated }: AdminCreateReservationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [checkIn, setCheckIn] = useState(todayIso);
  const [checkOut, setCheckOut] = useState(tomorrowIso);
  const [guestsCount, setGuestsCount] = useState(2);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentType, setDocumentType] = useState<GuestDocumentType>("RUT");
  const [rut, setRut] = useState("");
  const [passport, setPassport] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentOutcome>("PENDING");

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === roomId) ?? null, [rooms, roomId]);

  function resetForm() {
    setStep(1);
    setCheckIn(todayIso());
    setCheckOut(tomorrowIso());
    setGuestsCount(2);
    setRooms([]);
    setRoomId("");
    setFullName("");
    setEmail("");
    setPhone("");
    setDocumentType("RUT");
    setRut("");
    setPassport("");
    setBirthDate("");
    setSpecialRequests("");
    setPaymentOutcome("PENDING");
    setError(null);
    setFieldErrors({});
  }

  function handleClose() {
    if (saving) return;
    resetForm();
    onClose();
  }

  async function searchRooms() {
    setError(null);
    setFieldErrors({});
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Revisá las fechas: la salida debe ser después de la entrada.");
      return;
    }
    setLoadingRooms(true);
    setRoomId("");
    try {
      const query = new URLSearchParams({
        checkIn,
        checkOut,
        guests: String(guestsCount),
      });
      const response = await fetch(`${apiPath("/api/availability")}?${query.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo buscar disponibilidad.");
      }
      const list = Array.isArray(data.rooms) ? (data.rooms as AvailableRoom[]) : [];
      setRooms(list);
      if (list.length === 0) {
        setError("No hay habitaciones libres para esas fechas y huéspedes.");
      }
    } catch (err) {
      setRooms([]);
      setError(err instanceof Error ? err.message : "Error al buscar disponibilidad.");
    } finally {
      setLoadingRooms(false);
    }
  }

  function goToGuestStep() {
    setError(null);
    if (!roomId) {
      setError("Elegí una habitación disponible.");
      return;
    }
    setStep(2);
  }

  function validateGuest(): boolean {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = "Ingresa el nombre completo.";
    if (!email.trim() || !email.includes("@")) next.email = "Email inválido.";
    if (!isValidChileanPhone(phone)) next.phone = "Móvil chileno inválido (+56 9 …).";
    if (!birthDate) next.birthDate = "Fecha de nacimiento obligatoria.";
    if (documentType === "RUT") {
      if (!rut.trim()) next.rut = "RUT obligatorio.";
      else if (!isValidChileanRut(rut)) next.rut = "RUT inválido.";
    } else if (!passport.trim() || passport.trim().length < 5) {
      next.passport = "Pasaporte inválido.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submitCreate() {
    setError(null);
    if (!validateGuest()) return;

    setSaving(true);
    try {
      const response = await fetch(apiPath("/api/admin/reservations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          checkIn,
          checkOut,
          guestsCount,
          paymentOutcome,
          specialRequests: specialRequests.trim() || undefined,
          guest: {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone,
            documentType,
            birthDate,
            ...(documentType === "RUT" ? { rut } : { passport }),
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo crear la reserva.");
      }
      const reservation = data.reservation as { id: string; confirmationCode: string };
      resetForm();
      onCreated(reservation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la reserva.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminMobileSheet
      open={open}
      onClose={handleClose}
      title="Nueva reserva"
      subtitle={step === 1 ? "Paso 1 · Fechas y habitación" : "Paso 2 · Huésped y pago"}
      size="md"
    >
      <div className="space-y-4">
        {error ? <p className="alert-error">{error}</p> : null}

        {step === 1 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Check-in</span>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="input-field min-h-11"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Check-out</span>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || undefined}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="input-field min-h-11"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Huéspedes</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value) || 1)}
                  className="input-field min-h-11"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={loadingRooms}
              onClick={() => void searchRooms()}
              className="btn-secondary min-h-11 w-full sm:w-auto"
            >
              {loadingRooms ? "Buscando…" : "Buscar habitaciones libres"}
            </button>

            {rooms.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-500">
                  Habitaciones disponibles
                </p>
                <div className="space-y-2">
                  {rooms.map((room) => {
                    const active = roomId === room.id;
                    const total = room.totalAmount ?? room.pricePerNight;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setRoomId(room.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          active
                            ? "border-accent bg-accent/12 ring-1 ring-accent/30"
                            : "border-brand-700/60 bg-white/70 hover:border-brand-600"
                        )}
                      >
                        <span className="block text-sm font-bold text-brand-100">
                          {room.code} · {room.name}
                        </span>
                        <span className="mt-1 block text-xs text-brand-500">
                          Hasta {room.maxGuests} huéspedes
                          {room.nights ? ` · ${room.nights} noche${room.nights === 1 ? "" : "s"}` : ""}
                          {" · "}
                          {formatCurrency(total)}
                          {!room.totalAmount ? " / noche" : " total"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-brand-700/40 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleClose} className="btn-secondary min-h-11">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!roomId}
                onClick={goToGuestStep}
                className="btn-primary min-h-11 disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            {selectedRoom ? (
              <div className="rounded-2xl border border-brand-700/50 bg-white/65 px-4 py-3 text-sm text-brand-100">
                <p className="font-bold">
                  {selectedRoom.code} · {selectedRoom.name}
                </p>
                <p className="mt-1 text-xs text-brand-500">
                  {checkIn} → {checkOut} · {guestsCount} huésped{guestsCount === 1 ? "" : "es"}
                  {selectedRoom.totalAmount != null ? ` · ${formatCurrency(selectedRoom.totalAmount)}` : ""}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-brand-500">Nombre completo</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field min-h-11"
                  autoComplete="name"
                  {...fieldA11yProps("admin-res-err-fullName", fieldErrors.fullName)}
                />
                <FieldError
                  id="admin-res-err-fullName"
                  message={fieldErrors.fullName}
                  className="text-xs font-medium text-red-700"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field min-h-11"
                  autoComplete="email"
                  {...fieldA11yProps("admin-res-err-email", fieldErrors.email)}
                />
                <FieldError
                  id="admin-res-err-email"
                  message={fieldErrors.email}
                  className="text-xs font-medium text-red-700"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Teléfono</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field min-h-11"
                  placeholder="+56 9 …"
                  autoComplete="tel"
                  {...fieldA11yProps("admin-res-err-phone", fieldErrors.phone)}
                />
                <FieldError
                  id="admin-res-err-phone"
                  message={fieldErrors.phone}
                  className="text-xs font-medium text-red-700"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Nacimiento</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="input-field min-h-11"
                  {...fieldA11yProps("admin-res-err-birthDate", fieldErrors.birthDate)}
                />
                <FieldError
                  id="admin-res-err-birthDate"
                  message={fieldErrors.birthDate}
                  className="text-xs font-medium text-red-700"
                />
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">Documento</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDocumentType("RUT")}
                    className={cn(
                      "min-h-11 flex-1 rounded-xl border text-sm font-semibold",
                      documentType === "RUT"
                        ? "border-accent bg-accent/15 text-brand-100"
                        : "border-brand-700/60 bg-white/70 text-brand-500"
                    )}
                  >
                    RUT
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocumentType("PASSPORT")}
                    className={cn(
                      "min-h-11 flex-1 rounded-xl border text-sm font-semibold",
                      documentType === "PASSPORT"
                        ? "border-accent bg-accent/15 text-brand-100"
                        : "border-brand-700/60 bg-white/70 text-brand-500"
                    )}
                  >
                    Pasaporte
                  </button>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-brand-500">
                  {documentType === "RUT" ? "RUT" : "Pasaporte"}
                </span>
                {documentType === "RUT" ? (
                  <input
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    className="input-field min-h-11"
                    placeholder="12.345.678-9"
                    {...fieldA11yProps("admin-res-err-doc", fieldErrors.rut)}
                  />
                ) : (
                  <input
                    value={passport}
                    onChange={(e) => setPassport(e.target.value)}
                    className="input-field min-h-11"
                    {...fieldA11yProps("admin-res-err-doc", fieldErrors.passport)}
                  />
                )}
                <FieldError
                  id="admin-res-err-doc"
                  message={documentType === "RUT" ? fieldErrors.rut : fieldErrors.passport}
                  className="text-xs font-medium text-red-700"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-brand-500">Pedidos especiales (opcional)</span>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="input-field min-h-[5rem] resize-y py-2"
                maxLength={500}
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-500">Pago al crear</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { id: "PENDING", label: "Pendiente", hint: "Sin cobro aún" },
                    { id: "PARTIAL", label: "Abono 50%", hint: "Registra la mitad" },
                    { id: "PAID", label: "Pagado", hint: "Cobrado en caja" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPaymentOutcome(option.id)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      paymentOutcome === option.id
                        ? "border-accent bg-accent/12 ring-1 ring-accent/30"
                        : "border-brand-700/60 bg-white/70 hover:border-brand-600"
                    )}
                  >
                    <span className="block text-sm font-bold text-brand-100">{option.label}</span>
                    <span className="mt-0.5 block text-[11px] text-brand-500">{option.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-brand-700/40 pt-4 sm:flex-row sm:justify-between">
              <button type="button" disabled={saving} onClick={() => setStep(1)} className="btn-secondary min-h-11">
                Volver
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitCreate()}
                className="btn-primary min-h-11"
              >
                {saving ? "Creando…" : "Crear reserva"}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminMobileSheet>
  );
}
