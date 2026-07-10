"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { useTableSort } from "@/hooks/useTableSort";
import type { PublicStaffUser, StaffRoleCode } from "@/types/staff";
import { ADMIN_MODULE_HELP, ADMIN_USERS_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { SortableTh } from "@/components/admin/SortableTableHeader";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
import { PasswordFields, isPasswordFormValid } from "@/components/admin/PasswordFields";
import { AdminMobileFab } from "@/components/admin/mobile/AdminMobileFab";

type FormMode = "create" | "edit" | "password" | null;
type UserSortKey = "username" | "fullName" | "role" | "active" | "lastLoginAt";

const ROLE_LABEL: Record<StaffRoleCode, string> = {
  ADMIN: "Administrador",
  STAFF: "Trabajador",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminUsersPanel({ onUsersChanged }: { onUsersChanged?: () => void }) {
  const [users, setUsers] = useState<PublicStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<PublicStaffUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRoleCode>("STAFF");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const {
    sortKey: userSortKey,
    sortDirection: userSortDirection,
    toggleSort: toggleUserSort,
    sortRows: sortUserRows,
  } = useTableSort<UserSortKey>("username", "asc");

  const sortedUsers = useMemo(
    () =>
      sortUserRows(users, (user, key) => {
        switch (key) {
          case "username":
            return user.username;
          case "fullName":
            return user.fullName;
          case "role":
            return user.role;
          case "active":
            return user.active;
          case "lastLoginAt":
            return user.lastLoginAt ?? "";
          default:
            return "";
        }
      }),
    [users, sortUserRows]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiPath("/api/users"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los usuarios.");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function resetForm() {
    setUsername("");
    setFullName("");
    setRole("STAFF");
    setActive(true);
    setPassword("");
    setConfirmPassword("");
    setSelected(null);
    setMode(null);
  }

  function openCreate() {
    setSuccess(null);
    setError(null);
    setSelected(null);
    setUsername("");
    setFullName("");
    setRole("STAFF");
    setActive(true);
    setPassword("");
    setConfirmPassword("");
    setMode("create");
  }

  function openEdit(user: PublicStaffUser) {
    setSuccess(null);
    setError(null);
    setSelected(user);
    setUsername(user.username);
    setFullName(user.fullName ?? "");
    setRole(user.role);
    setActive(user.active);
    setPassword("");
    setConfirmPassword("");
    setMode("edit");
  }

  function openPassword(user: PublicStaffUser) {
    setSuccess(null);
    setError(null);
    setSelected(user);
    setPassword("");
    setConfirmPassword("");
    setMode("password");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "create") {
        if (!isPasswordFormValid(password, confirmPassword)) {
          throw new Error("Completá una contraseña válida y confirmala.");
        }
        const response = await fetch(apiPath("/api/users"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            fullName: fullName.trim() || null,
            role,
            active,
            password,
            confirmPassword,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo crear el usuario.");
        setSuccess(data.message ?? "Usuario creado.");
        resetForm();
        await loadUsers();
        onUsersChanged?.();
        return;
      }

      if (mode === "edit" && selected) {
        const response = await fetch(apiPath(`/api/users/${selected.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            fullName: fullName.trim() || null,
            role,
            active,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
        setSuccess(data.message ?? "Usuario actualizado.");
        resetForm();
        await loadUsers();
        onUsersChanged?.();
        return;
      }

      if (mode === "password" && selected) {
        if (!isPasswordFormValid(password, confirmPassword)) {
          throw new Error("Completá una contraseña válida y confirmala.");
        }
        const response = await fetch(apiPath(`/api/users/${selected.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, confirmPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cambiar la contraseña.");
        setSuccess(data.message ?? "Contraseña actualizada.");
        resetForm();
        await loadUsers();
        onUsersChanged?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: PublicStaffUser) {
    if (!window.confirm(`¿Eliminar al usuario “${user.username}”? Esta acción no se puede deshacer.`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(apiPath(`/api/users/${user.id}`), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      setSuccess(data.message ?? "Usuario eliminado.");
      await loadUsers();
      onUsersChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    }
  }

  const sheetTitle =
    mode === "create"
      ? "Nuevo usuario"
      : mode === "edit"
        ? "Editar usuario"
        : mode === "password"
          ? "Cambiar contraseña"
          : "";

  const canSubmit =
    mode === "create"
      ? username.trim().length >= 3 && isPasswordFormValid(password, confirmPassword)
      : mode === "edit"
        ? username.trim().length >= 3
        : mode === "password"
          ? isPasswordFormValid(password, confirmPassword)
          : false;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminHintLabel as="h2" hint={ADMIN_USERS_HELP.section} className="text-lg font-bold text-brand-100">
            Usuarios del panel
          </AdminHintLabel>
          <p className="mt-1 max-w-2xl text-sm text-brand-500">{ADMIN_MODULE_HELP.users}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary hidden sm:inline-flex">
          + Nuevo usuario
        </button>
      </div>

      {error && <p className="alert-danger text-sm">{error}</p>}
      {success && <p className="alert-success text-sm">{success}</p>}

      {loading ? (
        <p className="text-sm text-brand-500">Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-700 bg-brand-800/30 px-4 py-8 text-center text-sm text-brand-500">
          Todavía no hay usuarios. Creá el primero con el botón “Nuevo usuario”.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-brand-700/70 md:block">
            <table className="min-w-full divide-y divide-brand-700/60 text-left text-sm">
              <thead className="bg-brand-800/70 text-xs uppercase tracking-wider text-brand-500">
                <tr>
                  <SortableTh
                    label="Usuario"
                    columnKey="username"
                    sortKey={userSortKey}
                    sortDirection={userSortDirection}
                    onSort={toggleUserSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Nombre"
                    columnKey="fullName"
                    sortKey={userSortKey}
                    sortDirection={userSortDirection}
                    onSort={toggleUserSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Rol"
                    columnKey="role"
                    sortKey={userSortKey}
                    sortDirection={userSortDirection}
                    onSort={toggleUserSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Estado"
                    columnKey="active"
                    sortKey={userSortKey}
                    sortDirection={userSortDirection}
                    onSort={toggleUserSort}
                    className="px-4 py-3"
                  />
                  <SortableTh
                    label="Último acceso"
                    columnKey="lastLoginAt"
                    sortKey={userSortKey}
                    sortDirection={userSortDirection}
                    onSort={toggleUserSort}
                    className="px-4 py-3"
                  />
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-700/50 bg-white/40">
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="align-middle">
                    <td className="px-4 py-3 font-semibold text-brand-100">{user.username}</td>
                    <td className="px-4 py-3 text-brand-500">{user.fullName || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                          user.role === "ADMIN"
                            ? "bg-honey/40 text-accent-hover"
                            : "bg-brand-800 text-brand-500"
                        )}
                      >
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          user.active ? "text-emerald-700" : "text-danger"
                        )}
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-500">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => openEdit(user)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !px-2.5 !py-1.5 text-xs"
                          onClick={() => openPassword(user)}
                        >
                          Contraseña
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-danger/30 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
                          onClick={() => void handleDelete(user)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {users.map((user) => (
              <article
                key={user.id}
                className="rounded-2xl border border-brand-700/70 bg-white/55 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-brand-100">{user.username}</p>
                    <p className="text-sm text-brand-500">{user.fullName || "Sin nombre"}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                      user.role === "ADMIN" ? "bg-honey/40 text-accent-hover" : "bg-brand-800 text-brand-500"
                    )}
                  >
                    {ROLE_LABEL[user.role]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-brand-500">
                  {user.active ? "Activo" : "Inactivo"} · Último acceso: {formatDate(user.lastLoginAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={() => openEdit(user)}>
                    Editar
                  </button>
                  <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={() => openPassword(user)}>
                    Contraseña
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold text-danger"
                    onClick={() => void handleDelete(user)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <AdminMobileFab label="Nuevo usuario" onClick={openCreate} />

      <AdminMobileSheet
        open={mode !== null}
        onClose={resetForm}
        title={sheetTitle}
        subtitle={
          mode === "password" && selected
            ? `Usuario: ${selected.username}`
            : mode === "edit" && selected
              ? `Editando ${selected.username}`
              : ADMIN_USERS_HELP.form
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          {(mode === "create" || mode === "edit") && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-500">
                  Usuario
                </label>
                <input
                  className="input-field w-full"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="off"
                  required
                  minLength={3}
                  maxLength={32}
                  placeholder="ej. recepcion"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-500">
                  Nombre completo
                </label>
                <input
                  className="input-field w-full"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={80}
                  placeholder="Opcional"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-500">
                    Perfil
                  </label>
                  <select
                    className="input-field w-full"
                    value={role}
                    onChange={(event) => setRole(event.target.value as StaffRoleCode)}
                  >
                    <option value="STAFF">Trabajador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-500">
                    Estado
                  </label>
                  <select
                    className="input-field w-full"
                    value={active ? "1" : "0"}
                    onChange={(event) => setActive(event.target.value === "1")}
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {(mode === "create" || mode === "password") && (
            <PasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirmPassword}
              disabled={saving}
              autoFocus={mode === "password"}
            />
          )}

          {error && mode && <p className="alert-danger text-sm">{error}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-brand-700/40 pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !canSubmit}>
              {saving
                ? "Guardando…"
                : mode === "password"
                  ? "Guardar contraseña"
                  : mode === "edit"
                    ? "Guardar cambios"
                    : "Crear usuario"}
            </button>
          </div>
        </form>
      </AdminMobileSheet>
    </section>
  );
}
