"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { HOTEL_NAME, LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { AdkinCredit } from "@/components/AdkinCredit";
import { AdminAlertsBell } from "@/components/admin/AdminAlertsBell";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  AdminNavButton,
  type AdminNavId,
} from "@/components/admin/AdminNav";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { StaffRoleCode } from "@/types/staff";

type AdminShellProps = {
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
  onOpenReservationAlert?: (target: { id: string; confirmationCode: string }) => void;
  role: StaffRoleCode | null;
  username: string | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  children: ReactNode;
};

const TITLE: Record<AdminNavId, { title: string; subtitle: string }> = {
  calendar: {
    title: "Calendario",
    subtitle: "Ocupación y disponibilidad por fechas",
  },
  reservations: {
    title: "Reservas",
    subtitle: "Huéspedes, pagos y estadías",
  },
  rooms: {
    title: "Habitaciones",
    subtitle: "Inventario, precios y galería web",
  },
  rates: {
    title: "Tarifas",
    subtitle: "Temporadas, festivos y rangos",
  },
  blocks: {
    title: "Bloqueos",
    subtitle: "Cierres temporales fuera de venta online",
  },
  experiences: {
    title: "Experiencias",
    subtitle: "Turismo, partners y actividades",
  },
  menu: {
    title: "Carta",
    subtitle: "Comida, licores y productos",
  },
  reports: {
    title: "Reportes",
    subtitle: "Elegí el reporte, el período y generá el resultado",
  },
  bank: {
    title: "Transferencia",
    subtitle: "Datos de cuenta para pagos por transferencia",
  },
  users: {
    title: "Usuarios",
    subtitle: "Administradores y trabajadores",
  },
};

export function AdminShell({
  activeTab,
  onSelectTab,
  onOpenReservationAlert,
  role,
  username,
  mobileOpen,
  onMobileOpenChange,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const menuId = useId();
  const isAdmin = role === "ADMIN";
  const navItems = ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
    if (item.id === "menu" && !isFeatureEnabled("menu")) return { ...item, comingSoon: true };
    if (item.id === "experiences" && !isFeatureEnabled("experiences")) {
      return { ...item, comingSoon: true };
    }
    if (item.id === "reports" && !isFeatureEnabled("reports")) return { ...item, comingSoon: true };
    return item;
  });
  const heading = TITLE[activeTab];
  const roleLabel = role === "ADMIN" ? "Administrador" : role === "STAFF" ? "Trabajador" : null;
  const initials = (username ?? "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  useLayoutEffect(() => {
    document.body.classList.add("admin-layout");
    return () => document.body.classList.remove("admin-layout");
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onMobileOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onMobileOpenChange]);

  async function handleLogout() {
    onMobileOpenChange(false);
    await fetch(apiPath("/api/auth/logout"), { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function select(tab: AdminNavId) {
    onSelectTab(tab);
    onMobileOpenChange(false);
  }

  const sidebarBody = (
    <>
      <div className="admin-sidebar__brand border-b border-white/[0.08] px-4 py-4">
        <div className="flex items-center gap-3">
          <Image
            src={publicAssetUrl(LOGO_PATH) ?? apiPath(LOGO_PATH)}
            alt={`Logo de ${HOTEL_NAME}`}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full border border-white/15 bg-white/95 object-contain shadow-md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-bold leading-tight text-white">{HOTEL_NAME}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#e8c99a]/85">
              Administración
            </p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#c9b8a4] transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => onMobileOpenChange(false)}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="admin-sidebar__nav flex-1 overflow-y-auto px-2.5 py-3" aria-label="Secciones del panel">
        {ADMIN_NAV_GROUPS.map((group, groupIndex) => {
          const items = navItems.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <div
              key={group.id}
              className={cn("space-y-0.5", groupIndex > 0 && "mt-4 pt-3 border-t border-white/[0.06]")}
            >
              <p
                className={cn(
                  "mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[0.18em]",
                  group.muted ? "text-[#c9b8a4]/45" : "text-[#c9b8a4]/65"
                )}
              >
                {group.label}
              </p>
              {items.map((item) => (
                <AdminNavButton
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => select(item.id)}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer mt-auto space-y-2.5 border-t border-white/[0.08] p-3">
        {(username || roleLabel) && (
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-2.5 py-2">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8c99a]/20 text-[11px] font-bold text-[#e8c99a]"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white">{username ?? "Usuario"}</p>
              {roleLabel && (
                <p className="truncate text-[10px] text-[#c9b8a4]/75">{roleLabel}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onMobileOpenChange(false)}
            className="flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-2 text-[12px] font-semibold text-[#f0e6d8]/90 transition hover:bg-white/10"
          >
            Ver sitio
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex min-h-9 items-center justify-center rounded-lg bg-[#e8c99a] px-2 text-[12px] font-bold text-[#3d2b1f] transition hover:bg-[#f0d7ad]"
          >
            Salir
          </button>
        </div>
        <AdkinCredit className="!text-[9px] !text-[#c9b8a4]/65 [&_a]:!text-[#e8c99a]/80 [&_a]:hover:!text-white" />
      </div>
    </>
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">{sidebarBody}</aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-[#1a120c]/55 lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => onMobileOpenChange(false)}
          />
          <aside
            id={menuId}
            className="admin-sidebar admin-sidebar--drawer w-[min(18.5rem,88vw)] animate-[adminDrawerIn_220ms_ease-out] lg:hidden"
          >
            {sidebarBody}
          </aside>
        </>
      )}

      <div className="admin-shell__main">
        <header className="admin-topbar sticky top-0 z-40">
          <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-7">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(61,43,31,0.12)] bg-white text-[#5c4033] shadow-sm transition hover:bg-[#faf6f0] lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls={menuId}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => onMobileOpenChange(!mobileOpen)}
            >
              <span className="relative block h-4 w-5" aria-hidden>
                <span
                  className={cn(
                    "absolute left-0 top-0 block h-0.5 w-5 rounded-full bg-current transition",
                    mobileOpen && "top-1.5 rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-current transition",
                    mobileOpen && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-3 block h-0.5 w-5 rounded-full bg-current transition",
                    mobileOpen && "top-1.5 -rotate-45"
                  )}
                />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b5a2b] sm:block">
                {HOTEL_NAME} · Panel
              </p>
              <h1 className="truncate font-display text-xl font-bold leading-tight text-[#2c231c] sm:text-2xl">
                {heading.title}
              </h1>
              <p className="mt-0.5 hidden truncate text-sm text-[#6d5e54] sm:block">{heading.subtitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AdminAlertsBell
                onOpenReservation={(target) => {
                  onOpenReservationAlert?.(target);
                  onMobileOpenChange(false);
                }}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-7">
          <div className="admin-content-panel mx-auto w-full max-w-[96rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
