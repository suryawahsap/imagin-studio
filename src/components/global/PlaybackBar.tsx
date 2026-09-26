import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

export interface PlaybackBarProps {
  durationMs: number;
  currentMs: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onSkipStart: () => void;
  onSkipEnd: () => void;
}

export function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

export default function PlaybackBar({
  durationMs,
  currentMs,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSkipStart,
  onSkipEnd,
}: PlaybackBarProps) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-color)] rounded-xl px-3 py-2 flex items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          onClick={onSkipStart}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-element)] transition-colors"
          title="Skip to start"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            isPlaying
              ? "bg-[var(--color-mod-an-vivid)] text-black"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-element)]"
          }`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={onSkipEnd}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-element)] transition-colors"
          title="Skip to end"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(1, durationMs)}
        step={10}
        value={currentMs}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 h-1 bg-[var(--color-bg-element)] rounded-lg appearance-none cursor-pointer accent-[var(--color-mod-an-vivid)]"
      />

      <span className="font-mono text-xs text-[var(--color-text-secondary)] shrink-0 whitespace-nowrap">
        {formatTime(currentMs)} / {formatTime(durationMs)}
      </span>
    </div>
  );
}