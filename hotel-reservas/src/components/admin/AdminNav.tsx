"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminNavId =
  | "calendar"
  | "reservations"
  | "rooms"
  | "rates"
  | "blocks"
  | "experiences"
  | "menu"
  | "reports"
  | "users";

export type AdminNavGroupId = "daily" | "inventory" | "insights" | "services" | "system";

type IconProps = { className?: string };

function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 14h3M13 14h3M8 17h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconReservations({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4h8a2 2 0 0 1 2 2v14l-3-1.5L12 20l-3-1.5L6 20V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 9h6M9 13h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconRooms({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V9.5L12 4l8 5.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconBlocks({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14 16.5h5M16.5 14v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconRates({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V7a2 2 0 0 1 2-2h8.5L20 9.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 5v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8 13h8M8 16.5h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconExperiences({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18c2-4 4.5-7 8-9 3.5 2 6 5 8 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9V4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M9.5 6.5 12 4l2.5 2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 19h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconReports({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19V9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 19V5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M15 19v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M20 19V8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M3 19h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 19c.8-3 2.9-4.5 5.5-4.5S13.7 16 14.5 19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 14.5c2 .2 3.6 1.3 4.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export type AdminNavItem = {
  id: AdminNavId;
  label: string;
  description: string;
  group: AdminNavGroupId;
  adminOnly?: boolean;
  comingSoon?: boolean;
  Icon: (props: IconProps) => ReactNode;
};

/** Orden de trabajo real en recepción: día a día → inventario → números → extras → accesos */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "calendar",
    label: "Calendario",
    description: "Ocupación del día",
    group: "daily",
    Icon: IconCalendar,
  },
  {
    id: "reservations",
    label: "Reservas",
    description: "Huéspedes y pagos",
    group: "daily",
    Icon: IconReservations,
  },
  {
    id: "rooms",
    label: "Habitaciones",
    description: "Catálogo y fotos",
    group: "inventory",
    Icon: IconRooms,
  },
  {
    id: "rates",
    label: "Tarifas",
    description: "Temporadas y festivos",
    group: "inventory",
    Icon: IconRates,
  },
  {
    id: "blocks",
    label: "Bloqueos",
    description: "Cierres de fechas",
    group: "inventory",
    Icon: IconBlocks,
  },
  {
    id: "reports",
    label: "Reportes",
    description: "Ingresos y ocupación",
    group: "insights",
    Icon: IconReports,
  },
  {
    id: "experiences",
    label: "Experiencias",
    description: "Turismo y partners",
    group: "services",
    Icon: IconExperiences,
  },
  {
    id: "menu",
    label: "Carta",
    description: "Comida y bar",
    group: "services",
    Icon: IconMenu,
  },
  {
    id: "users",
    label: "Usuarios",
    description: "Accesos al panel",
    group: "system",
    adminOnly: true,
    Icon: IconUsers,
  },
];

export const ADMIN_NAV_GROUPS: {
  id: AdminNavGroupId;
  label: string;
  muted?: boolean;
}[] = [
  { id: "daily", label: "Operación diaria" },
  { id: "inventory", label: "Inventario" },
  { id: "insights", label: "Análisis" },
  { id: "services", label: "Servicios" },
  { id: "system", label: "Accesos" },
];

export function AdminNavButton({
  item,
  active,
  onClick,
  compact = false,
}: {
  item: AdminNavItem;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const { Icon } = item;
  const soon = Boolean(item.comingSoon);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "admin-nav-item group relative flex w-full items-center gap-2.5 rounded-xl text-left transition duration-150",
        compact ? "px-2.5 py-2" : "px-2.5 py-2",
        soon && !active && "opacity-55",
        active
          ? "bg-white/12 text-white shadow-[inset_3px_0_0_0_#e8c99a]"
          : "text-[#f0e6d8]/78 hover:bg-white/[0.07] hover:text-white"
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
          active ? "bg-[#e8c99a]/18 text-[#e8c99a]" : "text-[#d4b896]/85 group-hover:text-[#e8c99a]"
        )}
      >
        <Icon className="h-[1.15rem] w-[1.15rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("block truncate text-[13px] font-semibold tracking-wide", active && "text-white")}>
            {item.label}
          </span>
          {soon && (
            <span
              className={cn(
                "shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase tracking-wider",
                active ? "bg-[#e8c99a]/20 text-[#e8c99a]" : "bg-white/8 text-[#c9b8a4]/90"
              )}
            >
              Pronto
            </span>
          )}
        </span>
        {!compact && active && (
          <span className="mt-0.5 block truncate text-[10px] leading-snug text-white/55">{item.description}</span>
        )}
      </span>
    </button>
  );
}
