// Bulk ZIP export with XMP embed, CSV, JSON sidecar, manifest.
// Operates on LibraryAsset[] — fetches bytes from imagin:// URLs.
// Moved from Studio assetActionsFlow.ts handleBulkExport (Fase 2).
import type { LibraryAsset, StockMetadata } from "../../../types";
import { assetUrl } from "../../../utils/assetUrl";
import { loadJSZip } from "../../../utils/loadJszip";
import { embedXmpMetadata } from "./xmp";
import { buildCsvContent, buildManifest, buildJsonSidecar, assetFileExt, getCsvMetadataEligibility } from "./csv";
import { DEFAULT_PLATFORM, PLATFORM_ADAPTERS } from "../../../modules/studio/registry/presets";

//── Fetch asset bytes from library URL data URL ──────────────────────────

const fetchAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const resolved = assetUrl(url);
    const resp = await fetch(resolved);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// ── Build ZIP entries (pure function, testable) ─────────────────────────────

export interface ZipEntry {
  path: string;
  data: string;
  base64: boolean;
}

export const buildZipEntries = async (
  assets: LibraryAsset[],
  dateStr: string,
): Promise<{ entries: ZipEntry[]; succeeded: LibraryAsset[]; failed: string[] }> => {
  const entries: ZipEntry[] = [];
  const succeeded: LibraryAsset[] = [];
  const failed: string[] = [];
  let idx = 0;

  for (const asset of assets) {
    idx++;
    const shortName = `IMAGIN_${String(idx).padStart(4, '0')}`;
    const fileExt = assetFileExt(asset);
    const isJpeg = fileExt === 'jpg';
    const isSVG = fileExt === 'svg';
    const filename = `${shortName}.${fileExt}`;

    let dataUrl = asset.url ? await fetchAsDataUrl(asset.url) : null;
    if (!dataUrl) {
      failed.push(asset.id);
      continue;
    }

    // Embed XMP
    const sm = asset.stockMetadata || ({} as StockMetadata);
    const xmpMeta = {
      title: sm.title || asset.name || '',
      description: sm.description || '',
      keywords: Array.isArray(sm.keywords) ? sm.keywords : [],
    };
    if (isJpeg || (!isSVG && dataUrl.startsWith('data:image/png'))) {
      const withMeta = embedXmpMetadata(dataUrl, xmpMeta);
      if (withMeta && withMeta !== dataUrl) dataUrl = withMeta;
    }

    // Extract base64 payload
    let payload = dataUrl;
    let isB64 = true;
    if (isSVG) {
      const comma = dataUrl.indexOf(',');
      if (comma >= 0) {
        const hdr = dataUrl.slice(0, comma);
        const pld = dataUrl.slice(comma + 1);
        isB64 = /base64/i.test(hdr);
        payload = isB64 ? pld : decodeURIComponent(pld);
      }
      entries.push({ path: `assets/${filename}`, data: payload, base64: isB64 });
    } else {
      const comma = dataUrl.indexOf(',');
      payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      entries.push({ path: `assets/${filename}`, data: payload, base64: true });
    }

    // JSON sidecar
    entries.push({
      path: `assets/${shortName}.json`,
      data: JSON.stringify(buildJsonSidecar(asset), null, 2),
      base64: false,
    });

    succeeded.push(asset);
  }

  // Manifest
  const manifestItems = succeeded.map((a, i) => ({
    id: a.id,
    filename: `IMAGIN_${String(i + 1).padStart(4, '0')}.${assetFileExt(a)}`,
    title: a.stockMetadata?.title || a.name || '',
  }));
  entries.push({
    path: 'manifest.json',
    data: JSON.stringify(buildManifest(manifestItems), null, 2),
    base64: false,
  });

  // Per-platform CSV
  const byPlatform: Record<string, LibraryAsset[]> = {};
  for (const a of succeeded) {
    const key = (a as any).platform || DEFAULT_PLATFORM;
    if (!byPlatform[key]) byPlatform[key] = [];
    byPlatform[key].push(a);
  }
  for (const [platformKey, platformAssets] of Object.entries(byPlatform)) {
    const adapter = PLATFORM_ADAPTERS[platformKey];
    const csvContent = buildCsvContent(platformAssets, platformKey);
    if (csvContent) {
      entries.push({
        path: `${(adapter?.label || platformKey).replace(/\s+/g, '_')}_Metadata.csv`,
        data: csvContent,
        base64: false,
      });
    }
  }

  return { entries, succeeded, failed };
};

//── Orchestration: fetch embed ZIP download record export history ──

export interface BulkExportOptions {
  assets: LibraryAsset[];
  showToast?: (msg: string, type?: string) => void;
  onDone?: () => void;
}

export const handleBulkExport = async ({ assets, showToast, onDone }: BulkExportOptions): Promise<void> => {
  if (assets.length === 0) {
    showToast?.('Tidak ada asset yang dipilih.', 'error');
    return;
  }

  showToast?.('Mempersiapkan export ZIP metadata...', 'info');

  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const { entries, succeeded, failed } = await buildZipEntries(assets, dateStr);

    if (succeeded.length === 0) {
      showToast?.('Tidak ada asset yang bisa diunduh — semua gagal di-fetch.', 'error');
      return;
    }

    const JSZip = await loadJSZip();
    const zip = new JSZip();
    for (const entry of entries) {
      zip.file(entry.path, entry.data, { base64: entry.base64 });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imagin-vector-export-${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    // A11 paritas canvas (recordExportHistory): history ditulis & DIAWAIT (bukan fire-and-forget),
    // lifecycle 'exported' di lokal = presence exportHistory (schema library tanpa status 'exported').
    const historyWrites = succeeded.map((asset) => {
      const ext = assetFileExt(asset).toUpperCase();
      const a = asset as any;
      const base = Array.isArray(a.lineage?.exportHistory) ? a.lineage.exportHistory : (Array.isArray(a.exportHistory) ? a.exportHistory : []);
      const entry = { exportedAt: Date.now(), format: ext, platform: a.platform || null };
      const next = [...base, entry];
      // F1 gate4: library record dikunci oleh libraryAssetId — asset.id studio => "not found" senyap.
      const libId = a.libraryAssetId || asset.id;
      return (window as any).api?.libraryUpdate?.(libId, { exportHistory: next })
        .then((res: any) => { if (res && res.success === false) console.warn('[Export] history update failed:', asset.id, res.detail); })
        .catch((err: unknown) => { console.warn('[Export] history append failed:', err); });
    });
    await Promise.all(historyWrites);

    // Fictional count notification
    const fictionalCount = succeeded.filter(a => a.stockMetadata?.peopleAndPropertyFictional).length;
    if (fictionalCount > 0) {
      showToast?.(
        `ℹ️ ${fictionalCount} asset berisi orang/properti AI-fictional — saat upload ke Adobe Contributor Portal, centang "People and Property are fictional" agar Releases tidak diperlukan.`,
        'info',
      );
    }

    const skipped = assets.length - succeeded.length;
    showToast?.(
      `Export ZIP berhasil! ${succeeded.length} asset ter-download${skipped ? `; ${skipped} dilewati (gagal fetch)` : ''}. ✓`,
      'success',
    );
    setTimeout(() => {
      showToast?.(
        'ZIP diunduh! WAJIB di Adobe: upload gambar -> Edit > Edit with CSV -> import Adobe_Stock_Metadata.csv dari ZIP. Tanpa ini Adobe reject "Missing Generative AI Flag".',
        'info',
      );
    }, 2500);

    onDone?.();
  } catch (error) {
    console.error('Bulk export failed:', error);
    showToast?.('Gagal memproses ZIP: ' + (error as Error).message, 'error');
  }
};