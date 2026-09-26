import React from "react";
import {
  Layers,
  Search,
  FileSearch,
} from "lucide-react";
import { LibraryAsset } from "../../types";
import { MetadataFilterState, MetadataJobItem, MetadataStatusFilter } from "./types";
import { ProgressTrack } from "../global";

interface MetadataSidebarProps {
  assets: LibraryAsset[];
  selectedAssetId?: string;
  onSelectAsset: (asset: LibraryAsset) => void;
  jobsMap: Map<string, MetadataJobItem>;
  filter: MetadataFilterState;
  onFilterChange: (patch: Partial<MetadataFilterState>) => void;
  counts: Record<MetadataStatusFilter, number>;
  onGenerateSingle?: (id: string) => void;
  onGenerateAllPending: () => void;
  pendingCount: number;
  isProcessing: boolean;
  onClearFinished?: () => void;
}

export const MetadataSidebar: React.FC<MetadataSidebarProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  jobsMap,
  filter,
  onFilterChange,
  counts,
  onGenerateSingle,
  onClearFinished,
}) => {
  const totalAssets = counts.all || assets.length;
  const completedAssets = counts.completed || 0;
  const progressPercent = totalAssets > 0 ? Math.round((completedAssets / totalAssets) * 100) : 0;

  const getFormatBadge = (asset: LibraryAsset) => {
    const ext = asset.name.split(".").pop()?.toUpperCase() || (asset.type === "VECTOR" ? "SVG" : "PNG");
    if (ext === "SVG") return { label: "SVG", color: "bg-[var(--accent-warning-solid)]/15 text-[var(--accent-warning)] border-[var(--accent-warning)]/40" };
    if (ext === "PNG") return { label: "PNG", color: "bg-[var(--accent-action)]/15 text-[var(--accent-indicator)] border-[var(--accent-action)]/30" };
    if (ext === "JPG" || ext === "JPEG") return { label: "JPG", color: "bg-[var(--module-studio)]/15 text-[var(--module-studio-text)] border-[var(--module-studio)]/30" };
    if (ext === "MP4") return { label: "MP4", color: "bg-[var(--accent-error-solid)]/15 text-[var(--accent-error)] border-[var(--accent-error)]/40" };
    return { label: ext, color: "bg-[var(--text-muted)]/15 text-[var(--text-secondary)] border border-[var(--border-structural)]" };
  };

  const getAssetStatus = (asset: LibraryAsset) => {
    const job = jobsMap.get(asset.id);
    const hasMeta = Boolean(asset.stockMetadata?.title || (asset.stockMetadata?.keywords && asset.stockMetadata.keywords.length > 0));

    if (job?.status === "processing") {
      return {
        type: "processing",
        label: "Generating",
        dotColor: "bg-[var(--accent-cyan)]",
        tagCount: `${job.progress || 78}%`,
        isSpinning: true,
      };
    }
    if (job?.status === "queued") {
      return {
        type: "queued",
        label: "Queued",
        dotColor: "bg-[var(--accent-cobalt)]",
        tagCount: "In Queue",
        isSpinning: false,
      };
    }
    if (job?.status === "failed") {
      return {
        type: "failed",
        label: "Invalid",
        dotColor: "bg-[var(--accent-error)]",
        tagCount: "Min 5 tags",
        isSpinning: false,
      };
    }
    if (hasMeta) {
      const kwCount = asset.stockMetadata?.keywords?.length || 0;
      return {
        type: "completed",
        label: "Metadata Ready",
        dotColor: "bg-[var(--accent-success)]",
        tagCount: `${kwCount} tags`,
        isSpinning: false,
      };
    }
    return {
      type: "pending",
      label: "Not Generated",
      dotColor: "bg-[var(--text-muted)]",
      tagCount: "+ AI Generate",
      isSpinning: false,
    };
  };

  return (
    <aside className="w-60 bg-[var(--bg-panel)] border-r border-[var(--border-structural)] flex flex-col shrink-0 h-full overflow-hidden select-none">
      <div className="p-3 border-b border-[var(--border-structural)] bg-[var(--bg-panel)] shrink-0 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[var(--text-primary)] uppercase">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <span>Asset Queue</span>
          </span>
          <span className="text-[var(--accent-cyan)] font-mono text-[10px]">{progressPercent}%</span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
          <span>Production Progress</span>
          <span className="font-mono text-[var(--text-primary)]">
            {completedAssets} / {totalAssets} completed
          </span>
        </div>

        {/* Progress Track */}
        <ProgressTrack value={progressPercent} color="cyan" size="xs" />

        {/* Search Input Box */}
        <div className="relative mt-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search assets..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded px-2.5 py-1 pl-7 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 pt-1 text-[10px] font-medium overflow-x-auto">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Needs Meta" },
            { id: "processing", label: "Generating" },
            { id: "completed", label: "Ready" },
          ].map((tab) => {
            const active =
              (tab.id === "all" && filter.status === "all") ||
              (tab.id === "pending" && filter.status === "pending") ||
              (tab.id === "processing" && (filter.status === "processing" || filter.status === "queued")) ||
              (tab.id === "completed" && filter.status === "completed");

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  onFilterChange({
                    status: tab.id === "all" ? "all" : (tab.id as MetadataStatusFilter),
                  })
                }
                className={`px-2 py-0.5 rounded transition-all shrink-0 ${
                  active
                    ? "bg-[var(--accent-cobalt-solid)] text-white font-semibold shadow-xs"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-structural)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] p-1.5 space-y-1 bg-[var(--bg-void)]">
        {assets.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] space-y-2">
            <FileSearch className="w-6 h-6 mx-auto opacity-50" />
            <p>No assets match current filters</p>
          </div>
        ) : (
          assets.map((asset) => {
            const isSelected = asset.id === selectedAssetId;
            const badge = getFormatBadge(asset);
            const status = getAssetStatus(asset);
            const dimensions = asset.resolution || (asset.type === "VECTOR" ? "1024 × 1024" : "1920 × 1080");
            const typeLabel = asset.type === "VECTOR" ? "Vector" : "Raster";

            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[var(--bg-elevated)] border-[var(--accent-cyan)] shadow-sm ring-1 ring-[var(--accent-cyan)]/60"
                    : "bg-[var(--bg-panel)] border-[var(--border-structural)] hover:border-[var(--border-strong)]"
                }`}
              >
                {/* Row 1: Format Badge + Filename + Status dot */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-[130px]">
                      {asset.name}
                    </span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${status.dotColor} ${
                      status.isSpinning ? "animate-pulse" : ""
                    }`}
                  />
                </div>

                {/* Row 2: Type • Dimensions + Status label */}
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1">
                  <span>
                    {typeLabel} • {dimensions}
                  </span>
                  <span
                    className={`font-mono flex items-center gap-0.5 ${
                      status.type === "completed"
                        ? "text-[var(--accent-success)]"
                        : status.type === "processing"
                        ? "text-[var(--accent-cyan)]"
                        : status.type === "failed"
                        ? "text-[var(--accent-error)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Row 3: Tag Count / AI Action */}
                <div className="text-right text-[9px] font-mono mt-0.5 text-[var(--text-muted)]">
                  {status.type === "pending" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateSingle?.(asset.id);
                      }}
                      className="text-[var(--accent-cyan)] hover:underline"
                    >
                      + AI Generate
                    </button>
                  ) : (
                    <span>{status.tagCount}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 border-t border-[var(--border-structural)] bg-[var(--bg-panel)] flex items-center justify-between text-[10px] text-[var(--text-secondary)] shrink-0">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)]" />
          <span className="font-mono">
            {completedAssets} / {totalAssets} ({progressPercent}%)
          </span>
        </div>
        {onClearFinished && (
          <button
            type="button"
            onClick={onClearFinished}
            className="text-[var(--accent-cyan)] hover:text-[var(--accent-cobalt)] font-medium transition-colors"
          >
            Clear Finished
          </button>
        )}
      </div>
    </aside>
  );
};

export default MetadataSidebar;
