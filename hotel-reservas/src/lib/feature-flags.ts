/**
 * Feature flags de módulos opcionales (Carta, Experiencias, Reportes).
 *
 * - Sin variable: habilitado en development, bloqueado en production.
 * - Explicitá true/false con NEXT_PUBLIC_FEATURE_* (se hornean en el build).
 *
 * Para habilitar en prod tras pedido del cliente:
 *   NEXT_PUBLIC_FEATURE_MENU=true
 *   NEXT_PUBLIC_FEATURE_EXPERIENCES=true
 *   NEXT_PUBLIC_FEATURE_REPORTS=true
 * y rebuild de la app.
 */

export type OptionalFeature = "menu" | "experiences" | "reports";

const ENV_KEYS: Record<OptionalFeature, string> = {
  menu: "NEXT_PUBLIC_FEATURE_MENU",
  experiences: "NEXT_PUBLIC_FEATURE_EXPERIENCES",
  reports: "NEXT_PUBLIC_FEATURE_REPORTS",
};

function parseFlag(raw: string | undefined): boolean | null {
  if (raw == null || raw.trim() === "") return null;
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return null;
}

/** true = módulo usable; false = mostrar “Pronto” / ocultar en público */
export function isFeatureEnabled(feature: OptionalFeature): boolean {
  const parsed = parseFlag(process.env[ENV_KEYS[feature]]);
  if (parsed != null) return parsed;
  return process.env.NODE_ENV !== "production";
}

export function getOptionalFeatureFlags() {
  return {
    menu: isFeatureEnabled("menu"),
    experiences: isFeatureEnabled("experiences"),
    reports: isFeatureEnabled("reports"),
  };
}
