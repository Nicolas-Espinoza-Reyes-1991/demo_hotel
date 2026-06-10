/** URL de la landing / sitio institucional (fuera del módulo de reservas). */
export function getWebsiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WEBSITE_URL?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5501/propuesta-7-casona-futrono.html";
  }

  return "https://hotelboyehouse.cl";
}
