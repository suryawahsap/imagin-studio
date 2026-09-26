import React, { useState } from "react";
import {
  FolderOpen,
  UploadCloud,
  Shapes,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Check,
  Sliders,
  Maximize,
  Grid,
} from "lucide-react";
import WorkflowPanel, { WorkflowStep } from "../global/WorkflowPanel";
import Button from "../global/Button";
import FieldRow from "../global/FieldRow";
import {
  Asset,
  AssetTypeOption,
  TracerClustering,
  TracingArgs,
  ASSET_TYPE_OPTIONS,
} from "./types";
import { LibraryAsset } from "../../types";

export interface VectorizeSidebarLeftProps {
  assets: Asset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFiles: (files: File[]) => void;
  uploading: boolean;
  libraryAssets?: LibraryAsset[];
  onSelectGalleryAsset?: (assetId: string) => void;
  stagingAssetId?: string | null;
  // Tracing parameters
  tracing: TracingArgs;
  assetType: AssetTypeOption;
  removeBackground: boolean;
  applyPreset: (id: AssetTypeOption) => void;
  applyTracing: (partial: Partial<TracingArgs>) => void;
  applyRemoveBackground: (v: boolean) => void;
  activeAssetsCount: number;
  onStartTrace: () => void;
  optimizeIcons: boolean;
  onOptimizeIcons: (value: boolean) => void;
}

const DECOMPOSITION_PROFILES: Array<{
  id: AssetTypeOption;
  label: string;
  sub: string;
  iconSvg: React.ReactNode;
}> = [
  {
    id: "flat-icon",
    label: "Flat Icon",
    sub: "Solid fills",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-cobalt)]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "outline-icon",
    label: "Outline",
    sub: "Sharp lines",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    id: "flat-illustration",
    label: "Detailed",
    sub: "Multi-layer",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-indigo)]" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "line-art",
    label: "Line Art",
    sub: "Pure B/W",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20c4-4 8-16 16-16" />
        <path d="M4 14c3-3 6-9 11-10" />
      </svg>
    ),
  },
  {
    id: "photo",
    label: "Photo",
    sub: "High palette",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-warning)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: "cut-engrave",
    label: "Shape/Cut",
    sub: "CNC & Laser",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2">
        <path d="M12 2l8 8-8 8-8-8z" />
      </svg>
    ),
  },
  {
    id: "pixel-art",
    label: "Blocky",
    sub: "Pixel grids",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-error)]" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="4" height="4" />
        <rect x="10" y="4" width="4" height="4" />
        <rect x="16" y="4" width="4" height="4" />
        <rect x="4" y="10" width="4" height="4" />
        <rect x="16" y="10" width="4" height="4" />
        <rect x="10" y="16" width="4" height="4" />
      </svg>
    ),
  },
  {
    id: "auto",
    label: "Auto",
    sub: "Auto detect",
    iconSvg: (
      <svg className="w-5 h-5 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
      </svg>
    ),
  },
];

const CLUSTERING_OPTIONS: Array<{ id: TracerClustering; label: string }> = [
  { id: "color-cluster", label: "Color Clusters" },
  { id: "bw", label: "Binary (B/W)" },
  { id: "watershed", label: "Watershed" },
];

export default function VectorizeSidebarLeft({
  assets,
  selectedId,
  onSelect,
  onFiles,
  uploading,
  libraryAssets = [],
  onSelectGalleryAsset,
  stagingAssetId,
  tracing,
  assetType,
  removeBackground,
  applyPreset,
  applyTracing,
  applyRemoveBackground,
  activeAssetsCount,
  onStartTrace,
  optimizeIcons,
  onOptimizeIcons,
}: VectorizeSidebarLeftProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modeCategory, setModeCategory] = useState<"icon" | "structured">("icon");
  const [dragOver, setDragOver] = useState(false);

  const eligibleGalleryAssets = libraryAssets.filter((a) => {
    if (a.type !== "IMAGE") return false;
    if (a.mimeType) {
      return ["image/png", "image/jpeg", "image/webp"].includes(a.mimeType.toLowerCase());
    }
    const ext = a.url?.split(".").pop()?.toLowerCase();
    return ext ? ["png", "jpg", "jpeg", "webp"].includes(ext) : true;
  });

  const selectedAsset = assets.find((a) => a.tempId === selectedId) || null;
  const iconAssets = assets.filter(a => a.iconStyle);
  const presetNames = Array.from(new Set(iconAssets.map(a => a.iconStyle))).filter(Boolean) as string[];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <WorkflowPanel
      title="WORKFLOW"
      width={320}
      icon={<Shapes className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />}
      badge="VCTR-AI v3"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={activeAssetsCount > 0}
          onClick={onStartTrace}
          className="shadow-lg font-mono text-xs tracking-wider uppercase font-bold"
        >
          {activeAssetsCount > 0 ? "Tracing Vector..." : "Vectorize"}
        </Button>
      }
    >
      {/* ── STEP 1: Source ── */}
      <WorkflowStep
        step={1}
        title="Source"
        action={
          <button
            type="button"
            onClick={() => setShowGallery(!showGallery)}
            className="text-[11px] font-sans font-medium text-[var(--accent-cobalt)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
            <span>Library ({eligibleGalleryAssets.length})</span>
          </button>
        }
      >
        {/* Dropzone Container */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-3 text-center transition-all cursor-pointer block group ${
            dragOver
              ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/10"
              : "border-[var(--border-strong)] hover:border-[var(--accent-cobalt)] bg-[var(--bg-void)]/60 hover:bg-[var(--bg-hover)]"
          }`}
        >
          <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent-cobalt)] group-hover:border-[var(--accent-cobalt)]/40 transition-colors shadow-xs">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-cobalt)]" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
          </div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            {uploading ? "Uploading raster..." : "Drop file here or click to upload"}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
            Supported: JPG, PNG, WEBP, TIFF
          </p>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFiles(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />
        </label>

        {/* Selected / Loaded File Pill */}
        {selectedAsset && (
          <div className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] py-1.5 px-2.5 rounded-md flex items-center justify-between text-[10px] font-mono shadow-xs">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] inline-block shrink-0 shadow-xs" />
              <span className="text-[var(--text-primary)] font-semibold truncate">
                Loaded: {selectedAsset.originalName}
              </span>
            </div>
            <span className="text-[var(--text-muted)] shrink-0 ml-1">
              ({selectedAsset.fileSize ? `${(selectedAsset.fileSize / 1024 / 1024).toFixed(1)} MB` : "Ready"})
            </span>
          </div>
        )}

        {/* Gallery Drawer */}
        {showGallery && (
          <div className="p-2 bg-[var(--bg-base)] border border-[var(--border-structural)] rounded-lg space-y-1.5 animate-fade-in max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase px-1">
              <span>Gallery Assets</span>
              <span>{eligibleGalleryAssets.length}</span>
            </div>
            {eligibleGalleryAssets.length === 0 ? (
              <p className="text-[10px] font-mono text-[var(--text-muted)] p-1 text-center">
                No eligible raster images in Gallery.
              </p>
            ) : (
              eligibleGalleryAssets.map((ga) => {
                const isStaging = stagingAssetId === ga.id;
                const isStaged = assets.some((a) => a.originalName === ga.name);
                return (
                  <button
                    key={ga.id}
                    type="button"
                    onClick={() => onSelectGalleryAsset?.(ga.id)}
                    disabled={isStaging || uploading}
                    className={`w-full text-left p-1.5 rounded flex items-center justify-between gap-2 text-xs font-mono transition-all ${
                      isStaged
                        ? "bg-[var(--accent-cobalt)]/10 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/30"
                        : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-structural)] hover:border-[var(--accent-cobalt)]"
                    }`}
                  >
                    <span className="truncate">{ga.name}</span>
                    {isStaging ? (
                      <Loader2 className="w-3 h-3 animate-spin shrink-0 text-[var(--accent-cobalt)]" />
                    ) : isStaged ? (
                      <Check className="w-3 h-3 text-[var(--accent-cobalt)] shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Studio Workspace Queue List */}
        {assets.length > 1 && (
          <div className="space-y-1 max-h-28 overflow-y-auto pt-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] block px-1">
              WORKSPACE QUEUE ({assets.length})
            </span>
            {assets.map((a) => (
              <button
                key={a.tempId}
                type="button"
                onClick={() => onSelect(a.tempId)}
                className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono truncate flex items-center justify-between border transition-all ${
                  a.tempId === selectedId
                    ? "bg-[var(--bg-elevated)] border-[var(--accent-cobalt)] text-[var(--accent-cobalt)] font-semibold shadow-xs"
                    : "bg-[var(--bg-base)] border-[var(--border-structural)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="truncate">{a.originalName}</span>
                <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] ml-1">
                  {a.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </WorkflowStep>

      {/* ── STEP 2: Mode ── */}
      <WorkflowStep step={2} title="Mode">
        {iconAssets.length > 0 && (
          <div className="mb-2 space-y-1.5 rounded-md border border-[var(--border-structural)] bg-[var(--bg-panel)] p-2">
            <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-[var(--text-secondary)]">
              <span className="rounded bg-[var(--accent-cobalt)]/10 px-1.5 py-0.5 text-[var(--accent-cobalt)]">{iconAssets.length} ikon</span>
              <span>→ preset:</span>
              {presetNames.map(style => <span key={style} className="rounded border border-[var(--border-structural)] px-1.5 py-0.5 text-[var(--text-primary)]">{style}</span>)}
            </div>
            <label className="flex cursor-pointer items-center justify-between border-t border-[var(--border-structural)] pt-1.5 font-mono text-[10px] text-[var(--text-secondary)]">
              <span>Optimize icons (auto-preset)</span>
              <input type="checkbox" checked={optimizeIcons} onChange={e => onOptimizeIcons(e.target.checked)} className="cursor-pointer rounded accent-[var(--accent-cobalt)]" />
            </label>
          </div>
        )}
        {/* Segmented Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--bg-base)] rounded-lg border border-[var(--border-structural)]">
          <button
            type="button"
            onClick={() => setModeCategory("icon")}
            className={`py-1 text-xs font-mono font-semibold rounded-md transition-all ${
              modeCategory === "icon"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            Icon Profiles
          </button>
          <button
            type="button"
            onClick={() => setModeCategory("structured")}
            className={`py-1 text-xs font-mono font-semibold rounded-md transition-all ${
              modeCategory === "structured"
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            Structured Mode
          </button>
        </div>

        {/* 2-Column Grid of 8 Decomposition Profiles Cards */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {DECOMPOSITION_PROFILES.map((prof) => {
            const active = assetType === prof.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => applyPreset(prof.id)}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between h-[68px] relative ${
                  active
                    ? "bg-[var(--bg-elevated)] border-[var(--accent-cobalt)] shadow-xs ring-1 ring-[var(--accent-cobalt)]/40"
                    : "bg-[var(--bg-void)] border-[var(--border-structural)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  {prof.iconSvg}
                  {active && (
                    <span className="w-3.5 h-3.5 rounded-full bg-[var(--accent-cobalt-solid)] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-mono text-[11px] font-bold text-[var(--text-primary)] block leading-tight">
                    {prof.label}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)] block leading-tight">
                    {prof.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sliders & Micro Parameters */}
        <div className="space-y-3 bg-[var(--bg-void)] p-2.5 rounded-lg border border-[var(--border-structural)] pt-2.5">
          {/* Slider 1: Path Precision */}
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-[var(--text-secondary)] uppercase font-semibold">
                Path Precision
              </span>
              <span className="text-[var(--accent-cyan)] font-bold">
                {tracing.pathPrecision}px
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.01}
              value={tracing.pathPrecision}
              onChange={(e) => applyTracing({ pathPrecision: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--border-strong)] rounded-md appearance-none cursor-pointer accent-[var(--accent-cyan)]"
            />
          </div>

          {/* Slider 2: Max Color Clusters */}
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-[var(--text-secondary)] uppercase font-semibold">
                Max Color Clusters
              </span>
              <span className="text-[var(--accent-cyan)] font-bold">
                {tracing.maxColors} Palettes
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={64}
              step={1}
              value={tracing.maxColors}
              onChange={(e) => applyTracing({ maxColors: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--border-strong)] rounded-md appearance-none cursor-pointer accent-[var(--accent-cyan)]"
            />

            {/* Swatches preview */}
            <div className="flex items-center space-x-1 pt-1.5 overflow-hidden">
              {["#ffffff", "#f59e0b", "#d97706", "#1e293b", "#0f172a", "#38bdf8", "#10b981", "#6366f1"].slice(0, Math.min(8, tracing.maxColors)).map((c, i) => (
                <span
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-[var(--border-strong)] shadow-2xs block shrink-0"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Background Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono font-semibold text-[var(--text-secondary)] uppercase">
              Remove Background
            </span>
            <input
              type="checkbox"
              checked={removeBackground}
              onChange={(e) => applyRemoveBackground(e.target.checked)}
              className="rounded border-[var(--border-strong)] text-[var(--accent-cobalt)] focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </WorkflowStep>

      {/* ── STEP 3: Output ── */}
      <WorkflowStep step={3} title="Output" isLast>
        {/* Output Format Selector */}
        <FieldRow label="OUTPUT FORMAT">
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--bg-base)] rounded-lg border border-[var(--border-structural)]">
            <button
              type="button"
              className="py-1.5 px-2 rounded-md text-xs font-mono font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>SVG</span>
              <span className="text-[9px] font-normal text-[var(--accent-cyan)] font-sans">(Vector)</span>
            </button>
            <button
              type="button"
              className="py-1.5 px-2 rounded-md text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center gap-1.5"
            >
              <span>EPS</span>
              <span className="text-[9px] font-normal text-[var(--text-muted)] font-sans">(Print)</span>
            </button>
          </div>
        </FieldRow>

        {/* Vectorize Advanced Settings Disclosure */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between w-full p-1.5 rounded bg-[var(--bg-base)] border border-[var(--border-structural)] transition-colors"
          >
            <span>Advanced Vector Settings</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-2.5 rounded-lg bg-[var(--bg-void)] border border-[var(--border-structural)] space-y-2.5 animate-fade-in text-xs font-mono">
              <FieldRow label="CLUSTERING ALGORITHM">
                <div className="relative">
                  <select
                    value={tracing.clustering}
                    onChange={(e) => applyTracing({ clustering: e.target.value as TracerClustering })}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs rounded-md px-2 py-1.5 appearance-none focus:outline-none focus:border-[var(--accent-cobalt)]"
                  >
                    {CLUSTERING_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </FieldRow>

              <FieldRow label="CURVE FITTING">
                <div className="grid grid-cols-3 gap-1">
                  {(["spline", "polygon", "pixel"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyTracing({ mode: m })}
                      className={`py-1 text-[10px] uppercase font-bold rounded ${
                        tracing.mode === m
                          ? "bg-[var(--accent-cobalt-solid)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-structural)]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </FieldRow>
            </div>
          )}
        </div>
      </WorkflowStep>
    </WorkflowPanel>
  );
}
