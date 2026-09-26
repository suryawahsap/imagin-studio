import React, { useState } from "react";
import { Edit2, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { LibraryAsset } from "../../types";
import { MetadataJobItem } from "./types";
import { assetUrl } from "../../utils/assetUrl";
import { Button } from "../global";

interface MetadataCardProps {
  asset: LibraryAsset;
  job?: MetadataJobItem;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  onGenerate: (id: string) => void;
  onCancel: (jobId: string) => void;
  onEdit: (asset: LibraryAsset) => void;
  onRetry: (id: string) => void;
}

export const MetadataCard: React.FC<MetadataCardProps> = ({
  asset,
  job,
  isSelected,
  onSelectToggle,
  onGenerate,
  onCancel,
  onEdit,
  onRetry,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(() => assetUrl(asset.thumbnailUrl || asset.url));

  const metadata = asset.stockMetadata;
  const hasMetadata = Boolean(metadata?.title || (metadata?.keywords && metadata.keywords.length > 0));
  const status = job?.status || (hasMetadata ? "completed" : "pending");

  const renderStatusBadge = () => {
    switch (status) {
      case "processing":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-cyan)]/15 text-[var(--status-processing-text)] border border-[var(--accent-cyan)]/30">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            {job?.progress ? `${job.progress}%` : "Processing"}
          </span>
        );
      case "queued":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-cobalt)]/15 text-[var(--status-queued-text)] border border-[var(--accent-cobalt)]/30">
            <Clock className="w-2.5 h-2.5" />
            Queued
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-panel)] text-[var(--status-ready-text)] border border-[var(--accent-success)]/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Ready
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-panel)] text-[var(--status-failed-text)] border border-[var(--accent-error)]/30">
            <AlertCircle className="w-2.5 h-2.5" />
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-panel)] text-[var(--status-cancelled-text)] border border-[var(--border-strong)]/60">
            <XCircle className="w-2.5 h-2.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-panel)] text-[var(--status-pending-text)] border border-[var(--accent-warning)]/30">
            <Clock className="w-2.5 h-2.5" />
            Pending AI
          </span>
        );
    }
  };

  return (
    <div
      className={`group relative flex flex-col rounded-lg border bg-[var(--bg-panel)] overflow-hidden transition-all duration-200 shadow-xs hover:border-[var(--accent-cobalt)]/60 ${
        isSelected
          ? "border-[var(--accent-cobalt)] ring-1 ring-[var(--accent-cobalt)] shadow-sm"
          : "border-[var(--border-structural)]"
      }`}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video w-full bg-[var(--bg-void)] overflow-hidden">
        <img
          src={imgSrc}
          alt={asset.name}
          onError={() => setImgSrc(assetUrl(asset.url))}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Checkbox overlay */}
        <div className="absolute top-2 left-2 z-10">
          <label className="flex items-center gap-2 cursor-pointer p-1 rounded-md bg-black/40 hover:bg-black/60 transition-colors">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectToggle(asset.id)}
              className="w-3.5 h-3.5 rounded accent-[var(--accent-cobalt)] cursor-pointer"
            />
            <span className="sr-only">Select asset {asset.name}</span>
          </label>
        </div>

        {/* Status Overlay Badge */}
        <div className="absolute top-2 right-2 z-10">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] truncate" title={asset.name}>
            {metadata?.title || asset.name}
          </h3>

          {metadata?.description && (
            <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {metadata.description}
            </p>
          )}

          {/* Keywords Preview */}
          {metadata?.keywords && metadata.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {metadata.keywords.slice(0, 4).map((kw, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-structural)] truncate max-w-[90px]"
                >
                  {kw}
                </span>
              ))}
              {metadata.keywords.length > 4 && (
                <span className="text-[9px] font-mono px-1 py-0.5 text-[var(--text-muted)]">
                  +{metadata.keywords.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {status === "failed" && job?.error && (
          <p className="text-[10px] text-[var(--accent-error)] font-mono break-words line-clamp-2" title={job.error}>
            {job.error}
          </p>
        )}

        {/* Action Controls */}
        <div className="pt-2 border-t border-[var(--border-structural)] flex items-center justify-between gap-2">
          {status === "pending" && (
            <Button
              variant="secondary"
              size="xs"
              fullWidth
              onClick={() => onGenerate(asset.id)}
            >
              Generate AI
            </Button>
          )}

          {(status === "queued" || status === "processing") && (
            <Button
              variant="destructive"
              size="xs"
              fullWidth
              onClick={() => job && onCancel(job.id)}
              icon={<XCircle className="w-3 h-3" />}
            >
              Cancel Job
            </Button>
          )}

          {status === "completed" && (
            <div className="w-full flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="xs"
                className="flex-1"
                onClick={() => onEdit(asset)}
                icon={<Edit2 className="w-3 h-3" />}
              >
                Inspect
              </Button>
              <button
                type="button"
                onClick={() => onGenerate(asset.id)}
                title="Regenerate metadata"
                className="p-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-structural)] hover:border-[var(--border-strong)] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}

          {(status === "failed" || status === "cancelled") && (
            <Button
              variant="secondary"
              size="xs"
              fullWidth
              onClick={() => onRetry(asset.id)}
              icon={<RefreshCw className="w-3 h-3 text-[var(--accent-warning)]" />}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetadataCard;
