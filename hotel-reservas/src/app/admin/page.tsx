"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminReservationsPanel, AdminRoomBlocksPanel, AdminRoomsPanel } from "@/components/AdminManagePanel";
import { cn } from "@/lib/utils";

type AdminTab = "calendar" | "reservations" | "rooms" | "blocks";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "calendar", label: "Calendario" },
  { id: "reservations", label: "Reservas" },
  { id: "rooms", label: "Habitaciones" },
  { id: "blocks", label: "Bloqueos" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("calendar");
  const [calendarKey, setCalendarKey] = useState(0);

  function selectTab(next: AdminTab) {
    setTab(next);
    if (next === "calendar") {
      setCalendarKey((value) => value + 1);
    }
  }

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="rounded-3xl border border-white/55 bg-brand-900/58 p-4 shadow-[0_22px_58px_-22px_rgba(15,23,42,0.38)] backdrop-blur-[2px] sm:p-6 lg:p-8">
        <section className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Panel administrativo
          </p>
          <h1 className="text-3xl font-bold text-brand-100 sm:text-4xl">Gestión del hotel</h1>
          <p className="max-w-2xl text-sm text-brand-500">
            Calendario de ocupación, cambio manual de estados de reservas y habitaciones.
          </p>
        </section>

        <div className="admin-toolbar mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                "min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:min-h-10 sm:px-4",
                tab === item.id
                  ? "tab-active-admin"
                  : "text-brand-500 hover:bg-white/55 hover:text-brand-100"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "calendar" && <AdminCalendar key={calendarKey} />}
        {tab === "reservations" && <AdminReservationsPanel />}
        {tab === "rooms" && <AdminRoomsPanel />}
        {tab === "blocks" && <AdminRoomBlocksPanel />}
        </div>
      </main>
    </>
  );
}
