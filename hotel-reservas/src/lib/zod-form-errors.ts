type ZodFlatten = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Nombre completo",
  email: "Email",
  phone: "Teléfono",
  rut: "RUT",
  passport: "Pasaporte",
  birthDate: "Fecha de nacimiento",
  checkIn: "Fecha de entrada",
  checkOut: "Fecha de salida",
  guest: "Datos del huésped",
};

function labelForField(path: string): string {
  const key = path.split(".").pop() ?? path;
  return FIELD_LABELS[key] ?? key;
}

/** Primer mensaje legible desde flatten de Zod. */
export function firstZodErrorMessage(details: unknown, fallback = "Revisá los datos ingresados."): string {
  if (!details || typeof details !== "object") return fallback;
  const flat = details as ZodFlatten;

  if (flat.formErrors?.length) return flat.formErrors[0]!;

  const fieldErrors = flat.fieldErrors ?? {};
  for (const [path, messages] of Object.entries(fieldErrors)) {
    const msg = messages?.[0];
    if (!msg) continue;
    if (path === "guest" || path.startsWith("guest.")) {
      const guestField = path.replace(/^guest\./, "");
      return `${labelForField(guestField)}: ${msg}`;
    }
    return `${labelForField(path)}: ${msg}`;
  }

  return fallback;
}

/** Mapa campo → mensaje para formularios. */
export function zodFieldErrorMap(details: unknown): Record<string, string> {
  const map: Record<string, string> = {};
  if (!details || typeof details !== "object") return map;

  const fieldErrors = (details as ZodFlatten).fieldErrors ?? {};
  for (const [path, messages] of Object.entries(fieldErrors)) {
    const msg = messages?.[0];
    if (!msg) continue;

    if (path.startsWith("guest.")) {
      map[path.replace(/^guest\./, "")] = msg;
    } else {
      map[path] = msg;
    }
  }

  return map;
}
