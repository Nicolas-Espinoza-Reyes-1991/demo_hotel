"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { getWebsiteUrl } from "@/lib/website";
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
import type { StaffRoleCode } from "@/types/staff";

type AdminShellProps = {
  activeTab: AdminNavId;
  onSelectTab: (tab: AdminNavId) => void;
  role: StaffRoleCode | null;
  username: string | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  children: ReactNode;
};

const TITLE: Record<AdminNavId, { title: string; subtitle: string }> = {
  calendar: {
    title: "Calendario",
    subtitle: "Vista de ocupación y disponibilidad del hotel",
  },
  reservations: {
    title: "Reservas",
    subtitle: "Seguimiento de huéspedes, pagos y estadías",
  },
  rooms: {
    title: "Habitaciones",
    subtitle: "Inventario, precios y galería para la web",
  },
  blocks: {
    title: "Bloqueos",
    subtitle: "Cierres temporales fuera de la venta online",
  },
  experiences: {
    title: "Experiencias",
    subtitle: "Turismo, partners y actividades para huéspedes",
  },
  menu: {
    title: "Carta",
    subtitle: "Comida, licores y productos del hotel",
  },
  reports: {
    title: "Reportes",
    subtitle: "Reservas, ocupación e ingresos del hotel",
  },
  users: {
    title: "Usuarios",
    subtitle: "Accesos al panel: administradores y trabajadores",
  },
};

export function AdminShell({
  activeTab,
  onSelectTab,
  role,
  username,
  mobileOpen,
  onMobileOpenChange,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const menuId = useId();
  const websiteUrl = getWebsiteUrl();
  const isAdmin = role === "ADMIN";
  const navItems = ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const heading = TITLE[activeTab];
  const roleLabel = role === "ADMIN" ? "Administrador" : role === "STAFF" ? "Trabajador" : null;

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
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="flex items-center gap-3" onClick={() => onMobileOpenChange(false)}>
          <img
            src={publicAssetUrl(LOGO_PATH) ?? apiPath(LOGO_PATH)}
            alt={HOTEL_NAME}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border border-white/15 bg-white/95 object-contain shadow-lg"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold leading-tight text-white">{HOTEL_NAME}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8c99a]/90">
              Panel de gestión
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Secciones del panel">
        {ADMIN_NAV_GROUPS.map((group) => {
          const items = navItems.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="space-y-1.5">
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9b8a4]/70">
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

      <div className="mt-auto space-y-3 border-t border-white/10 p-4">
        <a
          href={websiteUrl}
          className="flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 text-sm font-semibold text-[#f0e6d8] transition hover:bg-white/10"
        >
          Ver sitio web
        </a>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-10 w-full items-center justify-center rounded-xl bg-[#e8c99a] px-3 text-sm font-bold text-[#3d2b1f] transition hover:bg-[#f0d7ad]"
        >
          Cerrar sesión
        </button>
        <AdkinCredit className="!text-[10px] !text-[#c9b8a4]/80 [&_a]:!text-[#e8c99a] [&_a]:hover:!text-white" />
      </div>
    </>
  );

  return (
    <div className="admin-shell">
      {/* Desktop sidebar */}
      <aside className="admin-sidebar">{sidebarBody}</aside>

      {/* Mobile drawer */}
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
            className="admin-sidebar admin-sidebar--drawer w-[min(20rem,88vw)] animate-[adminDrawerIn_220ms_ease-out] lg:hidden"
          >
            {sidebarBody}
          </aside>
        </>
      )}

      <div className="admin-shell__main">
        <header className="admin-topbar sticky top-0 z-40">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-5 lg:px-7">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(61,43,31,0.12)] bg-white text-[#5c4033] shadow-sm transition hover:bg-[#faf6f0] lg:hidden"
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
                La Casona · Administración
              </p>
              <h1 className="truncate font-display text-xl font-bold leading-tight text-[#2c231c] sm:text-2xl">
                {heading.title}
              </h1>
              <p className="mt-0.5 hidden truncate text-sm text-[#6d5e54] sm:block">{heading.subtitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AdminAlertsBell onOpenReservation={() => select("reservations")} />
              {(username || roleLabel) && (
                <span className="hidden rounded-full border border-[#d4b896]/70 bg-[#faf6f0] px-3 py-1 text-[11px] font-bold text-[#5c4033] sm:inline-flex">
                  {username}
                  {roleLabel ? ` · ${roleLabel}` : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-t border-[rgba(61,43,31,0.06)] px-3 py-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  activeTab === item.id
                    ? "bg-[#3d2b1f] text-white shadow-sm"
                    : "bg-white text-[#6d5e54] ring-1 ring-[rgba(61,43,31,0.1)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-7">
          <div className="admin-content-panel mx-auto w-full max-w-[96rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
