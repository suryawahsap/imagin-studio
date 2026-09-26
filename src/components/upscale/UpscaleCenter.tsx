import React, { useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  Columns2,
  ImagePlus,
  Loader2,
  FolderDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Zap,
} from "lucide-react";
import GlassBadge from "../global/GlassBadge";
import Button from "../global/Button";
import { Asset } from "./types";

export interface UpscaleCenterProps {
  selected: Asset | null;
  resolvedUrls: Record<string, string>;
  activeStep: number;
  splitPos: number;
  setSplitPos: (n: number) => void;
  zoom: number;
  setZoom: (n: number) => void;
  batchNumber: number;
  batchTotal: number;
  batchDone: number;
  batchFailed: number;
  recentAssets: Asset[];
  onExport: (url: string, name: string) => void;
  onReTrace: (id: string) => void;
  onAssetClick: (id: string) => void;
}

export default function UpscaleCenter({
  selected,
  resolvedUrls,
  splitPos,
  setSplitPos,
  zoom,
  setZoom,
  recentAssets,
  onExport,
  onReTrace,
  onAssetClick,
}: UpscaleCenterProps) {
  const [viewMode, setViewMode] = useState<"split" | "side">("split");
  const filmstripRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const originalSrc = selected ? resolvedUrls[selected.previewUrl || ""] || selected.previewUrl : undefined;
  const outputSrc = selected?.outputUrl ? resolvedUrls[selected.outputUrl] || selected.outputUrl : undefined;
  const isProcessing = selected?.status === "queued" || selected?.status === "processing";
  const isCompleted = selected?.status === "completed" || selected?.status === "exported";

  const scaleDisplay = selected
    ? selected.scale === "custom"
      ? `${selected.customScale}X`
      : selected.scale.toUpperCase()
    : "4K";

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const scrollFilmstrip = (direction: "left" | "right") => {
    if (filmstripRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      filmstripRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[var(--bg-void)] overflow-hidden select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── TOP WORKSPACE TOOLBAR ── */}
      <div className="h-11 border-b border-[var(--border-structural)] px-4 flex items-center justify-between bg-[var(--bg-panel)] shrink-0">
        {/* Left: Zoom & Scale Controls */}
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            type="button"
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-structural)]">
            {zoom}% ({scaleDisplay})
          </span>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            title="Fit to Screen (100%)"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Center: View Modes Switcher */}
        <div className="flex items-center bg-[var(--bg-base)] p-0.5 rounded-md border border-[var(--border-structural)]">
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
              viewMode === "split"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs border border-[var(--border-strong)] font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-[var(--accent-cobalt)]" />
            <span>Split Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("side")}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
              viewMode === "side"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs border border-[var(--border-strong)] font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Columns2 className="w-3 h-3 text-[var(--accent-cyan)]" />
            <span>Side-by-Side</span>
          </button>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center space-x-2">
          {selected && isCompleted && selected.outputUrl && (
            <Button
              variant="secondary"
              size="xs"
              icon={<RotateCcw className="w-3 h-3" />}
              onClick={() => onReTrace(selected.tempId)}
            >
              Re-trace
            </Button>
          )}
          {selected && isCompleted && selected.outputUrl && (
            <Button
              variant="primary"
              size="xs"
              icon={<FolderDown className="w-3 h-3" />}
              onClick={() => onExport(selected.outputUrl!, selected.originalName)}
            >
              Export
            </Button>
          )}
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            title="Fullscreen Canvas"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── MAIN CANVAS VIEWPORT ── */}
      <div className="flex-1 relative overflow-hidden bg-[var(--bg-void)] flex items-center justify-center p-3">
        {!selected ? (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-structural)] flex items-center justify-center text-[var(--accent-cobalt)] mb-4 shadow-sm">
              <ImagePlus className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No Image Selected
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 font-sans leading-relaxed">
              Drop an image into the workflow sidebar or select one from the Gallery to begin neural upscaling.
            </p>
          </div>
        ) : viewMode === "split" ? (
          /* ── SPLIT SLIDER VIEWPORT ── */
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="relative w-full max-w-[820px] aspect-square max-h-[580px] rounded border border-[var(--border-strong)] overflow-hidden shadow-2xl bg-[var(--bg-base)]"
          >
            {/* Layer 1: AFTER Image (Ultra High Res) */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
              {isProcessing || !outputSrc ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cobalt)]" />
                  <span className="mt-2 text-xs font-mono font-medium text-[var(--accent-cobalt)]">
                    NEURAL UPSCALING...
                  </span>
                </div>
              ) : (
                <img
                  src={outputSrc}
                  alt="Upscaled output"
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${zoom / 100})` }}
                  referrerPolicy="no-referrer"
                />
              )}

              {/* AFTER Badge */}
              <div className="absolute top-4 right-4 z-10">
                <GlassBadge variant="accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] shadow-xs" />
                  <span>AFTER ({scaleDisplay} AI)</span>
                </GlassBadge>
              </div>
            </div>

            {/* Layer 2: BEFORE Image (Lower Res Original, masked by split percentage) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-[var(--accent-cyan)] shadow-[0_0_15px_var(--accent-action-soft)]"
              style={{ width: `${splitPos}%` }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%" }}
              >
                {originalSrc ? (
                  <img
                    src={originalSrc}
                    alt="Original low-res"
                    className="max-w-full max-h-full object-contain filter contrast-[0.96]"
                    style={{ transform: `scale(${zoom / 100})` }}
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>

              {/* BEFORE Badge */}
              <div className="absolute top-4 left-4 z-10">
                <GlassBadge variant="dark">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                  <span>BEFORE (1K)</span>
                </GlassBadge>
              </div>
            </div>

            {/* Interactive Center Handle Grip */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute top-0 bottom-0 z-20 cursor-ew-resize flex items-center justify-center -translate-x-1/2"
              style={{ left: `${splitPos}%` }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-lg flex items-center justify-center text-xs hover:scale-110 active:scale-95 transition-transform">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Floating Zoom Pill (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 z-10">
              <GlassBadge variant="dark">
                <span>{zoom}% NATIVE</span>
              </GlassBadge>
            </div>

            {/* Floating Result Title (Bottom-Center) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <GlassBadge variant="frosted">
                <span className="font-semibold">{selected.originalName}</span>
              </GlassBadge>
            </div>
          </div>
        ) : (
          /* ── SIDE-BY-SIDE VIEWPORT ── */
          <div className="w-full h-full max-w-[960px] max-h-[580px] grid grid-cols-2 gap-2 p-2 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-strong)] shadow-2xl">
            {/* Left Box: Before */}
            <div className="relative rounded-md border border-[var(--border-structural)] bg-[var(--bg-base)] flex items-center justify-center overflow-hidden p-2">
              <div className="absolute top-3 left-3 z-10">
                <GlassBadge variant="dark">BEFORE (1K)</GlassBadge>
              </div>
              {originalSrc ? (
                <img
                  src={originalSrc}
                  alt="Before"
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom / 100})` }}
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>

            {/* Right Box: After */}
            <div className="relative rounded-md border border-[var(--border-structural)] bg-[var(--bg-base)] flex items-center justify-center overflow-hidden p-2">
              <div className="absolute top-3 right-3 z-10">
                <GlassBadge variant="accent">AFTER ({scaleDisplay} AI)</GlassBadge>
              </div>
              {isProcessing || !outputSrc ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cobalt)]" />
                  <span className="mt-2 text-xs font-mono font-medium text-[var(--accent-cobalt)]">
                    UPSCALING...
                  </span>
                </div>
              ) : (
                <img
                  src={outputSrc}
                  alt="After"
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom / 100})` }}
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM FILMSTRIP ASSET CAROUSEL ── */}
      <div className="h-16 border-t border-[var(--border-structural)] bg-[var(--bg-base)] flex items-center px-4 justify-between shrink-0">
        <button
          type="button"
          onClick={() => scrollFilmstrip("left")}
          className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={filmstripRef}
          className="flex items-center space-x-3 overflow-x-auto py-1 px-2 scrollbar-none flex-1 mx-2"
        >
          {recentAssets.length === 0 ? (
            <span className="text-[11px] font-mono text-[var(--text-muted)] mx-auto">
              Completed upscales will appear in this filmstrip carousel.
            </span>
          ) : (
            recentAssets.map((asset) => {
              const active = asset.tempId === selected?.tempId;
              const thumb = asset.outputUrl
                ? resolvedUrls[asset.outputUrl] || asset.outputUrl
                : asset.previewUrl
                ? resolvedUrls[asset.previewUrl] || asset.previewUrl
                : undefined;

              return (
                <div
                  key={asset.tempId}
                  onClick={() => onAssetClick(asset.tempId)}
                  className={`relative w-12 h-12 rounded overflow-hidden cursor-pointer shrink-0 transition-all border ${
                    active
                      ? "border-[var(--accent-cobalt)] ring-2 ring-[var(--accent-cobalt)]/40 shadow-sm"
                      : "border-[var(--border-structural)] hover:border-[var(--border-strong)] opacity-70 hover:opacity-100"
                  }`}
                  title={asset.originalName}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={asset.originalName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-elevated)] flex items-center justify-center">
                      <ImagePlus className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-black/80 text-white px-1 rounded">
                    {asset.scale === "custom" ? `${asset.customScale}x` : asset.scale.toUpperCase()}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => scrollFilmstrip("right")}
          className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
