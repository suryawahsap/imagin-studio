// Single asset download with XMP metadata embed + export history.
// Operates on LibraryAsset — fetches bytes from imagin:// URL.
// Moved from Studio assetActionsFlow.ts handleDownloadSingle (Fase 2).
import type { LibraryAsset, StockMetadata } from "../../../types";
import { assetUrl } from "../../../utils/assetUrl";
import { embedXmpMetadata } from "./xmp";
import { assetFileExt } from "./csv";

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

export interface SingleExportOptions {
  asset: LibraryAsset;
  showToast?: (msg: string, type?: string) => void;
}

export const handleDownloadSingle = async ({ asset, showToast }: SingleExportOptions): Promise<void> => {
  if (!asset.url) {
    showToast?.('Asset is not ready for download.', 'error');
    return;
  }

  const ext = assetFileExt(asset);
  const isJPEG = ext === 'jpg';
  const safeTitle = asset.stockMetadata?.title || asset.name || 'asset';
  const filename = `${safeTitle.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

  let downloadUrl: string | null = null;
  let objectUrlToRevoke: string | null = null;

  try {
    const dataUrl = await fetchAsDataUrl(asset.url);
    if (!dataUrl) {
      showToast?.('Gagal mengambil data asset.', 'error');
      return;
    }

    const sm = asset.stockMetadata || ({} as StockMetadata);
    const xmpMeta = {
      title: sm.title || asset.name || '',
      description: sm.description || '',
      keywords: Array.isArray(sm.keywords) ? sm.keywords : [],
    };

    if (isJPEG) {
 //JPEG: fetch embed XMP APP1 blob download
      const blob = await fetch(dataUrl).then(r => r.blob());
      const blobWithMeta = await new Promise<Blob>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => {
          try {
            const withMeta = embedXmpMetadata(String(fr.result), xmpMeta);
            if (withMeta && withMeta !== dataUrl) {
              fetch(withMeta).then(r => r.blob()).then(resolve).catch(() => resolve(blob));
            } else {
              resolve(blob);
            }
          } catch {
            resolve(blob);
          }
        };
        fr.onerror = () => resolve(blob);
        fr.readAsDataURL(blob);
      });
      downloadUrl = URL.createObjectURL(blobWithMeta);
      objectUrlToRevoke = downloadUrl;
    } else {
      // PNG: embed XMP iTXt chunk directly
      downloadUrl = embedXmpMetadata(dataUrl, xmpMeta) || dataUrl;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.target = '_blank';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (objectUrlToRevoke) setTimeout(() => URL.revokeObjectURL(objectUrlToRevoke), 1000);

    // Record export history (awaited — paritas canvas; lifecycle 'exported' = presence exportHistory)
    const srcA = asset as any;
    const base = Array.isArray(srcA.lineage?.exportHistory) ? srcA.lineage.exportHistory : (Array.isArray(srcA.exportHistory) ? srcA.exportHistory : []);
    const entry = { exportedAt: Date.now(), format: ext.toUpperCase(), platform: srcA.platform || null };
    const next = [...base, entry];
    await (window as any).api?.libraryUpdate?.(srcA.libraryAssetId || asset.id, { exportHistory: next })
      .then((res: any) => { if (res && res.success === false) console.warn('[Export] history update failed:', res.detail); })
      .catch((err: unknown) => console.warn('[Export] history append failed:', err));

    showToast?.(`Downloading: ${safeTitle} (.${ext.toUpperCase()})`, 'success');
  } catch (err) {
    console.error('[Export] Single download failed:', err);
    showToast?.('Download failed: ' + (err as Error).message, 'error');
  }
};