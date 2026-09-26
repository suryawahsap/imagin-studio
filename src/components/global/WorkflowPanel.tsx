import React, { useState } from "react";
import { ChevronDown, ChevronRight, Sliders } from "lucide-react";

export interface WorkflowPanelProps {
  title?: string;
  badge?: string | React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  width?: number | string;
}

export interface WorkflowStepProps {
  step: number | string;
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  active?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  isLast?: boolean;
}

export function WorkflowStep({
  step,
  title,
  badge,
  action,
  active = true,
  collapsible = false,
  defaultOpen = true,
  children,
  className = "",
  isLast = false,
}: WorkflowStepProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`relative space-y-2 ${className}`}>
      {/* Hairline connector line if not last */}
      {!isLast && (
        <div className="absolute left-2.5 top-6 bottom-0 w-px bg-[var(--border-structural)] pointer-events-none -z-0" />
      )}

      <div className="flex items-center justify-between text-xs z-10 relative">
        <div
          className={`flex items-center gap-2 font-medium ${
            collapsible ? "cursor-pointer select-none" : ""
          }`}
          onClick={() => collapsible && setIsOpen(!isOpen)}
        >
          {/* Index Badge */}
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
              active
                ? "bg-[var(--accent-cobalt-solid)] text-white shadow-xs"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-structural)]"
            }`}
          >
            {step}
          </span>

          <span className="font-semibold text-[var(--text-primary)] uppercase tracking-wide text-xs">
            {title}
          </span>

          {badge && <span className="ml-1">{badge}</span>}

          {collapsible && (
            <span className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {(!collapsible || isOpen) && (
        <div className="pl-7 space-y-2.5">
          {children}
        </div>
      )}
    </section>
  );
}

export default function WorkflowPanel({
  title = "WORKFLOW",
  badge,
  icon = <Sliders className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />,
  headerActions,
  footer,
  children,
  className = "",
  width = 285,
}: WorkflowPanelProps) {
  return (
    <aside
      className={`bg-[var(--bg-panel)] border-r border-[var(--border-structural)] flex flex-col shrink-0 h-full overflow-hidden select-none ${className}`}
      style={{ width }}
    >
      {/* Workflow Header */}
      <div className="h-11 px-3.5 border-b border-[var(--border-structural)] flex items-center justify-between shrink-0 bg-[var(--bg-panel)]">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase font-mono">
          {icon}
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            typeof badge === "string" ? (
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-cobalt)] border border-[var(--border-structural)]">
                {badge}
              </span>
            ) : (
              badge
            )
          )}
          {headerActions}
        </div>
      </div>

      {/* Scrollable Workflow Steps Content */}
      <div className="flex-1 p-3.5 space-y-4 overflow-y-auto">
        {children}
      </div>

      {/* Optional Sticky Bottom Action Dock */}
      {footer && (
        <div className="p-3 border-t border-[var(--border-structural)] bg-[var(--bg-base)] shrink-0">
          {footer}
        </div>
      )}
    </aside>
  );
}
