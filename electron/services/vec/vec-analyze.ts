/**
 * vec-analyze.ts — Analisis gambar sederhana (rebuild-plan.md F1.1).
 *
 * Tujuan: deteksi karakteristik gambar → pilih VTracer config yang tepat.
 * Prinsip: SEDERHANA. Hanya butuh 3 jawaban:
 *   Apakah background perlu dihapus?
 *   Berapa banyak warna yang relevan?
 *   Apa tipe artwork-nya?
 *
 * Tidak ada edge density, tidak ada symmetry, tidak ada metrik kompleks.
 */

import fs from "fs";
import { PNG } from "pngjs";

export type AssetType =
  | "flat-icon"         // icon transparan atau bg putih, warna solid
  | "outline-icon"      // outline hitam tebal di atas bg solid (seperti botol)
  | "flat-illustration" // ilustrasi berwarna, multiple shape
  | "line-art"          // hitam-putih, outline murni
  | "photo"             // foto atau render dengan banyak gradasi
  | "pixel-art"         // pixel art resolusi kecil
  | "cut-engrave";      // garis besar untuk laser/vinil (preset manual)

export interface VtracerHints {
  filterSpeckle: number;       // 2–16
  colorPrecision: number;      // 4–8
  simplify: number;            // 0.5–2.5
  clustering: "color-cluster" | "bw" | "watershed";
  hierarchical: "stacked" | "cutout";
  maxColors?: number;          // null atau 4–32
  watershedDetail?: number;    // null atau 128–220
  preset?: "bw" | "poster" | "photo";
}

export interface ImageAnalysis {
  assetType: AssetType;
  width: number;
  height: number;
  hasAlpha: boolean;          // alpha channel tersedia
  bgColor: string | null;     // warna background terdeteksi (#rrggbb)
  bgIsLight: boolean;         // bg near-white/light
  estimatedColors: number;    // perkiraan jumlah warna dominan
  isSmall: boolean;           // < 200px di sisi terpendek
  confidence: "high" | "low";
  // Field baru — diisi Gemini, opsional (pixel analysis tidak mengisi ini)
  hasGradient?: boolean;
  dominantColors?: string[];  // hex, max 8
  vtracerHints?: VtracerHints;
}

const VALID_ASSET_TYPES: AssetType[] = [
  "flat-icon",
  "outline-icon",
  "flat-illustration",
  "line-art",
  "photo",
  "pixel-art",
  "cut-engrave",
];

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN;
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function clampFloat(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : NaN;
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

const CLUSTERING: VtracerHints["clustering"][] = ["color-cluster", "bw", "watershed"];
const HIERARCHICAL: VtracerHints["hierarchical"][] = ["stacked", "cutout"];
const PRESETS: NonNullable<VtracerHints["preset"]>[] = ["bw", "poster", "photo"];

function normalizeGeminiResult(raw: any): Partial<ImageAnalysis> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const out: Partial<ImageAnalysis> = {};

  if (typeof raw.assetType === "string" && (VALID_ASSET_TYPES as string[]).includes(raw.assetType)) {
    out.assetType = raw.assetType;
  }

  if (typeof raw.hasGradient === "boolean") out.hasGradient = raw.hasGradient;

  if (Array.isArray(raw.dominantColors)) {
    const hexes = (raw.dominantColors as unknown[])
      .filter((c): c is string => typeof c === "string")
      .map((c: string) => {
        const m = c.trim().match(/^#?([0-9a-fA-F]{6})$/);
        return m ? `#${m[1].toLowerCase()}` : null;
      })
      .filter((c): c is string => c !== null);
    if (hexes.length > 0) out.dominantColors = hexes.slice(0, 8);
  }

  const h = raw.vtracerHints;
  if (typeof h === "object" && h !== null) {
    const hints: VtracerHints = {
      filterSpeckle: clampInt(h.filterSpeckle, 2, 16, 8),
      colorPrecision: clampInt(h.colorPrecision, 4, 8, 6),
      simplify: clampFloat(h.simplify, 0.5, 2.5, 1.5),
      clustering: CLUSTERING.includes(h.clustering) ? h.clustering : "color-cluster",
      hierarchical: HIERARCHICAL.includes(h.hierarchical) ? h.hierarchical : "stacked",
    };
    if (h.maxColors === null || h.maxColors === undefined) {
      hints.maxColors = undefined;
    } else if (typeof h.maxColors === "number") {
      hints.maxColors = clampInt(h.maxColors, 4, 32, 16);
    }
    if (h.watershedDetail === null || h.watershedDetail === undefined) {
      hints.watershedDetail = undefined;
    } else if (typeof h.watershedDetail === "number") {
      hints.watershedDetail = clampInt(h.watershedDetail, 128, 220, 160);
    }
    if (PRESETS.includes(h.preset)) {
      hints.preset = h.preset as NonNullable<VtracerHints["preset"]>;
    }
    out.vtracerHints = hints;
  }

  return out;
}

const GEMINI_SYSTEM_PROMPT = `You are a professional vector tracing analyst. Analyze the image and return ONLY valid JSON (no markdown fences) with the following schema:

{
  "assetType": "flat-icon" | "outline-icon" | "flat-illustration" | "line-art" | "photo" | "pixel-art" | "cut-engrave",
  "hasGradient": boolean,
  "dominantColors": string[] (hex #rrggbb, max 8),
  "vtracerHints": {
    "filterSpeckle": number (2-16),
    "colorPrecision": number (4-8),
    "simplify": number (0.5-2.5),
    "clustering": "color-cluster" | "bw" | "watershed",
    "hierarchical": "stacked" | "cutout",
    "maxColors": number (4-32) or null,
    "watershedDetail": number (128-220) or null,
    "preset": "bw" | "poster" | "photo"
  }
}

Guidance per asset type:
- flat-icon / outline-icon: clustering=color-cluster, hierarchical=cutout, simplify 1.0-1.5
- line-art: preset=bw, clustering=bw, simplify 1.0-2.0
- flat-illustration: clustering=color-cluster, hierarchical=stacked, simplify 0.8-1.2
- photo / gradient: clustering=watershed, hierarchical=cutout, watershedDetail 160-200`;

function extractJson(text: string): any {
  const trimmed = text.trim();
  // Strip markdown fences seperti ```json ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Cari blok JSON pertama dalam teks jika top-level gagal
    const objMatch = candidate.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch {}
    }
    return null;
  }
}

/**
 * Analisis gambar via Gemini Vision (async, fire-and-forget).
 * Return null jika gagal (network/parse) — tidak pernah throw.
 */
export async function analyzeImageWithGemini(
  filePath: string,
  apiKey: string,
  opts?: { baseUrl?: string; model?: string; tempId?: string }
): Promise<Partial<ImageAnalysis> | null> {
  const baseUrl = (opts?.baseUrl || "https://9router.rahmatur.dev").replace(/\/+$/, "");
  const model = opts?.model || "ag/gemini-2.5-flash";
  const tempId = opts?.tempId || "";
  try {
    const buf = fs.readFileSync(filePath);
    const b64 = buf.toString("base64");
    const mime = isPng(buf) ? "image/png" : "image/jpeg";

    if (!apiKey) {
      console.warn("[vec-analyze] Gemini skip: no api key");
      return null;
    }

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: GEMINI_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image for vector tracing. Return JSON only." },
              { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
            ],
          },
        ],
        stream: false,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[vec-analyze] Gemini skip: HTTP ${res.status}`);
      return null;
    }

    const json: any = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw
      : Array.isArray(raw) ? raw.map((c: any) => c?.text || "").filter(Boolean).join("\n")
      : "";
    if (!text) {
      console.warn("[vec-analyze] Gemini skip: empty content");
      return null;
    }

    const parsed = extractJson(text);
    if (!parsed) {
      console.warn("[vec-analyze] Gemini skip: parse failed");
      return null;
    }

    const result = normalizeGeminiResult(parsed);
    if (!result) {
      console.warn("[vec-analyze] Gemini skip: normalize failed");
      return null;
    }

    console.log("[vec-analyze] Gemini enhanced:", tempId.slice(0, 12), result.assetType || "");
    return result;
  } catch (err: any) {
    console.warn("[vec-analyze] Gemini skip:", err?.message || "network error");
    return null;
  }
}

const SAMPLE = 128; // sampling resolution (cukup untuk estimasi)

function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

/** Deteksi tipe artwork dari metrik sederhana (tanpa edge density). */
export function classifyAsset(a: {
  hasAlpha: boolean;
  bgIsLight: boolean;
  estimatedColors: number;
  width: number;
  height: number;
}): AssetType {
  // Pixel art — resolusi sangat kecil
  if (a.width <= 128 || a.height <= 128) return "pixel-art";

  // Foto / render — banyak warna. (Bukan berdasarkan jumlah pixel: kartun
  // 1024² punya <20 warna dan harusnya TIDAK masuk preset photo.)
  if (a.estimatedColors > 64) return "photo";

  if (a.hasAlpha) {
    // Transparan + warna terbatas → flat icon
    if (a.estimatedColors <= 16) return "flat-icon";
    return "flat-illustration";
  }

  // Opaque + background terang
  if (a.bgIsLight) {
    if (a.estimatedColors <= 5) return "line-art";          // hitam-putih murni
    if (a.estimatedColors <= 25) return "outline-icon";     // botol, headset
    return "flat-illustration";                             // banyak warna
  }

  // Background gelap / tidak terang
  if (a.estimatedColors <= 16) return "flat-icon";
  return "flat-illustration";
}

/** Konversi hex channel → string. */
function hex2(c: number): string {
  return c.toString(16).padStart(2, "0");
}

/**
 * Analisis gambar: decode PNG (atau JPEG via konversi sederhana),
 * sampling warna, estimasi background.
 */
export function analyzeImage(filePath: string): ImageAnalysis {
  const buf = fs.readFileSync(filePath);
  const notes: string[] = [];
  let width = 0;
  let height = 0;

  // Dimensi dari header PNG/JPEG
  if (isPng(buf)) {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  } else if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off < buf.length - 1) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        height = buf.readUInt16BE(off + 5);
        width = buf.readUInt16BE(off + 7);
        break;
      }
      off += 2 + buf.readUInt16BE(off + 2);
    }
  }

  let hasAlpha = false;
  let bgColor: string | null = null;
  let bgIsLight = false;
  let estimatedColors = 0;

  try {
    const png = PNG.sync.read(buf);
    hasAlpha = png.data[3] < 255; // cek pixel pertama — indikasi awal
    const sw = Math.min(png.width, SAMPLE);
    const sh = Math.min(png.height, SAMPLE);
    const stepX = Math.max(1, Math.floor(png.width / sw));
    const stepY = Math.max(1, Math.floor(png.height / sh));

    const colorSet = new Set<string>();
    let transparent = 0;
    let total = 0;
    let alphaAny = false;

    for (let y = 0; y < png.height; y += stepY) {
      for (let x = 0; x < png.width; x += stepX) {
        const i = (y * png.width + x) << 2;
        const a = png.data[i + 3];
        const r = png.data[i];
        const g = png.data[i + 1];
        const b = png.data[i + 2];
        total++;
        if (a < 250) { transparent++; alphaAny = true; }
        colorSet.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
      }
    }
    hasAlpha = alphaAny;
    estimatedColors = colorSet.size;

    // Estimasi background dari warna pixel tepi
    const edgeColors: Array<{ r: number; g: number; b: number; n: number }> = [];
    const edgeCount = new Map<string, { r: number; g: number; b: number; n: number }>();
    const record = (x: number, y: number) => {
      const i = (y * png.width + x) << 2;
      if (png.data[i + 3] < 128) return;
      const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
      const cur = edgeCount.get(key);
      if (cur) cur.n++;
      else edgeCount.set(key, { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], n: 1 });
    };
    for (let x = 0; x < png.width; x += Math.max(1, Math.floor(png.width / 32))) {
      record(x, 0);
      record(x, png.height - 1);
    }
    for (let y = 0; y < png.height; y += Math.max(1, Math.floor(png.height / 32))) {
      record(0, y);
      record(png.width - 1, y);
    }
    for (const c of edgeCount.values()) edgeColors.push(c);
    edgeColors.sort((a, b) => b.n - a.n);
    if (edgeColors.length > 0) {
      const bg = edgeColors[0];
      bgColor = `#${hex2(bg.r)}${hex2(bg.g)}${hex2(bg.b)}`;
      bgIsLight = bg.r > 220 && bg.g > 220 && bg.b > 220;
    }
  } catch {
    notes.push("Gagal decode penuh — metrik terbatas.");
  }

  const assetType = classifyAsset({
    hasAlpha,
    bgIsLight,
    estimatedColors,
    width,
    height,
  });

  return {
    assetType,
    width,
    height,
    hasAlpha,
    bgColor,
    bgIsLight,
    estimatedColors,
    isSmall: Math.min(width, height) < 200,
    confidence: estimatedColors > 0 ? "high" : "low",
  };
}
