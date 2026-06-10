/** Fechas futuras estables en UTC (mediodía) para evitar fallos por "hoy" o husos horarios. */
export function futureDateOnly(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function utcNoon(dateOnly: string): Date {
  return new Date(`${dateOnly}T12:00:00.000Z`);
}
