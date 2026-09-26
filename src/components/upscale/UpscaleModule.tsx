import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/electron";
import { useJobSync } from "../../api/useJobSync";
import { LibraryAsset } from "../../types";
import { assetUrl } from "../../utils/assetUrl";
import UpscaleSidebarLeft from "./UpscaleSidebarLeft";
import UpscaleCenter from "./UpscaleCenter";
import UpscaleSidebarRight from "./UpscaleSidebarRight";
import {
  Asset,
  EngineId,
  HistoryEntry,
  OutputFormat,
  ScaleMode,
  detectAssetType,
  engineLabel,
  formatSteps,
  toBlobUrl,
} from "./types";

export interface UpscaleModuleProps {
  isActive?: boolean;
  onNotify?: (message: string, type?: "success" | "error" | "info") => void;
  libraryAssets?: LibraryAsset[];
  pendingHandoff?: { module: "VECTOR" | "UPSCALE" | "ANIMATION"; assetIds: string[]; nonce: number } | null;
  onHandoffDone?: () => void;
}

export default function UpscaleModule({
  onNotify,
  libraryAssets,
  pendingHandoff,
  onHandoffDone,
}: UpscaleModuleProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stagingAssetId, setStagingAssetId] = useState<string | null>(null);
  const [engine, setEngine] = useState<EngineId>("auto");
  const [scale, setScale] = useState<ScaleMode>("2x");
  const [customScale, setCustomScale] = useState(2);
  const [tileSize, setTileSize] = useState(0);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [whiteBackground, setWhiteBackground] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [batchCounter, setBatchCounter] = useState(1);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [waifu2xAvailable, setWaifu2xAvailable] = useState(false);

  const assetsRef = useRef<Asset[]>([]);
  assetsRef.current = assets;

  // Resolve all asset URLs → blob for preview without CSP/file-protocol issues
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls = new Set<string>();
      for (const a of assets) {
        if (a.previewUrl) urls.add(a.previewUrl);
        if (a.originalUrl) urls.add(a.originalUrl);
        if (a.outputUrl) urls.add(a.outputUrl);
      }
      for (const h of history) if (h.output) urls.add(h.output);
      const resolved: Record<string, string> = {};
      for (const u of urls) {
        const b = await toBlobUrl(u);
        if (cancelled) return;
        if (b) resolved[u] = b;
      }
      setResolvedUrls(prev => ({ ...prev, ...resolved }));
    })();
    return () => { cancelled = true; };
  }, [assets, history]);

  useEffect(() => {
    api.upscaleWaifu2xAvailable().then(r => setWaifu2xAvailable(r.available)).catch(() => {});
  }, []);

  // Handoff from Studio → Upscale
  useEffect(() => {
    if (!pendingHandoff || pendingHandoff.module !== "UPSCALE") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.upscaleStageLibrary(pendingHandoff.assetIds.map(assetId => ({ assetId })));
        if (cancelled) return;
        if (!data.success || !data.items || data.items.length === 0) {
          onNotify?.(data.detail || "No assets staged to Upscale.", "error");
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
          originalUrl: item.filePath ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`) : undefined,
          previewUrl: item.filePath ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`) : undefined,
          status: "ready" as const,
          engine,
          scale,
          customScale,
          tileSize,
          whiteBackground,
          outputFormat,
          assetType: "illustration",
          priority: maxPriority + i + 1,
          selected: false,
        }));
        setAssets(prev => [...prev, ...staged]);
        if (staged.length > 0) setSelectedId(prev => prev ?? staged[0].tempId);
        onNotify?.(`${data.items.length} asset(s) ready for Upscale.`, "success");
        onHandoffDone?.();
      } catch {
        if (!cancelled) {
          onNotify?.("Failed to stage asset to Upscale.", "error");
          onHandoffDone?.();
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHandoff?.nonce]);

  const fetchQueue = useCallback(async (jobs: any[]) => {
    if (jobs.length === 0) return;
    setAssets(prev => {
      const byId = new Map<string, Asset>(prev.map(a => [a.tempId, a]));
      for (const job of jobs) {
        const existing = byId.get(job.tempId);
        if (!existing) continue;
        const wasCompleted = existing.status === "completed" || existing.status === "exported";
        const merged: Asset = {
          ...existing,
          status: job.status,
          error: job.error,
          outputUrl: job.outputUrl ? assetUrl(job.outputUrl) : existing.outputUrl,
          originalUrl: job.originalUrl ? assetUrl(job.originalUrl) : existing.originalUrl,
          outputWidth: job.outputWidth ?? existing.outputWidth,
          outputHeight: job.outputHeight ?? existing.outputHeight,
          elapsedMs: job.elapsedMs ?? existing.elapsedMs,
          fallbackUsed: job.fallbackUsed ?? existing.fallbackUsed,
        };
        byId.set(job.tempId, merged);

        if (!wasCompleted && job.status === "completed") {
          setHistory(h => [{
            id: `${job.tempId}-${Date.now()}`,
            source: existing.originalName,
            output: job.outputUrl ? assetUrl(job.outputUrl) : "",
            engine: engineLabel(existing.engine),
            scale: existing.scale === "custom" ? `${existing.customScale}x` : existing.scale,
            timestamp: Date.now(),
            elapsedMs: job.elapsedMs,
          }, ...h]);
        }
      }
      return Array.from(byId.values());
    });
  }, []);

  useJobSync("upscale", fetchQueue);

  const processIncomingFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const previews = new Map(files.map(f => [f.name, URL.createObjectURL(f)]));
    try {
      const data = await api.upscaleUpload(files);
      if (data.success) {
        const items: any[] = data.items || [];
        const maxPriority = assetsRef.current.reduce((m, a) => Math.max(m, a.priority), 0);
        const imported: Asset[] = items.map((item, i) => {
          const storageUrl = item.filePath
            ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`)
            : undefined;
          const blobUrl = previews.get(item.originalName) || (files[i] ? URL.createObjectURL(files[i]) : undefined);
          return {
            tempId: item.tempId,
            originalName: item.originalName,
            width: item.width,
            height: item.height,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
            previewUrl: blobUrl || storageUrl,
            status: "imported" as const,
            engine: "auto",
            scale: item.suggestedScale || "2x",
            customScale: 2,
            tileSize: 0,
            whiteBackground: false,
            outputFormat: "png",
            priority: maxPriority + i + 1,
            selected: false,
          };
        });
        setAssets(prev => [...prev, ...imported]);
        if (imported.length > 0) setSelectedId(prev => prev ?? imported[0].tempId);

        for (const asset of imported) {
          if (!asset.previewUrl) continue;
          const type = await detectAssetType(asset.previewUrl, asset.width, asset.height, asset.mimeType);
          setAssets(prev => prev.map(a => a.tempId === asset.tempId ? { ...a, status: "ready", assetType: type } : a));
        }
      }
    } catch {
      onNotify?.("Upload failed.", "error");
    }
    setUploading(false);
  };

  const applyEngineToSelection = (e: EngineId) => {
    setEngine(e);
    setAssets(prev => prev.map(a => a.tempId === selectedId ? { ...a, engine: e } : a));
  };
  const applyScaleToSelection = (s: ScaleMode) => {
    setScale(s);
    setAssets(prev => prev.map(a => a.tempId === selectedId ? { ...a, scale: s } : a));
  };
  const applyCustomScaleToSelection = (v: number) => {
    setCustomScale(v);
    setAssets(prev => prev.map(a => a.tempId === selectedId ? { ...a, customScale: v } : a));
  };
  const applyTileToSelection = (v: number) => {
    setTileSize(v);
    setAssets(prev => prev.map(a => a.tempId === selectedId ? { ...a, tileSize: v } : a));
  };
  const applyOutputFormatToSelection = (f: OutputFormat) => {
    setOutputFormat(f);
    setAssets(prev => prev.map(a => a.tempId === selectedId ? { ...a, outputFormat: f } : a));
  };
  const applyWhiteBgToSelection = (v: boolean) => {
    setWhiteBackground(v);
    setAssets(prev => prev.map(a => a.tempId === selectedId ? { ...a, whiteBackground: v } : a));
  };

  const queueAssets = async (target: Asset[]) => {
    if (target.length === 0) return;
    setBatchCounter(c => c + 1);
    const ordered = [...target].sort((a, b) => a.priority - b.priority);
    try {
      const result = await api.upscaleQueue(ordered.map(a => ({
        tempId: a.tempId,
        engine: a.engine === "auto" ? "auto" : a.engine,
        scale: a.scale,
        customScale: a.customScale,
        tileSize: a.tileSize,
        whiteBackground: a.whiteBackground,
        outputFormat: a.outputFormat,
      })));
      if (!result.success) {
        onNotify?.(result.detail || "Failed to queue job.", "error");
        return;
      }
      setAssets(prev => prev.map(a => ordered.some(o => o.tempId === a.tempId) ? { ...a, status: "queued", selected: false } : a));
    } catch {
      onNotify?.("Failed to queue job.", "error");
    }
    setTimeout(fetchQueue, 500);
  };

  const handleStartUpscale = () => {
    const target = selected && (selected.status === "ready" || selected.status === "imported") ? [selected] : [];
    queueAssets(target);
  };

  const handleReTrace = (tempId: string) => {
    setAssets(prev => prev.map(a => a.tempId === tempId ? {
      ...a, status: "ready", error: undefined, selected: true,
      outputUrl: undefined, fallbackUsed: undefined,
    } : a));
    setSelectedId(tempId);
    onNotify?.("Asset reset to Ready — adjust settings & upscale.", "info");
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
      const data = await api.upscaleStageLibrary([{ assetId }]);
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
        originalUrl: item.filePath ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`) : undefined,
        previewUrl: item.filePath ? assetUrl(`/storage/imports/${encodeURIComponent(String(item.filePath).split('/').pop() || '')}`) : undefined,
        status: "ready" as const,
        engine,
        scale,
        customScale,
        tileSize,
        whiteBackground,
        outputFormat,
        assetType: "illustration",
        priority: maxPriority + 1,
        selected: false,
      };
      setAssets((prev) => [...prev, staged]);
      setSelectedId(staged.tempId);
    } catch {
      onNotify?.("Failed to stage asset from Gallery.", "error");
    } finally {
      setStagingAssetId(null);
    }
  };

  const handleNativeExport = async (url: string, name: string) => {
    try {
      const res = await api.exportAsset({ url: url.replace(/^imagin:\/\/storage/, "/storage"), name });
      if (res.success && res.path) onNotify?.(`Exported to ${res.path}`, "success");
      else if (res.detail) onNotify?.(res.detail, "error");
    } catch {
      onNotify?.("Export failed.", "error");
    }
  };

  const selected = assets.find(a => a.tempId === selectedId) || null;
  const curEngine = selected?.engine ?? engine;
  const curScale = selected?.scale ?? scale;
  const curCustomScale = selected?.customScale ?? customScale;
  const curFormat = selected?.outputFormat ?? outputFormat;
  const curWhiteBg = selected?.whiteBackground ?? whiteBackground;

  const readyAssets = assets.filter(a => a.status === "ready" || a.status === "imported");
  const activeAssets = assets.filter(a => a.status === "queued" || a.status === "processing");
  const completedAssets = assets.filter(a => a.status === "completed");
  const exportedAssets = assets.filter(a => a.status === "exported");
  const failedAssets = assets.filter(a => a.status === "failed");
  const recentAssets = [...completedAssets, ...exportedAssets].sort((a, b) => (b.elapsedMs ?? 0) - (a.elapsedMs ?? 0));

  const batchTotal = activeAssets.length + completedAssets.length + failedAssets.length + exportedAssets.length;
  const batchDone = completedAssets.length + exportedAssets.length;
  const batchFailed = failedAssets.length;

  useEffect(() => {
    if (!selected) { setPipelineStep(0); return; }
    switch (selected.status) {
      case "completed":
      case "exported":
        setPipelineStep(9);
        break;
      case "processing":
        setPipelineStep(4);
        break;
      case "queued":
        setPipelineStep(1);
        break;
      default:
        setPipelineStep(0);
    }
  }, [selected?.status]);

  return (
    <div className="upscale-theme flex h-full w-full overflow-hidden bg-[var(--bg-base)]">
      <style>{`
        /* Upscale owns the mockup palette locally; shared tokens stay untouched. */
        .upscale-theme {
          --bg-base: #0a0d14;
          --bg-void: #07090e;
          --bg-panel: #0e131d;
          --bg-elevated: #161d2b;
          --bg-element: #141a27;
          --bg-hover: #1b2333;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --border-subtle: #1a2233;
          --border-structural: #1c2436;
          --border-strong: #232c3f;
          --accent-cobalt: #3b82f6;
          --accent-cobalt-solid: #2563eb;
          --accent-cyan: #00e5ff;
          --accent-cyan-solid: #00e5ff;
          --accent-success: #10b981;
          --accent-action-soft: rgb(0 229 255 / 0.12);
        }
        [data-theme="light"] .upscale-theme {
          --bg-base: #f8fafc;
          --bg-void: #f1f5f9;
          --bg-panel: #ffffff;
          --bg-elevated: #ffffff;
          --bg-element: #ffffff;
          --bg-hover: #f1f5f9;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #64748b;
          --border-subtle: #e2e8f0;
          --border-structural: #e2e8f0;
          --border-strong: #e2e8f0;
          --accent-cobalt: #2563eb;
          --accent-cobalt-solid: #2563eb;
          --accent-cyan: #0284c7;
          --accent-cyan-solid: #0284c7;
          --accent-success: #059669;
          --accent-action-soft: rgb(37 99 235 / 0.12);
        }
      `}</style>
      {/* ── LEFT WORKFLOW PANEL ── */}
      <UpscaleSidebarLeft
        assets={assets}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onFiles={processIncomingFiles}
        uploading={uploading}
        libraryAssets={libraryAssets}
        onSelectGalleryAsset={handleSelectGalleryAsset}
        stagingAssetId={stagingAssetId}
        engine={curEngine}
        setEngine={applyEngineToSelection}
        scale={curScale}
        setScale={applyScaleToSelection}
        customScale={curCustomScale}
        setCustomScale={applyCustomScaleToSelection}
        tileSize={tileSize}
        setTileSize={applyTileToSelection}
        outputFormat={curFormat}
        setOutputFormat={applyOutputFormatToSelection}
        whiteBackground={curWhiteBg}
        setWhiteBackground={applyWhiteBgToSelection}
        activeAssetsCount={activeAssets.length}
        selectedReadyCount={selected && (selected.status === "ready" || selected.status === "imported") ? 1 : 0}
        readyCount={readyAssets.length}
        onStartUpscale={handleStartUpscale}
      />

      {/* ── CENTER WORKSPACE ── */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[var(--bg-void)]">
        <UpscaleCenter
          selected={selected}
          resolvedUrls={resolvedUrls}
          activeStep={pipelineStep}
          splitPos={splitPos}
          setSplitPos={setSplitPos}
          zoom={zoom}
          setZoom={(value) => setZoom(Math.min(200, Math.max(50, value)))}
          batchNumber={batchCounter}
          batchTotal={batchTotal}
          batchDone={batchDone}
          batchFailed={batchFailed}
          recentAssets={recentAssets}
          onReTrace={handleReTrace}
          onExport={handleNativeExport}
          onAssetClick={setSelectedId}
        />
      </main>

      {/* ── RIGHT INSPECTOR PANEL ── */}
      <UpscaleSidebarRight
        selected={selected}
        outputFormat={curFormat}
        onExport={handleNativeExport}
        onNotify={onNotify}
      />
    </div>
  );
}
