"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_RATES_HELP } from "@/components/admin/admin-help";
import { AdminHintLabel } from "@/components/admin/AdminHintLabel";
import { AdminToast } from "@/components/admin/AdminToast";
import { AdminRatesMobileList, type RateSeasonGroup } from "@/components/admin/mobile/AdminManageMobile";
import { AdminMobileFab } from "@/components/admin/mobile/AdminMobileFab";
import { AdminMobileFilterScroll } from "@/components/admin/mobile/AdminMobilePrimitives";
import { AdminMobileSheet } from "@/components/admin/mobile/AdminMobileSheet";
import { formatCurrency, formatDateOnlyUTC, parseDateOnly } from "@/lib/dates";
import { apiPath } from "@/lib/api-path";
import { buildNextYearSeasonCopy } from "@/lib/season-copy";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;
const LIST_PAGE_SIZE = 100;

const SEASON_PRESETS = [
  "Verano",
  "Temporada baja",
  "Festivos",
  "Semana Santa",
  "Fin de año",
] as const;

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function addDaysDateOnly(iso: string, days: number): string {
  const date = parseDateOnly(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnlyUTC(date);
}

function formatDayLabel(iso: string): string {
  const date = parseDateOnly(iso);
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type PanelMessage = { type: "success" | "error"; text: string };

type PriceRuleRow = {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  name?: string | null;
};

type RoomOption = {
  id: string;
  code: string;
  name: string;
  pricePerNight: number;
};

function groupRulesIntoSeasons(rules: PriceRuleRow[]): RateSeasonGroup[] {
  const map = new Map<string, RateSeasonGroup>();

  for (const rule of rules) {
    const name = rule.name?.trim() || "Sin nombre";
    const key = `${name}|${rule.startDate}|${rule.endDate}`;
    const existing = map.get(key);
    const item = {
      id: rule.id,
      roomId: rule.roomId,
      roomCode: rule.roomCode,
      roomName: rule.roomName,
      pricePerNight: rule.pricePerNight,
    };

    if (existing) {
      existing.rules.push(item);
    } else {
      map.set(key, {
        key,
        name,
        startDate: rule.startDate,
        endDate: rule.endDate,
        lastNight: addDaysDateOnly(rule.endDate, -1),
        rules: [item],
      });
    }
  }

  return [...map.values()].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
}

/** Filtro de listado: todas, vigentes hoy, o año de la primera noche. */
type YearFilter = "all" | "active" | number;

function seasonStartYear(season: RateSeasonGroup): number {
  return Number(season.startDate.slice(0, 4));
}

function todayDateOnlyLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Vigente si hoy cae en [startDate, endDate). */
function seasonIsActiveOn(season: RateSeasonGroup, todayIso: string): boolean {
  return season.startDate <= todayIso && todayIso < season.endDate;
}

function listSeasonYears(seasons: RateSeasonGroup[]): number[] {
  const years = new Set(seasons.map(seasonStartYear));
  return [...years].sort((a, b) => b - a);
}

function defaultYearFilter(seasons: RateSeasonGroup[], todayIso: string): YearFilter {
  const todayYear = Number(todayIso.slice(0, 4));
  const years = listSeasonYears(seasons);
  if (years.includes(todayYear)) return todayYear;

  const upcoming = [...seasons]
    .filter((season) => season.startDate >= todayIso)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (upcoming) return seasonStartYear(upcoming);

  if (years.length > 0) return years[0];
  return todayYear;
}

function seasonMatchesSearch(season: RateSeasonGroup, q: string): boolean {
  if (!q) return true;
  return (
    season.name.toLowerCase().includes(q) ||
    season.rules.some(
      (rule) => rule.roomCode.toLowerCase().includes(q) || rule.roomName.toLowerCase().includes(q)
    )
  );
}

export function AdminPriceRulesPanel() {
  const [rules, setRules] = useState<PriceRuleRow[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [pricesByRoom, setPricesByRoom] = useState<Record<string, string>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [message, setMessage] = useState<PanelMessage | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [lastNight, setLastNight] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [copyingKey, setCopyingKey] = useState<string | null>(null);
  const [copySeason, setCopySeason] = useState<RateSeasonGroup | null>(null);
  const [copyName, setCopyName] = useState("");
  const [copyPercent, setCopyPercent] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSeasonKey, setExpandedSeasonKey] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<YearFilter | null>(null);

  const todayIso = useMemo(() => todayDateOnlyLocal(), []);
  const seasons = useMemo(() => groupRulesIntoSeasons(rules), [rules]);
  const availableYears = useMemo(() => listSeasonYears(seasons), [seasons]);

  useEffect(() => {
    if (!initialized) return;
    if (yearFilter !== null) return;
    setYearFilter(defaultYearFilter(seasons, todayIso));
  }, [initialized, seasons, todayIso, yearFilter]);

  const activeYearFilter: YearFilter = yearFilter ?? defaultYearFilter(seasons, todayIso);

  const searchMatchedSeasons = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return seasons.filter((season) => seasonMatchesSearch(season, q));
  }, [seasons, debouncedSearch]);

  const filteredSeasons = useMemo(() => {
    return searchMatchedSeasons.filter((season) => {
      if (activeYearFilter === "all") return true;
      if (activeYearFilter === "active") return seasonIsActiveOn(season, todayIso);
      return seasonStartYear(season) === activeYearFilter;
    });
  }, [searchMatchedSeasons, activeYearFilter, todayIso]);

  const otherYearMatchCount = useMemo(() => {
    if (!debouncedSearch.trim() || activeYearFilter === "all") return 0;
    return Math.max(0, searchMatchedSeasons.length - filteredSeasons.length);
  }, [debouncedSearch, activeYearFilter, searchMatchedSeasons.length, filteredSeasons.length]);

  const yearFilterOptions = useMemo(() => {
    const options: { id: YearFilter; label: string }[] = [
      { id: "active", label: "Vigentes" },
      ...availableYears.map((year) => ({ id: year as YearFilter, label: String(year) })),
      { id: "all", label: "Todas" },
    ];
    const todayYear = Number(todayIso.slice(0, 4));
    if (!availableYears.includes(todayYear) && typeof activeYearFilter === "number" && activeYearFilter === todayYear) {
      options.splice(1, 0, { id: todayYear, label: String(todayYear) });
    }
    return options;
  }, [availableYears, todayIso, activeYearFilter]);

  function seedForm(roomList: RoomOption[]) {
    const next: Record<string, string> = {};
    roomList.forEach((room) => {
      next[room.id] = String(room.pricePerNight);
    });
    setPricesByRoom(next);
    setSelectedRoomIds(new Set(roomList.map((room) => room.id)));
  }

  function openCreateForm() {
    setName("");
    setStartDate("");
    setLastNight("");
    setStep(1);
    seedForm(rooms);
    setShowCreateForm(true);
    setMessage(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setStep(1);
  }

  function applyPercentToSelected(percent: number) {
    setPricesByRoom((current) => {
      const next = { ...current };
      rooms.forEach((room) => {
        if (!selectedRoomIds.has(room.id)) return;
        const base = Number(current[room.id] ?? room.pricePerNight);
        next[room.id] = String(Math.max(1, Math.round(base * (1 + percent / 100))));
      });
      return next;
    });
  }

  function resetSelectedToBase() {
    setPricesByRoom((current) => {
      const next = { ...current };
      rooms.forEach((room) => {
        if (!selectedRoomIds.has(room.id)) return;
        next[room.id] = String(room.pricePerNight);
      });
      return next;
    });
  }

  function toggleRoom(roomId: string) {
    setSelectedRoomIds((current) => {
      const next = new Set(current);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  function selectAllRooms() {
    setSelectedRoomIds(new Set(rooms.map((room) => room.id)));
  }

  function goToPricesStep() {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Escribí un nombre para la temporada (ej. Verano 2026)." });
      return;
    }
    if (!startDate || !lastNight) {
      setMessage({ type: "error", text: "Completá la primera y la última noche." });
      return;
    }
    if (lastNight < startDate) {
      setMessage({ type: "error", text: "La última noche no puede ser anterior a la primera." });
      return;
    }
    setMessage(null);
    setStep(2);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: "1",
        pageSize: String(LIST_PAGE_SIZE),
      });

      const [rulesRes, roomsRes] = await Promise.all([
        fetch(`${apiPath("/api/room-price-rules")}?${query.toString()}`),
        fetch(`${apiPath("/api/rooms")}?page=1&pageSize=100`),
      ]);
      const rulesData = await rulesRes.json().catch(() => ({}));
      const roomsData = await roomsRes.json().catch(() => ({}));

      if (rulesRes.status === 401 || roomsRes.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }

      const roomList: RoomOption[] = (roomsData.rooms ?? []).map(
        (room: { id: string; code: string; name: string; pricePerNight: number }) => ({
          id: room.id,
          code: room.code,
          name: room.name,
          pricePerNight: Number(room.pricePerNight),
        })
      );

      if (roomsRes.ok) {
        setRooms(roomList);
        setPricesByRoom((current) => {
          if (Object.keys(current).length > 0) return current;
          const next: Record<string, string> = {};
          roomList.forEach((room) => {
            next[room.id] = String(room.pricePerNight);
          });
          return next;
        });
        setSelectedRoomIds((current) => {
          if (current.size > 0) return current;
          return new Set(roomList.map((room) => room.id));
        });
      }

      if (!rulesRes.ok) {
        throw new Error(
          typeof rulesData.error === "string"
            ? rulesData.error
            : "Error al cargar tarifas. Si acabás de actualizar, reiniciá el servidor."
        );
      }
      if (!roomsRes.ok) {
        throw new Error(
          typeof roomsData.error === "string" ? roomsData.error : "Error al cargar habitaciones."
        );
      }

      setRules(rulesData.rules ?? []);
      setMessage(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al cargar tarifas.",
      });
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createRules(event: React.FormEvent) {
    event.preventDefault();
    if (step === 1) {
      goToPricesStep();
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const selectedRooms = rooms.filter((room) => selectedRoomIds.has(room.id));
      if (selectedRooms.length === 0) {
        throw new Error("Elegí al menos una cabaña.");
      }

      const endDateExclusive = addDaysDateOnly(lastNight, 1);
      const items = selectedRooms.map((room) => {
        const price = Number(pricesByRoom[room.id]);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error(`Precio inválido para ${room.code}.`);
        }
        return { roomId: room.id, pricePerNight: price };
      });

      const response = await fetch(apiPath("/api/room-price-rules"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate: endDateExclusive,
          items,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) throw new Error(data.error);

      setMessage({
        type: "success",
        text: `Listo: “${name.trim()}” quedó programada en ${data.count ?? items.length} cabaña(s).`,
      });
      closeCreateForm();
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar tarifas.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSeason(season: RateSeasonGroup) {
    const label = `${season.name} (${formatDayLabel(season.startDate)} – ${formatDayLabel(season.lastNight)})`;
    if (!window.confirm(`¿Eliminar la temporada “${label}” y sus ${season.rules.length} precios?`)) {
      return;
    }

    setDeletingKey(season.key);
    setMessage(null);
    try {
      for (const rule of season.rules) {
        const response = await fetch(apiPath(`/api/room-price-rules/${rule.id}`), {
          method: "DELETE",
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.href = "/login?callbackUrl=/admin";
          return;
        }
        if (!response.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Error al eliminar.");
        }
      }
      setMessage({ type: "success", text: `Temporada “${season.name}” eliminada.` });
      if (expandedSeasonKey === season.key) setExpandedSeasonKey(null);
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al eliminar.",
      });
    } finally {
      setDeletingKey(null);
    }
  }

  function openCopySeason(season: RateSeasonGroup) {
    const draft = buildNextYearSeasonCopy(season, 0);
    setCopySeason(season);
    setCopyName(draft.name);
    setCopyPercent(0);
    setMessage(null);
  }

  function closeCopySeason() {
    setCopySeason(null);
    setCopyName("");
    setCopyPercent(0);
  }

  async function confirmCopySeason(event: React.FormEvent) {
    event.preventDefault();
    if (!copySeason) return;

    setCopyingKey(copySeason.key);
    setMessage(null);
    try {
      const payload = buildNextYearSeasonCopy(copySeason, copyPercent);
      const response = await fetch(apiPath("/api/room-price-rules"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copyName.trim() || payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          items: payload.items,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/admin";
        return;
      }
      if (!response.ok) throw new Error(data.error);

      setMessage({
        type: "success",
        text: `Temporada copiada: “${copyName.trim() || payload.name}” (${data.count ?? payload.items.length} cabañas).`,
      });
      setYearFilter(Number(payload.startDate.slice(0, 4)));
      closeCopySeason();
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al copiar temporada.",
      });
    } finally {
      setCopyingKey(null);
    }
  }

  function renderSeasonCard(season: RateSeasonGroup, compact = false) {
    const expanded = expandedSeasonKey === season.key;
    const minPrice = Math.min(...season.rules.map((rule) => rule.pricePerNight));
    const maxPrice = Math.max(...season.rules.map((rule) => rule.pricePerNight));
    const priceLabel =
      minPrice === maxPrice
        ? formatCurrency(minPrice)
        : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`;
    const busy = deletingKey === season.key || copyingKey === season.key;

    return (
      <div
        key={season.key}
        className={cn(
          "rounded-2xl border border-brand-700/70 bg-white/75 shadow-sm",
          compact ? "p-4" : "p-5"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-brand-100">{season.name}</p>
            <p className="mt-1 text-sm text-brand-100">
              {formatDayLabel(season.startDate)} → {formatDayLabel(season.lastNight)}
            </p>
            <p className="mt-1 text-xs text-brand-500">
              {season.rules.length} cabaña{season.rules.length === 1 ? "" : "s"} · {priceLabel} / noche
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setExpandedSeasonKey((current) => (current === season.key ? null : season.key))
              }
              className="btn-secondary min-h-9 px-3 text-xs"
            >
              {expanded ? "Ocultar" : "Ver precios"}
            </button>
            <button
              type="button"
              onClick={() => openCopySeason(season)}
              disabled={busy}
              className="btn-secondary min-h-9 px-3 text-xs disabled:opacity-60"
            >
              Copiar +1 año
            </button>
            <button
              type="button"
              onClick={() => void deleteSeason(season)}
              disabled={busy}
              className="btn-secondary min-h-9 px-3 text-xs disabled:opacity-60"
            >
              {deletingKey === season.key ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2 border-t border-brand-700/40 pt-3">
            {season.rules.map((rule) => {
              const base = rooms.find((room) => room.id === rule.roomId)?.pricePerNight;
              const delta = base != null ? rule.pricePerNight - base : null;
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-brand-800/15 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-100">
                      {rule.roomCode} · {rule.roomName}
                    </p>
                    {base != null && (
                      <p className="text-[11px] text-brand-500">
                        Base {formatCurrency(base)}
                        {delta != null && delta !== 0
                          ? ` · ${delta > 0 ? "+" : ""}${formatCurrency(delta)}`
                          : " · igual al base"}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-bold text-brand-100">
                    {formatCurrency(rule.pricePerNight)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderCopyForm() {
    if (!copySeason) return null;
    const preview = buildNextYearSeasonCopy(copySeason, copyPercent);

    return (
      <form onSubmit={confirmCopySeason} className="space-y-4">
        <p className="text-sm text-brand-500">
          Se crea la misma temporada un año después, con los mismos precios por cabaña (o un aumento %).
        </p>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-100">Nombre de la nueva temporada</span>
          <input
            type="text"
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
            className="input-field min-h-11"
            required
          />
        </label>

        <div className="rounded-xl bg-brand-800/15 px-3 py-2.5 text-sm text-brand-100">
          <p className="font-semibold">Fechas nuevas</p>
          <p className="mt-1">
            {formatDayLabel(preview.startDate)} → {formatDayLabel(addDaysDateOnly(preview.endDate, -1))}
          </p>
          <p className="mt-1 text-xs text-brand-500">
            Origen: {formatDayLabel(copySeason.startDate)} → {formatDayLabel(copySeason.lastNight)}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-100">Precios</p>
          <div className="flex flex-wrap gap-1.5">
            {[0, 5, 10, 15, 20].map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => setCopyPercent(percent)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  copyPercent === percent
                    ? "border-amber-500/70 bg-amber-200/70 text-amber-950"
                    : "border-brand-700 bg-white/70 text-brand-500 hover:bg-white"
                )}
              >
                {percent === 0 ? "Iguales" : `+${percent}%`}
              </button>
            ))}
          </div>
          <p className="text-xs text-brand-500">
            Ejemplo: {formatCurrency(copySeason.rules[0]?.pricePerNight ?? 0)} →{" "}
            {formatCurrency(preview.items[0]?.pricePerNight ?? 0)} / noche
          </p>
        </div>

        <div className="sticky bottom-0 -mx-1 flex gap-2 border-t border-brand-700/35 bg-[#faf6ef] px-1 pt-3 pb-1">
          <button
            type="submit"
            disabled={copyingKey === copySeason.key}
            className="btn-primary min-h-11 flex-[1.4] text-sm disabled:opacity-60"
          >
            {copyingKey === copySeason.key ? "Copiando…" : "Crear copia"}
          </button>
          <button type="button" onClick={closeCopySeason} className="btn-secondary min-h-11 flex-1 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  function renderCreateForm() {
    return (
      <form onSubmit={createRules} className="space-y-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-500">
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full",
              step === 1 ? "bg-amber-200 text-amber-950" : "bg-brand-800 text-brand-100"
            )}
          >
            1
          </span>
          <span className={step === 1 ? "text-brand-100" : undefined}>Fechas</span>
          <span className="text-brand-700">→</span>
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full",
              step === 2 ? "bg-amber-200 text-amber-950" : "bg-brand-800 text-brand-100"
            )}
          >
            2
          </span>
          <span className={step === 2 ? "text-brand-100" : undefined}>Precios</span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-brand-100">¿Cómo se llama esta temporada?</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field min-h-11"
                placeholder="Ej. Verano 2026"
                autoFocus
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SEASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    name === preset
                      ? "border-amber-500/70 bg-amber-200/70 text-amber-950"
                      : "border-brand-700 bg-white/70 text-brand-500 hover:bg-white"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-brand-100">Primera noche</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (lastNight && lastNight < e.target.value) setLastNight("");
                  }}
                  className="input-field min-h-11"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-brand-100">Última noche incluida</span>
                <input
                  type="date"
                  value={lastNight}
                  min={startDate || undefined}
                  onChange={(e) => setLastNight(e.target.value)}
                  className="input-field min-h-11"
                  required
                />
              </label>
            </div>

            {startDate && lastNight && lastNight >= startDate && (
              <p className="rounded-xl bg-brand-800/20 px-3 py-2 text-sm text-brand-100">
                Se cobrará este precio desde el <strong>{formatDayLabel(startDate)}</strong> hasta el{" "}
                <strong>{formatDayLabel(lastNight)}</strong> inclusive.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-700/50 bg-brand-800/15 px-3 py-2.5 text-sm text-brand-100">
              <p className="font-semibold">{name.trim()}</p>
              <p className="text-xs text-brand-500">
                {formatDayLabel(startDate)} → {formatDayLabel(lastNight)}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-brand-100">
                Precio por cabaña
                <span className="ml-1 font-normal text-brand-500">
                  ({selectedRoomIds.size} seleccionada{selectedRoomIds.size === 1 ? "" : "s"})
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={selectAllRooms} className="btn-secondary px-2.5 py-1 text-[11px]">
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => applyPercentToSelected(10)}
                  className="btn-secondary px-2.5 py-1 text-[11px]"
                >
                  +10%
                </button>
                <button
                  type="button"
                  onClick={() => applyPercentToSelected(20)}
                  className="btn-secondary px-2.5 py-1 text-[11px]"
                >
                  +20%
                </button>
                <button
                  type="button"
                  onClick={resetSelectedToBase}
                  className="btn-secondary px-2.5 py-1 text-[11px]"
                >
                  Precio base
                </button>
              </div>
            </div>

            <p className="text-xs text-brand-500">
              Marcá las cabañas que entran en esta temporada y ajustá el precio. Podés partir del base o
              subir un %.
            </p>

            <div className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto rounded-xl border border-brand-700/50 bg-white/50 p-2">
              {rooms.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-brand-500">
                  No hay habitaciones configuradas.
                </p>
              ) : (
                rooms.map((room) => {
                  const selected = selectedRoomIds.has(room.id);
                  const price = Number(pricesByRoom[room.id] ?? room.pricePerNight);
                  const delta = Number.isFinite(price) ? price - room.pricePerNight : 0;
                  return (
                    <div
                      key={room.id}
                      className={cn(
                        "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-2",
                        selected ? "bg-amber-50/80" : "opacity-55"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRoom(room.id)}
                        className="h-4 w-4 accent-amber-700"
                        aria-label={`Incluir ${room.code}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-100">
                          {room.code} · {room.name}
                        </p>
                        <p className="text-[11px] text-brand-500">
                          Base {formatCurrency(room.pricePerNight)}
                          {selected && delta !== 0
                            ? ` · ${delta > 0 ? "+" : ""}${formatCurrency(delta)}`
                            : ""}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        disabled={!selected}
                        value={pricesByRoom[room.id] ?? ""}
                        onChange={(e) =>
                          setPricesByRoom((current) => ({ ...current, [room.id]: e.target.value }))
                        }
                        className="input-field min-h-10 w-28 text-right disabled:opacity-50"
                        required={selected}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-1 flex gap-2 border-t border-brand-700/35 bg-[#faf6ef] px-1 pt-3 pb-1">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary min-h-11 flex-1 text-sm"
            >
              Atrás
            </button>
          )}
          <button
            type="submit"
            disabled={saving || (step === 2 && rooms.length === 0)}
            className="btn-primary min-h-11 flex-[1.4] text-sm disabled:opacity-60"
          >
            {step === 1 ? "Continuar" : saving ? "Guardando…" : "Guardar temporada"}
          </button>
          <button type="button" onClick={closeCreateForm} className="btn-secondary min-h-11 flex-1 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  if (loading && !initialized) {
    return <div className="glass-panel p-8 text-center text-brand-500">Cargando tarifas...</div>;
  }

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <AdminToast message={message} onDismiss={() => setMessage(null)} />

      <div className="glass-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <AdminHintLabel as="h2" hint={ADMIN_RATES_HELP.section} className="text-lg font-semibold text-brand-100">
            Temporadas y precios
          </AdminHintLabel>
          <p className="mt-1 text-sm text-brand-500">
            Creá una temporada o copiá una existente al año siguiente. Si no hay temporada, se usa el precio
            base.
          </p>
        </div>
        <button type="button" onClick={openCreateForm} className="btn-primary hidden min-h-11 shrink-0 px-4 md:inline-flex">
          + Nueva temporada
        </button>
      </div>

      <AdminMobileSheet
        open={showCreateForm}
        onClose={closeCreateForm}
        title={step === 1 ? "Nueva temporada" : "Precios de la temporada"}
        subtitle={step === 1 ? "Paso 1 de 2 · Fechas" : "Paso 2 de 2 · Precios"}
        size="lg"
      >
        {renderCreateForm()}
      </AdminMobileSheet>

      <AdminMobileSheet
        open={Boolean(copySeason)}
        onClose={closeCopySeason}
        title="Copiar al año siguiente"
        subtitle={copySeason ? `Desde “${copySeason.name}”` : undefined}
        size="md"
      >
        {renderCopyForm()}
      </AdminMobileSheet>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Año</span>
          <AdminMobileFilterScroll className="md:hidden">
            {yearFilterOptions.map((option) => (
              <button
                key={String(option.id)}
                type="button"
                onClick={() => setYearFilter(option.id)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition",
                  activeYearFilter === option.id
                    ? "border-amber-500/70 bg-amber-200/70 text-amber-950"
                    : "border-brand-700 bg-white/70 text-brand-500"
                )}
              >
                {option.label}
              </button>
            ))}
          </AdminMobileFilterScroll>
          <div className="hidden flex-wrap gap-1.5 md:flex">
            {yearFilterOptions.map((option) => (
              <button
                key={String(option.id)}
                type="button"
                onClick={() => setYearFilter(option.id)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold transition",
                  activeYearFilter === option.id
                    ? "border-amber-500/70 bg-amber-200/70 text-amber-950"
                    : "border-brand-700 bg-white/70 text-brand-500 hover:bg-white"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-brand-500">
          El año se toma de la primera noche. Las temporadas que cruzan años (ej. verano) quedan en el año de
          inicio.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full max-w-md"
          placeholder="Buscar temporada o cabaña..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          name="search-rates"
        />
        <span className="text-xs text-brand-500">
          {filteredSeasons.length} temporada{filteredSeasons.length === 1 ? "" : "s"}
          {activeYearFilter === "active"
            ? " vigentes"
            : typeof activeYearFilter === "number"
              ? ` en ${activeYearFilter}`
              : ""}
        </span>
      </div>

      {otherYearMatchCount > 0 && (
        <p className="rounded-xl border border-brand-700/50 bg-brand-800/15 px-3 py-2 text-sm text-brand-100">
          Hay {otherYearMatchCount} resultado{otherYearMatchCount === 1 ? "" : "s"} en otros años.{" "}
          <button
            type="button"
            onClick={() => setYearFilter("all")}
            className="font-semibold text-amber-900 underline underline-offset-2"
          >
            Ver todas
          </button>
        </p>
      )}

      <AdminRatesMobileList
        seasons={filteredSeasons}
        rooms={rooms}
        deletingKey={deletingKey}
        copyingKey={copyingKey}
        expandedKey={expandedSeasonKey}
        onToggleExpand={setExpandedSeasonKey}
        onCopySeason={openCopySeason}
        onDeleteSeason={deleteSeason}
        emptyMessage={
          seasons.length === 0
            ? "Todavía no hay temporadas. Tocá “+ Nueva temporada” para empezar."
            : activeYearFilter === "active"
              ? "No hay temporadas vigentes hoy. Probá otro filtro."
              : typeof activeYearFilter === "number"
                ? `No hay temporadas en ${activeYearFilter}. Probá “Todas” u otro año.`
                : "No hay temporadas con ese filtro."
        }
      />

      <div className="hidden space-y-3 md:block">
        {filteredSeasons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-700/70 bg-white/55 px-6 py-14 text-center">
            <p className="text-base font-semibold text-brand-100">
              {seasons.length === 0
                ? "Todavía no hay temporadas"
                : activeYearFilter === "active"
                  ? "No hay temporadas vigentes hoy"
                  : typeof activeYearFilter === "number"
                    ? `No hay temporadas en ${activeYearFilter}`
                    : "No hay temporadas con ese filtro"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-brand-500">
              {seasons.length === 0
                ? ADMIN_RATES_HELP.list
                : "Probá otro año, “Vigentes” o “Todas”, o creá / copiá una temporada."}
            </p>
            {seasons.length === 0 ? (
              <button type="button" onClick={openCreateForm} className="btn-primary mt-5 min-h-11 px-5">
                Crear primera temporada
              </button>
            ) : (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setYearFilter("all")} className="btn-secondary min-h-11 px-4">
                  Ver todas
                </button>
                <button type="button" onClick={openCreateForm} className="btn-primary min-h-11 px-4">
                  Nueva temporada
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredSeasons.map((season) => renderSeasonCard(season))
        )}
      </div>

      {!showCreateForm && <AdminMobileFab label="+ Nueva temporada" onClick={openCreateForm} />}
    </div>
  );
}
