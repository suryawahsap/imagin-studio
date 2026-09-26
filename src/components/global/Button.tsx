import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "cyber";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--accent-indigo)] border border-[var(--border-structural)] shadow-sm hover:shadow-md active:scale-[0.99] transition-all",
  secondary:
    "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-structural)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent-indigo)]/60 active:scale-[0.99] transition-all",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.99] transition-all",
  destructive:
    "bg-[var(--accent-error-solid)]/10 text-[var(--accent-error)] border border-[var(--accent-error)]/40 hover:bg-[var(--accent-error-solid)]/20 active:scale-[0.99] transition-all",
  cyber:
    "cyber-gradient-btn text-white font-semibold shadow-md active:scale-[0.99] transition-all",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "py-1 px-2 text-[10px] rounded gap-1",
  sm: "py-1.5 px-2.5 text-xs rounded-md gap-1.5",
  md: "py-2 px-3.5 text-xs rounded-md gap-2",
  lg: "py-2.5 px-4 text-sm rounded-lg gap-2.5",
};

export default function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  disabled = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className="shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
}
