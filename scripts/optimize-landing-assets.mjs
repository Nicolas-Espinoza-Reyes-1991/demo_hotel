/**
 * Optimiza fotos_web + logo PNG sin cambiar rutas/nombres.
 * Hero (frontis): máx 1600px / q80. Resto: máx 1200px / q78.
 * Solo reemplaza si el resultado es más liviano.
 *
 * Uso: node scripts/optimize-landing-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fotosDir = path.join(root, "fotos_web");
const heroRel = path.join("arquitectura_hotel_vista", "frontis.webp");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function optimizeOne(filePath, { maxWidth, quality }) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return null;

  const before = fs.statSync(filePath).size;
  const input = fs.readFileSync(filePath);
  const img = sharp(input, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const width = meta.width || 0;
  let pipeline = img;
  if (width > maxWidth) {
    pipeline = pipeline.resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  let outBuf;
  if (ext === ".webp") {
    outBuf = await pipeline.webp({ quality, effort: 6 }).toBuffer();
  } else if (ext === ".png") {
    outBuf = await pipeline
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();
  } else {
    outBuf = await pipeline
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toBuffer();
  }

  if (outBuf.length >= before) {
    return { file: filePath, before, after: before, skipped: true };
  }

  fs.writeFileSync(filePath, outBuf);
  return { file: filePath, before, after: outBuf.length, skipped: false };
}

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function main() {
  const files = walk(fotosDir).filter((f) =>
    IMAGE_EXT.has(path.extname(f).toLowerCase()),
  );

  let saved = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const rel = path.relative(fotosDir, file);
    const isHero = rel === heroRel;
    const result = await optimizeOne(file, {
      maxWidth: isHero ? 1600 : 1200,
      quality: isHero ? 80 : 78,
    });
    if (!result) continue;
    totalBefore += result.before;
    totalAfter += result.after;
    saved += result.before - result.after;
    const mark = result.skipped ? "skip" : "ok";
    console.log(
      `[${mark}] ${rel}: ${kb(result.before)} → ${kb(result.after)}`,
    );
  }

  const logoPng = path.join(root, "assets", "logo-casona.png");
  if (fs.existsSync(logoPng)) {
    const result = await optimizeOne(logoPng, { maxWidth: 800, quality: 80 });
    if (result) {
      totalBefore += result.before;
      totalAfter += result.after;
      saved += result.before - result.after;
      console.log(
        `[${result.skipped ? "skip" : "ok"}] assets/logo-casona.png: ${kb(result.before)} → ${kb(result.after)}`,
      );
    }
  }

  const logoWebp = path.join(root, "assets", "logo-casona.webp");
  if (fs.existsSync(logoWebp)) {
    const result = await optimizeOne(logoWebp, { maxWidth: 800, quality: 80 });
    if (result) {
      totalBefore += result.before;
      totalAfter += result.after;
      saved += result.before - result.after;
      console.log(
        `[${result.skipped ? "skip" : "ok"}] assets/logo-casona.webp: ${kb(result.before)} → ${kb(result.after)}`,
      );
    }
  }

  console.log(
    `\nTotal: ${kb(totalBefore)} → ${kb(totalAfter)} (ahorro ${kb(saved)})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
