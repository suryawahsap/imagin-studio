import React from "react";

export interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: "dark" | "frosted" | "accent";
  icon?: React.ReactNode;
  className?: string;
}

export default function GlassBadge({
  children,
  variant = "dark",
  icon,
  className = "",
}: GlassBadgeProps) {
  const variantStyles = {
    dark: "bg-black/75 text-white/90 border-white/15",
    frosted: "bg-white/80 dark:bg-slate-900/80 text-[var(--text-primary)] border-[var(--border-strong)]",
    accent: "bg-[var(--module-upscale)] text-[var(--text-primary)] border-[var(--border-structural)]",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] tracking-wide shadow-xs ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
