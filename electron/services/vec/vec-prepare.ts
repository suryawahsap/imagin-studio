/**
 * vec-prepare.ts — Pre-processing MINIMAL (rebuild-plan.md F1.2).
 *
 * Yang dibuang: flood fill manual, color clustering manual, edge cleanup,
 * symmetry detection. VTracer sendiri handle semua itu via --clustering,
 * --max-colors, --watershed, dst.
 *
 * Yang dipertahankan HANYA 3 hal:
 *   Convert ke PNG jika input JPEG (vtracer handle PNG lebih baik)
 *   Resize ke max 1500px jika gambar terlalu besar (vtracer lambat pada
 *      gambar besar; hasil SVG tetap tajam karena vector)
 *   Flatten alpha ke warna border dominan — HANYA jika gambar hampir
 *      seluruhnya opaque (mis. screenshot/ikon dengan sudut transparan).
 *      vtracer 1.0-alpha.3 men-trace batas area transparan sebagai bentuk
 *      artwork ("squircle"); ikon ber-background transparan justru butuh
 *      alpha-nya, jadi tidak di-flatten.
 */

import fs from "fs";
import { PNG } from "pngjs";
import path from "path";

export interface PrepareResult {
  outputPath: string; // path PNG yang siap diproses vtracer
  resized: boolean;
  converted: boolean;
}

const DEFAULT_MAX_DIM = 1500;
// Ambang pixel transparan di bawah mana gambar dianggap "hampir opaque"
// (sudut/margin transparan) dan alpha-nya di-flatten.
// ponytail: batas kasar 15%; upgrade path = flood-fill segmentasi kalau ada
// kasus ilustrasi opaque dengan area transparan >15%.
const NEARLY_OPAQUE_TRANSPARENT_RATIO = 0.15;

function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

/**
 * Composite pixel transparan ke warna border dominan sehingga vtracer tidak
 * men-trace batas alpha sebagai bentuk artwork.
 * Mengembalikan true bila flatten dilakukan (gambar hampir opaque).
 */
function flattenAlphaIfMostlyOpaque(png: PNG): boolean {
  const { width, height, data } = png;
  let transp = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transp++;
  const ratio = transp / (width * height);
  if (ratio === 0 || ratio >= NEARLY_OPAQUE_TRANSPARENT_RATIO) return false;

  // Warna dominan pixel border yang opaque (bucket RGB 4-bit, fallback putih)
  const hist = new Map<number, { n: number; r: number; g: number; b: number }>();
  const sample = (x: number, y: number) => {
    const i = (y * width + x) << 2;
    if (data[i + 3] < 128) return;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = hist.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2];
    hist.set(key, e);
  };
  const stepX = Math.max(1, Math.floor(width / 256));
  const stepY = Math.max(1, Math.floor(height / 256));
  for (let x = 0; x < width; x += stepX) { sample(x, 0); sample(x, height - 1); }
  for (let y = 0; y < height; y += stepY) { sample(0, y); sample(width - 1, y); }
  let bg = { r: 255, g: 255, b: 255 };
  let best = 0;
  for (const e of hist.values()) {
    if (e.n > best) { best = e.n; bg = { r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }; }
  }

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a >= 1) continue;
    data[i] = Math.round(data[i] * a + bg.r * (1 - a));
    data[i + 1] = Math.round(data[i + 1] * a + bg.g * (1 - a));
    data[i + 2] = Math.round(data[i + 2] * a + bg.b * (1 - a));
    data[i + 3] = 255;
  }
  return true;
}

function imageDimensions(buf: Buffer): { width: number; height: number } {
  if (isPng(buf)) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
      }
      const segLen = buf.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
  }
  return { width: 0, height: 0 };
}

/**
 * Siapkan gambar untuk tracing.
 * - JPEG → decode ke PNG (via pngjs; JPEG decode terbatas — jika gagal,
 *   copy file apa adanya, vtracer mungkin tetap bisa baca).
 * - Gambar besar → resize ke maxDimension (nearest-neighbor — untuk tracing
 *   cukup; vtracer yang melakukan halusinasi vektor).
 */
export function prepareForTrace(
  inputPath: string,
  outputPath: string,
  options: { maxDimension?: number } = {}
): PrepareResult {
  const maxDim = options.maxDimension || DEFAULT_MAX_DIM;
  const buf = fs.readFileSync(inputPath);
  const result: PrepareResult = { outputPath, resized: false, converted: false };

  // JPEG → PNG
  if (!isPng(buf)) {
    result.converted = true;
  }

  const { width, height } = imageDimensions(buf);
  const needsResize = width > maxDim || height > maxDim;
  result.resized = needsResize;

  try {
    const png = PNG.sync.read(buf);
    const flattened = flattenAlphaIfMostlyOpaque(png);
    if (!needsResize) {
      // Tidak perlu resize — tulis PNG (atau copy jika sudah PNG & tak diubah)
      if (isPng(buf) && !flattened) {
        fs.copyFileSync(inputPath, outputPath);
      } else {
        fs.writeFileSync(outputPath, PNG.sync.write(png));
      }
      return result;
    }

    // Resize ke maxDim (nearest-neighbor)
    const scale = Math.min(maxDim / width, maxDim / height);
    const nw = Math.max(4, Math.round(width * scale));
    const nh = Math.max(4, Math.round(height * scale));
    const resized = new PNG({ width: nw, height: nh });
    for (let y = 0; y < nh; y++) {
      const sy = Math.min(height - 1, Math.floor(y / scale));
      for (let x = 0; x < nw; x++) {
        const sx = Math.min(width - 1, Math.floor(x / scale));
        const si = (sy * width + sx) * 4;
        const di = (y * nw + x) * 4;
        resized.data[di] = png.data[si];
        resized.data[di + 1] = png.data[si + 1];
        resized.data[di + 2] = png.data[si + 2];
        resized.data[di + 3] = png.data[si + 3];
      }
    }
    fs.writeFileSync(outputPath, PNG.sync.write(resized));
    result.resized = true;
    return result;
  } catch (err: any) {
    // PNG decode gagal (mis. JPEG tidak didukung pngjs) — copy apa adanya
    try { fs.copyFileSync(inputPath, outputPath); } catch {}
    return result;
  }
}

export function preparePath(tempRoot: string, tempId: string): string {
  return path.join(tempRoot, `${tempId}_prep.png`);
}
