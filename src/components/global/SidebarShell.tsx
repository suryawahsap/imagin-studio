import React from "react";

export interface SidebarShellProps {
  width?: number | string;
  className?: string;
  children: React.ReactNode;
}

export default function SidebarShell({
  width = 320,
  className = "",
  children,
}: SidebarShellProps) {
  return (
    <aside
      className={`flex flex-col h-full bg-[var(--bg-panel)] border-r border-[var(--border-structural)] text-[var(--text-primary)] overflow-hidden ${className}`}
      style={{ width }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </aside>
  );
}
