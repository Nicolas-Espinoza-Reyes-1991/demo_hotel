"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminReservationsPanel, AdminRoomBlocksPanel, AdminRoomsPanel } from "@/components/AdminManagePanel";
import { ADMIN_MODULE_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";

type AdminTab = "calendar" | "reservations" | "rooms" | "blocks";

const TABS: { id: AdminTab; label: string; help: string }[] = [
  { id: "calendar", label: "Calendario", help: ADMIN_MODULE_HELP.calendar },
  { id: "reservations", label: "Reservas", help: ADMIN_MODULE_HELP.reservations },
  { id: "rooms", label: "Habitaciones", help: ADMIN_MODULE_HELP.rooms },
  { id: "blocks", label: "Bloqueos", help: ADMIN_MODULE_HELP.blocks },
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

      <main className="mx-auto w-full max-w-[96rem] px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="rounded-3xl border border-white/55 bg-brand-900/58 p-3 shadow-[0_22px_58px_-22px_rgba(15,23,42,0.38)] backdrop-blur-[2px] sm:p-4 lg:p-5">
        <header className="mb-3 flex flex-col gap-2.5 border-b border-brand-700/35 pb-3 sm:mb-4 sm:gap-4 sm:pb-3.5">
          <div className="min-w-0">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-gold sm:block">
              Panel administrativo
            </p>
            <AdminHintLabel
              as="h1"
              hint={ADMIN_MODULE_HELP.panel}
              className="text-lg font-bold leading-tight text-brand-100 sm:text-2xl"
            >
              Gestión del hotel
            </AdminHintLabel>
          </div>

          <nav
            className="admin-toolbar -mx-1 flex w-full max-w-full gap-1 overflow-x-auto p-0.5 [scrollbar-width:none] sm:mx-0 sm:inline-flex sm:w-auto sm:flex-wrap sm:overflow-visible sm:self-start [&::-webkit-scrollbar]:hidden"
            aria-label="Secciones del panel"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={cn(
                  "min-h-9 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition sm:min-h-9 sm:px-3.5 sm:text-sm",
                  tab === item.id
                    ? "tab-active-admin"
                    : "text-brand-500 hover:bg-white/55 hover:text-brand-100"
                )}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {item.label}
                  <span className="hidden sm:inline">
                    <InfoTooltip label={item.help} variant="accent" stopPropagation />
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </header>

        {tab === "calendar" && <AdminCalendar key={calendarKey} />}
        {tab === "reservations" && <AdminReservationsPanel />}
        {tab === "rooms" && <AdminRoomsPanel />}
        {tab === "blocks" && <AdminRoomBlocksPanel />}
        </div>
      </main>
    </>
  );
}
