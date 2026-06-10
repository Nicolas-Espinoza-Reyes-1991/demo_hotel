"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getWebsiteUrl } from "@/lib/website";
import { showDemoUi } from "@/lib/app-ui";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isAdminArea = pathname.startsWith("/admin");
  const websiteUrl = getWebsiteUrl();
  const demoUi = showDemoUi();

  useEffect(() => {
    if (!isAdminArea) {
      setUsername(null);
      return;
    }

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated) setUsername(data.username);
      })
      .catch(() => setUsername(null));
  }, [isAdminArea, pathname]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        isScrolled
          ? "border-white/70 bg-brand-900/72 shadow-[0_14px_36px_-16px_rgba(15,23,42,0.62)] backdrop-blur-xl"
          : "border-white/55 bg-brand-900/48 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.5)] backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-accent/25">
            <Image src="/logo-bh.png" alt="Hotel Boye House" fill sizes="36px" className="object-cover" priority />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-100">Hotel Boye House</p>
            <p className="text-[11px] text-brand-500">Futrono · Reservas</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <a
            href={websiteUrl}
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-white/45 hover:text-brand-100"
          >
            <span className="sm:hidden">← Web</span>
            <span className="hidden sm:inline">← Volver al sitio web</span>
          </a>
          <Link
            href="/"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              pathname === "/"
                ? "tab-active-accent"
                : "text-brand-500 hover:bg-white/45 hover:text-brand-100"
            )}
          >
            Reservar
          </Link>
          <Link
            href="/mi-reserva"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              pathname === "/mi-reserva"
                ? "tab-active-accent"
                : "text-brand-500 hover:bg-white/45 hover:text-brand-100"
            )}
          >
            Mi reserva
          </Link>
          {(demoUi || isAdminArea) && (
            <Link
              href="/admin"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                isAdminArea
                  ? "tab-active-admin"
                  : "text-brand-500 hover:bg-white/45 hover:text-brand-100"
              )}
            >
              Admin
            </Link>
          )}
          {isAdminArea && username && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-white/45 hover:text-brand-100"
            >
              Salir
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
