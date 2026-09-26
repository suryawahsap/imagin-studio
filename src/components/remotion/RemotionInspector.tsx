import React, { useState } from "react";
import {
  Film,
  Download,
  FolderOpen,
  Cpu,
  Layers,
  Sliders,
  ArrowUpRight,
} from "lucide-react";
import { InspectorPanel, Button, FieldRow } from "../global";
import type { KeyframeProperty } from "../global/KeyframePanel";
import { JobState } from "./types";

export interface RemotionInspectorProps {
  durationMs: number;
  canvasSize: string;
  fps: number;
  formats: string[];
  latestJob?: JobState;
  latestUrl?: string;
  keyframeProperties?: KeyframeProperty[];
  layersCount?: number;
  onDownload?: () => void;
  onOpenFolder?: () => void;
  onSendToUpscale?: () => void;
}

export default function RemotionInspector({
  durationMs,
  canvasSize,
  fps,
  formats,
  latestJob,
  latestUrl,
  keyframeProperties = [],
  layersCount = 0,
  onDownload,
  onOpenFolder,
  onSendToUpscale,
}: RemotionInspectorProps) {
  const [activeTab, setActiveTab] = useState<string>("video");

  const durationSec = (durationMs / 1000).toFixed(1);
  const estimatedSizeMb = ((durationMs / 1000) * (fps === 60 ? 1.2 : 0.8)).toFixed(1);
  const formatDisplay = formats.length > 0 ? formats.join(", ") : "MP4";

  return (
    <InspectorPanel
      title="INSPECTOR"
      badge="Keyframes"
      icon={<Sliders className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />}
      width={320}
      tabs={[
        { id: "video", label: "Video" },
        { id: "metadata", label: "Metadata" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="space-y-2">
          {onSendToUpscale && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={onSendToUpscale}
              icon={<ArrowUpRight className="w-4 h-4 text-[var(--accent-cyan)]" />}
            >
              Send to Upscale
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={!latestUrl}
            onClick={onDownload}
            icon={<Download className="w-4 h-4" />}
            className="shadow-md"
          >
            Download Video
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            disabled={!latestUrl}
            onClick={onOpenFolder}
            icon={<FolderOpen className="w-4 h-4" />}
          >
            Open Output Folder
          </Button>
        </div>
      }
    >
      {activeTab === "video" ? (
        <div className="space-y-4">
          {/* Template Overview Card */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[var(--accent-cyan)]" />
              <h3 className="font-bold text-[var(--text-primary)] text-xs tracking-wide">
                Cinematic Slideshow
              </h3>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Renders the analyzed source layers using the keyframe data from the workflow panel. Motion effects, parallax, and bloom are not implemented by the renderer.
            </p>
          </div>

          <div className="h-px bg-[var(--border-structural)]" />

          {/* Composition Specs Table */}
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-[var(--text-muted)] font-mono text-[10px] pb-1 border-b border-[var(--border-structural)]/60 uppercase">
              <span>Property</span>
              <span>Value</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Duration</span>
              <span className="text-[var(--text-primary)] font-mono font-medium">{durationSec} seconds</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Resolution</span>
              <span className="text-[var(--accent-cyan)] font-mono font-semibold">{canvasSize}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Format</span>
              <span className="text-[var(--text-primary)] font-mono">{formatDisplay}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">File Size (Est.)</span>
              <span className="text-[var(--text-primary)] font-mono">{estimatedSizeMb} MB</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Bitrate</span>
              <span className="text-[var(--text-primary)] font-mono">8.2 Mbps VBR</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Frame Rate</span>
              <span className="text-[var(--text-primary)] font-mono">{fps} FPS</span>
            </div>
          </div>

          <div className="h-px bg-[var(--border-structural)]" />

          {/* Neural Interpolation (not implemented by the renderer) */}
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-lg p-3 space-y-2 opacity-50">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text-muted)] text-xs">Neural Interpolation</span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] border border-[var(--border-structural)] rounded px-1 py-px">
                N/A
              </span>
            </div>
            <p className="text-[10px] font-mono text-[var(--text-secondary)] leading-tight">
              Frame interpolation is not implemented by the renderer.
            </p>
          </div>

          {/* Element Properties Section */}
          {keyframeProperties.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                  <span>Element Properties</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Layer 1</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {keyframeProperties.map((prop) => (
                  <div key={prop.id} className="bg-[var(--bg-elevated)] p-2 rounded border border-[var(--border-structural)] space-y-1">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase block">
                      {prop.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={prop.value}
                        onChange={(e) => prop.onChange(Number(e.target.value))}
                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-structural)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-cobalt)] focus:outline-none"
                      />
                      {prop.suffix && (
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">{prop.suffix}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compositing (not consumed by the renderer definition) */}
          <div className="space-y-2.5 pt-1 opacity-50">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block">
              Compositing
            </span>

            <div className="space-y-2 text-xs">
              <FieldRow label="Blend Mode">
                <select
                  disabled
                  aria-disabled="true"
                  value="Normal"
                  title="Blend mode is not wired to the animation renderer"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2 py-1 font-mono text-xs text-[var(--text-muted)] cursor-not-allowed"
                >
                  <option value="Normal">Normal</option>
                </select>
              </FieldRow>

              <FieldRow label="Blur Radius" suffix="off">
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={0}
                  disabled
                  aria-disabled="true"
                  title="Blur is not wired to the animation renderer"
                  onChange={() => {}}
                  className="w-full h-1 bg-[var(--border-structural)] rounded-lg appearance-none cursor-not-allowed accent-[var(--accent-cobalt)]"
                />
              </FieldRow>

              <FieldRow label="Ambient Shadow" suffix="off">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={0}
                  disabled
                  aria-disabled="true"
                  title="Ambient shadow is not wired to the animation renderer"
                  onChange={() => {}}
                  className="w-full h-1 bg-[var(--border-structural)] rounded-lg appearance-none cursor-not-allowed accent-[var(--accent-cobalt)]"
                />
              </FieldRow>
            </div>
            <p className="text-[10px] font-mono text-[var(--accent-warning)] leading-tight">
              Compositing controls are not applied by the renderer yet.
            </p>
          </div>
        </div>
      ) : (
        /* Metadata Tab */
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-structural)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)]">Render Job Telemetry</div>
            <div className="space-y-1.5 font-mono text-[10px] text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Job Status:</span>
                <span className="text-[var(--accent-cyan)]">{latestJob?.status || "Idle"}</span>
              </div>
              <div className="flex justify-between">
                <span>Temp ID:</span>
                <span className="truncate max-w-[140px]">{latestJob?.tempId || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Layers Count:</span>
                <span>{layersCount} vector layers</span>
              </div>
              <div className="flex justify-between">
                <span>Loop Mode:</span>
                <span>Infinite (Normalized)</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-structural)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)]">Export Manifest</div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Export builds a video container (audio is not rendered — video only), compatible with stock libraries and web embeds.
            </p>
          </div>
        </div>
      )}
    </InspectorPanel>
  );
}
