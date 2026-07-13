"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ADMIN_MODULE_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { AdminToast, type AdminToastMessage } from "@/components/admin/AdminToast";
import { AdminMobileFab } from "@/components/admin/mobile/AdminMobileFab";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
import { apiPath, publicAssetUrl } from "@/lib/api-path";
import { formatCurrency } from "@/lib/dates";
import type { PublicMenuCategory, PublicMenuItem } from "@/lib/menu";
import { cn } from "@/lib/utils";

type ItemFormMode = "create" | "edit" | null;
type CategoryFormMode = "create" | "edit" | null;

type DeleteTarget =
  | { type: "category"; id: string; name: string }
  | { type: "item"; id: string; name: string }
  | null;

const emptyItemForm = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  tags: "",
  available: true,
  featured: false,
  active: true,
};

export function AdminMenuPanel() {
  const [categories, setCategories] = useState<PublicMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<AdminToastMessage | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [categoryMode, setCategoryMode] = useState<CategoryFormMode>(null);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [itemMode, setItemMode] = useState<ItemFormMode>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [mobileItemOpen, setMobileItemOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiPath("/api/menu/categories"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la carta.");
      const next = (data.categories ?? []) as PublicMenuCategory[];
      setCategories(next);
      setExpandedId((prev) => {
        if (prev && next.some((c) => c.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Error al cargar la carta.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalItems = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.items.length, 0),
    [categories]
  );

  function openCreateCategory() {
    setCategoryMode("create");
    setCategoryName("");
    setEditingCategoryId(null);
  }

  function openEditCategory(category: PublicMenuCategory) {
    setCategoryMode("edit");
    setCategoryName(category.name);
    setEditingCategoryId(category.id);
  }

  function closeCategoryForm() {
    setCategoryMode(null);
    setCategoryName("");
    setEditingCategoryId(null);
  }

  async function submitCategory(event: FormEvent) {
    event.preventDefault();
    const name = categoryName.trim();
    if (name.length < 2) {
      setToast({ type: "error", text: "El nombre de la categoría es muy corto." });
      return;
    }
    setSaving(true);
    try {
      const isEdit = categoryMode === "edit" && editingCategoryId;
      const response = await fetch(
        apiPath(isEdit ? `/api/menu/categories/${editingCategoryId}` : "/api/menu/categories"),
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la categoría.");
      setToast({ type: "success", text: data.message ?? "Categoría guardada." });
      closeCategoryForm();
      await load();
      if (!isEdit && data.category?.id) setExpandedId(data.category.id);
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar categoría.",
      });
    } finally {
      setSaving(false);
    }
  }

  function openCreateItem(categoryId?: string) {
    setItemMode("create");
    setEditingItemId(null);
    setItemForm({
      ...emptyItemForm,
      categoryId: categoryId || expandedId || categories[0]?.id || "",
    });
    setMobileItemOpen(true);
  }

  function openEditItem(item: PublicMenuItem) {
    setItemMode("edit");
    setEditingItemId(item.id);
    setItemForm({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? "",
      price: String(Math.round(item.price)),
      imageUrl: item.imageUrl ?? "",
      tags: item.tags.join(", "),
      available: item.available,
      featured: item.featured,
      active: item.active,
    });
    setMobileItemOpen(true);
  }

  function closeItemForm() {
    setItemMode(null);
    setEditingItemId(null);
    setItemForm(emptyItemForm);
    setMobileItemOpen(false);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(apiPath("/api/uploads/menu"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo subir la imagen.");
      setItemForm((prev) => ({ ...prev, imageUrl: data.url ?? "" }));
      setToast({ type: "success", text: "Imagen subida." });
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Error al subir imagen.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function submitItem(event: FormEvent) {
    event.preventDefault();
    const name = itemForm.name.trim();
    const price = Number(itemForm.price);
    if (name.length < 2) {
      setToast({ type: "error", text: "El nombre del producto es muy corto." });
      return;
    }
    if (!itemForm.categoryId) {
      setToast({ type: "error", text: "Elegí una categoría." });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setToast({ type: "error", text: "Ingresá un precio válido." });
      return;
    }

    const tags = itemForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const isEdit = itemMode === "edit" && editingItemId;
      const payload = {
        categoryId: itemForm.categoryId,
        name,
        description: itemForm.description.trim() || null,
        price,
        imageUrl: itemForm.imageUrl.trim() || null,
        tags,
        available: itemForm.available,
        featured: itemForm.featured,
        active: itemForm.active,
      };
      const response = await fetch(
        apiPath(isEdit ? `/api/menu/items/${editingItemId}` : "/api/menu/items"),
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el producto.");
      setToast({ type: "success", text: data.message ?? "Producto guardado." });
      setExpandedId(itemForm.categoryId);
      closeItemForm();
      await load();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar producto.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleItemFlag(
    item: PublicMenuItem,
    patch: Partial<Pick<PublicMenuItem, "available" | "featured" | "active">>
  ) {
    try {
      const response = await fetch(apiPath(`/api/menu/items/${item.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      await load();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Error al actualizar.",
      });
    }
  }

  async function moveCategory(categoryId: string, direction: -1 | 1) {
    const index = categories.findIndex((c) => c.id === categoryId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= categories.length) return;
    const a = categories[index];
    const b = categories[swapIndex];
    try {
      await Promise.all([
        fetch(apiPath(`/api/menu/categories/${a.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: swapIndex }),
        }),
        fetch(apiPath(`/api/menu/categories/${b.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: index }),
        }),
      ]);
      await load();
    } catch {
      setToast({ type: "error", text: "No se pudo reordenar." });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const path =
        deleteTarget.type === "category"
          ? `/api/menu/categories/${deleteTarget.id}`
          : `/api/menu/items/${deleteTarget.id}`;
      const response = await fetch(apiPath(path), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      setToast({ type: "success", text: data.message ?? "Eliminado." });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Error al eliminar.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const itemFormFields = (
    <form onSubmit={(e) => void submitItem(e)} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-brand-600">Categoría</span>
        <select
          className="input-field"
          value={itemForm.categoryId}
          onChange={(e) => setItemForm((p) => ({ ...p, categoryId: e.target.value }))}
          required
        >
          <option value="">Elegí…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-brand-600">Nombre</span>
        <input
          className="input-field"
          value={itemForm.name}
          onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
          required
          maxLength={120}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-brand-600">Descripción</span>
        <textarea
          className="input-field min-h-[72px]"
          value={itemForm.description}
          onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
          maxLength={600}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-brand-600">Precio (CLP)</span>
        <input
          className="input-field"
          type="number"
          min={0}
          step={1}
          value={itemForm.price}
          onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
          required
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-brand-600">Etiquetas (separadas por coma)</span>
        <input
          className="input-field"
          placeholder="vegetariano, sin gluten"
          value={itemForm.tags}
          onChange={(e) => setItemForm((p) => ({ ...p, tags: e.target.value }))}
        />
      </label>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-brand-600">Foto (opcional)</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
                e.target.value = "";
              }}
            />
          </label>
          {itemForm.imageUrl && (
            <button
              type="button"
              className="text-sm font-semibold text-red-700 hover:underline"
              onClick={() => setItemForm((p) => ({ ...p, imageUrl: "" }))}
            >
              Quitar foto
            </button>
          )}
        </div>
        {itemForm.imageUrl && publicAssetUrl(itemForm.imageUrl) && (
          <div className="relative h-28 w-40 overflow-hidden rounded-xl border border-brand-100">
            <Image
              src={publicAssetUrl(itemForm.imageUrl)!}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2 font-medium text-brand-700">
          <input
            type="checkbox"
            checked={itemForm.available}
            onChange={(e) => setItemForm((p) => ({ ...p, available: e.target.checked }))}
          />
          Disponible
        </label>
        <label className="inline-flex items-center gap-2 font-medium text-brand-700">
          <input
            type="checkbox"
            checked={itemForm.featured}
            onChange={(e) => setItemForm((p) => ({ ...p, featured: e.target.checked }))}
          />
          Destacado
        </label>
        <label className="inline-flex items-center gap-2 font-medium text-brand-700">
          <input
            type="checkbox"
            checked={itemForm.active}
            onChange={(e) => setItemForm((p) => ({ ...p, active: e.target.checked }))}
          />
          Visible en carta
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary min-h-11 flex-1" disabled={saving || uploading}>
          {saving ? "Guardando…" : itemMode === "edit" ? "Guardar cambios" : "Crear producto"}
        </button>
        <button type="button" className="btn-secondary min-h-11 px-4" onClick={closeItemForm}>
          Cancelar
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <AdminToast message={toast} onDismiss={() => setToast(null)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminHintLabel hint={ADMIN_MODULE_HELP.menu}>
            <h2 className="font-display text-lg font-bold text-brand-100">Carta digital</h2>
          </AdminHintLabel>
          <p className="mt-1 text-sm text-brand-500">
            {loading
              ? "Cargando…"
              : `${categories.length} categorías · ${totalItems} productos`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/carta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Ver carta pública
          </Link>
          <button
            type="button"
            onClick={openCreateCategory}
            className="inline-flex min-h-10 items-center rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            + Categoría
          </button>
          <button
            type="button"
            onClick={() => openCreateItem()}
            disabled={categories.length === 0}
            className="btn-primary hidden min-h-10 px-4 sm:inline-flex"
          >
            + Producto
          </button>
        </div>
      </div>

      {categoryMode && (
        <form
          onSubmit={(e) => void submitCategory(e)}
          className="rounded-2xl border border-brand-200/80 bg-white/80 p-4 shadow-sm"
        >
          <p className="text-sm font-bold text-brand-100">
            {categoryMode === "edit" ? "Editar categoría" : "Nueva categoría"}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="input-field flex-1"
              placeholder="Ej. Desayunos, Bar, Snacks"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              maxLength={80}
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary min-h-11 px-4" disabled={saving}>
                {saving ? "…" : "Guardar"}
              </button>
              <button type="button" className="btn-secondary min-h-11 px-4" onClick={closeCategoryForm}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {itemMode && (
        <div className="hidden rounded-2xl border border-brand-200/80 bg-white/80 p-4 shadow-sm md:block">
          <p className="mb-3 text-sm font-bold text-brand-100">
            {itemMode === "edit" ? "Editar producto" : "Nuevo producto"}
          </p>
          {itemFormFields}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-brand-500">Cargando carta…</p>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-white/60 px-4 py-12 text-center">
          <p className="font-semibold text-brand-100">Todavía no hay categorías</p>
          <p className="mt-1 text-sm text-brand-500">
            Creá la primera (Desayunos, Platos, Bar…) y después agregá productos.
          </p>
          <button type="button" className="btn-primary mt-4 min-h-11 px-5" onClick={openCreateCategory}>
            Crear categoría
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category, index) => {
            const open = expandedId === category.id;
            return (
              <section
                key={category.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white/75 shadow-sm",
                  category.active ? "border-brand-200/80" : "border-amber-200/80 opacity-80"
                )}
              >
                <div className="flex items-center gap-2 border-b border-brand-100/80 px-3 py-2.5 sm:px-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(open ? null : category.id)}
                    aria-expanded={open}
                  >
                    <span className="block truncate font-display text-base font-bold text-brand-100">
                      {category.name}
                    </span>
                    <span className="text-[11px] text-brand-500">
                      {category.items.length} producto{category.items.length === 1 ? "" : "s"}
                      {!category.active ? " · oculta" : ""}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg text-brand-500 hover:bg-brand-50 disabled:opacity-30"
                      disabled={index === 0}
                      aria-label="Subir categoría"
                      onClick={() => void moveCategory(category.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg text-brand-500 hover:bg-brand-50 disabled:opacity-30"
                      disabled={index === categories.length - 1}
                      aria-label="Bajar categoría"
                      onClick={() => void moveCategory(category.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      onClick={() => openEditCategory(category)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      onClick={() => openCreateItem(category.id)}
                    >
                      + Ítem
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      onClick={() =>
                        setDeleteTarget({ type: "category", id: category.id, name: category.name })
                      }
                    >
                      Borrar
                    </button>
                  </div>
                </div>

                {open && (
                  <ul className="divide-y divide-brand-100/70">
                    {category.items.length === 0 ? (
                      <li className="px-4 py-6 text-center text-sm text-brand-500">
                        Sin productos.{" "}
                        <button
                          type="button"
                          className="font-semibold text-accent hover:underline"
                          onClick={() => openCreateItem(category.id)}
                        >
                          Agregar uno
                        </button>
                      </li>
                    ) : (
                      category.items.map((item) => {
                        const img = publicAssetUrl(item.imageUrl);
                        return (
                          <li
                            key={item.id}
                            className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:px-4"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                                {img ? (
                                  <Image src={img} alt="" fill className="object-cover" unoptimized />
                                ) : (
                                  <span className="grid h-full place-items-center text-[10px] text-brand-400">
                                    Sin foto
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate font-semibold text-brand-100">{item.name}</p>
                                  {!item.available && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                                      Agotado
                                    </span>
                                  )}
                                  {item.featured && (
                                    <span className="rounded bg-[#e8c99a]/35 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#5c4033]">
                                      Destacado
                                    </span>
                                  )}
                                  {!item.active && (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                                      Oculto
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-brand-500">
                                    {item.description}
                                  </p>
                                )}
                                <p className="mt-1 text-sm font-bold text-accent">
                                  {formatCurrency(item.price)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                              <button
                                type="button"
                                className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                                onClick={() =>
                                  void toggleItemFlag(item, { available: !item.available })
                                }
                              >
                                {item.available ? "Marcar agotado" : "Disponible"}
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                                onClick={() => openEditItem(item)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  setDeleteTarget({ type: "item", id: item.id, name: item.name })
                                }
                              >
                                Borrar
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <AdminMobileFab label="+ Producto" onClick={() => openCreateItem()} className={categories.length === 0 ? "pointer-events-none opacity-40" : undefined} />

      <AdminMobileSheet
        open={Boolean(itemMode) && mobileItemOpen}
        onClose={closeItemForm}
        title={itemMode === "edit" ? "Editar producto" : "Nuevo producto"}
        mobileOnly
      >
        {itemFormFields}
      </AdminMobileSheet>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === "category" ? "Eliminar categoría" : "Eliminar producto"}
        message={
          deleteTarget?.type === "category"
            ? `Se eliminará «${deleteTarget.name}» y todos sus productos.`
            : `Se eliminará «${deleteTarget?.name ?? ""}» de la carta.`
        }
        confirmLabel="Eliminar"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
