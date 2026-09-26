import React from "react";
import { MetadataCard } from "./MetadataCard";
import { LibraryAsset } from "../../types";
import { MetadataJobItem } from "./types";
import { Inbox } from "lucide-react";

interface MetadataGridProps {
  assets: LibraryAsset[];
  jobsMap: Map<string, MetadataJobItem>;
  selectedIds: Set<string>;
  onSelectToggle: (id: string) => void;
  onGenerate: (id: string) => void;
  onCancel: (jobId: string) => void;
  onEdit: (asset: LibraryAsset) => void;
  onRetry: (id: string) => void;
}

export const MetadataGrid: React.FC<MetadataGridProps> = ({
  assets,
  jobsMap,
  selectedIds,
  onSelectToggle,
  onGenerate,
  onCancel,
  onEdit,
  onRetry,
}) => {
  if (assets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[var(--bg-void)]">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">No Assets Found</h3>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm">
          No library assets matched your current search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[var(--bg-void)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {assets.map((asset) => {
          const job = jobsMap.get(asset.id);
          return (
            <MetadataCard
              key={asset.id}
              asset={asset}
              job={job}
              isSelected={selectedIds.has(asset.id)}
              onSelectToggle={onSelectToggle}
              onGenerate={onGenerate}
              onCancel={onCancel}
              onEdit={onEdit}
              onRetry={onRetry}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MetadataGrid;
