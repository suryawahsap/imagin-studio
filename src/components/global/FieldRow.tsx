import React from "react";

export interface FieldRowProps {
  label?: string;
  suffix?: React.ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FieldRow({
  label,
  suffix,
  hint,
  error,
  children,
  className = "",
}: FieldRowProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Overhead Label Bar */}
      {(label || suffix) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <label className="font-mono text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              {label}
            </label>
          )}
          {suffix && (
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {suffix}
            </span>
          )}
        </div>
      )}

      {/* Control Input Slot */}
      <div className="relative">{children}</div>

      {/* Helper or Error Text */}
      {error ? (
        <p className="font-sans text-[10px] text-[var(--accent-error)] leading-tight">{error}</p>
      ) : hint ? (
        <p className="font-sans text-[10px] text-[var(--text-muted)] leading-tight">{hint}</p>
      ) : null}
    </div>
  );
}
