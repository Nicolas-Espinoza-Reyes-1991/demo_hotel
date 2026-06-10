"use client";

import { formatCurrency, formatNightsLabel } from "@/lib/dates";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

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

const BOYE_ROOM_IMAGES = [
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.07.58.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.06.02.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.21.10.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.10.16.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.09.02.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.09.37.jpeg",
];

function getRoomImage(room: RoomCardData): string | null {
  if (room.imageUrl && !room.imageUrl.includes("images.unsplash.com")) {
    return room.imageUrl;
  }

  const codeNumber = Number(room.code.replace(/\D/g, ""));
  const index = Number.isFinite(codeNumber) ? codeNumber % BOYE_ROOM_IMAGES.length : 0;
  return BOYE_ROOM_IMAGES[index];
}

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
  const displayImageUrl = getRoomImage(room);
  const fallbackImage = BOYE_ROOM_IMAGES[Number(room.code.replace(/\D/g, "")) % BOYE_ROOM_IMAGES.length];

  return (
    <article
      className={cn(
        "group animate-fade-in-up glass-panel overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-accent-bright/45 hover:shadow-lg hover:shadow-emerald-500/18",
        delayClasses[animationDelay % delayClasses.length],
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-800">
        {displayImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImageUrl}
            alt={room.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            onError={(event) => {
              const target = event.currentTarget;
              if (target.src.endsWith(fallbackImage)) return;
              target.src = fallbackImage;
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-500">Sin imagen</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-100/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute left-3 top-3">
          <StatusBadge variant="available" label={room.type} />
        </div>
        {room.totalAmount ? (
          <div className="absolute bottom-3 right-3 rounded-xl bg-highlight/95 px-3 py-1.5 text-sm font-extrabold text-white shadow-lg">
            {formatCurrency(room.totalAmount)}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-500">
              Hab. {room.code}
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
