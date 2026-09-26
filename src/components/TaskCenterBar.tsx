import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Ellipsis,
  HardDrive,
  Maximize2,
  RotateCcw,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import { StorageInfo, Task } from "../types";

interface Props {
  tasks: Task[];
  storage: StorageInfo | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCancelTask: (id: string) => void;
  onRetryTask: (id: string) => void;
  onClearTasks: () => void;
  loading: boolean;
  error: boolean;
  onRetryLoad: () => void;
}

type Filter = "all" | "generating" | "upscaling" | "vectorizing" | "remotion" | "completed" | "failed";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "generating", label: "Generating" },
  { key: "upscaling", label: "Upscaling" },
  { key: "vectorizing", label: "Vectorizing" },
  { key: "remotion", label: "Remotion" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

const category = (task: Task): Filter => {
  if (task.status === "FAILED") return "failed";
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return "completed";
  if (task.module === "STUDIO") return "generating";
  if (task.type === "IMAGE_UPSCALE") return "upscaling";
  if (task.type === "VECTOR_GENERATION" || task.module === "VECTOR") return "vectorizing";
  return "remotion";
};

const taskMeta = (task: Task) => {
  if (category(task) === "upscaling") {
    return { Icon: Maximize2, label: "Upscale", color: "var(--module-upscale-text)", fill: "var(--s-cyan)" };
  }
  if (category(task) === "vectorizing") {
    return { Icon: Workflow, label: "Vectorize", color: "var(--module-vectorize-text)", fill: "var(--s-neon)" };
  }
  if (category(task) === "remotion") {
    return { Icon: Clapperboard, label: "Remotion", color: "var(--module-animation-text)", fill: "var(--s-pink)" };
  }
  return { Icon: Sparkles, label: "Text to Image", color: "var(--module-studio-text)", fill: "var(--s-accent-hi)" };
};

export default function TaskCenterBar({
  tasks,
  storage,
  expanded,
  onExpandedChange,
  onCancelTask,
  onRetryTask,
  onClearTasks,
  loading,
  error,
  onRetryLoad,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [menu, setMenu] = useState<string | null>(null);

  const counts = Object.fromEntries(
    filters.map(({ key }) => [
      key,
      key === "all" ? tasks.length : tasks.filter((t) => category(t) === key).length,
    ])
  ) as Record<Filter, number>;

  const visible = filter === "all" ? tasks : tasks.filter((t) => category(t) === filter);
  const hasFailedJobs = tasks.some((t) => t.status === "FAILED");
  const activeCount = tasks.filter((t) => t.status === "PROCESSING" || t.status === "QUEUED").length;

  const formatDate = (value: string) => {
    try {
      const d = new Date(value);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return value;
    }
  };

  return (
    <footer
      className="h-36 bg-[var(--s-dock)] border-t border-[var(--border-default)] flex flex-col shrink-0 z-20 select-none shadow-[var(--shadow-lg)]"
      onClick={() => menu && setMenu(null)}
    >
      {/* Dock Titlebar & State Counters */}
      <div className="h-8 bg-[var(--s-dock-bar)] px-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onExpandedChange(!expanded)}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--t-heading)] shrink-0"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>Task Center</span>
            {activeCount > 0 && (
              <span className="px-1.5 rounded text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold">
                {activeCount}
              </span>
            )}
          </button>

          {/* Filter tabs with job counters */}
          <div className="flex items-center gap-1 text-[10px] shrink-0">
            {filters.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-2 py-0.5 rounded-sm transition ${
                    active
                      ? "bg-[var(--s-accent)] text-white font-medium"
                      : "text-[var(--t-secondary)] hover:text-[var(--t-heading)]"
                  }`}
                >
                  {label} ({counts[key]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Dock Right Controls & Telemetry */}
        <div className="flex items-center gap-3 text-[10px] shrink-0">
          <span className="flex items-center gap-1">
            {hasFailedJobs ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--s-error)] animate-pulse" />
                <span className="text-[var(--s-error)]">Needs Attention</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[var(--s-text-muted)]">System Ready</span>
              </>
            )}
          </span>

          {storage && (
            <span className="hidden sm:flex items-center gap-2 text-[var(--s-text-faint)] font-mono">
              <span>
                STORAGE {storage.used} / {storage.total} GB
              </span>
              <span className="w-16 h-1.5 rounded-full bg-[var(--s-border)] overflow-hidden">
                <span
                  className="block h-full rounded-full bg-cyan-400"
                  style={{ width: `${Math.min(100, Math.max(0, storage.percent))}%` }}
                />
              </span>
            </span>
          )}

          <button
            onClick={() => onExpandedChange(!expanded)}
            aria-label={expanded ? "Collapse task center" : "Expand task center"}
            className="text-[var(--s-text-muted)] hover:text-[var(--s-text)] transition"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Active Tasks Progress Table */}
      {expanded && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto font-mono text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--s-table-head)] text-[10px] text-[var(--t-muted)] border-b border-[var(--border-subtle)] uppercase font-sans sticky top-0">
              <tr>
                <th className="py-1.5 px-3 w-8">#</th>
                <th className="py-1.5 px-3 w-36">Type</th>
                <th className="py-1.5 px-3">Asset Name</th>
                <th className="py-1.5 px-3 w-64">Progress</th>
                <th className="py-1.5 px-3 w-32">Status</th>
                <th className="py-1.5 px-3 w-40">Created</th>
                <th className="py-1.5 px-3 w-16 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--t-body)]">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-3 px-3 text-center text-[var(--s-text-faint)]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                      Loading tasks queue...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7} className="py-3 px-3 text-center text-[var(--s-error)]">
                    <span className="inline-flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Failed to load tasks.
                      <button
                        onClick={onRetryLoad}
                        className="px-2 py-0.5 rounded bg-[var(--s-elev)] border border-[var(--s-border)] text-[var(--s-text)]"
                      >
                        Retry
                      </button>
                    </span>
                  </td>
                </tr>
              )}

              {!loading && !error && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 px-3 text-center text-[var(--s-text-faint)]">
                    No tasks found in this filter.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                visible.map((task, index) => {
                  const meta = taskMeta(task);
                  const Icon = meta.Icon;
                  const isFailed = task.status === "FAILED";
                  const isCompleted = task.status === "COMPLETED";
                  const isProcessing = task.status === "PROCESSING";
                  const isCancelled = task.status === "CANCELLED";
                  const fill = isFailed
                    ? "var(--s-error)"
                    : isCompleted
                    ? "var(--s-success)"
                    : meta.fill;

                  return (
                    <tr key={task.id} className="hover:bg-[var(--s-hover)] transition">
                      <td className="py-1 px-3 text-[var(--s-text-faint)]">{index + 1}</td>

                      <td className="py-1 px-3">
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                          <span className="truncate">{meta.label}</span>
                        </span>
                      </td>

                      <td className="py-1 px-3 font-semibold text-[var(--s-text)] truncate max-w-0" title={task.name}>
                        {task.name}
                      </td>

                      <td className="py-1 px-3">
                        <span className="flex items-center gap-2">
                          <span className="flex-1 bg-[var(--border-default)] h-1.5 rounded-full overflow-hidden">
                            <span
                              className="block h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.min(100, Math.max(0, task.progress))}%`,
                                backgroundColor: fill,
                              }}
                            />
                          </span>
                          <span
                            className="text-[10px] font-bold w-8 text-right"
                            style={{ color: fill }}
                          >
                            {Math.round(task.progress)}%
                          </span>
                        </span>
                      </td>

                      <td className="py-1 px-3">
                        {isProcessing && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping mr-1" />
                            Generating
                          </span>
                        )}
                        {task.status === "QUEUED" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-[var(--s-text-faint)]/10 text-[var(--s-text-muted)] border border-[var(--s-border)]">
                            Queued
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Completed
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                            Failed
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-[var(--s-text-faint)]/10 text-[var(--s-text-muted)] border border-[var(--s-border)]">
                            Cancelled
                          </span>
                        )}
                      </td>

                      <td className="py-1 px-3 text-[var(--s-text-faint)] text-[10px] truncate">
                        {formatDate(task.createdAt)}
                      </td>

                      <td className="py-1 px-3 text-right">
                        <span className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu(menu === task.id ? null : task.id);
                            }}
                            aria-label={`Actions for ${task.name}`}
                            className="text-[var(--s-text-faint)] hover:text-[var(--s-text)] transition"
                          >
                            <Ellipsis className="w-3.5 h-3.5 inline" />
                          </button>

                          {menu === task.id && (
                            <span
                              className="absolute right-0 bottom-6 z-30 w-32 block rounded-lg border border-[var(--s-border-strong)] bg-[var(--s-card)] p-1 shadow-lg font-sans text-xs text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!isCompleted && !isFailed && !isCancelled && (
                                <button
                                  onClick={() => {
                                    onCancelTask(task.id);
                                    setMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[var(--s-error)] hover:bg-[var(--s-hover)]"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              )}
                              {isFailed && (
                                <button
                                  onClick={() => {
                                    onRetryTask(task.id);
                                    setMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[var(--s-text)] hover:bg-[var(--s-hover)]"
                                >
                                  <RotateCcw className="w-3 h-3 text-blue-400" />
                                  Retry
                                </button>
                              )}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom status / clear history */}
      {expanded && tasks.some((t) => t.status === "COMPLETED" || t.status === "FAILED" || t.status === "CANCELLED") && (
        <div className="px-3 py-1 bg-[var(--s-dock-bar)] border-t border-[var(--s-border-soft)] flex items-center justify-between text-[10px] text-[var(--s-text-faint)] font-sans">
          <span>{tasks.length} total jobs logged</span>
          <button
            onClick={onClearTasks}
            className="flex items-center gap-1.5 hover:text-[var(--s-text)] transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear history</span>
          </button>
        </div>
      )}
    </footer>
  );
}
