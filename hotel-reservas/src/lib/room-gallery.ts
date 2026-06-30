/**
 * Galería de fotos por habitación.
 * Cada habitación tiene un nombre de árbol nativo chileno y un set de fotos
 * almacenadas en public/habitaciones/{folder}/.
 * La clave es el número entero extraído del código de habitación (01 → 1).
 */
export type RoomGallery = {
  /** Nombre del árbol nativo — identidad visual de la habitación */
  treeName: string;
  /** Carpeta dentro de public/habitaciones/ */
  folder: string;
  /** Archivos de foto dentro de la carpeta */
  photos: string[];
};

export const ROOM_GALLERY: Record<number, RoomGallery> = {
  1: {
    treeName: "Canelo",
    folder: "habitacion_1_canelo",
    photos: ["1.webp", "2.webp", "3.webp", "4.webp"],
  },
  2: {
    treeName: "Laurel",
    folder: "habitacion_2_laurel",
    photos: ["1.webp", "2.webp", "3.webp"],
  },
  3: {
    treeName: "Ma\u00F1\u00EDo",
    folder: "habitacion_3_ma\u00F1io",
    photos: ["1.webp", "2.webp", "3.webp"],
  },
  4: {
    treeName: "Roble",
    folder: "habitacion_4_roble",
    photos: ["1.webp", "2.webp", "file_000000001d34720ebbb7d9eb9169ed7b.webp"],
  },
  5: {
    treeName: "Raul\u00ED",
    folder: "habitacion_5_rauli",
    photos: ["1.webp", "2.webp", "3.webp", "4.webp"],
  },
  6: {
    treeName: "Ulmo",
    folder: "habitacion_6_ulmo",
    photos: ["1.webp", "2.webp", "3.webp", "4.webp", "5.webp"],
  },
  7: {
    treeName: "Alerce",
    folder: "habitacion_7_alerce",
    photos: ["1.webp", "2.webp", "3.webp", "4.webp"],
  },
};

/** Devuelve la galería para un código de habitación ("01", "1", "HAB-03", etc.) */
export function getGalleryForRoom(code: string): RoomGallery | null {
  const num = parseInt(code.replace(/\D/g, ""), 10);
  return ROOM_GALLERY[num] ?? null;
}

/** Array de rutas de foto listas para usar en <img src> dentro del módulo Next.js */
export function getPhotosForRoom(code: string): string[] {
  const gallery = getGalleryForRoom(code);
  if (!gallery) return [];
  return gallery.photos.map(
    (photo) => `/habitaciones/${gallery.folder}/${photo}`
  );
}

/** Nombre del árbol o null si no hay galería para este código */
export function getTreeNameForRoom(code: string): string | null {
  return getGalleryForRoom(code)?.treeName ?? null;
}
