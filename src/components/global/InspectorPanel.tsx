import React from "react";
import { Info } from "lucide-react";

export interface InspectorTab {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface InspectorPanelProps {
  title?: string;
  badge?: string | React.ReactNode;
  icon?: React.ReactNode;
  tabs?: InspectorTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  width?: number | string;
  className?: string;
}

export default function InspectorPanel({
  title = "INSPECTOR",
  badge,
  icon = <Info className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />,
  tabs,
  activeTab,
  onTabChange,
  headerActions,
  children,
  actions,
  width = 320,
  className = "",
}: InspectorPanelProps) {
  return (
    <aside
      className={`bg-[var(--bg-panel)] border-l border-[var(--border-structural)] flex flex-col shrink-0 h-full overflow-hidden select-none ${className}`}
      style={{ width }}
    >
      {/* Inspector Header */}
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

      {/* Optional Segmented Tabs Bar */}
      {tabs && tabs.length > 0 && (
        <div className="p-2 border-b border-[var(--border-structural)] bg-[var(--bg-base)] shrink-0">
          <div className="grid grid-flow-col auto-cols-fr gap-1 p-0.5 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-structural)]">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`py-1 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    active
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs border border-[var(--border-strong)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      ({tab.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable Content Arena */}
      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto">
        {children}
      </div>

      {/* Sticky Bottom Actions Stack */}
      {actions && (
        <div className="p-3 border-t border-[var(--border-structural)] bg-[var(--bg-base)] space-y-2 shrink-0">
          {actions}
        </div>
      )}
    </aside>
  );
}
