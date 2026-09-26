import React from "react";
import { X } from "lucide-react";

export type ChipVariant = "filter" | "meta" | "status";
export type ChipColor = "default" | "cobalt" | "cyan" | "indigo" | "emerald" | "amber" | "rose";

export interface ChipProps {
  label: React.ReactNode;
  active?: boolean;
  variant?: ChipVariant;
  color?: ChipColor;
  count?: number | string;
  icon?: React.ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

const colorMap: Record<ChipColor, { active: string; idle: string }> = {
  default: {
    active: "bg-[var(--accent-action)] text-white border-[var(--accent-action)]",
    idle: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-structural)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
  },
  cobalt: {
    active: "bg-[var(--accent-action)] text-white border-[var(--accent-action)]",
    idle: "bg-[var(--accent-action)]/10 text-[var(--accent-indicator)] border-[var(--accent-action)]/30 hover:bg-[var(--accent-action)]/20",
  },
  cyan: {
    active: "bg-[var(--accent-cyan-solid)] text-white border-[var(--accent-cyan-solid)]",
    idle: "bg-[var(--accent-telemetry-dark)]/10 text-[var(--accent-telemetry-dark)] border-[var(--accent-telemetry-dark)]/30 hover:bg-[var(--accent-telemetry-dark)]/20",
  },
  indigo: {
    active: "bg-[var(--module-studio)] text-[var(--text-primary)] border-[var(--module-studio)]",
    idle: "bg-[var(--module-studio)]/10 text-[var(--module-studio-text)] border-[var(--module-studio)]/30 hover:bg-[var(--module-studio)]/20",
  },
  emerald: {
    active: "bg-[var(--accent-success-solid)] text-white border-[var(--accent-success)]/40",
    idle: "bg-[var(--accent-success-solid)]/10 text-[var(--accent-success)] border-[var(--accent-success)]/40 hover:bg-[var(--accent-success-solid)]/20",
  },
  amber: {
    active: "bg-[var(--accent-warning-solid)] text-white border-[var(--accent-warning)]/40",
    idle: "bg-[var(--accent-warning-solid)]/10 text-[var(--accent-warning)] border-[var(--accent-warning)]/40 hover:bg-[var(--accent-warning-solid)]/20",
  },
  rose: {
    active: "bg-[var(--accent-error-solid)] text-white border-[var(--accent-error)]/40",
    idle: "bg-[var(--accent-error-solid)]/10 text-[var(--accent-error)] border-[var(--accent-error)]/40 hover:bg-[var(--accent-error-solid)]/20",
  },
};

export default function Chip({
  label,
  active = false,
  variant = "filter",
  color = "default",
  count,
  icon,
  onClick,
  onRemove,
  className = "",
}: ChipProps) {
  const isFilter = variant === "filter";
  const isMeta = variant === "meta";
  const isStatus = variant === "status";

  const colorStyles = isFilter
    ? active
      ? colorMap[color].active
      : colorMap[color].idle
    : colorMap[color].idle;

  const fontStyle = isMeta ? "font-mono text-[10px]" : isStatus ? "font-sans text-[10px] font-medium" : "font-sans text-[11px]";

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
        onClick ? "cursor-pointer select-none" : ""
      } ${fontStyle} ${colorStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`font-mono text-[9px] ${
            active ? "text-white font-bold" : "text-[var(--text-muted)]"
          }`}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 hover:text-white rounded-full transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
