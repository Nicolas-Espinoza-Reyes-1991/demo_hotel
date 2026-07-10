"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { getWebsiteUrl } from "@/lib/website";
import { showDemoUi } from "@/lib/app-ui";
import { HOTEL_NAME, HOTEL_TAGLINE, LOGO_PATH } from "@/lib/brand";

type NavItem = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  onClick?: () => void;
  active?: boolean;
  variant?: "default" | "accent" | "admin";
};

function navItemClass(active: boolean, variant: NavItem["variant"] = "default", mobile = false) {
  if (active && variant === "accent") return "tab-active-accent";
  if (active && variant === "admin") return "tab-active-admin";
  if (active) return "tab-active-accent";
  if (mobile) return "text-accent hover:bg-brand-800/60";
  return "text-brand-600 hover:bg-brand-800/45 hover:text-accent";
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const [username, setUsername] = useState<string | null>(null);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminArea = pathname.startsWith("/admin");
  const websiteUrl = getWebsiteUrl();
  const demoUi = showDemoUi();

  useEffect(() => {
    if (!isAdminArea) {
      setUsername(null);
      setRoleLabel(null);
      return;
    }

    fetch(apiPath("/api/auth/session"))
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated) {
          setUsername(data.username);
          setRoleLabel(
            data.role === "ADMIN" ? "Admin" : data.role === "STAFF" ? "Trabajador" : null
          );
        }
      })
      .catch(() => {
        setUsername(null);
        setRoleLabel(null);
      });
  }, [isAdminArea, pathname]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("app-nav-open", mobileOpen);
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.classList.remove("app-nav-open");
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleLogout() {
    setMobileOpen(false);
    await fetch(apiPath("/api/auth/logout"), { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navItems: NavItem[] = [
    {
      key: "web",
      label: "Volver al sitio web",
      href: websiteUrl,
      external: true,
    },
    {
      key: "reserve",
      label: "Reservar",
      href: "/",
      active: pathname === "/",
      variant: "accent",
    },
    {
      key: "lookup",
      label: "Mi reserva",
      href: "/mi-reserva",
      active: pathname === "/mi-reserva",
      variant: "accent",
    },
  ];

  if (demoUi || isAdminArea) {
    navItems.push({
      key: "admin",
      label: "Admin",
      href: "/admin",
      active: isAdminArea,
      variant: "admin",
    });
  }

  if (isAdminArea && username) {
    navItems.push({
      key: "logout",
      label: roleLabel ? `Salir (${roleLabel})` : "Salir",
      href: "#",
      onClick: () => void handleLogout(),
    });
  }

  function renderNavLink(item: NavItem, mobile = false) {
    const classes = cn(
      mobile
        ? "flex min-h-12 w-full items-center rounded-xl px-4 py-3 text-base font-semibold transition"
        : "flex min-h-11 w-full items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition md:w-auto md:min-h-0 md:rounded-lg md:px-3 md:py-2 md:font-medium",
      navItemClass(Boolean(item.active), item.variant, mobile)
    );

    if (item.onClick) {
      return (
        <button key={item.key} type="button" onClick={item.onClick} className={classes}>
          {item.label}
        </button>
      );
    }

    if (item.external) {
      return (
        <a key={item.key} href={item.href} className={classes} onClick={() => setMobileOpen(false)}>
          {item.label}
        </a>
      );
    }

    return (
      <Link key={item.key} href={item.href} className={classes} onClick={() => setMobileOpen(false)}>
        {item.label}
      </Link>
    );
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          mobileOpen
            ? "border-brand-600/20 bg-white/97 shadow-md backdrop-blur-xl"
            : isScrolled
              ? "border-[rgba(61,43,31,0.09)] bg-white/92 shadow-[0_10px_32px_rgba(61,43,31,0.06)] backdrop-blur-xl"
              : "border-[rgba(61,43,31,0.07)] bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <img
              src={publicAssetUrl(LOGO_PATH) ?? apiPath(LOGO_PATH)}
              alt={HOTEL_NAME}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain drop-shadow-md"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-accent">{HOTEL_NAME}</p>
              <p className="truncate text-[11px] text-brand-600">{HOTEL_TAGLINE}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          <button
            type="button"
            className={cn(
              "relative z-[60] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition md:hidden",
              mobileOpen
                ? "border-brand-600/25 bg-white text-accent"
                : "border-brand-600/20 bg-white/80 text-accent hover:bg-white"
            )}
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">{mobileOpen ? "Cerrar menú" : "Abrir menú"}</span>
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
        </div>
      </header>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[#0c1814]/50 md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            id={menuId}
            aria-label="Menú móvil"
            className="fixed inset-x-0 bottom-0 top-[3.75rem] z-50 overflow-y-auto border-t border-brand-600/15 bg-white px-4 py-4 shadow-2xl md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {navItems.map((item) => renderNavLink(item, true))}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
