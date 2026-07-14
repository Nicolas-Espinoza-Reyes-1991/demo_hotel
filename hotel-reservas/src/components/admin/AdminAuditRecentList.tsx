"use client";

import type { PublicAdminAuditLog } from "@/types/admin-audit";

function formatAuditDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLastEditLabel(updatedBy: string | null, updatedAt: string | null): string | null {
  if (!updatedBy && !updatedAt) return null;
  const when = updatedAt ? formatAuditDate(updatedAt) : null;
  if (updatedBy && when) return `Última edición: ${updatedBy} · ${when}`;
  if (updatedBy) return `Última edición: ${updatedBy}`;
  return when ? `Última edición: ${when}` : null;
}

type AdminAuditRecentListProps = {
  title?: string;
  logs: PublicAdminAuditLog[];
  emptyText?: string;
};

export function AdminAuditRecentList({
  title = "Actividad reciente",
  logs,
  emptyText = "Todavía no hay cambios registrados.",
}: AdminAuditRecentListProps) {
  return (
    <div className="rounded-2xl border border-brand-700/70 bg-brand-800/20 p-4">
      <h3 className="text-sm font-bold text-brand-100">{title}</h3>
      {logs.length === 0 ? (
        <p className="mt-2 text-sm text-brand-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-xl border border-brand-700/50 bg-brand-900/30 px-3 py-2 text-sm"
            >
              <p className="text-brand-100">{log.summary}</p>
              <p className="mt-0.5 text-xs text-brand-500">{formatAuditDate(log.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
