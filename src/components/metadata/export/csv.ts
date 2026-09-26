// CSV metadata export helpers — pure functions, no DOM/IO.
// Moved from Studio assetActionsFlow.ts + resolvers.ts (Fase 2).
// Operates on LibraryAsset (src/types.ts) with StockMetadata.
import type { LibraryAsset, StockMetadata } from "../../../types";
import {
  DEFAULT_PLATFORM,
  DNA_TO_OFFICIAL_MAP,
  PLATFORM_ADAPTERS,
} from "../../../modules/studio/registry/presets";

// ── Utilities ────────────────────────────────────────────────────────────────

export const assetFileExt = (a: { outputFormat?: string; mimeType?: string; url?: string } | null): string => {
  if (!a) return 'png';
  if (a.outputFormat === 'JPEG') return 'jpg';
  if (a.outputFormat === 'PNG') return 'png';
  if (a.outputFormat === 'SVG') return 'svg';
  if (a.mimeType) {
    if (a.mimeType.includes('jpeg') || a.mimeType.includes('jpg')) return 'jpg';
    if (a.mimeType.includes('png')) return 'png';
    if (a.mimeType.includes('svg')) return 'svg';
  }
  const dataUrlMime = a.url?.match(/^data:image\/(jpeg|jpg|png|svg)/);
  if (dataUrlMime) return dataUrlMime[1].startsWith('j') ? 'jpg' : dataUrlMime[1];
  if (a.url?.includes('.svg')) return 'svg';
  return 'png';
};

const csvEscapeValue = (val: unknown): string =>
  `"${String(val ?? '').replace(/"/g, '""')}"`;

// ── Releases resolver ────────────────────────────────────────────────────────

export const resolveReleasesValue = (sm?: StockMetadata | null): string => {
  if (!sm) return '';
  if (sm.peopleAndPropertyFictional) return '';
  if (sm.peopleRelease === 'released' || (sm as any).peopleReleaseAvailable === true) return 'Model Released';
  if (sm.propertyRelease === 'released' || (sm as any).propertyReleaseAvailable === true) return 'Property Released';
  return '';
};

// ── Eligibility gate ─────────────────────────────────────────────────────────

export const getCsvMetadataEligibility = (asset: LibraryAsset): { eligible: boolean; hardBlock: boolean; missing: boolean } => {
  const sm = asset.stockMetadata || ({} as StockMetadata);
  const checks = sm.preflightChecks || {};
  const platform = (asset as any).platform || DEFAULT_PLATFORM;
  const categoryKey = (asset as any).adobeCategory || sm.stockCategory || '';
  const adapter = PLATFORM_ADAPTERS[platform];
  const platformCategoryId = (asset as any).platformCategoryId
    ?? adapter?.dnaToOfficial?.(categoryKey)
    ?? DNA_TO_OFFICIAL_MAP[platform]?.[categoryKey]
    ?? null;
  const issues = [
    ...(Array.isArray(sm.preflightIssues) ? sm.preflightIssues : []),
    ...Object.values((sm as any).preflightIssueCategories || {}).flatMap((v: unknown) => Array.isArray(v) ? v : []),
  ].map(String).join(' ').toLowerCase();
  const config: any = adapter?.config() || { keywordRange: { min: 20, max: 50 } };
  const keywords = Array.isArray(sm.keywords)
    ? sm.keywords.filter(k => /^[a-zA-Z0-9]+(?:[ -][a-zA-Z0-9]+)*$/.test(String(k).trim()))
    : [];
  const ipScore = Number((sm as any).ipRisk?.score) || 0;
  const ipRecommendation = String((sm as any).ipRisk?.recommendation || 'pass');
  const hardBlock = [
    (asset as any).status === 'rejected' || (asset as any).status === 'FAILED',
    !adapter || adapter.status !== 'active' || !config.csvColumns?.length,
    sm.metadataSource === 'fallback' || sm.metadataSource === 'import' || (sm as any).analysisAvailable === false
      || (sm.metadataSource == null && (sm as any).analysisAvailable == null && /analysis\s*(?:fallback|failed|failure)|(?:fallback|failed|failure)\s*analysis/.test(issues)),
    checks.noWatermark === false,
    checks.noLogo === false || ipRecommendation === 'block' || ipRecommendation === 'regenerate' || ipScore >= 51,
    sm.preflightDecision === 'fail',
    /\b(?:critical|reject(?:ed)?|hard block)\b.*\b(?:metadata|compliance)\b|\b(?:metadata|compliance)\b.*\b(?:critical|reject(?:ed)?|hard block)\b/.test(issues),
    /\b(?:duplicate|near[- ]duplicate|too similar)\b/.test(issues),
  ].some(Boolean);
  const missing = [
    !String(sm.title || '').trim(),
    !String(sm.description || '').trim(),
    keywords.length < Math.max(20, config.keywordRange?.min || 20),
    platformCategoryId == null,
  ].some(Boolean);
  return { eligible: !hardBlock && !missing, hardBlock, missing };
};

// ── CSV row builder ──────────────────────────────────────────────────────────

export interface CsvRow {
  filename: string;
  title: string;
  keywords: string;
  category: string;
  releases: string;
  generativeAi: string;
}

export const buildCsvRow = (asset: LibraryAsset, platform: string): CsvRow | null => {
  const sm = asset.stockMetadata || ({} as StockMetadata);
  const adapter = PLATFORM_ADAPTERS[platform];
  const config = adapter?.config() || { csvColumns: [], keywordRange: { min: 0, max: 0 }, titleMaxLen: 200 };
  const ext = assetFileExt(asset);

  const categoryId = (asset as any).platformCategoryId
    ?? adapter?.dnaToOfficial?.((asset as any).adobeCategory || sm.stockCategory || '')
    ?? DNA_TO_OFFICIAL_MAP[platform]?.[(asset as any).adobeCategory || sm.stockCategory || '']
    ?? '';

  const rawTitle = sm.title || asset.name || 'asset';
  const safeTitle = rawTitle
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, config.titleMaxLen || 200);

  const filename = `${safeTitle.replace(/\s+/g, '_')}_${asset.id.slice(-8)}.${ext}`;

  const rawKeywords = (sm.keywords || []).slice(0, config.keywordRange.max);
  const keywords = rawKeywords
    .map(k => String(k).replace(/[^a-zA-Z0-9\s,]/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
    .join(', ');

  return { filename, title: safeTitle, keywords, category: String(categoryId), releases: resolveReleasesValue(sm), generativeAi: 'Yes' };
};

export const buildCsvRows = (assets: LibraryAsset[], platform: string): string[] => {
  const adapter = PLATFORM_ADAPTERS[platform];
  const config = adapter?.config() || { csvColumns: [], keywordRange: { min: 0, max: 0 } };
  const rows = assets
    .map(a => buildCsvRow(a, platform))
    .filter((r): r is CsvRow => r !== null)
    .map(r => {
      const rowMap: Record<string, string> = {
        Filename: r.filename, Title: r.title, Keywords: r.keywords,
        Category: r.category, Releases: r.releases, 'Generative AI': r.generativeAi,
      };
      return config.csvColumns.map((col: string) => csvEscapeValue(rowMap[col] ?? '')).join(',');
    });
  return rows;
};

export const buildCsvContent = (assets: LibraryAsset[], platform: string): string | null => {
  const adapter = PLATFORM_ADAPTERS[platform];
  const config = adapter?.config() || { csvColumns: [] };
  if (!config.csvColumns?.length) return null;
  const rows = buildCsvRows(assets, platform);
  if (rows.length === 0) return null;
  return [config.csvColumns.join(','), ...rows].join('\r\n');
};

export interface DownloadCsvOptions {
  platform?: string;
  filename?: string;
  showToast?: (msg: string, type?: string) => void;
}

export const downloadCsvForAssets = (
  assets: LibraryAsset[],
  options: DownloadCsvOptions = {}
): { exportedCount: number; skippedCount: number } => {
  if (!assets || assets.length === 0) {
    options.showToast?.("Tidak ada asset yang dipilih.", "error");
    return { exportedCount: 0, skippedCount: 0 };
  }

  const eligibleAssets = assets.filter((a) => getCsvMetadataEligibility(a).eligible);
  const skippedCount = assets.length - eligibleAssets.length;

  if (skippedCount > 0) {
    options.showToast?.(
      `${skippedCount} asset dilewati (metadata tidak lengkap/ditolak)`,
      "info"
    );
  }

  if (eligibleAssets.length === 0) {
    options.showToast?.("Dilewati: metadata tidak lengkap", "error");
    return { exportedCount: 0, skippedCount };
  }

  const byPlatform: Record<string, LibraryAsset[]> = {};
  for (const a of eligibleAssets) {
    const key = options.platform || (a as any).platform || DEFAULT_PLATFORM;
    if (!byPlatform[key]) byPlatform[key] = [];
    byPlatform[key].push(a);
  }

  const dateStr = new Date().toISOString().slice(0, 10);

  for (const [platformKey, platformAssets] of Object.entries(byPlatform)) {
    const adapter = PLATFORM_ADAPTERS[platformKey];
    const label = adapter?.label || platformKey;
    const csvContent = buildCsvContent(platformAssets, platformKey);

    if (csvContent && typeof document !== "undefined") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        options.filename ||
        `${label.replace(/\s+/g, "_")}_Metadata_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return { exportedCount: eligibleAssets.length, skippedCount };
};

// ── Manifest entry builder ───────────────────────────────────────────────────

export const buildManifest = (assets: { id: string; filename: string; title: string }[]): Record<string, unknown> => ({
  exportDate: new Date().toISOString(),
  totalAssets: assets.length,
  source: "IMAGIN Studio",
  items: assets,
});

// ── JSON sidecar builder ─────────────────────────────────────────────────────

export const buildJsonSidecar = (asset: LibraryAsset): Record<string, unknown> => {
  const sm = asset.stockMetadata || ({} as StockMetadata);
  return {
    id: asset.id,
    title: sm.title || asset.name || "",
    description: sm.description || "",
    keywords: sm.keywords || [],
    category: (asset as any).adobeCategory,
    subcategory: (asset as any).subcategory,
    assetType: (asset as any).assetType,
    style: (asset as any).style,
    iconStyle: (asset as any).iconStyle || null,
    prompt: (asset as any).prompt,
    assembledPrompt: (asset as any).assembledPrompt,
    negativePrompt: (asset as any).negativePrompt,
    backgroundMode: (asset as any).background || "white",
    createdAt: asset.createdAt,
    mimeType: asset.mimeType,
    tags: asset.tags || [],
  };
};