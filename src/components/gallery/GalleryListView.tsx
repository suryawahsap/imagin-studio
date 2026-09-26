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
import { assetUrl } from '../../utils/assetUrl';

export interface GalleryListViewProps {
  assets: LibraryAsset[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpen: (id: string) => void;
  onToggleFavorite: (asset: LibraryAsset) => void;
  onDownload: (asset: LibraryAsset) => void;
  onReveal: (asset: LibraryAsset) => void;
  onDeleteAsset: (id: string) => void;
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

function formatDate(val?: string | number): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(val);
  }
}

function getFormatPill(asset: LibraryAsset): string {
  if (asset.name.includes('.')) {
    const ext = asset.name.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) return ext;
  }
  return asset.type;
}

export default function GalleryListView({
  assets,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpen,
  onToggleFavorite,
  onDownload,
  onReveal,
  onDeleteAsset,
  onAnimate,
  onVectorize,
  onUpscale,
  onEditMetadata,
}: GalleryListViewProps) {
  const allSelected = assets.length > 0 && assets.every(a => selectedIds.has(a.id));

  return (
    <div className="w-full bg-[var(--bg-panel)] rounded-[6px] border border-[var(--border-structural)] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-structural)] bg-[var(--bg-elevated)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] select-none">
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  aria-label="Select all"
                  className="rounded border-[var(--border-strong)] text-[var(--accent-cobalt)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3 w-12 text-center">Preview</th>
              <th className="py-2.5 px-3">Asset Name & Prompt</th>
              <th className="py-2.5 px-3 w-28">Type / Format</th>
              <th className="py-2.5 px-3 w-28">Resolution</th>
              <th className="py-2.5 px-3 w-24">Size</th>
              <th className="py-2.5 px-3 w-28">Created</th>
              <th className="py-2.5 px-3 w-36 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-xs font-sans">
            {assets.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              const favorite = asset.favorite ?? false;
              const formatPill = getFormatPill(asset);
              const isVector = asset.type === 'VECTOR';
              const isImage = asset.type === 'IMAGE';
              const isUpscaled =
                asset.status === 'Upscaled' ||
                asset.sourceModule === 'UPSCALE' ||
                (asset.resolution && (asset.resolution.includes('4K') || asset.resolution.includes('3840')));
              const resolved = assetUrl(asset.thumbnailUrl || asset.url);

              return (
                <tr
                  key={asset.id}
                  onClick={() => onOpen(asset.id)}
                  className={`group transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--accent-cobalt)]/10 text-[var(--text-primary)]'
                      : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {/* Select Checkbox */}
                  <td
                    className="py-2 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(asset.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(asset.id)}
                      aria-label={`Select ${asset.name}`}
                      className="rounded border-[var(--border-strong)] text-[var(--accent-cobalt)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="py-2 px-3 text-center">
                    <div className="w-10 h-10 rounded bg-[var(--bg-void)] border border-[var(--border-structural)] overflow-hidden flex items-center justify-center shrink-0 mx-auto">
                      {resolved ? (
                        <img
                          src={resolved}
                          alt={asset.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : isVector ? (
                        <FileCode className="w-5 h-5 text-[var(--module-studio-text)]" />
                      ) : asset.type === 'VIDEO' ? (
                        <Video className="w-5 h-5 text-[var(--accent-success)]" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </td>

                  {/* Name & Prompt */}
                  <td className="py-2 px-3 min-w-[200px] max-w-[320px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate" title={asset.name}>
                        {asset.name}
                      </span>
                      {favorite && <Star className="w-3 h-3 text-[var(--accent-warning)] fill-[var(--accent-warning)] shrink-0" />}
                    </div>
                    {asset.prompt ? (
                      <p className="text-[11px] text-[var(--text-muted)] truncate font-sans mt-0.5" title={asset.prompt}>
                        {asset.prompt}
                      </p>
                    ) : asset.tags && asset.tags.length > 0 ? (
                      <p className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                        {asset.tags.join(', ')}
                      </p>
                    ) : null}
                  </td>

                  {/* Type / Format */}
                  <td className="py-2 px-3 font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/30">
                        {formatPill}
                      </span>
                      {isUpscaled ? (
                        <span className="text-[9px] font-bold text-[var(--accent-indicator)] bg-[var(--accent-action)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-action)]/20">
                          4K
                        </span>
                      ) : asset.status ? (
                        <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-structural)]">
                          {asset.status}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Resolution */}
                  <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {asset.resolution || (isVector ? 'Vector' : '1024 × 1024')}
                  </td>

                  {/* Size */}
                  <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {formatBytes(asset.fileSize)}
                  </td>

                  {/* Created Date */}
                  <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {formatDate(asset.createdAt)}
                  </td>

                  {/* Quick Action buttons */}
                  <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* Favorite button */}
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(asset)}
                        title={favorite ? 'Remove favorite' : 'Add to favorites'}
                        className={`p-1.5 rounded transition-colors ${
                          favorite
                            ? 'text-[var(--accent-warning)] hover:text-amber-300 bg-[var(--accent-warning-solid)]/10'
                            : 'text-[var(--text-muted)] hover:text-[var(--accent-warning)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${favorite ? 'fill-current' : ''}`} />
                      </button>

                      {/* Open detail */}
                      <button
                        type="button"
                        onClick={() => onOpen(asset.id)}
                        title="View details"
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => onDownload(asset)}
                        title="Download asset"
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Show in folder */}
                      <button
                        type="button"
                        onClick={() => onReveal(asset)}
                        title="Show in folder"
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>

                      {/* Upscale */}
                      {(isImage || isVector) && onUpscale && (
                        <button
                          type="button"
                          onClick={() => onUpscale(asset.id)}
                          title="Upscale 4K"
                          className="p-1.5 rounded text-[var(--accent-telemetry-dark)] hover:bg-[var(--accent-telemetry-dark)]/20 transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Vectorize */}
                      {isImage && onVectorize && (
                        <button
                          type="button"
                          onClick={() => onVectorize(asset.id)}
                          title="Vectorize"
                          className="p-1.5 rounded text-[var(--module-studio-text)] hover:bg-[var(--module-studio)]/20 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Animate */}
                      {isVector && onAnimate && (
                        <button
                          type="button"
                          onClick={() => onAnimate(asset.id)}
                          title="Animate"
                          className="p-1.5 rounded text-[var(--accent-error)] hover:bg-[var(--accent-error-solid)]/20 transition-colors"
                        >
                          <Film className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        title="Delete asset"
                        className="p-1.5 rounded text-[var(--accent-error)] hover:text-rose-300 hover:bg-[var(--accent-error-solid)]/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
