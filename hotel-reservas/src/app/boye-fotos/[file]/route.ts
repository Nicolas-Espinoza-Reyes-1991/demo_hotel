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



async function tryReadImage(...candidates: string[]): Promise<Buffer | null> {

  for (const candidate of candidates) {

    try {

      return await readFile(candidate);

    } catch {

      // siguiente candidato

    }

  }

  return null;

}



export async function GET(_request: NextRequest, { params }: RouteParams) {

  const { file } = await params;

  const safeFile = path.basename(decodeURIComponent(file));

  const extension = path.extname(safeFile).toLowerCase();



  if (!ALLOWED_EXTENSIONS.has(extension)) {

    return Response.json({ error: "Formato no permitido." }, { status: 400 });

  }



  const publicDir = path.join(process.cwd(), "public");

  const image = await tryReadImage(

    path.join(publicDir, "boye-fotos", safeFile),

    path.join(publicDir, "uploads", "rooms", safeFile),

    path.join(process.cwd(), "..", "boye_fotos", safeFile)

  );



  if (!image) {

    return Response.json({ error: "Imagen no encontrada." }, { status: 404 });

  }



  return new Response(new Uint8Array(image), {

    headers: {

      "Content-Type": contentTypeFor(extension),

      "Cache-Control": "public, max-age=86400",

    },

  });

}


