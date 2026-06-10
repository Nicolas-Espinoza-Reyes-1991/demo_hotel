export type GuestDocumentType = "RUT" | "PASSPORT";

export function cleanRut(value: string): string {
  return value.replace(/\./g, "").replace(/-/g, "").replace(/\s/g, "").toUpperCase();
}

/** Formatea RUT chileno mientras se escribe (ej. 18.026.553-8). */
export function formatRutInput(value: string): string {
  const cleaned = cleanRut(value).slice(0, 9);
  if (!cleaned) return "";

  const body = cleaned.length > 7 ? cleaned.slice(0, -1) : cleaned;
  const dv = cleaned.length > 7 ? cleaned.slice(-1) : "";

  let formatted = "";
  const reversed = body.replace(/\D/g, "").split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) formatted = `.${formatted}`;
    formatted = `${reversed[i]}${formatted}`;
  }

  if (!dv) return formatted;
  return `${formatted}-${dv}`;
}

export function computeRutVerifier(body: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

export function isValidChileanRut(value: string): boolean {
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body) || body.length < 7 || body.length > 8) return false;
  if (!/^[0-9K]$/.test(dv)) return false;

  return computeRutVerifier(body) === dv;
}

export function normalizeRut(value: string): string {
  const cleaned = cleanRut(value);
  if (!cleaned) return "";
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return formatRutInput(`${body}${dv}`);
}

export function cleanPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normaliza teléfono móvil chileno a +569XXXXXXXX. */
export function normalizeChileanPhone(value: string): string {
  let digits = cleanPhoneDigits(value);
  if (!digits) return "";

  if (digits.startsWith("56")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 8) {
    digits = `9${digits}`;
  }
  if (!digits.startsWith("9") || digits.length !== 9) {
    return value.trim();
  }

  return `+56${digits}`;
}

/** Máscara visual: +56 9 1234 5678 */
export function formatChileanPhoneInput(value: string): string {
  let digits = cleanPhoneDigits(value);

  if (digits.startsWith("56")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!digits.startsWith("9") && digits.length > 0) {
    digits = `9${digits}`;
  }

  digits = digits.slice(0, 9);

  if (digits.length === 0) return "";
  if (digits.length <= 1) return `+56 ${digits}`;
  if (digits.length <= 5) return `+56 ${digits[0]} ${digits.slice(1)}`;
  return `+56 ${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
}

export function isValidChileanPhone(value: string): boolean {
  const normalized = normalizeChileanPhone(value);
  return /^\+569\d{8}$/.test(normalized);
}

export function normalizePassport(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidPassport(value: string): boolean {
  const normalized = normalizePassport(value);
  return /^[A-Z0-9]{5,20}$/.test(normalized);
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return false;
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (date >= today) return false;

  const minDate = new Date("1900-01-01T12:00:00.000Z");
  return date >= minDate;
}

export function formatBirthDateForDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
