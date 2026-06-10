import type { Prisma, Room } from "@prisma/client";
import type { z } from "zod";
import type { createRoomSchema, updateRoomAdminSchema } from "@/lib/validations";

export function serializeRoom(room: Room) {
  return {
    ...room,
    pricePerNight: Number(room.pricePerNight),
    beds: Array.isArray(room.beds) ? (room.beds as unknown[]) : [],
    bathrooms: Array.isArray(room.bathrooms) ? (room.bathrooms as unknown[]) : [],
    amenities: Array.isArray(room.amenities) ? (room.amenities as string[]) : [],
  };
}

type CreateRoomInput = z.infer<typeof createRoomSchema>;
type UpdateRoomInput = z.infer<typeof updateRoomAdminSchema>;

function normalizeRoomFields(data: UpdateRoomInput): Prisma.RoomUpdateInput {
  return {
    ...(data.code !== undefined ? { code: data.code.trim() } : {}),
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.description !== undefined
      ? { description: data.description?.trim() ? data.description.trim() : null }
      : {}),
    ...(data.bedType !== undefined
      ? { bedType: data.bedType?.trim() ? data.bedType.trim() : null }
      : {}),
    ...(data.bathroomDetail !== undefined
      ? { bathroomDetail: data.bathroomDetail?.trim() ? data.bathroomDetail.trim() : null }
      : {}),
    ...(data.beds !== undefined ? { beds: data.beds } : {}),
    ...(data.bathrooms !== undefined ? { bathrooms: data.bathrooms } : {}),
    ...(data.pricePerNight !== undefined ? { pricePerNight: data.pricePerNight } : {}),
    ...(data.maxGuests !== undefined ? { maxGuests: data.maxGuests } : {}),
    ...(data.floor !== undefined ? { floor: data.floor ?? null } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.imageUrl !== undefined
      ? { imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null }
      : {}),
    ...(data.amenities !== undefined ? { amenities: data.amenities } : {}),
  };
}

export function normalizeRoomCreateInput(data: CreateRoomInput): Prisma.RoomCreateInput {
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    type: data.type,
    description: data.description?.trim() ? data.description.trim() : null,
    bedType: data.bedType?.trim() ? data.bedType.trim() : null,
    bathroomDetail: data.bathroomDetail?.trim() ? data.bathroomDetail.trim() : null,
    beds: data.beds,
    bathrooms: data.bathrooms,
    pricePerNight: data.pricePerNight,
    maxGuests: data.maxGuests,
    floor: data.floor ?? null,
    status: data.status,
    imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
    amenities: data.amenities,
  };
}

export function normalizeRoomUpdateInput(data: UpdateRoomInput): Prisma.RoomUpdateInput {
  return normalizeRoomFields(data);
}

/** @deprecated Usar normalizeRoomCreateInput o normalizeRoomUpdateInput */
export function normalizeRoomInput(data: {
  code?: string;
  name?: string;
  type?: Room["type"];
  description?: string | null;
  bedType?: string | null;
  bathroomDetail?: string | null;
  beds?: Array<{ size: "SINGLE" | "DOUBLE" | "KING"; count: number }>;
  bathrooms?: Array<{ type: "PRIVATE" | "SHARED"; count: number }>;
  pricePerNight?: number;
  maxGuests?: number;
  floor?: number | null;
  status?: Room["status"];
  imageUrl?: string | null;
  amenities?: string[];
}) {
  return normalizeRoomFields(data);
}
