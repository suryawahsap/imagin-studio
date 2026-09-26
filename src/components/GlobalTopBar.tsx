import {
  Bell,
  BookOpen,
  Clock,
  Film,
  Images,
  Info,
  Maximize2,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Wand2,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MODULE_LABEL, ModuleKey } from "../utils/moduleAccent";
import { emitOpenStudioModal } from "./global/studio-bridge";

export interface GlobalTopBarProps {
  activeModule: ModuleKey;
  onModuleChange: (m: ModuleKey) => void;
  taskCount?: number;
  onTaskCenterToggle?: () => void;
}

export default function GlobalTopBar({
  activeModule,
  onModuleChange,
  taskCount = 0,
  onTaskCenterToggle,
}: GlobalTopBarProps) {
  const modules: ModuleKey[] = ["studio", "upscale", "vectorize", "remotion", "metadata", "gallery"];

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "light" || attr === "dark") return attr;
    }
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("imagin-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  // Sync attribute to DOM + persist
  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme") !== theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem("imagin-theme", theme);
  }, [theme]);

  // Adopt theme changes made by other writers
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme");
      if ((t === "light" || t === "dark") && t !== theme) {
        setTheme(t);
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [theme]);

  const icons: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
    studio: Wand2,
    upscale: Maximize2,
    vectorize: Workflow,
    remotion: Film,
    metadata: Info,
    gallery: Images,
  };

  return (
    <header
      className="h-12 bg-[var(--s-header)] border-b border-[var(--border-default)] px-2 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30 select-none shadow-[var(--shadow-sm)]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Left: App Branding */}
      <div
        className="flex items-center gap-2 sm:gap-4 min-w-0"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--s-logo)] border border-[var(--s-border)] flex items-center justify-center p-1 shadow-sm overflow-hidden shrink-0">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow text-black">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>
        <div className="flex flex-col justify-center leading-tight min-w-0">
          <span className="font-black tracking-[.025em] text-[var(--t-heading)] text-xs uppercase truncate">IMAGIN STUDIO</span>
          <span className="text-xs text-[var(--t-muted)]">Powered by AI.</span>
        </div>
      </div>

      {/* Center: Workspace navigation */}
      <nav
        className="flex min-w-0 flex-1 sm:flex-none items-center justify-center overflow-x-auto px-1 py-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--s-nav-capsule)] backdrop-blur gap-0.5 sm:gap-1"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {modules.map((m) => {
          const active = m === activeModule;
          const Icon = icons[m];

          return (
            <button
              key={m}
              onClick={() => onModuleChange(m)}
              aria-current={active ? "page" : undefined}
              className={`relative flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-md min-h-8 px-2 sm:px-3 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--s-header)] ${
                active
                  ? "font-semibold text-[var(--s-text)] bg-[var(--s-hover)] border border-[var(--accent)] shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_18%,transparent)] after:absolute after:inset-x-2 after:-bottom-[3px] after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-blue-500 after:to-cyan-400"
                  : "font-normal text-[var(--s-text-muted)] border border-transparent hover:text-[var(--s-text-2)] hover:bg-[var(--s-hover)]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 stroke-2 ${active ? "text-cyan-300" : ""}`} />
              <span className="tracking-wide">{MODULE_LABEL[m]}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Utility Tray */}
      <div
        className="flex items-center gap-1 sm:gap-2.5 shrink-0"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Task Center */}
        <button
          onClick={onTaskCenterToggle}
          title={taskCount > 0 ? `${taskCount} active jobs · Task Center` : "Task Center"}
          aria-label="Toggle Task Center"
          className="relative rounded-lg p-1.5 text-[var(--s-text-2)] transition-colors hover:bg-[var(--s-hover)] hover:text-[var(--s-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--s-header)]"
        >
          <Bell className="w-4 h-4" />
          {taskCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[var(--s-base)]" />}
        </button>

        {/* Activity Log */}
        <button
          onClick={() => emitOpenStudioModal("history")}
          title="History"
          aria-label="Activity Log"
          className="rounded-lg p-1.5 text-[var(--s-text-muted)] transition-colors hover:bg-[var(--s-hover)] hover:text-[var(--s-text-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--s-header)]"
        >
          <Clock className="w-4 h-4" />
        </button>

        {/* Documentation */}
        <button
          onClick={() => emitOpenStudioModal("help")}
          title="Documentation"
          aria-label="Help & Documentation"
          className="rounded-lg p-1.5 text-[var(--s-text-muted)] transition-colors hover:bg-[var(--s-hover)] hover:text-[var(--s-text-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--s-header)]"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[var(--s-border)]" />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
          className="rounded-lg p-1.5 text-[var(--s-text-muted)] transition-colors hover:bg-[var(--s-hover)] hover:text-[var(--s-text-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--s-header)]"
        >
          {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={() => emitOpenStudioModal("settings")}
          title="Settings"
          aria-label="Settings"
          className="p-1.5 text-[var(--s-text-muted)] hover:text-[var(--s-text-2)] rounded-lg hover:bg-[var(--s-hover)] transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
