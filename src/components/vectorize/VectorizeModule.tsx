import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/electron";
import { useJobSync } from "../../api/useJobSync";
import { LibraryAsset } from "../../types";
import { assetUrl } from "../../utils/assetUrl";
import VectorizeSidebarLeft from "./VectorizeSidebarLeft";
import VectorizeSidebarRight from "./VectorizeSidebarRight";
import VectorizeCenter from "./VectorizeCenter";
import {
  Asset,
  AssetTypeOption,
  TracingArgs,
  VecPostprocess,
  DEFAULT_POSTPROCESS,
  TRACING_DEFAULTS,
  tracingToPayload,
} from "./types";

// Kept in the renderer only to route the existing vtracerArgs payload; the
// authoritative table and server-side resolver live in electron/services/vec.
const ICON_PRESET_ARGS: Record<string, { assetType: AssetTypeOption; args: Record<string, number | string> }> = {
  black_outline: { assetType: "outline-icon", args: { clustering: "watershed", hierarchical: "cutout", pathPrecision: 0.35, maxColors: 2 } },
  outline: { assetType: "outline-icon", args: { clustering: "watershed", hierarchical: "cutout", pathPrecision: 0.1, maxColors: 2 } },
  black_filled: { assetType: "flat-icon", args: { maxColors: 8 } }, glyph: { assetType: "flat-icon", args: { maxColors: 8 } },
  duotone: { assetType: "flat-icon", args: { maxColors: 4 } }, filled: { assetType: "flat-icon", args: { maxColors: 12 } },
  lineal_color: { assetType: "flat-icon", args: { maxColors: 16 } }, flat: { assetType: "flat-icon", args: { maxColors: 16 } },
  hand_drawn: { assetType: "flat-illustration", args: { pathPrecision: 0.35, maxColors: 16 } },
  gradient: { assetType: "flat-illustration", args: { pathPrecision: 0.5, maxColors: 32, gradientStep: 8 } },
  threed: { assetType: "flat-illustration", args: { pathPrecision: 0.5, maxColors: 32, gradientStep: 8 },
  },
};

const blobUrlCache = new Map<string, string>();
async function toBlobUrl(url: string | undefined): Promise<string | undefined> {
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

export interface VectorizeModuleProps {
  onNotify?: (message: string, type?: "success" | "error" | "info") => void;
  libraryAssets?: LibraryAsset[];
  pendingHandoff?: { module: "VECTOR" | "UPSCALE" | "ANIMATION"; assetIds: string[]; nonce: number } | null;
  onHandoffDone?: () => void;
}

export default function VectorizeModule({
  onNotify,
  libraryAssets,
  pendingHandoff,
  onHandoffDone,
}: VectorizeModuleProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stagingAssetId, setStagingAssetId] = useState<string | null>(null);

  const [assetType, setAssetType] = useState<AssetTypeOption>("auto");
  const [tracing, setTracing] = useState<TracingArgs>({ ...TRACING_DEFAULTS.auto });
  const [removeBackground, setRemoveBackground] = useState(false);
  const artboard = "source";
  const padding = 8;
  const exportEps = true;
  const [postprocess, setPostprocess] = useState<VecPostprocess>({ ...DEFAULT_POSTPROCESS });
  const [optimizeIcons, setOptimizeIcons] = useState(true);

  const [splitPos, setSplitPos] = useState(50);
  const [batchCounter, setBatchCounter] = useState(1);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Array<{ id: string; source: string; output: string; assetType: string; timestamp: number }>>([]);

  const assetsRef = useRef<Asset[]>([]);
  assetsRef.current = assets;

  // Handoff from Studio → Vectorize
  useEffect(() => {
    if (!pendingHandoff || pendingHandoff.module !== "VECTOR") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.vectorStageLibrary(pendingHandoff.assetIds.map(assetId => ({ assetId })));
        if (cancelled) return;
        if (!data.success || !data.items || data.items.length === 0) {
          onNotify?.(data.detail || "No assets staged to Vectorize.", "error");
          onHandoffDone?.();
          return;
        }
        const items: any[] = data.items;
        const maxPriority = assetsRef.current.reduce((m, a) => Math.max(m, a.priority), 0);
        const staged: Asset[] = items.map((item, i) => ({
          tempId: item.tempId,
          originalName: item.originalName,
          width: item.width,
          height: item.height,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
          previewUrl: item.filePath ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`) : undefined,
          status: "ready" as const,
          assetType,
          tracing: { ...TRACING_DEFAULTS[assetType] },
          artboard, padding, exportEps,
          removeBackground,
          postprocess: { ...postprocess },
          priority: maxPriority + i + 1,
          selected: false,
          iconStyle: item.iconStyle || null,
        }));
        setAssets(prev => [...prev, ...staged]);
        if (staged.length > 0) setSelectedId(prev => prev ?? staged[0].tempId);
        onNotify?.(`${data.items.length} asset(s) ready for Vectorize.`, "success");
        onHandoffDone?.();
      } catch {
        if (!cancelled) {
          onNotify?.("Failed to stage asset to Vectorize.", "error");
          onHandoffDone?.();
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHandoff?.nonce]);

  // Resolve URLs → blob for preview
  useEffect(() => {
    let cancelled = false;
    const urls = new Set<string>();
    for (const a of assets) {
      if (a.previewUrl) urls.add(a.previewUrl);
      if (a.originalUrl) urls.add(a.originalUrl);
      if (a.outputSvgUrl) urls.add(a.outputSvgUrl);
    }
    const resolved: Record<string, string> = {};
    (async () => {
      for (const u of urls) {
        const b = await toBlobUrl(u);
        if (cancelled) return;
        if (b) resolved[u] = b;
      }
      setResolvedUrls(prev => ({ ...prev, ...resolved }));
    })();
    return () => { cancelled = true; };
  }, [assets]);

  const fetchQueue = useCallback(async (jobs: any[]) => {
    if (jobs.length === 0) return;
    setAssets(prev => {
      const byId = new Map(prev.map(a => [a.tempId, a]));
      for (const job of jobs) {
        const existing = byId.get(job.tempId);
        if (!existing) continue;
        const wasCompleted = existing.status === "completed" || existing.status === "exported";
        const merged: Asset = {
          ...existing,
          status: job.status,
          error: job.error,
          outputSvgUrl: job.outputSvgUrl ? assetUrl(job.outputSvgUrl) : existing.outputSvgUrl,
          outputEpsUrl: job.outputEpsUrl ? assetUrl(job.outputEpsUrl) : existing.outputEpsUrl,
          originalUrl: job.originalUrl ? assetUrl(job.originalUrl) : existing.originalUrl,
          outputWidth: job.outputWidth ?? existing.outputWidth,
          outputHeight: job.outputHeight ?? existing.outputHeight,
          elapsedMs: job.elapsedMs ?? existing.elapsedMs,
          qcWarnings: job.qcWarnings ?? existing.qcWarnings,
          qcPassed: job.qcPassed ?? existing.qcPassed,
          analysis: job.analysis ?? existing.analysis,
          validation: job.validation ?? existing.validation,
          assetType: (job.assetType && job.assetType !== existing.assetType && existing.assetType === "auto")
            ? job.assetType : existing.assetType,
        };
        byId.set(job.tempId, merged);

        if (!wasCompleted && job.status === "completed") {
          setSelectedId(cur => cur ?? job.tempId);
          setHistory(h => [{
            id: `${job.tempId}-${Date.now()}`,
            source: existing.originalName,
            output: job.outputSvgUrl ? assetUrl(job.outputSvgUrl) : "",
            assetType: job.assetType || "auto",
            timestamp: Date.now(),
          }, ...h]);
        }
      }
      return Array.from(byId.values());
    });
  }, []);

  useJobSync("vector", fetchQueue);

  const processIncomingFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const previews = new Map(files.map(f => [f.name, URL.createObjectURL(f)]));
    try {
      const data = await api.vectorUpload(files);
      if (data.success) {
        const items: any[] = data.items || [];
        const maxPriority = assetsRef.current.reduce((m, a) => Math.max(m, a.priority), 0);
        const imported: Asset[] = items.map((item, i) => ({
          tempId: item.tempId,
          originalName: item.originalName,
          width: item.width,
          height: item.height,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
          previewUrl: previews.get(item.originalName) || (files[i] ? URL.createObjectURL(files[i]) : undefined),
          status: "ready" as const,
          assetType,
          tracing: { ...TRACING_DEFAULTS[assetType] },
          artboard, padding, exportEps,
          removeBackground,
          postprocess: { ...postprocess },
          priority: maxPriority + i + 1,
          selected: false,
          iconStyle: item.iconStyle || null,
        }));
        setAssets(prev => [...prev, ...imported]);
        if (imported.length > 0) {
          setSelectedId(prev => prev ?? imported[0].tempId);
        }
      }
    } catch {
      onNotify?.("Upload failed.", "error");
    }
    setUploading(false);
  };

  const applyTracingToSelection = (partial: Partial<TracingArgs>) => {
    const target = selected ? [selected.tempId] : [];
    setAssets(prev => prev.map(a => target.includes(a.tempId) ? { ...a, tracing: { ...a.tracing, ...partial } } : a));
    setTracing(cur => ({ ...cur, ...partial }));
  };

  const applyPresetToSelection = (id: AssetTypeOption) => {
    setAssetType(id);
    setTracing({ ...TRACING_DEFAULTS[id] });
    const out = id === "cut-engrave"
      ? { drawStyle: "edges" as const, strokeWidth: 1, nonScaleStroke: true, gapFiller: false, parameterizedShapes: false, strokeReplacement: "#000000" }
      : { ...selected?.postprocess };
    if (id === "cut-engrave") setPostprocess({ ...out });
    setAssets(prev => prev.map(a => a.tempId === selected?.tempId
      ? { ...a, assetType: id, tracing: { ...TRACING_DEFAULTS[id] }, postprocess: { ...out } } : a));
  };

  const handleSelectGalleryAsset = async (assetId: string) => {
    const targetAsset = libraryAssets?.find((la) => la.id === assetId);
    const existing = assets.find((a) => a.tempId === assetId || (targetAsset && a.originalName === targetAsset.name));
    if (existing) {
      setSelectedId(existing.tempId);
      return;
    }

    setStagingAssetId(assetId);
    try {
      const data = await api.vectorStageLibrary([{ assetId }]);
      if (!data.success || !data.items || data.items.length === 0) {
        onNotify?.(data.detail || "Failed to stage asset from Gallery.", "error");
        return;
      }
      const item = data.items[0];
      const maxPriority = assetsRef.current.reduce((m, a) => Math.max(m, a.priority), 0);
      const staged: Asset = {
        tempId: item.tempId,
        originalName: item.originalName,
        width: item.width,
        height: item.height,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        previewUrl: item.filePath ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`) : undefined,
        status: "ready" as const,
        assetType,
        tracing: { ...TRACING_DEFAULTS[assetType] },
        artboard,
        padding,
        exportEps,
        removeBackground,
        postprocess: { ...postprocess },
        priority: maxPriority + 1,
        selected: false,
        iconStyle: targetAsset?.iconStyle || null,
      };
      setAssets((prev) => [...prev, staged]);
      setSelectedId(staged.tempId);
    } catch {
      onNotify?.("Failed to stage asset from Gallery.", "error");
    } finally {
      setStagingAssetId(null);
    }
  };

  const queueAssets = async (target: Asset[]) => {
    if (target.length === 0) return;
    setBatchCounter(c => c + 1);
    const ordered = [...target].sort((a, b) => a.priority - b.priority);
    try {
      const result = await api.vectorQueue(ordered.map(a => ({
        tempId: a.tempId,
        artboard: a.artboard,
        padding: a.padding,
        exportEps: a.exportEps,
        postprocess: a.postprocess,
        vtracerArgs: optimizeIcons && a.iconStyle && ICON_PRESET_ARGS[a.iconStyle]
          ? { ...tracingToPayload(a.tracing), ...ICON_PRESET_ARGS[a.iconStyle].args }
          : tracingToPayload(a.tracing),
        assetType: optimizeIcons && a.iconStyle && ICON_PRESET_ARGS[a.iconStyle]
          ? ICON_PRESET_ARGS[a.iconStyle].assetType
          : (a.assetType === "auto" ? undefined : a.assetType),
      })));
      if (!result.success) {
        onNotify?.(result.detail || "Failed to queue job.", "error");
        return;
      }
      setAssets(prev => prev.map(a => ordered.some(o => o.tempId === a.tempId)
        ? { ...a, status: "queued", selected: false } : a));
    } catch {
      onNotify?.("Failed to queue job.", "error");
    }
  };

  const handleStartTracing = () => {
    if (selected && (selected.status === "ready" || selected.status === "imported")) {
      queueAssets([selected]);
    } else if (selected && (selected.status === "completed" || selected.status === "failed")) {
      handleReTrace(selected.tempId);
    }
  };

  const handleReTrace = (tempId: string) => {
    setAssets(prev => prev.map(a => a.tempId === tempId ? {
      ...a, status: "ready", error: undefined, selected: true,
      outputSvgUrl: undefined, outputEpsUrl: undefined,
      validation: undefined, qcWarnings: undefined,
    } : a));
    setSelectedId(tempId);
    onNotify?.("Asset reset to Ready — adjust settings & trace.", "info");
  };

  const handleNativeExport = async (url: string, name: string) => {
    try {
      const res = await api.exportAsset({ url: url.replace(/^imagin:\/\/storage/, "/storage"), name });
      if (res.success && res.path) onNotify?.(`Exported: ${res.path}`, "success");
      else if (res.detail) onNotify?.(res.detail, "error");
    } catch {
      onNotify?.("Export failed.", "error");
    }
  };

  const handleRemoveBackground = (v: boolean) => {
    setRemoveBackground(v);
    setAssets(prev => prev.map(a => a.tempId === selected?.tempId ? { ...a, removeBackground: v } : a));
  };

  const selected = assets.find(a => a.tempId === selectedId) || null;
  const curTracing: TracingArgs = selected?.tracing ?? tracing;
  const curAssetType: AssetTypeOption = selected?.assetType ?? assetType;
  const curRemoveBackground = selected?.removeBackground ?? removeBackground;

  const activeAssets = assets.filter(a => a.status === "queued" || a.status === "processing");
  const completedAssets = assets.filter(a => a.status === "completed");
  const exportedAssets = assets.filter(a => a.status === "exported");
  const failedAssets = assets.filter(a => a.status === "failed");
  const recentAssets = [...completedAssets, ...exportedAssets].sort(
    (a, b) => (b.elapsedMs ?? 0) - (a.elapsedMs ?? 0)
  );

  const batchTotal = activeAssets.length + completedAssets.length + failedAssets.length + exportedAssets.length;
  const batchDone = completedAssets.length + exportedAssets.length;
  const batchFailed = failedAssets.length;

  return (
    <div className="vectorize-theme flex h-full w-full overflow-hidden bg-[var(--bg-base)]">
      <style>{`
        .vectorize-theme {
          --bg-void: #090c13;
          --bg-base: #090c13;
          --bg-panel: #0d111a;
          --bg-elevated: #121825;
          --bg-element: #121825;
          --bg-hover: #111724;
          --text-primary: #e2e8f0;
          --text-secondary: #cbd5e1;
          --text-muted: #64748b;
          --border-structural: #1e2638;
          --border-subtle: #202a3f;
          --border-strong: #2b3956;
          --accent-cobalt: #3b82f6;
          --accent-cobalt-solid: #2563eb;
          --accent-cyan: #06b6d4;
          --accent-cyan-solid: #06b6d4;
          --accent-indigo: #8b5cf6;
          --accent-warning: #f59e0b;
          --accent-success: #14b8a6;
          --accent-error: #ef4444;
          --vector-checker-base: #0d111a;
          --vector-checker-tile: #090c12;
        }
        [data-theme="light"] .vectorize-theme {
          --bg-void: #f8fafc;
          --bg-base: #f8fafc;
          --bg-panel: #ffffff;
          --bg-elevated: #f1f5f9;
          --bg-element: #f1f5f9;
          --bg-hover: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #334155;
          --text-muted: #94a3b8;
          --border-structural: #e2e8f0;
          --border-subtle: #e2e8f0;
          --border-strong: #cbd5e1;
          --accent-cobalt: #2563eb;
          --accent-cobalt-solid: #2563eb;
          --accent-cyan: #0284c7;
          --accent-cyan-solid: #2563eb;
          --accent-indigo: #7c3aed;
          --accent-warning: #d97706;
          --accent-success: #0d9488;
          --accent-error: #dc2626;
          --vector-checker-base: #f1f5f9;
          --vector-checker-tile: #e2e8f0;
        }
      `}</style>
      {/* ── LEFT WORKFLOW PANEL ── */}
      <VectorizeSidebarLeft
        assets={assets}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onFiles={processIncomingFiles}
        uploading={uploading}
        libraryAssets={libraryAssets}
        onSelectGalleryAsset={handleSelectGalleryAsset}
        stagingAssetId={stagingAssetId}
        tracing={curTracing}
        assetType={curAssetType}
        removeBackground={curRemoveBackground}
        applyPreset={applyPresetToSelection}
        applyTracing={applyTracingToSelection}
        applyRemoveBackground={handleRemoveBackground}
        activeAssetsCount={activeAssets.length}
        onStartTrace={handleStartTracing}
        optimizeIcons={optimizeIcons}
        onOptimizeIcons={setOptimizeIcons}
      />

      {/* ── CENTER WORKSPACE ── */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[var(--bg-void)]">
        <VectorizeCenter
          selected={selected}
          resolvedUrls={resolvedUrls}
          batchNumber={batchCounter}
          batchTotal={batchTotal}
          batchDone={batchDone}
          batchFailed={batchFailed}
          recentAssets={recentAssets}
          splitPos={splitPos}
          setSplitPos={setSplitPos}
          onReTrace={handleReTrace}
          onExport={handleNativeExport}
          onAssetClick={setSelectedId}
        />
      </main>

      {/* ── RIGHT INSPECTOR PANEL ── */}
      <VectorizeSidebarRight
        selected={selected}
        onExport={handleNativeExport}
        onNotify={onNotify}
      />
    </div>
  );
}
