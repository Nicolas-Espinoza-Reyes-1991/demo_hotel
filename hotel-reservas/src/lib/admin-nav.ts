import type { AdminNavId } from "@/components/admin/AdminNav";

export const ADMIN_TAB_IDS: AdminNavId[] = [
  "calendar",
  "reservations",
  "rooms",
  "rates",
  "blocks",
  "experiences",
  "menu",
  "reports",
  "bank",
  "users",
];

export function parseAdminTab(raw: string | null | undefined): AdminNavId {
  if (raw && (ADMIN_TAB_IDS as string[]).includes(raw)) {
    return raw as AdminNavId;
  }
  return "calendar";
}
