// Studio utilities — diekstrak dari imagin_studio.tsx baris 6635–6752 + 8321–8342.
// Pure helpers (no React, no JSX). Network helpers, image/data helpers, resolution helpers.

function isSpecificUserInput(text) {
  if (!text || text.trim().length < 2) return false;
  const lower = text.trim().toLowerCase();
  if (/\d/.test(lower)) return true;
  const GENERIC = new Set([
    'culture','cultural','tradition','traditional','festival',
    'celebration','ceremony','custom','heritage','art','craft',
    'ritual','folk','ethnic','indigenous','native','tribal',
    'religion','religious','faith','spiritual','worship',
    'dance','music','food','costume','attire','dress',
    'holiday','event','day','month','year','theme','concept',
    'vector','illustration','background','pattern','scene',
  ]);
  const words = lower.split(/\s+/).filter(Boolean);
  return !words.every(w => GENERIC.has(w));
}
export { isSpecificUserInput };

const sanitizeIconThemeInput = (text = '') =>
    (text || '')
        .replace(/\b\d+\b/g, ' ')
        .replace(/\b(create exactly|generate exactly|make exactly|please create|show me|buat|ciptakan|hasilkan)\b/gi, ' ')
        .replace(/\b(icon set|icon pack|sheet|per canvas|per-canvas|single icon|one icon|one icon per canvas|all icons?|icons to generate|generate icons|ikon set|lembar|per kanvas|paket ikon|batch|collection|grid|collage)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s,;:\-|]+|[\s,;:\-|]+$/g, '')
        .trim();
export { sanitizeIconThemeInput };

const sanitizeVisualPromptInput = (text = '') =>
    (text || '')
        .replace(/\b\d+\b/g, ' ')
        .replace(/\b(create exactly|generate exactly|make exactly|please create|buat|ciptakan|hasilkan)\b/gi, ' ')
        .replace(/\b(sheet|per canvas|per-canvas|icon set|icon pack|batch|collection|grid|collage)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s,;:\-|]+|[\s,;:\-|]+$/g, '')
        .trim();
export { sanitizeVisualPromptInput };

const extractLeadingIconCount = (text = '') => {
    const match = (text || '').match(/\b(\d{1,3})\b/);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n < 1 || n > 50) return null;
    return n;
};
export { extractLeadingIconCount };

import { PREFLIGHT_ITEMS } from './engines/compliance';

const countPreflightPassed = (checks, sm = {}) =>
    PREFLIGHT_ITEMS.filter(item => {
        if (item.autoRule) return item.autoRule(sm);
        return checks?.[item.id] === true;
    }).length;
export { countPreflightPassed };

function matchesBlockedTerm(text: string, term: string): boolean {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isSingleWord = !/\s/.test(term.trim());
    const pattern = isSingleWord
        ? `(?<![a-zA-Z0-9-])${escaped}(?![a-zA-Z0-9-])`
        : `(?<![a-z0-9])${escaped}(?![a-z0-9])`;
    return new RegExp(pattern, 'i').test(text);
}
export { matchesBlockedTerm };

// ── Network: fetch with retry (line 6646) ─────────────────────────────────

let fetchRetryNotifier: ((status: number, delayMs: number) => void) | null = null;

export function setFetchRetryNotifier(fn: ((status: number, delayMs: number) => void) | null): void {
  fetchRetryNotifier = fn;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  timeoutMs = 60000
): Promise<Response> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    // FASE 18: AbortController timeout — request tidak boleh menggantung tanpa
    // batas. Gagal timeout dianggap transient → retry dengan backoff.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      // jangan retry — langsung kembalikan ke caller agar tidak membuang kuota RPM
      if (res.status === 429) return res;
      if (res.status >= 500) {
        if (i < maxRetries - 1) fetchRetryNotifier?.(res.status, delay);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (i === maxRetries - 1) throw err;
      fetchRetryNotifier?.(0, delay);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("Max retries exceeded");
}

// ── Aspect ratio / CSS helpers (line 6687) ────────────────────────────────
const aspectRatioToCss = (ratio) => {
    if (!ratio || typeof ratio !== 'string' || !ratio.includes(':')) return '4 / 3';
    const [w, h] = ratio.split(':').map(Number);
    if (!w || !h) return '4 / 3';
    return `${w} / ${h}`;
};
export { aspectRatioToCss };

// ── Resolution policy (line 6691) ──────────────────────────────────────────
const RESOLUTION_POLICY = {
    // Sumber: helpx.adobe.com/stock/contributor — raster (photo/illustration):
    // min 4MP, max 100MP, max file 45MB, JPEG + sRGB (PNG hanya untuk transparent).
    MINIMUM_MEGAPIXELS: 4,
    RECOMMENDED_MEGAPIXELS: 8,
    MAXIMUM_MEGAPIXELS: 100,
    SVG_MINIMUM_MEGAPIXELS: 15,
    SVG_MAXIMUM_MEGAPIXELS: 65,
    MAX_FILE_SIZE_MB: 45,
    // Fallback konstanta lama (1500px short side ≠ 4MP untuk 1:1) — dipertahankan
    // untuk UI/back-compat, tapi semua KEPUTUSAN resolusi kini pakai megapixel
    // via minShortSideForMegapixels().
    MINIMUM_SHORT_SIDE: 1500,
    RECOMMENDED_SHORT_SIDE: 2000,
    // FIX: naikkan dari 4× → 6× agar target 4K/6K achievable. Pipeline upscale
    // bersifat multi-stage via Lanczos — bukan AI (Real-ESRGAN off by design,
    // lihat [09.07] L7420). 6× cap = aman dari blow-up; 8× blur terlihat
    // untuk watercolor/illustration dengan soft edge.
    MAX_UPSCALE_FACTOR: 6,
};
export { RESOLUTION_POLICY };

const RESOLUTION_TARGETS = {
    '4k': { megapixels: 8,  shortSide: 2828, label: '4K (8MP · Stock Standard)' },
    '6k': { megapixels: 36, shortSide: 6000, label: '6K (36MP · Premium)' },
};
export { RESOLUTION_TARGETS };

const DEFAULT_RESOLUTION_TARGET = '4k';
export { DEFAULT_RESOLUTION_TARGET };

const getResolutionTarget = (target) => {
    return RESOLUTION_TARGETS[target] || RESOLUTION_TARGETS[DEFAULT_RESOLUTION_TARGET];
};
export { getResolutionTarget };

const getFormatResolutionPolicy = (format = 'PNG', resolutionTarget = DEFAULT_RESOLUTION_TARGET) => {
    const f = String(format || '').toUpperCase();
    if (f === 'SVG') {
        return {
            minimumMegapixels: RESOLUTION_POLICY.SVG_MINIMUM_MEGAPIXELS,
            recommendedMegapixels: RESOLUTION_POLICY.SVG_MINIMUM_MEGAPIXELS,
            maximumMegapixels: RESOLUTION_POLICY.SVG_MAXIMUM_MEGAPIXELS,
            maxFileSizeMB: RESOLUTION_POLICY.MAX_FILE_SIZE_MB,
        };
    }
    // recommendedMegapixels ikut resolutionTarget (4K=8MP, 6K=36MP).
    // minimumMegapixels tetap MINIMUM_MEGAPIXELS (4MP, Adobe floor) — target
    // tidak bisa menurunkan standar Adobe.
    // maximumMegapixels capped ke MAXIMUM_MEGAPIXELS (100MP) — meski target
    // 6K, kita tidak akan push lewat 100MP.
    const target = getResolutionTarget(resolutionTarget);
    const recommended = Math.min(target.megapixels, RESOLUTION_POLICY.MAXIMUM_MEGAPIXELS);
    return {
        minimumMegapixels: RESOLUTION_POLICY.MINIMUM_MEGAPIXELS,
        recommendedMegapixels: recommended,
        maximumMegapixels: RESOLUTION_POLICY.MAXIMUM_MEGAPIXELS,
        maxFileSizeMB: RESOLUTION_POLICY.MAX_FILE_SIZE_MB,
    };
};
export { getFormatResolutionPolicy };

const resolveExportFormat = ({ assetType, background, iconMode, outputFormat, explicit }) => {
    const bg = (background || 'white').toLowerCase();
    if (iconMode || bg === 'transparent' || bg === 'greenscreen') return 'PNG';
    if (bg === 'scene') return 'JPEG';
    if (explicit && (outputFormat === 'PNG' || outputFormat === 'JPEG')) return outputFormat;
    if (assetType === 'illustration' || assetType === '3d' || assetType === 'photo') return 'JPEG';
    return 'PNG';
};
export { resolveExportFormat };

import { BRAND_IP_BLOCKLIST, GOVERNMENT_AGENCY_BLOCKLIST, ARTIST_STYLE_REFERENCE_PATTERN } from './engines/compliance';

const checkBrandSafety = (text) => {
    const raw = text || '';
    const hits = [
        ...BRAND_IP_BLOCKLIST.filter(term => matchesBlockedTerm(raw, term)),
        ...GOVERNMENT_AGENCY_BLOCKLIST.filter(term => matchesBlockedTerm(raw, term)),
    ];
    let match;
    ARTIST_STYLE_REFERENCE_PATTERN.lastIndex = 0;
    while ((match = ARTIST_STYLE_REFERENCE_PATTERN.exec(raw)) !== null) {
        hits.push(`possible artist-style reference: "${match[0]}"`);
    }
    return hits;
};
export { checkBrandSafety };

// Hitung short side (px) minimal untuk mencapai target megapixel pada aspek rasio
// tertentu. 4:3 @4MP → ~1732px; 1:1 @4MP → 2000px; 16:9 @4MP → ~1500px.
// k²·w·h = MP·1e6 → k = sqrt(MP·1e6/(w·h)); shortSide = min(w,h)·k.
const minShortSideForMegapixels = (aspectRatio, megapixels) => {
    const [rw, rh] = (aspectRatio || '4:3').split(':').map(Number);
    const w = rw || 4, h = rh || 3;
    const k = Math.sqrt((megapixels * 1e6) / (w * h));
    return Math.round(Math.min(w, h) * k);
};
export { minShortSideForMegapixels };

const megapixelsOf = (width, height) => (width * height) / 1e6;
export { megapixelsOf };

const dimensionsForMegapixels = (width, height, megapixels) => {
    const w = Number(width) || 1;
    const h = Number(height) || 1;
    const scale = Math.sqrt((megapixels * 1e6) / (w * h));
    return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
};
export { dimensionsForMegapixels };

const fileSizeKBFromDataUrl = (dataUrl) => {
    if (!dataUrl) return 0;
    const base64 = dataUrl.split(',')[1] || '';
    return Math.round((base64.length * 3) / 4 / 1024);
};
export { fileSizeKBFromDataUrl };

// ── File/Data helpers (line 8324) ─────────────────────────────────────────
import { assetUrl } from "../../utils/assetUrl";

const blobToDataURL = (blob: Blob): Promise<string | null> => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
  reader.onerror = () => resolve(null);
  reader.readAsDataURL(blob);
});

export async function toDataURL(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (!/^(?:blob:|imagin:\/\/|https?:\/\/|\/storage\/)/i.test(url)) return null;
  try {
    const res = await fetch(assetUrl(url));
    if (!res.ok) return null;
    return await blobToDataURL(await res.blob());
  } catch {
    return null;
  }
}

// ── pickUnique — generic helper for dimension pool (used in prompt engine) ─
export function pickUnique<T>(arr: T[], used: Set<T>): T {
  const remaining = arr.filter((x) => !used.has(x));
  const choice = remaining[Math.floor(Math.random() * remaining.length)] ?? arr[Math.floor(Math.random() * arr.length)];
  used.add(choice);
  return choice;
}

const getAssetFileSizeKB = (asset) => {
        if (!asset?.url || !asset.url.startsWith('data:')) return null;
        const comma = asset.url.indexOf(',');
        if (comma < 0) return null;
        const header = asset.url.slice(0, comma);
        const payload = asset.url.slice(comma + 1);
        let bytes;
        if (header.includes('base64')) {
            // base64: setiap 4 karakter = 3 byte
            bytes = Math.round((payload.length * 3) / 4);
        } else {
            // URL-encoded: decode dulu untuk dapat panjang byte asli
            try { bytes = new TextEncoder().encode(decodeURIComponent(payload)).length; }
            catch { bytes = payload.length; }
        }
        return Math.round(bytes / 1024);
    };
export { getAssetFileSizeKB };
const formatFileSize = (kb) => {
        if (kb === null) return '—';
        if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
        return `${kb} KB`;
    };
export { formatFileSize };
function hashString(input) {
  let h = 0x811c9dc5;
  const str = String(input || '');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
export { hashString };
const estimateApiCalls = (vectorState, systemSettings) => {
    if (vectorState.iconMode && vectorState.assetType !== 'photo') {
        if (vectorState.iconGenerationMode === 'sheet') return 1;
        return vectorState.iconQuantity || 1;
    }
    const qty = vectorState.quantity || 1;
    const perAsset = vectorState.skipAIExpansion ? 1 : 2;
    let total = qty * perAsset;
    if (systemSettings?.commercialRules?.enableDifferentiationCheck) total += 1;
    if (vectorState.useAIComposition && qty > 1) total += 1;
    return total;
};
export { estimateApiCalls };
const ESTIMATED_COST_PER_CALL_USD = 0.01;
export { ESTIMATED_COST_PER_CALL_USD };
const estimateCostUsd = (apiCalls) => {
    const n = Number(apiCalls) || 0;
    return (n * ESTIMATED_COST_PER_CALL_USD).toFixed(3);
};
export { estimateCostUsd };

const isUpscaleEligible = (asset) => {
    if (!asset?.url || asset.isLoading || asset.isUpscaling || asset.status === 'FAILED') return false;
    if (asset.outputFormat === 'SVG' || String(asset.url || '').startsWith('data:image/svg+xml')) return false;

    const attempts = asset.resolution?.upscaleAttempts || 0;
    // Pakai resolutionTarget dari asset (kalau ada) supaya upscale eligible
    // benar-benar mengacu ke target user. Backward-compat: asset lawas tanpa
    // field ini = '4k' (default 8MP).
    const resolutionPolicy = getFormatResolutionPolicy(
        asset.outputFormat || 'PNG',
        asset.resolutionTarget || DEFAULT_RESOLUTION_TARGET
    );

    // BUG FIX (1): Jika resolution belum tersimpan (asset baru di-generate,
    // resolution.width/height bisa undefined), currentMp=0 menyebabkan
    // belowResTarget=false meski gambar sebenarnya masih kecil.
    // Solusi: jika resolusi tidak diketahui (null), anggap eligible —
    // biarkan upscale berjalan dan deteksi sendiri.
    let currentMp = null;
    if (asset.resolution?.width && asset.resolution?.height) {
        currentMp = megapixelsOf(asset.resolution.width, asset.resolution.height);
    }
    const belowResTarget = currentMp === null || Math.round(currentMp * 10) / 10 < resolutionPolicy.recommendedMegapixels;

    // File size tidak boleh menjadi trigger upscale. JPEG/PNG bisa tetap kecil
    // karena kompresi walaupun megapixel sudah tinggi; memaksa upscale dari
    // ukuran byte dapat menghasilkan file 40-70MP yang tidak masuk akal.
    return belowResTarget && attempts < 3;
};
export { isUpscaleEligible };
