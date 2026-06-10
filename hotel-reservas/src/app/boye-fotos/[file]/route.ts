import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";

type RouteParams = { params: Promise<{ file: string }> };

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function contentTypeFor(extension: string): string {
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { file } = await params;
  const safeFile = path.basename(decodeURIComponent(file));
  const extension = path.extname(safeFile).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return Response.json({ error: "Formato no permitido." }, { status: 400 });
  }

  const imagePath = path.resolve(process.cwd(), "..", "boye_fotos", safeFile);

  try {
    const image = await readFile(imagePath);
    return new Response(image, {
      headers: {
        "Content-Type": contentTypeFor(extension),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return Response.json({ error: "Imagen no encontrada." }, { status: 404 });
  }
}
