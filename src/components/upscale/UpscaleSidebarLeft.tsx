import React, { useState } from "react";
import {
  FolderOpen,
  UploadCloud,
  Sliders,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Check,
} from "lucide-react";
import WorkflowPanel, { WorkflowStep } from "../global/WorkflowPanel";
import Button from "../global/Button";
import FieldRow from "../global/FieldRow";
import { Asset, EngineId, ScaleMode, OutputFormat, ENGINE_OPTIONS, formatSteps } from "./types";
import { LibraryAsset } from "../../types";
import { assetUrl } from "../../utils/assetUrl";

export interface UpscaleSidebarLeftProps {
  assets: Asset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFiles: (files: File[]) => void;
  uploading: boolean;
  libraryAssets?: LibraryAsset[];
  onSelectGalleryAsset?: (assetId: string) => void;
  stagingAssetId?: string | null;
  // Controls
  engine: EngineId;
  setEngine: (e: EngineId) => void;
  scale: ScaleMode;
  setScale: (s: ScaleMode) => void;
  customScale: number;
  setCustomScale: (n: number) => void;
  tileSize: number;
  setTileSize: (n: number) => void;
  outputFormat: OutputFormat;
  setOutputFormat: (f: OutputFormat) => void;
  whiteBackground: boolean;
  setWhiteBackground: (b: boolean) => void;
  activeAssetsCount: number;
  selectedReadyCount: number;
  readyCount: number;
  onStartUpscale: () => void;
}

export default function UpscaleSidebarLeft({
  assets,
  selectedId,
  onSelect,
  onFiles,
  uploading,
  libraryAssets = [],
  onSelectGalleryAsset,
  stagingAssetId,
  engine,
  setEngine,
  scale,
  setScale,
  customScale,
  setCustomScale,
  tileSize,
  setTileSize,
  outputFormat,
  setOutputFormat,
  whiteBackground,
  setWhiteBackground,
  activeAssetsCount,
  selectedReadyCount,
  readyCount,
  onStartUpscale,
}: UpscaleSidebarLeftProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Filter eligible raster images from library
  const eligibleGalleryAssets = libraryAssets.filter((a) => {
    if (a.type !== "IMAGE") return false;
    if (a.mimeType) {
      return ["image/png", "image/jpeg", "image/webp"].includes(a.mimeType.toLowerCase());
    }
    const ext = a.url?.split(".").pop()?.toLowerCase();
    return ext ? ["png", "jpg", "jpeg", "webp"].includes(ext) : true;
  });

  const selectedAsset = assets.find((a) => a.tempId === selectedId) || null;
  const canStart = readyCount > 0 && activeAssetsCount === 0;

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
      width={285}
      icon={<Sliders className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />}
      badge="v4.2 PRO"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={activeAssetsCount > 0}
          disabled={!canStart}
          onClick={onStartUpscale}
          className="shadow-lg font-mono text-xs tracking-wider uppercase font-bold"
        >
          {activeAssetsCount > 0
            ? "Upscaling..."
            : `Upscale (${formatSteps(scale, customScale)} Render)`}
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
            {uploading ? "Uploading assets..." : "Drop file here or click to upload"}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
            Supported: JPG, PNG, WEBP • Max 32MB
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
                {selectedAsset.originalName}
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

        {/* Studio Workspace Assets List */}
        {assets.length > 1 && (
          <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
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

      {/* ── STEP 2: Resolution ── */}
      <WorkflowStep step={2} title="Resolution">
        {/* Scale Multipliers */}
        <FieldRow label="SCALE" suffix={formatSteps(scale, customScale)}>
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-[var(--bg-base)] rounded-lg border border-[var(--border-structural)]">
            {(["2x", "3x", "4x", "4k"] as ScaleMode[]).map((m) => {
              const active = scale === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setScale(m)}
                  className={`py-1.5 text-xs font-mono font-bold rounded-md transition-all uppercase ${
                    active
                      ? "bg-[var(--accent-cobalt-solid)] text-white shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </FieldRow>

        {/* Output Format */}
        <FieldRow label="OUTPUT FORMAT">
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-[var(--bg-base)] rounded-lg border border-[var(--border-structural)]">
            {(["png", "jpeg", "webp"] as OutputFormat[]).map((f) => {
              const active = outputFormat === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOutputFormat(f)}
                  className={`py-1 text-xs font-mono font-semibold rounded-md uppercase transition-all ${
                    active
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </FieldRow>

        {/* Output Settings Disclosure */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between w-full p-1.5 rounded bg-[var(--bg-base)] border border-[var(--border-structural)] transition-colors"
          >
            <span>Advanced Output Settings</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-2.5 rounded-lg bg-[var(--bg-void)] border border-[var(--border-structural)] space-y-2.5 animate-fade-in text-xs">
              <FieldRow label="TILE SIZE" suffix="0 = Auto" hint="Set >0 to conserve VRAM on large 4K+ images">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={4096}
                    step={64}
                    value={tileSize}
                    onChange={(e) => setTileSize(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-[var(--text-muted)]">
                    px
                  </span>
                </div>
              </FieldRow>

              <label
                htmlFor="upscale-white-background"
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  White Matte Background
                </span>
                <input
                  id="upscale-white-background"
                  type="checkbox"
                  checked={whiteBackground}
                  onChange={(e) => setWhiteBackground(e.target.checked)}
                  className="rounded border-[var(--border-strong)] text-[var(--accent-cobalt)] focus:ring-0"
                />
              </label>
            </div>
          )}
        </div>
      </WorkflowStep>

      {/* ── STEP 3: AI Model ── */}
      <WorkflowStep
        step={3}
        title="AI Model"
        isLast
        action={
          <span className="text-[10px] text-[var(--accent-cyan)] font-mono flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
            v4.2 Engine
          </span>
        }
      >
        <FieldRow label="MODEL ARCHITECTURE">
          <div className="relative">
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineId)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs rounded-md px-2.5 py-2 pr-8 appearance-none focus:outline-none focus:border-[var(--accent-cobalt)] font-sans font-medium"
            >
              {ENGINE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </FieldRow>

        {/* Fine-Tune Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 bg-[var(--bg-void)] p-2 rounded-lg border border-[var(--border-structural)] text-[11px]">
          <div>
            <span className="text-[var(--text-muted)] text-[10px] block font-mono">
              Inference Mode
            </span>
            <span className="text-[var(--text-primary)] font-mono font-medium truncate block">
              {engine === "waifu2x" ? "Waifu2x-NCNN" : "RealESRGAN"}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[10px] block font-mono">
              Tile Pipeline
            </span>
            <span className="text-[var(--accent-cyan)] font-mono font-medium">
              {tileSize > 0 ? `${tileSize}px` : "Auto"}
            </span>
          </div>
        </div>
      </WorkflowStep>
    </WorkflowPanel>
  );
}
