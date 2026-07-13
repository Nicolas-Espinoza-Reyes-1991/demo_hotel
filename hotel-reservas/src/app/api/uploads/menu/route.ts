import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { jsonError, jsonOk, handleApiError } from "@/lib/api-response";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Debés seleccionar una imagen.", 400);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return jsonError("Formato no permitido. Usá JPG, PNG o WEBP.", 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError("La imagen excede 8 MB.", 400);
    }

    const originalName = sanitizeFilename(file.name || "plato");
    const extension = path.extname(originalName) || ".jpg";
    const baseName = path.basename(originalName, extension) || "plato";
    const finalName = `${baseName}-${randomUUID().slice(0, 8)}${extension}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, finalName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    return jsonOk(
      {
        message: "Imagen subida correctamente.",
        url: `/uploads/menu/${finalName}`,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
