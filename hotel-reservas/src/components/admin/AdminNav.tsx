"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminNavId =
  | "calendar"
  | "reservations"
  | "rooms"
  | "blocks"
  | "experiences"
  | "menu"
  | "reports"
  | "users";

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
  group: "operation" | "growth" | "system";
  adminOnly?: boolean;
  comingSoon?: boolean;
  Icon: (props: IconProps) => ReactNode;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "calendar",
    label: "Calendario",
    description: "Ocupación por fechas",
    group: "operation",
    Icon: IconCalendar,
  },
  {
    id: "reservations",
    label: "Reservas",
    description: "Gestión operativa",
    group: "operation",
    Icon: IconReservations,
  },
  {
    id: "rooms",
    label: "Habitaciones",
    description: "Catálogo y precios",
    group: "operation",
    Icon: IconRooms,
  },
  {
    id: "blocks",
    label: "Bloqueos",
    description: "Cierres de disponibilidad",
    group: "operation",
    Icon: IconBlocks,
  },
  {
    id: "experiences",
    label: "Experiencias",
    description: "Turismo y partners",
    group: "growth",
    comingSoon: true,
    Icon: IconExperiences,
  },
  {
    id: "menu",
    label: "Carta",
    description: "Comida, bar y productos",
    group: "growth",
    comingSoon: true,
    Icon: IconMenu,
  },
  {
    id: "reports",
    label: "Reportes",
    description: "Reservas e ingresos",
    group: "growth",
    comingSoon: true,
    Icon: IconReports,
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

export const ADMIN_NAV_GROUPS: { id: AdminNavItem["group"]; label: string }[] = [
  { id: "operation", label: "Operación" },
  { id: "growth", label: "Servicios" },
  { id: "system", label: "Sistema" },
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl text-left transition duration-200",
        compact ? "px-3 py-2.5" : "px-3.5 py-3",
        active
          ? "bg-gradient-to-r from-[#6b4f3a] to-[#3d2b1f] text-[#fffdf9] shadow-[0_12px_28px_-14px_rgba(61,43,31,0.65)]"
          : "text-[#f0e6d8]/88 hover:bg-white/10 hover:text-white"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
          active ? "bg-white/15 text-[#e8c99a]" : "bg-white/8 text-[#d4b896] group-hover:bg-white/12"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block text-sm font-semibold tracking-wide">{item.label}</span>
          {item.comingSoon && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                active ? "bg-[#e8c99a]/25 text-[#e8c99a]" : "bg-[#e8c99a]/15 text-[#e8c99a]/90"
              )}
            >
              Pronto
            </span>
          )}
        </span>
        {!compact && (
          <span className={cn("mt-0.5 block text-[11px] leading-snug", active ? "text-white/70" : "text-[#c9b8a4]/75")}>
            {item.description}
          </span>
        )}
      </span>
      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8c99a]" aria-hidden />}
    </button>
  );
}
