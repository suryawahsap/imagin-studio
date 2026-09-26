import React, { useState } from 'react';
import {
  Check,
  Download,
  Eye,
  FolderOpen,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  Film,
  FileCode,
  Image as ImageIcon,
  Video,
  Volume2,
  Code,
  ArrowUpRight,
  PenLine,
} from 'lucide-react';
import type { LibraryAsset } from '../../types';
import GlassBadge from '../global/GlassBadge';

export interface GalleryCardProps {
  asset: LibraryAsset;
  resolvedUrl?: string;
  selected?: boolean;
  favorite?: boolean;
  compact?: boolean;
  onSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onToggleFavorite?: (asset: LibraryAsset) => void;
  onDownload?: (asset: LibraryAsset) => void;
  onReveal?: (asset: LibraryAsset) => void;
  onDelete?: (id: string) => void;
  onAnimate?: (assetId: string) => void;
  onVectorize?: (assetId: string) => void;
  onUpscale?: (assetId: string) => void;
  onEditMetadata?: (assetId: string) => void;
}

function formatBytes(bytes?: string | number): string {
  if (bytes === undefined || bytes === null || bytes === '') return '—';
  if (typeof bytes === 'string' && (bytes.includes('MB') || bytes.includes('KB') || bytes.includes('GB') || bytes.includes('B'))) {
    return bytes;
  }
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (Number.isNaN(n) || n <= 0) return typeof bytes === 'string' ? bytes : '—';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function getFormatPill(asset: LibraryAsset): string {
  if (asset.name.includes('.')) {
    const ext = asset.name.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) return ext;
  }
  if (asset.mimeType) {
    if (asset.mimeType.includes('png')) return 'PNG';
    if (asset.mimeType.includes('jpeg') || asset.mimeType.includes('jpg')) return 'JPG';
    if (asset.mimeType.includes('webp')) return 'WEBP';
    if (asset.mimeType.includes('svg')) return 'SVG';
    if (asset.mimeType.includes('mp4')) return 'MP4';
    if (asset.mimeType.includes('webm')) return 'WEBM';
    if (asset.mimeType.includes('json')) return 'JSON';
  }
  return asset.type;
}

export default function GalleryCard({
  asset,
  resolvedUrl,
  selected = false,
  favorite = false,
  compact = false,
  onSelect,
  onOpen,
  onToggleFavorite,
  onDownload,
  onReveal,
  onDelete,
  onAnimate,
  onVectorize,
  onUpscale,
  onEditMetadata,
}: GalleryCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatPill = getFormatPill(asset);
  const isUpscaled =
    asset.status === 'Upscaled' ||
    asset.sourceModule === 'UPSCALE' ||
    (asset.resolution && (asset.resolution.includes('4K') || asset.resolution.includes('3840') || asset.resolution.includes('4096')));
  const isVector = asset.type === 'VECTOR';
  const isVideo = asset.type === 'VIDEO';
  const isAnimation = asset.type === 'ANIMATION';
  const isAudio = asset.type === 'AUDIO';
  const isHtml = asset.type === 'HTML';
  const isImage = asset.type === 'IMAGE';

  // Badge label & badge styling per format
  let badgeLabel = 'IMAGE';
  let badgeClasses = 'bg-black/70 text-white border-white/15';

  if (isUpscaled) {
    badgeLabel = '4K UPSCALED';
    badgeClasses = 'bg-[var(--accent-action)] text-white border-[var(--accent-action)]/40 shadow-xs';
  } else if (isVector) {
    badgeLabel = 'VECTOR';
    badgeClasses = 'bg-[var(--module-studio)]/90 text-[var(--text-primary)] border-[var(--module-studio)]/30';
  } else if (isVideo) {
    badgeLabel = 'VIDEO';
    badgeClasses = 'bg-[var(--accent-success-solid)] text-white border-[var(--accent-success)]/40';
  } else if (isAnimation) {
    badgeLabel = 'ANIMATION';
    badgeClasses = 'bg-[var(--accent-error-solid)] text-white border-[var(--accent-error)]/40';
  } else if (isAudio) {
    badgeLabel = 'AUDIO';
    badgeClasses = 'bg-[var(--accent-warning-solid)] text-white border-[var(--accent-warning)]/40';
  } else if (isHtml) {
    badgeLabel = 'HTML5';
    badgeClasses = 'bg-[var(--accent-cyan-solid)]/90 text-white border-[var(--accent-telemetry-dark)]/30';
  }

  const dimensionsLabel = asset.resolution || (isVector ? 'Vector Inf' : '1024 × 1024');
  const sizeLabel = formatBytes(asset.fileSize);

  return (
    <div
      onClick={() => (onOpen ? onOpen(asset.id) : onSelect?.(asset.id))}
      className={`group relative flex flex-col bg-[var(--bg-panel)] rounded-[6px] overflow-hidden cursor-pointer transition-all duration-150 select-none ${
        selected
          ? 'border-2 border-[var(--accent-cobalt)] shadow-[0_0_12px_var(--accent-action-soft)] ring-1 ring-[var(--accent-cobalt)]/30'
          : 'border border-[var(--border-structural)] hover:border-[var(--accent-cobalt)]/60 hover:shadow-md'
      }`}
    >
      {/* Media / Letterbox Container */}
      <div className="relative w-full aspect-square bg-[var(--bg-void)] overflow-hidden flex items-center justify-center">
        {/* Subtle letterbox gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

        {resolvedUrl && !imageError ? (
          <img
            src={resolvedUrl}
            alt={asset.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-[var(--text-muted)] gap-2">
            {isVector ? (
              <FileCode className="w-12 h-12 text-[var(--module-studio-text)] opacity-80" />
            ) : isVideo || isAnimation ? (
              <Video className="w-12 h-12 text-[var(--accent-success)] opacity-80" />
            ) : isAudio ? (
              <Volume2 className="w-12 h-12 text-[var(--accent-warning)] opacity-80" />
            ) : isHtml ? (
              <Code className="w-12 h-12 text-[var(--accent-telemetry-dark)] opacity-80" />
            ) : (
              <ImageIcon className="w-12 h-12 text-[var(--text-muted)] opacity-60" />
            )}
            <span className="font-mono text-[10px] text-[var(--text-muted)]">{formatPill}</span>
          </div>
        )}

        {/* Video / Animation Play indicator icon */}
        {(isVideo || isAnimation) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <Film className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        )}

        {/* Top-Left: Format Glass Badge & Active Pill */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span
            className={`text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded uppercase border shadow-xs ${badgeClasses}`}
          >
            {badgeLabel}
          </span>
          {selected && (
            <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-cobalt-solid)] text-white uppercase font-black shadow-xs">
              Selected
            </span>
          )}
        </div>

        {/* Top-Right: Selection Checkbox & Favorite Star */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {/* Multi-Select Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(asset.id);
            }}
            title={selected ? 'Deselect asset' : 'Select asset'}
            className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
              selected
                ? 'bg-[var(--accent-cobalt-solid)] border-[var(--accent-cobalt)] text-white opacity-100 shadow-xs'
                : 'bg-black/60 border-white/20 text-transparent hover:text-white/80 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${selected ? 'stroke-[2.5]' : ''}`} />
          </button>

          {/* Favorite Toggle Star */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(asset);
            }}
            title={favorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
              favorite
                ? 'bg-black/70 border-[var(--accent-warning)]/40 text-[var(--accent-warning)] opacity-100 shadow-xs'
                : 'bg-black/60 border-white/20 text-white/50 hover:text-[var(--accent-warning)] opacity-0 group-hover:opacity-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favorite ? 'fill-[var(--accent-warning)] text-[var(--accent-warning)]' : ''}`} />
          </button>
        </div>

        {/* Hover Quick Actions Overlay Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-2 bottom-2 py-1 px-1.5 rounded-lg bg-black/80 border border-white/15 flex items-center justify-around opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-lg"
        >
          {/* Open Details */}
          <button
            type="button"
            onClick={() => onOpen?.(asset.id)}
            title="Inspect Details"
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/15 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Send to Upscale */}
          {(isImage || isVector) && onUpscale && (
            <button
              type="button"
              onClick={() => onUpscale(asset.id)}
              title="Upscale 4K"
              className="p-1 rounded text-[var(--accent-telemetry-dark)] hover:text-white hover:bg-[var(--accent-telemetry-dark)]/20 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Send to Vectorize */}
          {isImage && onVectorize && (
            <button
              type="button"
              onClick={() => onVectorize(asset.id)}
              title="Vectorize"
              className="p-1 rounded text-[var(--module-studio-text)] hover:text-white hover:bg-[var(--module-studio)]/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Send to Animation */}
          {isVector && onAnimate && (
            <button
              type="button"
              onClick={() => onAnimate(asset.id)}
              title="Animate SVG"
              className="p-1 rounded text-rose-300 hover:text-white hover:bg-[var(--accent-error-solid)]/20 transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download */}
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(asset)}
              title="Download asset"
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/15 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Show in folder */}
          {onReveal && (
            <button
              type="button"
              onClick={() => onReveal(asset)}
              title="Show in folder"
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/15 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit Metadata */}
          {onEditMetadata && (
            <button
              type="button"
              onClick={() => onEditMetadata(asset.id)}
              title="Edit Metadata"
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/15 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(asset.id)}
              title="Delete asset"
              className="p-1 rounded text-[var(--accent-error)] hover:text-rose-200 hover:bg-[var(--accent-error-solid)]/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Meta Shelf (Geist font for filename + JetBrains Mono for stats) */}
      <div
        className={`flex items-center justify-between border-t border-[var(--border-structural)] bg-[var(--bg-elevated)] ${
          compact ? 'p-2' : 'p-2.5'
        }`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <h4
            className="font-sans font-semibold text-[var(--text-primary)] text-xs truncate leading-snug"
            title={asset.name}
          >
            {asset.name}
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
            {dimensionsLabel}
          </p>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end">
          <span className="text-[9px] font-mono font-bold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1 py-0.5 rounded border border-[var(--accent-cyan)]/30">
            {formatPill}
          </span>
          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
            {sizeLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
