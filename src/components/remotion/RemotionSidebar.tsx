import React from "react";
import {
  Film,
  Plus,
  X,
  Check,
  Layers,
  FileCode,
  Code2,
  Ban,
} from "lucide-react";
import { WorkflowPanel, WorkflowStep, Button, FieldRow } from "../global";
import { LibraryAsset } from "../../types";
import { AnimOutputFormat, AnimSourceEngine, CompositionPreset } from "./types";
import { assetUrl } from "../../utils/assetUrl";

export interface RemotionSidebarProps {
  sourceEngine: AnimSourceEngine;
  setSourceEngine: (e: AnimSourceEngine) => void;
  outputFormats: Set<AnimOutputFormat>;
  toggleFormat: (f: AnimOutputFormat) => void;
  isRendering: boolean;
  canRender: boolean;
  renderDisabledReason?: string;
  onRender: () => void;
  libraryAssets?: LibraryAsset[];
  selectedAssetId?: string;
  onSelectAsset?: (asset: LibraryAsset | null) => void;
  htmlContent: string;
  setHtmlContent: (v: string) => void;
  cssContent: string;
  setCssContent: (v: string) => void;
  onAnalyzeHtml: () => void;
  isAnalyzing: boolean;
  analyzedLayersCount?: number;
  canvasW: number;
  canvasH: number;
  fps: number;
  setFps: (fps: number) => void;
  durationMs: number;
  setDurationMs: (ms: number) => void;
  canvasSize: string;
  setCanvasSize: (size: string) => void;
  background: string;
  setBackground: (bg: string) => void;
  loop: boolean;
  setLoop: (loop: boolean) => void;
}

const COMPOSITION_PRESETS: CompositionPreset[] = [
  { id: "16-9", name: "16:9 HD", ratio: "16:9", width: 1920, height: 1080, label: "1920×1080" },
  { id: "9-16", name: "9:16 Reel", ratio: "9:16", width: 1080, height: 1920, label: "1080×1920" },
  { id: "1-1", name: "1:1 Square", ratio: "1:1", width: 1080, height: 1080, label: "1080×1080" },
  { id: "4-3", name: "4:3 Standard", ratio: "4:3", width: 1440, height: 1080, label: "1440×1080" },
];

const FORMAT_OPTIONS: AnimOutputFormat[] = ["MP4", "WEBM", "GIF", "Lottie"];

export default function RemotionSidebar(p: RemotionSidebarProps) {
  const vectors = p.libraryAssets?.filter((a) => a.type === "VECTOR") || [];
  const selectedAsset = vectors.find((a) => a.id === p.selectedAssetId) || null;

  const durationSec = (p.durationMs / 1000).toFixed(1);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      p.setDurationMs(Math.round(val * 1000));
    }
  };

  const handlePresetSelect = (preset: CompositionPreset) => {
    p.setCanvasSize(`${preset.width}×${preset.height}`);
  };

  return (
    <WorkflowPanel
      title="WORKFLOW"
      badge="Step 1-5"
      icon={<Film className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />}
      width={296}
      footer={
        <div className="space-y-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            loading={p.isRendering}
            disabled={!p.canRender || p.isRendering}
            onClick={p.onRender}
            icon={<Film className="w-4 h-4" />}
            className="font-semibold shadow-md py-2.5"
          >
            {p.isRendering ? "Rendering Animation..." : "Render Animation"}
          </Button>

          <div className="flex items-center justify-between px-1 text-[10px] font-mono text-[var(--text-muted)]">
            <span>Cost: 20 Credits</span>
            <span className="flex items-center text-[var(--accent-cyan)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] mr-1.5 animate-pulse" />
              {p.isRendering ? "Rendering frames" : "Ready for dispatch"}
            </span>
          </div>

          {p.renderDisabledReason && !p.canRender && (
            <p className="text-[10px] font-mono text-[var(--accent-warning)] text-center leading-tight">
              {p.renderDisabledReason}
            </p>
          )}
        </div>
      }
    >
      <WorkflowStep step={1} title="Composition Preset">
        <div className="grid grid-cols-2 gap-1.5">
          {COMPOSITION_PRESETS.map((preset) => {
            const isSelected = p.canvasSize === `${preset.width}×${preset.height}`;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`p-2 rounded-md border text-left transition-all ${
                  isSelected
                    ? "bg-[var(--bg-elevated)] border-[var(--accent-cobalt)] text-[var(--text-primary)] ring-1 ring-[var(--accent-cobalt)] shadow-xs"
                    : "bg-[var(--bg-panel)] border-[var(--border-structural)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold">{preset.ratio}</span>
                  {isSelected && <Check className="w-3 h-3 text-[var(--accent-cobalt)]" />}
                </div>
                <div className="font-mono text-[9px] text-[var(--text-muted)] mt-0.5">{preset.label}</div>
              </button>
            );
          })}
        </div>
      </WorkflowStep>

      <WorkflowStep
        step={2}
        title="Source"
        badge={
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {p.sourceEngine === "svg" ? `${vectors.length} Items` : "HTML"}
          </span>
        }
      >
        {/* Source Engine Segmented Switch */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-structural)]">
          <button
            type="button"
            onClick={() => p.setSourceEngine("svg")}
            className={`py-1 text-[11px] font-medium rounded transition-all flex items-center justify-center gap-1.5 ${
              p.sourceEngine === "svg"
                ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs border border-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Layers className="w-3 h-3 text-[var(--accent-cobalt)]" />
            <span>SVG Asset</span>
          </button>
          <button
            type="button"
            onClick={() => p.setSourceEngine("html")}
            className={`py-1 text-[11px] font-medium rounded transition-all flex items-center justify-center gap-1.5 ${
              p.sourceEngine === "html"
                ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs border border-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileCode className="w-3 h-3 text-[var(--accent-cyan)]" />
            <span>HTML & CSS</span>
          </button>
        </div>

        {p.sourceEngine === "svg" ? (
          <div className="space-y-2">
            {selectedAsset ? (
              <div className="p-2 rounded-lg border border-[var(--accent-cobalt)]/40 bg-[var(--bg-elevated)] flex items-center gap-2.5">
                <div className="w-10 h-10 rounded border border-[var(--border-structural)] overflow-hidden shrink-0 bg-[var(--bg-void)]">
                  <img
                    src={assetUrl(selectedAsset.thumbnailUrl || selectedAsset.url)}
                    alt={selectedAsset.name}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {selectedAsset.name}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--accent-cyan)]">
                    {p.analyzedLayersCount ? `${p.analyzedLayersCount} layers analyzed` : "Vector Asset Ready"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => p.onSelectAsset?.(null)}
                  title="Remove Selection"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {vectors.slice(0, 3).map((asset) => {
                    const isPicked = asset.id === p.selectedAssetId;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => p.onSelectAsset?.(asset)}
                        aria-pressed={isPicked}
                        aria-label={`Select vector asset ${asset.name}`}
                        className={`h-14 rounded border cursor-pointer overflow-hidden relative group transition-all ${
                          isPicked
                            ? "border-[var(--accent-cobalt)] ring-1 ring-[var(--accent-cobalt)]"
                            : "border-[var(--border-structural)] hover:border-[var(--border-strong)]"
                        }`}
                        title={asset.name}
                      >
                        <img
                          src={assetUrl(asset.thumbnailUrl || asset.url)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (vectors.length > 0) p.onSelectAsset?.(vectors[0]);
                    }}
                    className="h-14 rounded border border-dashed border-[var(--border-strong)] hover:border-[var(--accent-cobalt)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-mono mt-0.5">Select</span>
                  </button>
                </div>

                {vectors.length > 0 && (
                  <select
                    value={p.selectedAssetId || ""}
                    onChange={(e) => {
                      const asset = vectors.find((a) => a.id === e.target.value);
                      if (asset) p.onSelectAsset?.(asset);
                    }}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2 py-1.5 font-mono text-[11px] text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none"
                  >
                    <option value="">Choose vector from library ({vectors.length})...</option>
                    {vectors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={p.htmlContent}
              onChange={(e) => p.setHtmlContent(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="HTML markup with classes or SVG elements..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md p-2 font-mono text-[11px] text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none resize-none"
            />
            <textarea
              value={p.cssContent}
              onChange={(e) => p.setCssContent(e.target.value)}
              rows={2}
              spellCheck={false}
              placeholder="Custom CSS rules or keyframe animations..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md p-2 font-mono text-[11px] text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none resize-none"
            />
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              loading={p.isAnalyzing}
              disabled={p.isAnalyzing || !p.htmlContent.trim()}
              onClick={p.onAnalyzeHtml}
              icon={<Code2 className="w-3.5 h-3.5" />}
            >
              Analyze HTML Layers {p.analyzedLayersCount ? `(${p.analyzedLayersCount})` : ""}
            </Button>
          </div>
        )}
      </WorkflowStep>

      <WorkflowStep step={3} title="Motion">
        {/* Duration row (reaches renderer) */}
        <FieldRow label="Total Duration" suffix="seconds">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              step={0.5}
              value={durationSec}
              onChange={handleDurationChange}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none"
            />
          </div>
        </FieldRow>

        {/* Controls below are not consumed by the renderer definition, so they
            are shown disabled with an honest label instead of pretending. */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5 opacity-50">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Motion blur is not wired to the animation renderer"
              className="py-1 px-2 rounded border text-[10px] font-medium flex items-center justify-center gap-1.5 bg-[var(--bg-panel)] border-[var(--border-structural)] text-[var(--text-muted)] cursor-not-allowed"
            >
              <Ban className="w-3 h-3" />
              <span>Motion Blur</span>
            </button>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Beat sync is not wired to the animation renderer"
              className="py-1 px-2 rounded border text-[10px] font-medium flex items-center justify-center gap-1.5 bg-[var(--bg-panel)] border-[var(--border-structural)] text-[var(--text-muted)] cursor-not-allowed"
            >
              <Ban className="w-3 h-3" />
              <span>Beat Sync</span>
            </button>
          </div>
          <p className="text-[10px] font-mono text-[var(--accent-warning)] leading-tight">
            Motion effect, motion blur, and beat sync are not applied by the renderer yet.
          </p>
        </div>
      </WorkflowStep>

      <WorkflowStep step={4} title="Audio" badge="Unavailable">
        <div className="p-2.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)] space-y-2 opacity-60">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-muted)]">Audio Track</span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-secondary)] leading-tight">
            Audio is not rendered — animation definitions currently export video only.
          </p>
        </div>
      </WorkflowStep>

      <WorkflowStep
        step={5}
        title="Output"
        badge={
          <span className="font-mono text-[10px] text-[var(--accent-cobalt)]">
            {p.outputFormats.size} formats
          </span>
        }
      >
        <div className="grid grid-cols-4 gap-1">
          {FORMAT_OPTIONS.map((fmt) => {
            const active = p.outputFormats.has(fmt);
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => p.toggleFormat(fmt)}
                className={`py-1.5 px-1 rounded border text-[10px] font-mono font-bold transition-all text-center ${
                  active
                    ? "bg-[var(--accent-cobalt-solid)] text-white border-[var(--accent-cobalt)] shadow-xs"
                    : "bg-[var(--bg-elevated)] border-[var(--border-structural)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {fmt}
              </button>
            );
          })}
        </div>
      </WorkflowStep>

      {/* Collapsible Advanced Controls */}
      <WorkflowStep step="" title="Advanced Controls" collapsible defaultOpen={false}>
        <div className="space-y-2 text-[11px]">
          <FieldRow label="Frame Rate (FPS)">
            <select
              value={p.fps}
              onChange={(e) => p.setFps(Number(e.target.value))}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2 py-1 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none"
            >
              <option value={24}>24 fps (Cinema)</option>
              <option value={30}>30 fps (Standard)</option>
              <option value={60}>60 fps (Smooth)</option>
            </select>
          </FieldRow>

          <FieldRow label="Background">
            <select
              value={p.background}
              onChange={(e) => p.setBackground(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2 py-1 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none"
            >
              <option value="transparent">Transparent Alpha</option>
              <option value="#0c0e14">Void Dark (#0c0e14)</option>
              <option value="#ffffff">Pure White (#ffffff)</option>
              <option value="#1e293b">Slate Slate (#1e293b)</option>
            </select>
          </FieldRow>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={p.loop}
                onChange={(e) => p.setLoop(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[var(--accent-cobalt)]"
              />
              <span>Loop output animation</span>
            </label>
          </div>
        </div>
      </WorkflowStep>
    </WorkflowPanel>
  );
}
