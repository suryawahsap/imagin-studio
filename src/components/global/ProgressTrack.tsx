export interface ProgressTrackProps {
  value?: number;
  size?: "xs" | "sm" | "md";
  color?: "cobalt" | "cyan" | "emerald" | "amber" | "rose" | "indigo" | "auto";
  showLabel?: boolean;
  indeterminate?: boolean;
  className?: string;
}

const sizeStyles = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
};

const colorStyles = {
  cobalt: "bg-[var(--accent-cobalt)]",
  cyan: "bg-[var(--accent-cyan)]",
  emerald: "bg-[var(--accent-success)]",
  amber: "bg-[var(--accent-warning)]",
  rose: "bg-[var(--accent-rose)]",
  indigo: "bg-[var(--accent-indigo)]",
  auto: "bg-[var(--accent-cobalt)]",
};

export default function ProgressTrack({
  value = 0,
  size = "sm",
  color = "cobalt",
  showLabel = false,
  indeterminate = false,
  className = "",
}: ProgressTrackProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const fillColor =
    color === "auto"
      ? clamped >= 100
        ? colorStyles.emerald
        : colorStyles.cobalt
      : colorStyles[color];

  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      <div
        className={`flex-1 bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-full overflow-hidden ${sizeStyles[size]}`}
      >
        {indeterminate ? (
          <div className={`h-full w-1/3 rounded-full ${fillColor} animate-[indeterminate_1.5s_infinite_linear]`} />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-200 ${fillColor}`}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>

      {showLabel && !indeterminate && (
        <span className="font-mono text-[10px] text-[var(--text-muted)] w-8 text-right shrink-0">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
