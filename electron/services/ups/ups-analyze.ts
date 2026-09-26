/**
 * ups-analyze.ts — Deteksi kategori gambar untuk pilih engine (rebuild-plan.md F2.1).
 *
 * Deteksi sederhana berdasarkan: jumlah warna (sedikit → illustration/icon),
 * ada alpha (→ icon), ukuran kecil (→ icon).
 */

import fs from "fs";
import { PNG } from "pngjs";

export type ImageCategory = "photo" | "illustration" | "anime" | "icon";

export interface UpsAnalysis {
  category: ImageCategory;
  width: number;
  height: number;
  hasAlpha: boolean;
  estimatedColors: number;
}

const SAMPLE = 96;

function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function dimensions(buf: Buffer): { width: number; height: number } {
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
      offset += 2 + buf.readUInt16BE(offset + 2);
    }
  }
  return { width: 0, height: 0 };
}

export function categorizeImage(filePath: string): UpsAnalysis {
  const buf = fs.readFileSync(filePath);
  const { width, height } = dimensions(buf);
  let hasAlpha = false;
  let estimatedColors = 0;

  try {
    const png = PNG.sync.read(buf);
    const sw = Math.min(png.width, SAMPLE);
    const sh = Math.min(png.height, SAMPLE);
    const stepX = Math.max(1, Math.floor(png.width / sw));
    const stepY = Math.max(1, Math.floor(png.height / sh));
    const colors = new Set<string>();
    for (let y = 0; y < png.height; y += stepY) {
      for (let x = 0; x < png.width; x += stepX) {
        const i = (y * png.width + x) << 2;
        if (png.data[i + 3] < 250) hasAlpha = true;
        colors.add(`${png.data[i] >> 4}-${png.data[i + 1] >> 4}-${png.data[i + 2] >> 4}`);
      }
    }
    estimatedColors = colors.size;
  } catch {}

  // Kategorisasi
  let category: ImageCategory;
  const small = Math.min(width, height) <= 256;
  if (hasAlpha && small) category = "icon";
  else if (estimatedColors <= 12) category = small ? "icon" : "illustration";
  else if (estimatedColors <= 48) category = "illustration";
  else category = "photo";

  // Anime: warna terbatas + edge tegas biasanya illustration — waifu2x cocok.
  // Untuk simplicity: illustration → waifu2x (anime) jika binary ada, engine
  // override tetap bisa pilih.

  return { category, width, height, hasAlpha, estimatedColors };
}
