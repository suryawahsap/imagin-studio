/**
 *ups-validate.ts — Validasi item antrean upscale (kontrak renderer main).
 *
 * Modul murni tanpa import electron agar bisa dites langsung via tsx.
 * Aturan tileSize: undefined | 0 (auto) | integer 64–4096 — 0 harus diterima
 * karena UI mengirim 0 sebagai default ("auto").
 */

const UPSCALE_SCALES = ["2x", "3x", "4x", "custom", "4k", "6k", "8k"] as const;
const UPSCALE_ENGINES = ["auto", "realesrgan", "waifu2x"] as const;
const UPSCALE_OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const finiteNumber = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

export function isValidUpscaleTileSize(v: unknown): boolean {
  if (v === undefined) return true;
  return Number.isInteger(v) && (v === 0 || finiteNumber(v, 64, 4096));
}

export function isValidUpscaleQueueItem(item: unknown, maxScale: number): boolean {
  if (!isRecord(item)) return false;
  if (typeof item.tempId !== "string" || item.tempId.length === 0 || item.tempId.length > 256) return false;
  if (item.engine !== undefined && !UPSCALE_ENGINES.includes(item.engine as typeof UPSCALE_ENGINES[number])) return false;
  const scale = (typeof item.scale === "string" && item.scale) || "2x";
  if (!UPSCALE_SCALES.includes(scale as typeof UPSCALE_SCALES[number])) return false;
  if (scale === "custom" && !finiteNumber(item.customScale, 2, maxScale)) return false;
  if (item.customScale !== undefined && !finiteNumber(item.customScale, 2, maxScale)) return false;
  if (!isValidUpscaleTileSize(item.tileSize)) return false;
  if (item.outputFormat !== undefined && !UPSCALE_OUTPUT_FORMATS.includes(item.outputFormat as typeof UPSCALE_OUTPUT_FORMATS[number])) return false;
  return true;
}
