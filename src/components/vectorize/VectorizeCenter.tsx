import React, { useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  Columns2,
  FileImage,
  Loader2,
  FolderDown,
  ChevronLeft,
  ChevronRight,
  Grid,
  Zap,
  Layers,
} from "lucide-react";
import GlassBadge from "../global/GlassBadge";
import Button from "../global/Button";
import { Asset } from "./types";

export interface VectorizeCenterProps {
  selected: Asset | null;
  resolvedUrls: Record<string, string>;
  batchNumber: number;
  batchTotal: number;
  batchDone: number;
  batchFailed: number;
  recentAssets: Asset[];
  splitPos: number;
  setSplitPos: (n: number) => void;
  onReTrace: (id: string) => void;
  onExport: (url: string, name: string) => void;
  onAssetClick: (id: string) => void;
}

export default function VectorizeCenter({
  selected,
  resolvedUrls,
  splitPos,
  setSplitPos,
  recentAssets,
  onReTrace,
  onExport,
  onAssetClick,
}: VectorizeCenterProps) {
  const [zoom, setZoom] = useState(100);
  const [wireframe, setWireframe] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const moveSplit = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    setSplitPos(Math.max(25, Math.min(75, ((event.clientX - bounds.left) / bounds.width) * 100)));
  };

  const originalSrc = selected ? resolvedUrls[selected.previewUrl || ""] || selected.previewUrl : undefined;
  const outputSvgSrc = selected?.outputSvgUrl ? resolvedUrls[selected.outputSvgUrl] || selected.outputSvgUrl : undefined;
  const isProcessing = selected?.status === "queued" || selected?.status === "processing";
  const isCompleted = selected?.status === "completed" || selected?.status === "exported";

  const pathCount = selected?.validation?.metrics?.pathCount ?? 142;
  const nodeCount = selected?.validation?.metrics?.nodeCount ?? 384;
  const fileSizeKb = selected?.fileSize ? Math.round(selected.fileSize / 1024) : 245;

  const scrollFilmstrip = (direction: "left" | "right") => {
    if (filmstripRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      filmstripRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const checkerboardStyle: React.CSSProperties = {
    backgroundColor: "var(--vector-checker-base, var(--bg-void))",
    backgroundImage: `
      linear-gradient(45deg, var(--vector-checker-tile, var(--border-structural)) 25%, transparent 25%),
      linear-gradient(-45deg, var(--vector-checker-tile, var(--border-structural)) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--vector-checker-tile, var(--border-structural)) 75%),
      linear-gradient(-45deg, transparent 75%, var(--vector-checker-tile, var(--border-structural)) 75%)
    `,
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-void)] overflow-hidden select-none">
      {/* ── TOP WORKSPACE UTILITY TOOLBAR ── */}
      <div className="h-10 bg-[var(--bg-panel)] border-b border-[var(--border-structural)] flex items-center justify-between px-4 shrink-0">
        {/* Scale & Bézier Nodes indicator */}
        <div className="flex items-center space-x-3 text-[11px] font-mono text-[var(--text-secondary)]">
          <div className="flex items-center space-x-1 bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-structural)]">
            <button
              type="button"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="hover:text-[var(--text-primary)] transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="hover:text-[var(--text-primary)] transition ml-1"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="hover:text-[var(--text-primary)] transition ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
          <span>
            Scale: <strong className="text-[var(--text-primary)]">{zoom}%</strong>
          </span>
          <span className="text-[var(--text-muted)]">|</span>
          <span>
            Bézier Nodes: <strong className="text-[var(--accent-cyan)]">{nodeCount}</strong>
          </span>
        </div>

        {/* Wireframe & Canvas Tools */}
        <div className="flex items-center space-x-2">
          {selected && isCompleted && selected.outputSvgUrl && (
            <Button
              variant="secondary"
              size="xs"
              icon={<RotateCcw className="w-3 h-3" />}
              onClick={() => onReTrace(selected.tempId)}
            >
              Re-trace
            </Button>
          )}
          {selected && isCompleted && selected.outputSvgUrl && (
            <Button
              variant="primary"
              size="xs"
              icon={<FolderDown className="w-3 h-3" />}
              onClick={() => onExport(selected.outputSvgUrl!, selected.originalName)}
            >
              Export SVG
            </Button>
          )}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono border transition ${
              wireframe
                ? "bg-[var(--accent-cobalt-solid)] text-white border-[var(--accent-cobalt)] shadow-xs"
                : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border-[var(--border-structural)] text-[var(--text-secondary)]"
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Wireframe</span>
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

      {/* ── DUAL PANE COMPARISON CANVAS VIEWPORT ── */}
      <div
        className="flex-1 grid gap-px bg-[var(--border-structural)] overflow-hidden relative"
        style={{ gridTemplateColumns: `${splitPos}% ${100 - splitPos}%` }}
      >
        {/* Left Pane: Original Raster */}
        <div className="relative bg-[var(--bg-base)] flex flex-col items-center justify-center p-4 overflow-hidden group select-none">
          {/* Top-Left Pane Badge */}
          <div className="absolute top-3 left-3 z-10">
            <GlassBadge variant="dark">
              <span className="font-semibold uppercase tracking-wider">Original Raster</span>
              <span className="text-[9px] text-[var(--text-muted)] border-l border-white/20 pl-1.5 ml-1">
                RGBA 8-bit
              </span>
            </GlassBadge>
          </div>

          {/* Raster Preview Render */}
          {!selected ? (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <FileImage className="w-10 h-10 text-[var(--text-muted)] mb-2" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">No Raster Selected</p>
            </div>
          ) : originalSrc ? (
            <div className="w-full h-full max-w-[420px] max-h-[420px] flex items-center justify-center drop-shadow-2xl">
              <img
                src={originalSrc}
                alt={selected.originalName}
                className="max-w-full max-h-full object-contain filter contrast-105"
                style={{ transform: `scale(${zoom / 100})` }}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          )}

          {/* Bottom-Left Spec Readout */}
          {selected && (
            <div className="absolute bottom-3 left-3 z-10 font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-panel)]/80 px-2 py-0.5 rounded border border-[var(--border-structural)]">
              {selected.width} × {selected.height}
            </div>
          )}
        </div>

        {/* Right Pane: Vectorized SVG */}
        <div
          style={checkerboardStyle}
          className="relative flex flex-col items-center justify-center p-4 overflow-hidden group select-none"
        >
          {/* Top-Left Pane Badge */}
          <div className="absolute top-3 left-3 z-10">
            <GlassBadge variant="accent">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-pulse shadow-xs" />
              <span className="font-semibold uppercase tracking-wider">Vectorized SVG</span>
              <span className="text-[9px] text-[var(--accent-cyan)] border-l border-[var(--accent-cyan)]/30 pl-1.5 ml-1">
                Clean Bézier Curves
              </span>
            </GlassBadge>
          </div>

          {/* Top-Right Info Badge */}
          {selected && isCompleted && (
            <div className="absolute top-3 right-3 z-10 font-mono text-[10px] text-[var(--accent-cyan)] bg-[var(--bg-panel)]/90 px-2.5 py-1 rounded border border-[var(--border-structural)] shadow-xs">
              {pathCount} paths • {fileSizeKb} KB
            </div>
          )}

          {/* Vector SVG Render */}
          {!selected ? (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <p className="text-xs font-mono text-[var(--text-muted)]">
                Vector output preview will render here.
              </p>
            </div>
          ) : isProcessing || !outputSvgSrc ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cobalt)]" />
              <span className="mt-2 text-xs font-mono font-medium text-[var(--accent-cobalt)]">
                GENERATING BÉZIER CURVES...
              </span>
            </div>
          ) : (
            <div className={`w-full h-full max-w-[420px] max-h-[420px] flex items-center justify-center drop-shadow-2xl ${wireframe ? "filter invert contrast-200" : ""}`}>
              <img
                src={outputSvgSrc}
                alt="Vector SVG"
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoom / 100})` }}
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Caption Pill */}
          {selected && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <GlassBadge variant="frosted">
                <span className="font-semibold">{selected.originalName.replace(/\.[^.]+$/, "")}.svg</span>
              </GlassBadge>
            </div>
          )}
        </div>
        <div
          role="separator"
          aria-label="Comparison split position"
          aria-valuemin={25}
          aria-valuemax={75}
          aria-valuenow={Math.round(splitPos)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            moveSplit(event);
          }}
          onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && moveSplit(event)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setSplitPos(Math.max(25, splitPos - 1));
            if (event.key === "ArrowRight") setSplitPos(Math.min(75, splitPos + 1));
          }}
          className="absolute inset-y-0 z-20 -ml-1 w-2 cursor-col-resize outline-none"
          style={{ left: `${splitPos}%` }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border-strong)] shadow-[0_0_8px_var(--bg-void)]" />
          <span className="absolute left-1/2 top-1/2 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-panel)] text-[var(--text-muted)] shadow-lg">
            <Columns2 className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* ── BOTTOM FILMSTRIP CAROUSEL ── */}
      <div className="h-24 bg-[var(--bg-panel)] border-t border-[var(--border-structural)] px-4 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => scrollFilmstrip("left")}
          className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
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
              Completed vectorizations will appear in this history filmstrip.
            </span>
          ) : (
            recentAssets.map((asset) => {
              const active = asset.tempId === selected?.tempId;
              const thumb = asset.outputSvgUrl
                ? resolvedUrls[asset.outputSvgUrl] || asset.outputSvgUrl
                : asset.previewUrl
                ? resolvedUrls[asset.previewUrl] || asset.previewUrl
                : undefined;

              return (
                <div
                  key={asset.tempId}
                  onClick={() => onAssetClick(asset.tempId)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden cursor-pointer shrink-0 transition-all border p-1 ${
                    active
                      ? "border-[var(--accent-cobalt)] ring-2 ring-[var(--accent-cobalt)]/40 shadow-sm bg-[var(--bg-elevated)]"
                      : "border-[var(--border-structural)] hover:border-[var(--border-strong)] bg-[var(--bg-base)] opacity-70 hover:opacity-100"
                  }`}
                  title={asset.originalName}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={asset.originalName}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  )}
                  {active && (
                    <span className="absolute bottom-0.5 inset-x-1 bg-[var(--accent-cobalt-solid)] text-white text-[8px] font-mono text-center rounded">
                      Active
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => scrollFilmstrip("right")}
          className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
