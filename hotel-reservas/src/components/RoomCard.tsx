"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Gestos de swipe (móvil)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const lbTouchX = useRef<number | null>(null);
  const lbTouchY = useRef<number | null>(null);

  const step = useCallback(
    (dir: number) => {
      setCurrent((c) => (c + dir + photos.length) % photos.length);
    },
    [photos.length]
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    swipedRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 10) swipedRef.current = true;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX.current;
      const dy = t.clientY - (touchStartY.current ?? 0);
      if (photos.length > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [photos.length, step]
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const goLightbox = useCallback(
    (index: number) => {
      setLightboxIndex((index + photos.length) % photos.length);
    },
    [photos.length]
  );

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") goLightbox(lightboxIndex - 1);
      if (event.key === "ArrowRight") goLightbox(lightboxIndex + 1);
    }

    document.addEventListener("keydown", onKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeydown);
    };
  }, [closeLightbox, goLightbox, lightboxIndex, lightboxOpen]);

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
    <div
      className="room-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Imagen activa */}
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${name} — foto ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          onClick={(e) => {
            e.stopPropagation();
            if (swipedRef.current) {
              swipedRef.current = false;
              return;
            }
            setLightboxIndex(i);
            setLightboxOpen(true);
          }}
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

      {lightboxOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="room-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={`Imagen ampliada de ${name}`}
              onClick={closeLightbox}
              onTouchStart={(e) => {
                const t = e.touches[0];
                lbTouchX.current = t.clientX;
                lbTouchY.current = t.clientY;
              }}
              onTouchEnd={(e) => {
                if (lbTouchX.current == null) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - lbTouchX.current;
                const dy = t.clientY - (lbTouchY.current ?? 0);
                if (photos.length > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                  goLightbox(lightboxIndex + (dx < 0 ? 1 : -1));
                }
                lbTouchX.current = null;
                lbTouchY.current = null;
              }}
            >
              <button
                type="button"
                className="room-lightbox__close"
                onClick={closeLightbox}
                aria-label="Cerrar imagen ampliada"
              >
                ×
              </button>

              {photos.length > 1 && (
                <button
                  type="button"
                  className="room-lightbox__btn room-lightbox__btn--prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    goLightbox(lightboxIndex - 1);
                  }}
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>
              )}

              <figure
                className="room-lightbox__figure"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={photos[lightboxIndex]}
                  alt={`${name} — imagen ampliada ${lightboxIndex + 1}`}
                  className="room-lightbox__img"
                />
                <figcaption className="room-lightbox__caption">{name}</figcaption>
              </figure>

              {photos.length > 1 && (
                <button
                  type="button"
                  className="room-lightbox__btn room-lightbox__btn--next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goLightbox(lightboxIndex + 1);
                  }}
                  aria-label="Imagen siguiente"
                >
                  ›
                </button>
              )}

              <span className="room-lightbox__counter" aria-live="polite">
                {lightboxIndex + 1} / {photos.length}
              </span>
            </div>,
            document.body
          )
        : null}
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
        "room-card group animate-fade-in-up",
        delayClasses[animationDelay % delayClasses.length],
        className
      )}
    >
      {/* ── Zona de imagen ── */}
      <div className="room-card__media">
        <RoomCarousel photos={photos} name={room.name} />

        {/* Precio por noche — top-left */}
        <div className="room-card__price-badge pointer-events-none">
          <span className="room-card__price-main">{formatCurrency(room.pricePerNight)}</span>
          <span className="room-card__price-sub">/ noche</span>
        </div>

        {/* Precio total en estadía — top-right */}
        {room.totalAmount ? (
          <div className="room-card__total-badge pointer-events-none">
            <span className="room-card__total-main">{formatCurrency(room.totalAmount)}</span>
            {room.nights ? <span className="room-card__total-sub">{formatNightsLabel(room.nights)}</span> : null}
          </div>
        ) : null}

        {/* Overlay inferior: código + tipo */}
        <div className="room-card__img-overlay pointer-events-none">
          <span className="room-card__img-code">Hab. {room.code}</span>
          <StatusBadge
            variant="available"
            label={room.type}
            className="!bg-white/15 !text-white !ring-white/30 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div className="room-card__body">
        {/* Nombre — héroe con ícono árbol */}
        <h3 className="room-card__title">
          {treeName && (
            <svg viewBox="0 0 14 16" fill="currentColor" className="room-card__title-tree" aria-hidden="true">
              <path d="M7 0L2 6h2.5L2 11h4v4h2v-4h4l-2.5-5H12z" />
            </svg>
          )}
          {room.name}
        </h3>

        {/* Características compactas */}
        <ul className="room-card__meta" aria-label="Características">
          <li>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <circle cx="10" cy="6" r="3" /><path d="M4 17c.5-3 2.8-5 6-5s5.5 2 6 5" />
            </svg>
            Hasta {room.maxGuests} huéspedes
          </li>
          <li>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <rect x="2" y="9" width="16" height="8" rx="1.5" /><path d="M5 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M2 13h16" />
            </svg>
            {formatBeds(room)}
          </li>
          <li>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path d="M3 11h14M5 11V8a2 2 0 0 1 2-2h2.5" /><ellipse cx="12.5" cy="5.5" rx="1" ry="1" />
              <path d="M5 11v3a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-3" />
            </svg>
            {formatBathrooms(room)}
          </li>
        </ul>

        {/* Amenidades */}
        {room.amenities.length > 0 && (
          <div className="room-card__amenities">
            {room.amenities.slice(0, 4).map((item) => (
              <span key={item} className="room-card__chip">{item}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => onReserve(room)}
          className="room-card__cta"
        >
          Reservar ahora
        </button>
      </div>
    </article>
  );
}
