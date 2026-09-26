import React, { useRef, useState, useMemo } from "react";
import {
  Play,
  Pause,
  Scissors,
  Magnet,
  Video,
  Activity,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
} from "lucide-react";
import { formatTime } from "../global/PlaybackBar";

export type TimelineLayer = {
  id?: string;
  name?: string;
  keyframes?: Array<{ timeMs?: number; [key: string]: any }>;
};

export interface RemotionTimelineProps {
  durationMs: number;
  currentMs: number;
  isPlaying: boolean;
  layers: TimelineLayer[];
  fps?: number;
  resolution?: string;
  onSeek: (ms: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSkipStart: () => void;
  onSkipEnd: () => void;
}

export default function RemotionTimeline({
  durationMs,
  currentMs,
  isPlaying,
  layers,
  fps = 30,
  resolution = "1920×1080",
  onSeek,
  onPlay,
  onPause,
  onSkipStart,
  onSkipEnd,
}: RemotionTimelineProps) {
  const duration = Math.max(1, durationMs);
  const [zoomLevel, setZoomLevel] = useState(40);
  const [snapping, setSnapping] = useState(true);
  const rulerRef = useRef<HTMLDivElement>(null);

  const currentFrame = Math.floor((currentMs / 1000) * fps);
  const progressPercent = Math.min(100, Math.max(0, (currentMs / duration) * 100));
  const rulerLabels = Array.from({ length: 6 }, (_, index) => ({
    ms: Math.round((duration * index) / 5),
    left: index / 5,
  }));

  const seekFromClientX = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * duration));
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX, e.currentTarget);
  };

  // Shared keyboard contract for the ruler and track lanes: arrows seek by
  // frame, Home/End jump to bounds, PageUp/PageDown by 10% of duration.
  const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const frameMs = 1000 / Math.max(1, fps);
    const stepMs = e.shiftKey ? frameMs * 10 : frameMs;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = currentMs + stepMs;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = currentMs - stepMs;
    else if (e.key === "PageUp") next = currentMs + duration * 0.1;
    else if (e.key === "PageDown") next = currentMs - duration * 0.1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = duration;
    if (next === null) return;
    e.preventDefault();
    onSeek(Math.round(Math.max(0, Math.min(duration, next))));
  };

  const tracks = layers.length > 0 ? layers : [
    { id: "default-v1", name: "Video 1", keyframes: [{ timeMs: 0 }, { timeMs: duration * 0.4 }, { timeMs: duration }] }
  ];

  const totalKeyframes = useMemo(() => {
    return tracks.reduce((acc, tr) => acc + (tr.keyframes?.length || 0), 0);
  }, [tracks]);

  return (
    <section
      className="h-56 bg-[var(--bg-panel)] border border-[var(--border-structural)] rounded-lg flex flex-col shrink-0 overflow-hidden select-none shadow-xs"
      aria-label="Animation Timeline"
    >
      <div className="h-8 bg-[var(--bg-elevated)] border-b border-[var(--border-structural)] px-3 flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0">
        {/* Left: Tools & Frame Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onSkipStart}
              title="Return to Start"
              className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onSkipEnd}
              title="Jump to end"
              className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Clip cutting is not implemented"
              className="p-1 text-[var(--text-muted)] cursor-not-allowed opacity-50"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              title={isPlaying ? "Pause playback" : "Play playback"}
              className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setSnapping(!snapping)}
              title="Toggle Snapping"
              className={`p-1 rounded transition-colors ${
                snapping ? "text-[var(--accent-cyan)] bg-[var(--bg-panel)]" : "hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-[var(--border-structural)]" />

          <span className="font-mono text-[11px] text-[var(--accent-cyan)] font-medium tracking-wider">
            CURRENT: {formatTime(currentMs)} (Frame {currentFrame})
          </span>
        </div>

        {/* Right: Zoom slider & Snap badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <ZoomOut className="w-3 h-3" />
            <input
              type="range"
              min={10}
              max={100}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-16 h-1 bg-[var(--border-structural)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-cobalt)]"
            />
            <ZoomIn className="w-3 h-3" />
          </div>

          <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-structural)]">
            Snap
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg-void)]">
        {/* Time Ruler Header */}
        <div
          ref={rulerRef}
          role="slider"
          tabIndex={0}
          aria-label="Timeline ruler"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(currentMs)}
          aria-valuetext={`${formatTime(currentMs)} of ${formatTime(duration)}`}
          onClick={handleSeekClick}
          onKeyDown={handleSeekKeyDown}
          className="h-6 bg-[var(--bg-elevated)]/80 border-b border-[var(--border-structural)] flex items-center text-[10px] font-mono text-[var(--text-muted)] pl-28 relative cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
        >
          {rulerLabels.map(({ ms, left }) => (
            <span key={left} className="absolute" style={{ left: `calc(7rem + (100% - 7rem) * ${left})` }}>
              {formatTime(ms)}
            </span>
          ))}

          {/* Ruler tick marks */}
          <div className="w-full h-full flex justify-between items-end pb-0.5 opacity-30 px-2 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className={`w-px bg-[var(--text-muted)] ${i % 4 === 0 ? "h-2" : i % 2 === 0 ? "h-1.5" : "h-1"}`}
              />
            ))}
          </div>
        </div>

        {/* Playhead indicator */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--accent-rose)] z-30 pointer-events-none flex flex-col items-center transition-all duration-75"
          style={{ left: `calc(7rem + (100% - 7rem) * ${progressPercent / 100})` }}
        >
          <div className="w-2.5 h-2.5 bg-[var(--accent-rose)] rotate-45 -mt-1 shadow-md" />
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-structural)] relative">
          {/* Track 1: Video */}
          <div className="h-16 flex items-center relative group bg-[var(--bg-panel)]/40 hover:bg-[var(--bg-panel)]/70 transition-colors">
            {/* Header label */}
            <div className="w-28 h-full bg-[var(--bg-elevated)] border-r border-[var(--border-structural)] flex items-center px-2.5 gap-2 text-[var(--text-secondary)] shrink-0 z-10">
              <Video className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
              <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">Video 1</span>
            </div>

            {/* Clips & Keyframe dots */}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Video 1 track"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.round(currentMs)}
              aria-valuetext={`${formatTime(currentMs)} of ${formatTime(duration)}`}
              className="flex-1 h-full p-1.5 flex items-center relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
              onClick={handleSeekClick}
              onKeyDown={handleSeekKeyDown}
            >
              <div className="w-full h-full bg-[var(--bg-elevated)] rounded border border-[var(--accent-cobalt)]/40 relative overflow-hidden flex items-center px-3">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cobalt)]/20 to-transparent" />
                <span className="relative z-10 font-mono text-[10px] text-[var(--text-primary)] font-medium truncate">
                  Clip_01.composition • {tracks.length} Layers
                </span>

                {/* Keyframe dot markers */}
                {tracks[0]?.keyframes?.map((kf, i) => {
                  const kfPercent = ((kf.timeMs || 0) / duration) * 100;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(kf.timeMs || 0);
                      }}
                      title={`Keyframe at ${formatTime(kf.timeMs || 0)}`}
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--accent-cyan)] ring-2 ring-[var(--bg-panel)] hover:scale-125 transition-transform z-20"
                      style={{ left: `${Math.min(98, Math.max(2, kfPercent))}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Track 2: Audio A1 */}
          <div className="h-14 flex items-center relative bg-[var(--bg-panel)]/20 hover:bg-[var(--bg-panel)]/50 transition-colors">
            {/* Header label */}
            <div className="w-28 h-full bg-[var(--bg-elevated)] border-r border-[var(--border-structural)] flex items-center px-2.5 gap-2 text-[var(--text-secondary)] shrink-0 z-10">
              <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)]">Audio A1</span>
              <span
                className="font-mono text-[9px] text-[var(--text-muted)] border border-[var(--border-structural)] rounded px-1 py-px"
                title="Audio is not rendered by the animation pipeline"
              >
                N/A
              </span>
            </div>

            {/* Waveform track */}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Audio A1 track"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.round(currentMs)}
              aria-valuetext={`${formatTime(currentMs)} of ${formatTime(duration)}`}
              className="flex-1 h-full p-1.5 flex items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
              onClick={handleSeekClick}
              onKeyDown={handleSeekKeyDown}
            >
              <div className="w-full h-full bg-[var(--bg-elevated)] rounded border border-[var(--accent-cyan)]/30 flex items-center px-3 relative overflow-hidden">
                {/* Waveform visualization */}
                <div className="flex items-center justify-between w-full h-6 gap-0.5 opacity-80">
                  {[2, 4, 6, 3, 5, 7, 4, 2, 5, 6, 3, 7, 4, 2, 6, 4, 3, 6, 7, 5, 2, 4, 6, 5, 3, 7, 4, 2, 5, 6, 3, 7, 5, 3, 6, 7, 4].map((h, i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-[var(--accent-cyan)] rounded-full transition-all"
                      style={{ height: `${h * 3}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
