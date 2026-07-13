"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BankTransferCheckout } from "@/components/BankTransferCheckout";
import { showDemoUi } from "@/lib/app-ui";
import { formatCurrency, formatNightsLabel, formatStayRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { apiPath } from "@/lib/api-path";
import type { RoomCardData } from "@/components/RoomCard";
import type { SearchParams } from "@/components/SearchForm";
import type { SuccessReservation } from "@/components/ReservationSuccessModal";
import type { BankTransferConfig, PaymentConfigResponse } from "@/types/payments";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { InfoTooltip } from "@/components/InfoTooltip";
import {
  formatChileanPhoneInput,
  formatRutInput,
  isValidBirthDate,
  isValidChileanPhone,
  isValidChileanRut,
  isValidPassport,
  type GuestDocumentType,
} from "@/lib/guest-identity";
import { firstZodErrorMessage, zodFieldErrorMap } from "@/lib/zod-form-errors";
import { FieldError, fieldA11yProps } from "@/components/ui/FieldError";

const MercadoPagoCheckout = dynamic(
  () => import("@/components/MercadoPagoCheckout").then((mod) => mod.MercadoPagoCheckout),
  {
    ssr: false,
    loading: () => <div className="glass-panel h-40 animate-pulse" />,
  }
);

type BookingModalProps = {
  open: boolean;
  room: RoomCardData | null;
  search: SearchParams | null;
  onClose: () => void;
  onSuccess: (data: SuccessReservation) => void;
};

type Step = "details" | "payment";
type PaymentMethod = "online" | "bank_transfer";

type CheckoutMeta = {
  checkoutToken: string;
  totalAmount: number;
  nights?: number;
  pricePerNight?: number;
  holdMinutes?: number;
  holdExpiresAt?: string;
};

const CHECKOUT_SESSION_KEY = "bh_checkout_session";

type StoredCheckoutSession = CheckoutMeta & {
  roomId: string;
  checkIn: string;
  checkOut: string;
};

function saveCheckoutSession(data: StoredCheckoutSession) {
  try {
    sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(data));
  } catch {
    /* sessionStorage no disponible */
  }
}

function loadCheckoutSession(
  roomId: string,
  checkIn: string,
  checkOut: string
): CheckoutMeta | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredCheckoutSession;
    if (data.roomId !== roomId || data.checkIn !== checkIn || data.checkOut !== checkOut) {
      return null;
    }
    return {
      checkoutToken: data.checkoutToken,
      totalAmount: data.totalAmount,
      nights: data.nights,
      pricePerNight: data.pricePerNight,
      holdMinutes: data.holdMinutes,
      holdExpiresAt: data.holdExpiresAt,
    };
  } catch {
    return null;
  }
}

function clearCheckoutSession() {
  try {
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
  } catch {
    /* sessionStorage no disponible */
  }
}

function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

const DETAIL_STEP_LABELS = ["Datos de contacto", "Identificación", "Tu estadía"];
const DETAIL_STEP_COUNT = DETAIL_STEP_LABELS.length;

const CANCELLATION_POLICY =
  "Cancelación gratuita hasta 7 días antes del check-in. Después de ese plazo puede aplicarse cargo según política del hotel. Reembolsos se gestionan por WhatsApp o email de reservas.";

export function BookingModal({ open, room, search, onClose, onSuccess }: BookingModalProps) {
  const [step, setStep] = useState<Step>("details");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentType, setDocumentType] = useState<GuestDocumentType>("RUT");
  const [rut, setRut] = useState("");
  const [passport, setPassport] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [checkoutMeta, setCheckoutMeta] = useState<CheckoutMeta | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [guestsCount, setGuestsCount] = useState(1);
  const [detailStep, setDetailStep] = useState(0);
  const demoUi = showDemoUi();

  useEffect(() => {
    if (!open) {
      setStep("details");
      setPaymentMethod("bank_transfer");
      setCheckoutMeta(null);
      setPaymentConfig(null);
      setError(null);
      setFieldErrors({});
      setAcceptedTerms(false);
      setGuestsCount(1);
      setDetailStep(0);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !search) return;
    setGuestsCount(search.guests);
  }, [open, search?.checkIn, search?.checkOut, search?.guests]);

  useEffect(() => {
    if (!open || !room || !search) return;
    const pending = loadCheckoutSession(room.id, search.checkIn, search.checkOut);
    if (pending) setCheckoutMeta(pending);
  }, [open, room, search]);

  useEffect(() => {
    if (fullName && !cardHolder) setCardHolder(fullName);
  }, [fullName, cardHolder]);

  useEffect(() => {
    if (!open) return;

    fetch(apiPath("/api/payments/config"))
      .then((response) => response.json())
      .then((data: PaymentConfigResponse) => {
        setPaymentConfig(data);
        if (data.bankTransfer?.enabled) {
          setPaymentMethod("bank_transfer");
        } else if (data.online.enabled) {
          setPaymentMethod("online");
        }
      })
      .catch(() =>
        setPaymentConfig({
          currency: "CLP",
          online: {
            enabled: false,
            comingSoon: true,
            provider: "disabled",
            publicKey: null,
            label: "Pago online · Pronto",
          },
          bankTransfer: null,
          notifications: { emailEnabled: false },
        })
      );
  }, [open, step]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 40);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !room || !search) return null;

  const activeRoom = room;
  const activeSearch = search;

  const maxBirthDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  })();

  const bankTransferAvailable = Boolean(paymentConfig?.bankTransfer?.enabled);
  const onlineAvailable = Boolean(paymentConfig?.online.enabled);
  const onlineComingSoon = Boolean(paymentConfig?.online.comingSoon);
  const showPaymentMethodTabs =
    bankTransferAvailable && (onlineAvailable || onlineComingSoon);
  const emailNotificationsEnabled = paymentConfig?.notifications?.emailEnabled ?? false;

  function handleGuestsCountChange(value: number) {
    setGuestsCount(value);
    setFieldErrors((prev) => ({ ...prev, guestsCount: "" }));
    if (checkoutMeta) {
      setCheckoutMeta(null);
      clearCheckoutSession();
    }
  }

  function validateGuestLocally(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (guestsCount < 1 || guestsCount > activeRoom.maxGuests) {
      errors.guestsCount = `Esta habitación admite máximo ${activeRoom.maxGuests} huéspedes.`;
    }
    if (fullName.trim().length < 2) errors.fullName = "Nombre demasiado corto.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Email inválido.";
    if (!isValidChileanPhone(phone)) {
      errors.phone = "Ingresa un móvil chileno válido (+56 9 XXXX XXXX).";
    }
    if (!birthDate || !isValidBirthDate(birthDate)) {
      errors.birthDate = "Fecha de nacimiento inválida.";
    }
    if (documentType === "RUT") {
      if (!rut.trim()) errors.rut = "El RUT es obligatorio.";
      else if (!isValidChileanRut(rut)) errors.rut = "RUT inválido. Verificá el dígito verificador.";
    } else {
      if (!passport.trim()) errors.passport = "El número de pasaporte es obligatorio.";
      else if (!isValidPassport(passport)) {
        errors.passport = "Pasaporte inválido (5 a 20 caracteres alfanuméricos).";
      }
    }
    return errors;
  }

  function validateDetailStep(index: number): Record<string, string> {
    const errors: Record<string, string> = {};
    if (index === 0) {
      if (fullName.trim().length < 2) errors.fullName = "Nombre demasiado corto.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Email inválido.";
      if (!isValidChileanPhone(phone)) {
        errors.phone = "Ingresa un móvil chileno válido (+56 9 XXXX XXXX).";
      }
    } else if (index === 1) {
      if (documentType === "RUT") {
        if (!rut.trim()) errors.rut = "El RUT es obligatorio.";
        else if (!isValidChileanRut(rut)) errors.rut = "RUT inválido. Verificá el dígito verificador.";
      } else {
        if (!passport.trim()) errors.passport = "El número de pasaporte es obligatorio.";
        else if (!isValidPassport(passport)) {
          errors.passport = "Pasaporte inválido (5 a 20 caracteres alfanuméricos).";
        }
      }
      if (!birthDate || !isValidBirthDate(birthDate)) {
        errors.birthDate = "Fecha de nacimiento inválida.";
      }
    } else if (index === 2) {
      if (guestsCount < 1 || guestsCount > activeRoom.maxGuests) {
        errors.guestsCount = `Esta habitación admite máximo ${activeRoom.maxGuests} huéspedes.`;
      }
    }
    return errors;
  }

  function handleDetailBack() {
    setError(null);
    setDetailStep((current) => Math.max(0, current - 1));
  }

  function handleDetailSubmit(event: React.FormEvent) {
    event.preventDefault();

    const stepErrors = validateDetailStep(detailStep);
    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...stepErrors }));
      setError("Revisa los campos marcados antes de continuar.");
      return;
    }

    setError(null);
    if (detailStep < DETAIL_STEP_COUNT - 1) {
      setDetailStep((current) => current + 1);
      return;
    }

    void handleContinueToPayment(event);
  }

  function completeSuccess(data: {
    reservation: {
      confirmationCode: string;
      totalAmount: number;
      paymentStatus: string;
      nights: number;
      room: { name: string; code: string };
    };
    transactionId?: string;
    paymentMethod: PaymentMethod;
    bankTransfer?: BankTransferConfig | null;
  }) {
    onSuccess({
      confirmationCode: data.reservation.confirmationCode,
      checkIn: search!.checkIn,
      checkOut: search!.checkOut,
      totalAmount: data.reservation.totalAmount,
      paymentStatus: data.reservation.paymentStatus,
      roomName: data.reservation.room.name,
      roomCode: data.reservation.room.code,
      guestName: fullName,
      guestEmail: email,
      transactionId: data.transactionId,
      nights: data.reservation.nights,
      paymentMethod: data.paymentMethod,
      bankTransfer: data.bankTransfer ?? undefined,
      emailNotificationsEnabled,
    });
    clearCheckoutSession();
    onClose();
  }

  function storeCheckoutMeta(meta: CheckoutMeta) {
    setCheckoutMeta(meta);
    saveCheckoutSession({
      ...meta,
      roomId: room!.id,
      checkIn: search!.checkIn,
      checkOut: search!.checkOut,
    });
  }

  async function handleContinueToPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!room || !search) return;

    setLoading(true);
    setError(null);
    setFieldErrors({});

    const localErrors = validateGuestLocally();
    if (!acceptedTerms) {
      setError("Debes aceptar los términos y la política de privacidad para continuar.");
      setLoading(false);
      return;
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setError("Revisa los campos marcados antes de continuar.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiPath("/api/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          guestsCount,
          guest: {
            fullName,
            email,
            phone,
            documentType,
            birthDate,
            ...(documentType === "RUT" ? { rut } : { passport }),
          },
          specialRequests: specialRequests || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFieldErrors(zodFieldErrorMap(data.details));
        throw new Error(firstZodErrorMessage(data.details, data.error ?? "No se pudo preparar el pago."));
      }

      storeCheckoutMeta({
        checkoutToken: data.checkoutToken,
        totalAmount: data.quote.totalAmount,
        nights: data.quote.nights,
        pricePerNight: data.quote.pricePerNight,
        holdMinutes: data.holdMinutes,
        holdExpiresAt: data.holdExpiresAt,
      });
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulatedPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!checkoutMeta) return;

    setLoading(true);
    setError(null);

    try {
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        throw new Error("Ingresa el vencimiento con formato MM/AA.");
      }

      const response = await fetch(apiPath("/api/checkout/pay"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutToken: checkoutMeta.checkoutToken,
          provider: "simulated",
          payment: { cardHolder, cardNumber, expiry, cvv },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo completar el pago.");
      }

      completeSuccess({
        reservation: data.reservation,
        transactionId: data.transactionId,
        paymentMethod: "online",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankTransferConfirm() {
    if (!checkoutMeta || !paymentConfig?.bankTransfer) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiPath("/api/checkout/pay"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutToken: checkoutMeta.checkoutToken,
          provider: "bank_transfer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar la transferencia.");
      }

      completeSuccess({
        reservation: data.reservation,
        transactionId: data.transactionId,
        paymentMethod: "bank_transfer",
        bankTransfer: paymentConfig.bankTransfer,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar reserva"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-highlight/35 bg-brand-900 shadow-2xl shadow-accent/10 animate-fade-in-up"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-700/40 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {step === "details"
                ? `Paso ${detailStep + 1} de ${DETAIL_STEP_COUNT + 1} · ${DETAIL_STEP_LABELS[detailStep]}`
                : `Paso ${DETAIL_STEP_COUNT + 1} de ${DETAIL_STEP_COUNT + 1} · Elige cómo pagar`}
            </p>
            <h2 id="booking-title" className="mt-1 text-xl font-bold text-brand-100">
              {room.name}
            </h2>
            <p className="mt-1 text-sm text-brand-500">
              {formatStayRange(search.checkIn, search.checkOut)}
              {(checkoutMeta?.totalAmount ?? room.totalAmount) ? (
                <>
                  {" · "}
                  {formatCurrency(checkoutMeta?.totalAmount ?? room.totalAmount!)}
                  {room.nights ? ` · ${formatNightsLabel(room.nights)}` : ""}
                </>
              ) : null}
            </p>
            {room.description && (
              <p className="mt-2 line-clamp-2 text-xs text-brand-500">{room.description}</p>
            )}
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: DETAIL_STEP_COUNT + 1 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= (step === "details" ? detailStep : DETAIL_STEP_COUNT)
                      ? "bg-accent"
                      : "bg-brand-700/40"
                  )}
                />
              ))}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-700 px-3 py-1 text-sm text-brand-500 hover:bg-brand-800"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {step === "details" ? (
          <form onSubmit={handleDetailSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              {detailStep === 0 && (
                <>
                  {paymentConfig && !emailNotificationsEnabled && (
                    <p className="alert-warning text-xs leading-relaxed">
                      Los correos automáticos no están activos. Al finalizar, guarda tu código de
                      confirmación o consulta tu reserva en <strong>Mi reserva</strong>.
                    </p>
                  )}

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-brand-100">Nombre completo</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                      }}
                      className="input-field"
                      required
                      autoComplete="name"
                      {...fieldA11yProps("booking-err-fullName", fieldErrors.fullName)}
                    />
                    <FieldError id="booking-err-fullName" message={fieldErrors.fullName} />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-brand-100">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      className="input-field"
                      required
                      autoComplete="email"
                      {...fieldA11yProps("booking-err-email", fieldErrors.email)}
                    />
                    <FieldError id="booking-err-email" message={fieldErrors.email} />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-brand-100">
                      Teléfono móvil
                      <InfoTooltip label="Te contactaremos por WhatsApp solo si hay algún cambio en tu reserva." />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(formatChileanPhoneInput(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      className="input-field"
                      autoComplete="tel"
                      placeholder="+56 9 1234 5678"
                      required
                      inputMode="tel"
                      {...fieldA11yProps("booking-err-phone", fieldErrors.phone)}
                    />
                    <FieldError id="booking-err-phone" message={fieldErrors.phone} />
                  </label>
                </>
              )}

              {detailStep === 1 && (
                <>
                  <div className="space-y-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-brand-100">
                      Tipo de documento
                      <InfoTooltip label="Requerido por ley para el registro de huéspedes en el alojamiento." />
                    </span>
                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-brand-700 bg-brand-800 p-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDocumentType("RUT");
                          setPassport("");
                          setError(null);
                        }}
                        className={cn(
                          "min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition",
                          documentType === "RUT"
                            ? "tab-active-accent"
                            : "text-brand-500 hover:bg-brand-800 hover:text-brand-100"
                        )}
                      >
                        RUT chileno
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocumentType("PASSPORT");
                          setRut("");
                          setError(null);
                        }}
                        className={cn(
                          "min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition",
                          documentType === "PASSPORT"
                            ? "tab-active-accent"
                            : "text-brand-500 hover:bg-brand-800 hover:text-brand-100"
                        )}
                      >
                        Pasaporte
                      </button>
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-brand-100">
                      {documentType === "RUT" ? "Número de RUT" : "N° de pasaporte"}
                    </span>
                    {documentType === "RUT" ? (
                      <input
                        type="text"
                        value={rut}
                        onChange={(e) => {
                          setRut(formatRutInput(e.target.value));
                          setFieldErrors((prev) => ({ ...prev, rut: "" }));
                        }}
                        className="input-field"
                        placeholder="12.345.678-9"
                        autoComplete="off"
                        required
                        inputMode="text"
                        {...fieldA11yProps("booking-err-doc", fieldErrors.rut)}
                      />
                    ) : (
                      <input
                        type="text"
                        value={passport}
                        onChange={(e) => {
                          setPassport(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 20)
                          );
                          setFieldErrors((prev) => ({ ...prev, passport: "" }));
                        }}
                        className="input-field font-mono uppercase"
                        placeholder="AB1234567"
                        autoComplete="off"
                        required
                        {...fieldA11yProps("booking-err-doc", fieldErrors.passport)}
                      />
                    )}
                    <FieldError
                      id="booking-err-doc"
                      message={documentType === "RUT" ? fieldErrors.rut : fieldErrors.passport}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-brand-100">
                      Fecha de nacimiento
                      <InfoTooltip label="La usamos para el registro de check-in. Debes ser mayor de edad para reservar." />
                    </span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, birthDate: "" }));
                      }}
                      className="input-field"
                      required
                      max={maxBirthDate}
                      min="1900-01-01"
                      {...fieldA11yProps("booking-err-birthDate", fieldErrors.birthDate)}
                    />
                    <FieldError id="booking-err-birthDate" message={fieldErrors.birthDate} />
                  </label>
                </>
              )}

              {detailStep === 2 && (
                <>
                  <label className="block space-y-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-brand-100">
                      Huéspedes
                      <InfoTooltip
                        label={`Esta habitación admite un máximo de ${activeRoom.maxGuests} ${
                          activeRoom.maxGuests === 1 ? "huésped" : "huéspedes"
                        }.`}
                      />
                    </span>
                    <select
                      value={guestsCount}
                      onChange={(e) => handleGuestsCountChange(Number(e.target.value))}
                      className="input-field"
                      {...fieldA11yProps("booking-err-guests", fieldErrors.guestsCount)}
                    >
                      {Array.from({ length: activeRoom.maxGuests }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>
                          {count} {count === 1 ? "huésped" : "huéspedes"}
                        </option>
                      ))}
                    </select>
                    <FieldError id="booking-err-guests" message={fieldErrors.guestsCount} />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-100">
                        Solicitudes especiales
                        <InfoTooltip label="Cama extra, cuna, llegada tardía, celebración... haremos lo posible por cumplirlas." />
                      </span>
                      <span className="text-xs font-normal text-brand-500">Opcional</span>
                    </span>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="input-field min-h-20 resize-y"
                      rows={2}
                      placeholder="Ej.: llegada después de las 20:00, cama adicional…"
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-brand-700 bg-brand-800/50 p-3 text-sm text-brand-500">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (e.target.checked) setError(null);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                      required
                    />
                    <span>
                      Acepto los{" "}
                      <Link href="/terminos" className="font-semibold text-accent hover:underline" target="_blank">
                        términos y condiciones
                      </Link>{" "}
                      y la{" "}
                      <Link href="/privacidad" className="font-semibold text-accent hover:underline" target="_blank">
                        política de privacidad
                      </Link>
                      .
                    </span>
                  </label>
                </>
              )}
            </div>

            <div className="shrink-0 space-y-3 border-t border-brand-700/50 bg-brand-900 px-5 py-4 sm:px-6">
              {error && <div className="alert-error">{error}</div>}

              <div className="flex gap-3">
                {detailStep > 0 && (
                  <button
                    type="button"
                    onClick={handleDetailBack}
                    disabled={loading}
                    className="btn-secondary w-full"
                  >
                    Atrás
                  </button>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading
                    ? "Verificando..."
                    : detailStep < DETAIL_STEP_COUNT - 1
                      ? "Siguiente"
                      : "Continuar al pago"}
                </button>
              </div>

              <WhatsAppSupport variant="compact" guestName={fullName || undefined} />
            </div>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-3 sm:px-6">
            {paymentConfig && !emailNotificationsEnabled && (
              <p className="alert-warning text-xs leading-relaxed">
                No enviaremos correo de confirmación. Anota tu código al terminar o usa{" "}
                <strong>Mi reserva</strong> para consultarlo después.
              </p>
            )}

            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-brand-500">
              Se confirma al pagar
              <span className="text-brand-700">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-brand-100">
                Política de cancelación
                <InfoTooltip label={CANCELLATION_POLICY} />
              </span>
            </p>

            {checkoutMeta ? (
              <div className="rounded-xl border border-brand-700/70 bg-brand-800/80 px-3 py-2.5 text-xs text-brand-500">
                <div className="flex justify-between gap-3">
                  <span>Desglose</span>
                  <span className="text-right font-medium text-brand-100">
                    {formatCurrency(checkoutMeta.pricePerNight ?? room?.pricePerNight ?? 0)}
                    {" × "}
                    {checkoutMeta.nights ?? room?.nights ?? "—"} noche
                    {(checkoutMeta.nights ?? room?.nights ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-3 border-t border-brand-700/50 pt-1.5">
                  <span className="font-semibold text-brand-100">Total</span>
                  <span className="font-bold text-accent">{formatCurrency(checkoutMeta.totalAmount)}</span>
                </div>
                {checkoutMeta.holdMinutes ? (
                  <p className="mt-2 text-[11px] leading-snug text-amber-900/90">
                    Tienes <strong>{checkoutMeta.holdMinutes} minutos</strong> para completar el pago. Si se
                    vence, tendrás que volver a iniciar la reserva.
                  </p>
                ) : null}
              </div>
            ) : null}

            {showPaymentMethodTabs && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-brand-700 bg-brand-800 p-1.5">
                <button
                  type="button"
                  disabled={onlineComingSoon}
                  onClick={() => {
                    if (onlineComingSoon) return;
                    setPaymentMethod("online");
                    setError(null);
                  }}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-sm font-semibold transition",
                    onlineComingSoon && "cursor-not-allowed opacity-60",
                    !onlineComingSoon && paymentMethod === "online"
                      ? "tab-active-accent"
                      : "text-brand-500 hover:bg-brand-800 hover:text-brand-100"
                  )}
                >
                  <span>Pago online</span>
                  {onlineComingSoon && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-500">
                      Pronto
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("bank_transfer");
                    setError(null);
                  }}
                  className={cn(
                    "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
                    paymentMethod === "bank_transfer"
                      ? "bg-sky-900/15 text-sky-950 ring-1 ring-sky-700/30"
                      : "text-brand-500 hover:bg-brand-800 hover:text-brand-100"
                  )}
                >
                  Transferencia
                </button>
              </div>
            )}

            {onlineComingSoon && bankTransferAvailable && (
              <p className="rounded-xl border border-brand-700/70 bg-brand-800/70 px-3 py-2.5 text-xs leading-relaxed text-brand-500">
                El pago con tarjeta estará disponible <strong className="text-brand-100">pronto</strong>.
                Por ahora puedes confirmar tu reserva por transferencia bancaria.
              </p>
            )}

            {paymentMethod === "bank_transfer" && paymentConfig?.bankTransfer && checkoutMeta ? (
              <BankTransferCheckout
                config={paymentConfig.bankTransfer}
                totalAmount={checkoutMeta.totalAmount}
                guestEmail={email}
                loading={loading}
                onConfirm={handleBankTransferConfirm}
                showConfirmButton={false}
              />
            ) : paymentConfig?.online.provider === "mercadopago" &&
              paymentConfig.online.enabled &&
              paymentConfig.online.publicKey &&
              checkoutMeta ? (
              <>
                <p className="alert-success text-xs">
                  Pago seguro con Mercado Pago. Tarjeta, débito y más métodos disponibles.
                </p>
                <MercadoPagoCheckout
                  publicKey={paymentConfig.online.publicKey}
                  checkoutToken={checkoutMeta.checkoutToken}
                  amount={checkoutMeta.totalAmount}
                  email={email}
                  onSuccess={(result) => {
                    completeSuccess({
                      reservation: result.reservation,
                      transactionId: result.transactionId,
                      paymentMethod: "online",
                    });
                  }}
                  onError={(message) => setError(message)}
                />
              </>
            ) : paymentConfig?.online.provider === "simulated" &&
              paymentConfig.online.enabled &&
              checkoutMeta ? (
              <form
                id="simulated-payment-form"
                onSubmit={handleSimulatedPayment}
                className="space-y-3"
              >
                {demoUi && (
                  <p className="alert-warning text-xs">Modo demo: tarjeta simulada.</p>
                )}

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-brand-100">Titular de la tarjeta</span>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="input-field"
                    required
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-brand-100">Número de tarjeta</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ""))}
                    className="input-field font-mono"
                    placeholder="4242 4242 4242 4242"
                    required
                    maxLength={19}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-brand-100">Vencimiento</span>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                      className="input-field font-mono"
                      placeholder="MM/AA"
                      pattern="\d{2}/\d{2}"
                      required
                      maxLength={5}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-brand-100">CVV</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                      className="input-field font-mono"
                      required
                      maxLength={4}
                    />
                  </label>
                </div>

              </form>
            ) : paymentConfig && !onlineAvailable && !bankTransferAvailable ? (
              <div className="alert-error space-y-2 text-sm">
                <p className="font-semibold">No hay métodos de pago habilitados.</p>
                <p>
                  Contactá al hotel por WhatsApp para completar la reserva o intentá nuevamente
                  más tarde.
                </p>
              </div>
            ) : (
              <div className="glass-panel h-32 animate-pulse" />
            )}

            {error && <div className="alert-error">{error}</div>}
            </div>

            <div className="shrink-0 space-y-2.5 border-t border-brand-700/50 bg-brand-900 px-5 py-4 sm:px-6">
              {paymentMethod === "bank_transfer" && paymentConfig?.bankTransfer && checkoutMeta ? (
                <button
                  type="button"
                  onClick={handleBankTransferConfirm}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? "Registrando reserva..." : "Confirmar reserva con transferencia"}
                </button>
              ) : paymentConfig?.online.provider === "simulated" &&
                paymentConfig.online.enabled &&
                checkoutMeta ? (
                <button
                  type="submit"
                  form="simulated-payment-form"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? "Procesando pago..." : `Pagar ${formatCurrency(checkoutMeta.totalAmount)}`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setError(null);
                }}
                className="btn-secondary w-full"
                disabled={loading}
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
