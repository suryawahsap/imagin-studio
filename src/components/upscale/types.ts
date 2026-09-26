// Shared types & constants for the Upscale module
// Fully typed and compliant with electron backend contracts

export type AssetTypeUpscale = "photo" | "illustration" | "icon" | "anime" | "line";
export type PipelineStatus = "imported" | "ready" | "queued" | "processing" | "completed" | "exported" | "failed";
export type EngineId = "auto" | "realesrgan" | "waifu2x";
export type ScaleMode = "2x" | "3x" | "4x" | "custom" | "4k" | "6k" | "8k";
export type OutputFormat = "png" | "jpeg" | "webp";

export const MOCKUP_STAGES: { step: number; label: string }[] = [
  { step: 1, label: "Load" },
  { step: 2, label: "Verify" },
  { step: 3, label: "Pre-proc" },
  { step: 4, label: "Tile" },
  { step: 5, label: "ESRGAN" },
  { step: 6, label: "Fusion" },
  { step: 7, label: "Post-proc" },
  { step: 8, label: "Format" },
  { step: 9, label: "Save" },
];

export const ENGINE_OPTIONS: Array<{ id: EngineId; label: string; desc: string; bestFor: string }> = [
  { id: "auto", label: "Standard (Balanced)", desc: "Auto-select best engine based on image characteristics", bestFor: "Auto detection" },
  { id: "realesrgan", label: "Real-ESRGAN (Photorealistic)", desc: "Deep neural upscale for photos, 3D renders & fine details", bestFor: "Photos & Renders" },
  { id: "waifu2x", label: "Waifu2x (Anime & CGI)", desc: "Bicubic neural upscaler for illustrations, anime & line art", bestFor: "Anime & Graphics" },
];

export function engineLabel(id?: EngineId): string {
  return ENGINE_OPTIONS.find(o => o.id === id)?.label || "Standard (Balanced)";
}

export const TYPE_META: Record<AssetTypeUpscale, { label: string; engine: EngineId }> = {
  illustration: { label: "Illustration", engine: "waifu2x" },
  anime: { label: "Anime", engine: "waifu2x" },
  line: { label: "Line Art", engine: "waifu2x" },
  photo: { label: "Photo", engine: "realesrgan" },
  icon: { label: "Icon", engine: "realesrgan" },
};

export function scaleSteps(scale: ScaleMode, custom: number): number[] {
  if (scale === "custom") return [Math.min(8, Math.max(1, custom || 2))];
  if (scale === "3x") return [3];
  if (scale === "4k") return [3840];
  if (scale === "6k") return [6144];
  if (scale === "8k") return [7680];
  return scale === "4x" ? [4] : [2];
}

export function formatSteps(scale: ScaleMode, custom: number): string {
  if (scale === "4k") return "4K (3840px)";
  if (scale === "6k") return "6K (6144px)";
  if (scale === "8k") return "8K (7680px)";
  return scaleSteps(scale, custom).map(s => `${s}x`).join(" → ");
}

export interface Asset {
  tempId: string;
  originalName: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  previewUrl?: string;
  status: PipelineStatus;
  assetType?: AssetTypeUpscale;
  engine: EngineId;
  scale: ScaleMode;
  customScale: number;
  tileSize: number;
  whiteBackground: boolean;
  outputFormat: OutputFormat;
  priority: number;
  selected: boolean;
  error?: string;
  outputUrl?: string;
  originalUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  elapsedMs?: number;
  fallbackUsed?: boolean;
  exportedAt?: number;
}

export interface HistoryEntry {
  id: string;
  source: string;
  output: string;
  engine: string;
  scale: string;
  timestamp: number;
  elapsedMs?: number;
}

export const blobUrlCache = new Map<string, string>();
export async function toBlobUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (blobUrlCache.has(url)) return blobUrlCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(url, blobUrl);
    return blobUrl;
  } catch {
    return undefined;
  }
}

export function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function detectAssetType(previewUrl: string, width: number, height: number, mimeType: string): Promise<AssetTypeUpscale> {
  try {
    const img = await loadImageEl(previewUrl);
    const sample = 48;
    const canvas = document.createElement("canvas");
    canvas.width = sample;
    canvas.height = sample;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-ctx");
    ctx.drawImage(img, 0, 0, sample, sample);
    const { data } = ctx.getImageData(0, 0, sample, sample);

    let transparent = 0;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) transparent++;
      colors.add(`${data[i] >> 4}-${data[i + 1] >> 4}-${data[i + 2] >> 4}`);
    }
    const totalPx = sample * sample;
    const alphaRatio = transparent / totalPx;
    const colorDensity = colors.size / totalPx;
    const ratio = width / height;
    const isSquareSmall = Math.abs(width - height) < Math.max(width, height) * 0.06 && width <= 512;
    const screenRatios = [16 / 9, 16 / 10, 4 / 3, 21 / 9];
    const looksLikeScreenshot = width >= 1000 && screenRatios.some(r => Math.abs(ratio - r) < 0.05);

    if (alphaRatio > 0.04 && isSquareSmall) return "icon";
    if (alphaRatio > 0.08) return "illustration";
    if (looksLikeScreenshot && colorDensity < 0.35) return "photo";
    if (alphaRatio > 0) return "line";
    if (colorDensity < 0.08) return "line";
    if (colorDensity < 0.22) return "illustration";
    return "photo";
  } catch {
    if (width === height && width <= 512) return "icon";
    if (mimeType === "image/png") return "illustration";
    return "photo";
  }
}
