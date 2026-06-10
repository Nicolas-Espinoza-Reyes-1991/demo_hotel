import { describe, expect, it } from "vitest";
import { RoomStatus, RoomType } from "@prisma/client";
import { normalizeRoomCreateInput, normalizeRoomUpdateInput, serializeRoom } from "./rooms";

describe("rooms serialization", () => {
  const baseRoom = {
    id: "r1",
    code: "101",
    name: " Coihue ",
    type: RoomType.STANDARD,
    description: "  Vista  ",
    bedType: " Queen ",
    bathroomDetail: null,
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "120.50" as unknown as number,
    maxGuests: 2,
    floor: 1,
    status: RoomStatus.AVAILABLE,
    imageUrl: "/img.jpg",
    amenities: ["WiFi"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Happy path: serializeRoom convierte Decimal y arrays JSON.
  it("serializeRoom normaliza precio y arrays", () => {
    const serialized = serializeRoom(baseRoom as never);
    expect(serialized.pricePerNight).toBe(120.5);
    expect(serialized.amenities).toEqual(["WiFi"]);
    expect(serialized.beds).toHaveLength(1);
  });

  // normalizeRoomCreateInput recorta strings y nullifica vacíos.
  it("normalizeRoomCreateInput recorta campos de texto", () => {
    const data = normalizeRoomCreateInput({
      code: " 202 ",
      name: " Ulmo ",
      type: RoomType.SUPERIOR,
      description: "  ",
      bedType: "",
      bathroomDetail: undefined,
      beds: [],
      bathrooms: [],
      pricePerNight: 150,
      maxGuests: 2,
      floor: 2,
      status: RoomStatus.AVAILABLE,
      imageUrl: " /foto.jpg ",
      amenities: ["WiFi"],
    });

    expect(data.code).toBe("202");
    expect(data.name).toBe("Ulmo");
    expect(data.description).toBeNull();
    expect(data.bedType).toBeNull();
    expect(data.imageUrl).toBe("/foto.jpg");
  });

  // normalizeRoomUpdateInput solo incluye campos presentes.
  it("normalizeRoomUpdateInput aplica cambios parciales", () => {
    const data = normalizeRoomUpdateInput({
      name: " Nuevo nombre ",
      pricePerNight: 199,
    });
    expect(data.name).toBe("Nuevo nombre");
    expect(data.pricePerNight).toBe(199);
    expect(data).not.toHaveProperty("code");
  });
});
