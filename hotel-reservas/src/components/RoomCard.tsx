"use client";

import { useState, useCallback } from "react";
import { formatCurrency, formatNightsLabel } from "@/lib/dates";
import { publicAssetUrl } from "@/lib/api-path";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { getPhotosForRoom, getTreeNameForRoom } from "@/lib/room-gallery";

export type RoomCardData = {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string | null;
  bedType?: string | null;
  bathroomDetail?: string | null;
  beds?: Array<{ size: "SINGLE" | "DOUBLE" | "KING"; count: number }>;
  bathrooms?: Array<{ type: "PRIVATE" | "SHARED"; count: number }>;
  pricePerNight: number;
  maxGuests: number;
  imageUrl?: string | null;
  amenities: string[];
  nights?: number;
  totalAmount?: number;
};

function formatBeds(room: RoomCardData): string {
  if (room.bedType?.trim()) return room.bedType.trim();

  if (Array.isArray(room.beds) && room.beds.length > 0) {
    const label = room.beds
      .map((item) => {
        const sizeLabel =
          item.size === "SINGLE" ? "1 plaza" : item.size === "DOUBLE" ? "2 plazas" : "King";
        return item.count > 1 ? `${item.count} ${sizeLabel}` : sizeLabel;
      })
      .join(" + ");
    if (label) return label;
  }

  return "Sin dato de cama";
}

function formatBathrooms(room: RoomCardData): string {
  if (room.bathroomDetail?.trim()) return room.bathroomDetail.trim();

  if (Array.isArray(room.bathrooms) && room.bathrooms.length > 0) {
    const label = room.bathrooms
      .map((item) => {
        const single = item.type === "PRIVATE" ? "baño propio" : "baño compartido";
        const plural = item.type === "PRIVATE" ? "baños propios" : "baños compartidos";
        return item.count > 1 ? `${item.count} ${plural}` : single;
      })
      .join(" + ");
    if (label) return label;
  }

  return "Sin dato de baño";
}

const delayClasses = ["", "animate-delay-1", "animate-delay-2", "animate-delay-3", "animate-delay-4"];

// Fallback genérico cuando no hay galería asignada
const FALLBACK_IMAGES = [
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.07.58.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.06.02.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.21.10.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.10.16.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.09.02.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.09.37.jpeg",
];

function getResolvedPhotos(room: RoomCardData): string[] {
  // 1. Intentar galería por carpeta de árbol
  const galleryPhotos = getPhotosForRoom(room.code);
  if (galleryPhotos.length > 0) {
    return galleryPhotos.map((p) => publicAssetUrl(p) ?? p);
  }

  // 2. imageUrl individual en BD (sin Unsplash)
  if (room.imageUrl && !room.imageUrl.includes("images.unsplash.com")) {
    return [publicAssetUrl(room.imageUrl) ?? room.imageUrl];
  }

  // 3. Fallback genérico rotativo
  const codeNumber = parseInt(room.code.replace(/\D/g, ""), 10);
  const index = Number.isFinite(codeNumber) ? codeNumber % FALLBACK_IMAGES.length : 0;
  return [publicAssetUrl(FALLBACK_IMAGES[index]) ?? FALLBACK_IMAGES[index]];
}

// ── Carrusel de fotos ───────────────────────────────────────────────────────
function RoomCarousel({ photos, name }: { photos: string[]; name: string }) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c - 1 + photos.length) % photos.length);
    },
    [photos.length]
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c + 1) % photos.length);
    },
    [photos.length]
  );

  return (
    <div className="room-carousel">
      {/* Imagen activa */}
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${name} — foto ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "room-carousel__slide",
            i === current ? "room-carousel__slide--active" : ""
          )}
        />
      ))}

      {/* Controles prev / next */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="room-carousel__btn room-carousel__btn--prev"
            onClick={prev}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="room-carousel__btn room-carousel__btn--next"
            onClick={next}
            aria-label="Foto siguiente"
          >
            ›
          </button>

          {/* Dots */}
          <div className="room-carousel__dots" aria-hidden="true">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent(i);
                }}
                className={cn(
                  "room-carousel__dot",
                  i === current && "room-carousel__dot--active"
                )}
              />
            ))}
          </div>

          {/* Contador */}
          <span className="room-carousel__counter" aria-live="polite" aria-atomic="true">
            {current + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}

// ── Card principal ──────────────────────────────────────────────────────────
export function RoomCard({
  room,
  onReserve,
  className,
  animationDelay = 0,
}: {
  room: RoomCardData;
  onReserve: (room: RoomCardData) => void;
  className?: string;
  animationDelay?: number;
}) {
  const photos = getResolvedPhotos(room);
  const treeName = getTreeNameForRoom(room.code);

  return (
    <article
      className={cn(
        "group animate-fade-in-up glass-panel overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-highlight/45 hover:shadow-lg hover:shadow-highlight/20",
        delayClasses[animationDelay % delayClasses.length],
        className
      )}
    >
      {/* ── Zona de imagen con carrusel ── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-800">
        <RoomCarousel photos={photos} name={room.name} />

        {/* Badge de tipo */}
        <div className="absolute left-3 top-3 z-10 pointer-events-none">
          <StatusBadge variant="available" label={room.type} />
        </div>

        {/* Precio total (cuando se buscó disponibilidad) */}
        {room.totalAmount ? (
          <div className="absolute bottom-3 right-3 z-10 pointer-events-none rounded-xl bg-highlight/95 px-3 py-1.5 text-sm font-extrabold text-white shadow-lg">
            {formatCurrency(room.totalAmount)}
          </div>
        ) : null}
      </div>

      {/* ── Cuerpo del card ── */}
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-500">
              Hab. {room.code}
              {treeName && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-accent">
                  <svg viewBox="0 0 14 16" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden="true">
                    <path d="M7 0L2 6h2.5L2 11h4v4h2v-4h4l-2.5-5H12z" />
                  </svg>
                  {treeName}
                </span>
              )}
            </p>
            <h3 className="mt-1 text-xl font-bold text-brand-100">{room.name}</h3>
          </div>
          <div className="text-right">
            <p className="price-tag">{formatCurrency(room.pricePerNight)}</p>
            <p className="text-xs font-semibold text-brand-500">/ noche</p>
          </div>
        </div>

        {room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.slice(0, 4).map((item) => (
              <span
                key={item}
                className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-brand-700 pt-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-brand-500">Hasta {room.maxGuests} huéspedes</p>
            <p className="text-xs font-medium text-brand-500">{formatBeds(room)}</p>
            <p className="text-xs font-medium text-brand-500">{formatBathrooms(room)}</p>
          </div>
          {room.nights ? (
            <p className="text-sm font-bold text-accent-bright">{formatNightsLabel(room.nights)}</p>
          ) : null}
        </div>

        <button type="button" onClick={() => onReserve(room)} className="btn-primary w-full">
          Reservar ahora
        </button>
      </div>
    </article>
  );
}
