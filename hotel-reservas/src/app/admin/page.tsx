"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminReservationsPanel, AdminRoomBlocksPanel, AdminRoomsPanel } from "@/components/AdminManagePanel";
import { AdminPriceRulesPanel } from "@/components/admin/AdminPriceRulesPanel";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";
import { AdminComingSoonPanel } from "@/components/admin/AdminComingSoonPanel";
import { AdminExperiencesPanel } from "@/components/admin/AdminExperiencesPanel";
import { AdminMenuPanel } from "@/components/admin/AdminMenuPanel";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminBankTransferPanel } from "@/components/admin/AdminBankTransferPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import type { AdminNavId } from "@/components/admin/AdminNav";
import { parseAdminTab } from "@/lib/admin-nav";
import { apiPath } from "@/lib/api-path";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getLockedAdminTab } from "@/lib/locked-modules";
import type { StaffRoleCode } from "@/types/staff";

function AdminPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = parseAdminTab(searchParams.get("tab"));
  const focusReservationId = searchParams.get("focus");
  const focusCode = searchParams.get("code");

  const [calendarKey, setCalendarKey] = useState(0);
  const [role, setRole] = useState<StaffRoleCode | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const replaceAdminQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
    if ((next === "users" || next === "bank") && !isAdmin) return;
    replaceAdminQuery((params) => {
      params.set("tab", next);
      params.delete("focus");
      params.delete("code");
    });
    if (next === "calendar") {
      setCalendarKey((value) => value + 1);
    }
  }

  function openReservation(target: { id: string; confirmationCode: string }) {
    replaceAdminQuery((params) => {
      params.set("tab", "reservations");
      params.set("focus", target.id);
      params.set("code", target.confirmationCode);
    });
  }

  const clearReservationFocus = useCallback(() => {
    replaceAdminQuery((params) => {
      params.delete("focus");
      params.delete("code");
    });
  }, [replaceAdminQuery]);

  useEffect(() => {
    if ((tab === "users" || tab === "bank") && role === "STAFF") {
      replaceAdminQuery((params) => {
        params.set("tab", "calendar");
        params.delete("focus");
        params.delete("code");
      });
    }
  }, [tab, role, replaceAdminQuery]);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      replaceAdminQuery((params) => {
        params.set("tab", tab);
      });
    }
  }, [searchParams, tab, replaceAdminQuery]);

  const locked = getLockedAdminTab(tab);
  const menuOn = isFeatureEnabled("menu");
  const experiencesOn = isFeatureEnabled("experiences");
  const reportsOn = isFeatureEnabled("reports");

  return (
    <AdminShell
      activeTab={tab}
      onSelectTab={selectTab}
      onOpenReservationAlert={openReservation}
      role={role}
      username={username}
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
    >
      {tab === "calendar" && <AdminCalendar key={calendarKey} onOpenReservation={openReservation} />}
      {tab === "reservations" && (
        <AdminReservationsPanel
          focusReservationId={focusReservationId}
          focusCode={focusCode}
          onFocusConsumed={clearReservationFocus}
        />
      )}
      {tab === "rooms" && <AdminRoomsPanel />}
      {tab === "rates" && <AdminPriceRulesPanel />}
      {tab === "blocks" && <AdminRoomBlocksPanel />}
      {tab === "reports" && reportsOn && <AdminReportsPanel />}
      {tab === "menu" && menuOn && <AdminMenuPanel />}
      {tab === "experiences" && experiencesOn && <AdminExperiencesPanel />}
      {tab === "bank" && isAdmin && <AdminBankTransferPanel />}
      {tab === "users" && isAdmin && <AdminUsersPanel onUsersChanged={refreshSession} />}
      {locked && (
        <AdminComingSoonPanel
          title={locked.title}
          summary={locked.summary}
          highlights={locked.highlights}
        />
      )}
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-brand-500">
          Cargando panel…
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}
