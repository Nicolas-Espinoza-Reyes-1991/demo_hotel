"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminReservationsPanel, AdminRoomBlocksPanel, AdminRoomsPanel } from "@/components/AdminManagePanel";
import { AdminComingSoonPanel } from "@/components/admin/AdminComingSoonPanel";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import type { AdminNavId } from "@/components/admin/AdminNav";
import { apiPath } from "@/lib/api-path";
import type { StaffRoleCode } from "@/types/staff";

const COMING_SOON: Partial<
  Record<AdminNavId, { title: string; summary: string; highlights: string[] }>
> = {
  experiences: {
    title: "Experiencias y turismo",
    summary:
      "Publicá cabalgatas, paseos en bote y actividades de partners para que tus huéspedes las descubran y consulten fácil.",
    highlights: [
      "Carga de actividades con precio, duración y contacto del operador",
      "Vitrina pública para huéspedes con consulta por WhatsApp",
      "Gestión de partners y disponibilidad desde el panel",
    ],
  },
  menu: {
    title: "Carta del hotel",
    summary:
      "Armá una carta digital de comida, licores y productos para mostrar a tus clientes y facilitar pedidos o consultas.",
    highlights: [
      "Catálogo por categorías: comida, bar, snacks y más",
      "Precios, fotos y disponibilidad en tiempo real",
      "Carta visible para huéspedes con contacto directo al hotel",
    ],
  },
  reports: {
    title: "Reportes y gráficos",
    summary:
      "Visualizá reservas, ocupación e ingresos recaudados para tomar mejores decisiones de gestión.",
    highlights: [
      "KPIs de reservas del mes, ocupación e ingresos confirmados",
      "Gráficos por período y ranking de habitaciones",
      "Exportación de datos para control interno",
    ],
  },
};

export default function AdminPage() {
  const [tab, setTab] = useState<AdminNavId>("calendar");
  const [calendarKey, setCalendarKey] = useState(0);
  const [role, setRole] = useState<StaffRoleCode | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const refreshSession = useCallback(() => {
    fetch(apiPath("/api/auth/session"))
      .then((response) => response.json())
      .then((data) => {
        if (data.authenticated && (data.role === "ADMIN" || data.role === "STAFF")) {
          setRole(data.role);
          setUsername(data.username ?? null);
        } else {
          setRole(null);
          setUsername(null);
        }
      })
      .catch(() => {
        setRole(null);
        setUsername(null);
      });
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const isAdmin = role === "ADMIN";

  function selectTab(next: AdminNavId) {
    if (next === "users" && !isAdmin) return;
    setTab(next);
    if (next === "calendar") {
      setCalendarKey((value) => value + 1);
    }
  }

  useEffect(() => {
    if (tab === "users" && role === "STAFF") {
      setTab("calendar");
    }
  }, [tab, role]);

  const comingSoon = COMING_SOON[tab];

  return (
    <AdminShell
      activeTab={tab}
      onSelectTab={selectTab}
      role={role}
      username={username}
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
    >
      {tab === "calendar" && <AdminCalendar key={calendarKey} />}
      {tab === "reservations" && <AdminReservationsPanel />}
      {tab === "rooms" && <AdminRoomsPanel />}
      {tab === "blocks" && <AdminRoomBlocksPanel />}
      {tab === "users" && isAdmin && <AdminUsersPanel onUsersChanged={refreshSession} />}
      {comingSoon && (
        <AdminComingSoonPanel
          title={comingSoon.title}
          summary={comingSoon.summary}
          highlights={comingSoon.highlights}
        />
      )}
    </AdminShell>
  );
}
