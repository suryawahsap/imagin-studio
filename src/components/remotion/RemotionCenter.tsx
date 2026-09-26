import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Ban,
} from "lucide-react";
import { AnimTemplate } from "./types";
import RemotionTimeline, { TimelineLayer } from "./RemotionTimeline";
import EmptyAnimationState from "../global/EmptyAnimationState";
import { GlassBadge } from "../global";
import { formatTime } from "../global/PlaybackBar";

export interface RemotionCenterProps {
  durationMs: number;
  currentMs: number;
  isPlaying: boolean;
  selectedTemplate?: AnimTemplate | null;
  recentAnimations: { id: string; name: string; thumbnailUrl?: string; onClick: () => void }[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onSkipStart: () => void;
  onSkipEnd: () => void;
  layers?: TimelineLayer[];
  fps?: number;
  resolution?: string;
  onGenerate?: () => void;
  onAddToQueue?: () => void;
}

export default function RemotionCenter({
  durationMs,
  currentMs,
  isPlaying,
  selectedTemplate = null,
  recentAnimations,
  onPlay,
  onPause,
  onSeek,
  onSkipStart,
  onSkipEnd,
  layers = [],
  fps = 30,
  resolution = "1920×1080",
  onGenerate,
  onAddToQueue,
}: RemotionCenterProps) {
  const [zoomScale, setZoomScale] = useState<number>(100);

  const duration = Math.max(1, durationMs);
  const progressPercent = Math.min(100, Math.max(0, (currentMs / duration) * 100));

  const filmstripThumbnails = recentAnimations.slice(0, 5);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-void)] h-full overflow-hidden select-none">
      <div className="h-10 bg-[var(--bg-panel)] border-b border-[var(--border-structural)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[var(--text-primary)] text-xs font-semibold tracking-wide">
            {selectedTemplate?.name || "Sequence_01.composition"}
          </span>
          <span className="bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 text-[10px] font-mono px-2 py-0.5 rounded font-semibold">
            Remotion v4.0
          </span>
        </div>

        {/* Stage Zoom & Fit Controls */}
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => setZoomScale((prev) => Math.min(200, prev + 10))}
            className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale((prev) => Math.max(50, prev - 10))}
            className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale(100)}
            className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-3 relative overflow-hidden">
        {/* 16:9 Aspect Ratio Container */}
        <div className="w-full max-w-4xl max-h-full aspect-video bg-black rounded-lg border border-[var(--border-strong)] shadow-2xl relative overflow-hidden flex flex-col group">
          {/* Top Floating Glass Badges */}
          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
            <GlassBadge variant="dark">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] mr-1 animate-pulse" />
              PREVIEW CACHE: REALTIME
            </GlassBadge>
            <GlassBadge variant="dark">
              {resolution} • {fps} FPS
            </GlassBadge>
          </div>

          {/* Viewport Frame Content */}
          <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
            {selectedTemplate?.preview ? (
              <img
                src={selectedTemplate.preview}
                alt={selectedTemplate.name}
                className="w-full h-full object-contain transition-transform duration-150"
                style={{ transform: `scale(${zoomScale / 100})` }}
              />
            ) : (
              <EmptyAnimationState
                message={selectedTemplate ? selectedTemplate.name : "No animation source selected"}
                submessage="Choose an SVG asset or HTML source in the workflow panel to preview"
              />
            )}

            {/* Central Play/Pause Overlay Trigger */}
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="absolute w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white text-xl hover:scale-110 hover:bg-[var(--accent-cobalt-solid)] transition-all shadow-xl z-10"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
          </div>

          {/* Floating Bottom Media Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 flex flex-col gap-1.5 z-20">
            {/* Scrubbing bar (native range = keyboard + pointer operable) */}
            <input
              type="range"
              min={0}
              max={duration}
              step={1}
              value={Math.round(currentMs)}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Seek animation position"
              aria-valuetext={`${formatTime(currentMs)} of ${formatTime(duration)}`}
              className="w-full h-1 rounded-full cursor-pointer appearance-none accent-[var(--accent-cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
              style={{
                background: `linear-gradient(to right, var(--accent-cobalt) ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
              }}
            />

            {/* Transport Controls Row */}
            <div className="flex items-center justify-between pt-0.5 text-[var(--text-primary)] text-xs">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onSkipStart}
                  className="hover:text-[var(--accent-cyan)] transition-colors p-1"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSeek(Math.max(0, currentMs - 1000))}
                  className="hover:text-[var(--accent-cyan)] transition-colors p-1"
                  title="Skip back 1s"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={isPlaying ? onPause : onPlay}
                  className="hover:text-[var(--accent-cyan)] transition-colors p-1 text-base font-bold"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSeek(Math.min(duration, currentMs + 1000))}
                  className="hover:text-[var(--accent-cyan)] transition-colors p-1"
                  title="Skip forward 1s"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-[var(--text-secondary)] ml-1 tracking-wider">
                  {formatTime(currentMs)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right media controls */}
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-muted)]"
                  title="Audio is not rendered by the animation pipeline"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Audio N/A</span>
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-element)] text-[var(--text-secondary)] border border-[var(--border-strong)]">
                  {zoomScale}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filmstrip Frame Thumbnails (below stage). */}
        {filmstripThumbnails.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto max-w-4xl py-1 px-1">
            <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase shrink-0">Frames</span>
            {filmstripThumbnails.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onClick={item.onClick}
                aria-pressed={idx === 0}
                aria-label={`Select animation ${item.name}`}
                title={item.name}
                className={`h-10 w-16 rounded border cursor-pointer overflow-hidden relative shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)] ${
                  idx === 0
                    ? "border-[var(--accent-cobalt)] ring-1 ring-[var(--accent-cobalt)] shadow-xs"
                    : "border-[var(--border-structural)] opacity-70 hover:opacity-100"
                }`}
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full bg-[var(--bg-elevated)] flex items-center justify-center font-mono text-[9px] text-[var(--text-muted)]">
                    F{idx + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 pb-3">
        <RemotionTimeline
          durationMs={durationMs}
          currentMs={currentMs}
          isPlaying={isPlaying}
          layers={layers}
          fps={fps}
          resolution={resolution}
          onSeek={onSeek}
          onPlay={onPlay}
          onPause={onPause}
          onSkipStart={onSkipStart}
          onSkipEnd={onSkipEnd}
        />
      </div>
    </main>
  );
}
