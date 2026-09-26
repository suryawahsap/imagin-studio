import React, { useEffect, useState } from 'react';
import {
  Download,
  FileArchive,
  FileSpreadsheet,
  FolderOpen,
  Pencil,
  Star,
  Trash2,
  X,
  Wand2,
  Sparkles,
  Film,
  FileCode,
  Image as ImageIcon,
  Video,
  Volume2,
  Code,
  ArrowUpRight,
  PenLine,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import type { LibraryAsset } from '../../types';
import { buildCsvContent, handleBulkExport } from '../metadata/export';
import { DEFAULT_PLATFORM, PLATFORM_ADAPTERS } from '../../modules/studio/registry/presets';
import Button from '../global/Button';
import Chip from '../global/Chip';
import GlassBadge from '../global/GlassBadge';

export interface GalleryDetailModalProps {
  asset: LibraryAsset | null;
  resolvedUrl?: string;
  favorite?: boolean;
  onClose: () => void;
  onDownload?: (asset: LibraryAsset) => void;
  onReveal?: (asset: LibraryAsset) => void;
  onToggleFavorite?: (asset: LibraryAsset) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onAnimate?: (assetId: string) => void;
  onVectorize?: (assetId: string) => void;
  onUpscale?: (assetId: string) => void;
  onEditMetadata?: (assetId: string) => void;
  persistent?: boolean;
}

function formatBytes(bytes?: string | number): string | null {
  if (bytes === undefined || bytes === null || bytes === '') return null;
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (Number.isNaN(n) || n <= 0) return typeof bytes === 'string' ? bytes : null;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function formatDateTime(value?: string | number): string | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

function getFormatPill(asset: LibraryAsset): string {
  if (asset.name.includes('.')) {
    const ext = asset.name.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) return ext;
  }
  return asset.type;
}

export default function GalleryDetailModal({
  asset,
  resolvedUrl,
  favorite = false,
  onClose,
  onDownload,
  onReveal,
  onToggleFavorite,
  onRename,
  onDelete,
  onAnimate,
  onVectorize,
  onUpscale,
  onEditMetadata,
  persistent = false,
}: GalleryDetailModalProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setRenaming(false);
    setDraftName(asset.name);
    setCopiedPrompt(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !renaming) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    if (!persistent) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      if (!persistent) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [asset, onClose, renaming, persistent]);

  if (!asset) return null;

  const stockMeta = asset.stockMetadata;
  const metaTitle = stockMeta && typeof stockMeta.title === 'string' ? stockMeta.title : null;
  const metaDescription = stockMeta && typeof stockMeta.description === 'string' ? stockMeta.description : null;
  const metaKeywords = stockMeta && Array.isArray(stockMeta.keywords)
    ? stockMeta.keywords.filter((k): k is string => typeof k === 'string')
    : [];
  const size = formatBytes(asset.fileSize);
  const created = formatDateTime(asset.createdAt);
  const formatPill = getFormatPill(asset);
  const isVector = asset.type === 'VECTOR';
  const isImage = asset.type === 'IMAGE';
  const isVideo = asset.type === 'VIDEO';
  const isAnimation = asset.type === 'ANIMATION';
  const isAudio = asset.type === 'AUDIO';
  const isUpscaled =
    asset.status === 'Upscaled' ||
    asset.sourceModule === 'UPSCALE' ||
    (asset.resolution && (asset.resolution.includes('4K') || asset.resolution.includes('3840')));

  const handleExportCsv = () => {
    const platform = (asset as any).platform || DEFAULT_PLATFORM;
    const csvContent = buildCsvContent([asset], platform);
    if (!csvContent) return;
    const adapter = PLATFORM_ADAPTERS[platform];
    const label = adapter?.label || platform;
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.replace(/\s+/g, '_')}_Metadata_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportZip = () => {
    handleBulkExport({ assets: [asset] });
  };

  const saveRename = () => {
    const next = draftName.trim();
    if (next && next !== asset.name) onRename?.(asset.id, next);
    setRenaming(false);
  };

  const handleCopyPrompt = () => {
    if (!asset.prompt) return;
    navigator.clipboard.writeText(asset.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div
      className={
        persistent
          ? 'w-[340px] shrink-0 h-full overflow-y-auto border-l border-[var(--border-structural)] bg-[var(--bg-panel)]'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 select-text'
      }
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail ${asset.name}`}
    >
      <div
        className={
          persistent
            ? 'w-full flex flex-col h-full bg-[var(--bg-panel)]'
            : 'w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl shadow-black/80 overflow-hidden'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Layer-3 Modal Header */}
        <div className="h-12 px-5 border-b border-[var(--border-structural)] flex items-center justify-between shrink-0 bg-[var(--bg-panel)] z-10 select-none">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider shrink-0">
              <Info className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span>Asset Details</span>
            </div>

            <div className="h-4 w-px bg-[var(--border-structural)] mx-1 shrink-0" />

            {renaming ? (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') setRenaming(false);
                  }}
                  className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] font-sans"
                />
                <Button size="xs" variant="primary" onClick={saveRename}>
                  Save
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] truncate" title={asset.name}>
                  {asset.name}
                </h3>
                {onRename && (
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                    title="Rename Asset"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-bold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded border border-[var(--accent-cyan)]/30">
              {formatPill}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Top Grid (Preview + Key Actions & Summary) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Media Staging Letterbox Preview */}
            <div className="md:col-span-6 flex flex-col space-y-2">
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-structural)] bg-[var(--bg-void)] flex items-center justify-center shadow-inner group">
                {resolvedUrl ? (
                  <img
                    src={resolvedUrl}
                    alt={asset.name}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-[var(--text-muted)] gap-2">
                    {isVector ? (
                      <FileCode className="w-16 h-16 text-[var(--module-studio-text)]" />
                    ) : isVideo || isAnimation ? (
                      <Video className="w-16 h-16 text-[var(--accent-success)]" />
                    ) : isAudio ? (
                      <Volume2 className="w-16 h-16 text-[var(--accent-warning)]" />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-[var(--text-muted)]" />
                    )}
                    <span className="font-mono text-xs">{formatPill} File</span>
                  </div>
                )}

                {/* Overlay Badges */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-white/10">
                  ID: #{asset.id.slice(-8)}
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-[var(--accent-cyan)] border border-white/10 font-bold">
                  {formatPill} {asset.resolution ? `• ${asset.resolution}` : ''}
                </div>
              </div>

              {/* Media Title & Specs bar */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] font-sans truncate max-w-[240px]">
                    {asset.name}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                    {asset.type} • {asset.resolution || (isVector ? 'Vector' : '1024 × 1024')} •{' '}
                    <span className="text-[var(--accent-cyan)] font-semibold">{size || '—'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Action Stack & Quick Specs */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-4">
              {/* Primary Action Buttons Grid */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {onDownload && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => onDownload(asset)}
                    >
                      Download Asset
                    </Button>
                  )}

                  {onReveal && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FolderOpen className="w-3.5 h-3.5" />}
                      onClick={() => onReveal(asset)}
                    >
                      Show in Folder
                    </Button>
                  )}
                </div>

                {/* Pipeline Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Upscale */}
                  {(isImage || isVector) && onUpscale && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent-telemetry-dark)]" />}
                      onClick={() => onUpscale(asset.id)}
                    >
                      Send to Upscale
                    </Button>
                  )}

                  {/* Vectorize */}
                  {isImage && onVectorize && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Sparkles className="w-3.5 h-3.5 text-[var(--module-studio-text)]" />}
                      onClick={() => onVectorize(asset.id)}
                    >
                      Vectorize SVG
                    </Button>
                  )}

                  {/* Animate */}
                  {isVector && onAnimate && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Film className="w-3.5 h-3.5 text-[var(--accent-error)]" />}
                      onClick={() => {
                        onAnimate(asset.id);
                        onClose();
                      }}
                    >
                      Animate Motion
                    </Button>
                  )}

                  {/* Favorite Toggle */}
                  {onToggleFavorite && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Star className={`w-3.5 h-3.5 ${favorite ? 'fill-[var(--accent-warning)] text-[var(--accent-warning)]' : ''}`} />}
                      onClick={() => onToggleFavorite(asset)}
                    >
                      {favorite ? 'Favorited' : 'Add to Favorites'}
                    </Button>
                  )}
                </div>

                {/* Metadata & Export Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {onEditMetadata && (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={<PenLine className="w-3.5 h-3.5" />}
                      onClick={() => onEditMetadata(asset.id)}
                    >
                      Edit Metadata
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="xs"
                    icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                    onClick={handleExportCsv}
                  >
                    Export CSV
                  </Button>

                  <Button
                    variant="secondary"
                    size="xs"
                    icon={<FileArchive className="w-3.5 h-3.5" />}
                    onClick={handleExportZip}
                  >
                    Export ZIP
                  </Button>
                </div>

                {/* Delete Button */}
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="xs"
                    fullWidth
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => onDelete(asset.id)}
                  >
                    Delete Asset
                  </Button>
                )}
              </div>

              {/* Quick Specs Overview Table */}
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-structural)] space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Asset Type</span>
                  <span className="text-[var(--text-primary)] font-semibold">{asset.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Source Module</span>
                  <span className="text-[var(--accent-cyan)] font-semibold">{asset.sourceModule || 'STUDIO'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Created Date</span>
                  <span className="text-[var(--text-secondary)]">{created || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-muted)]">Folder Path</span>
                  <span className="text-[var(--text-secondary)] truncate max-w-[160px]">{asset.folder || 'assets'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Synthesis Lineage Flow */}
          <div className="border-t border-[var(--border-structural)] pt-4 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--accent-indigo)]" />
                <span>Synthesis Lineage</span>
              </span>
              <span className="text-[var(--accent-cyan)] font-mono font-medium">
                {isUpscaled && isVector ? '3 Stages' : isUpscaled || isVector ? '2 Stages' : '1 Stage'}
              </span>
            </div>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-[var(--border-structural)] before:z-0 ml-1">
              {/* Stage 1: Created */}
              <div className="flex items-start gap-3 relative z-10">
                <span className="w-4 h-4 rounded-full bg-[var(--accent-cyan)] ring-4 ring-[var(--bg-panel)] flex items-center justify-center shrink-0 mt-0.5 shadow-xs" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">Created</span>
                    <span className="text-[10px] text-[var(--accent-cyan)] font-mono font-bold">
                      {asset.sourceModule || 'Studio'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                    {asset.settings?.style || 'Standard Generation'} • {asset.settings?.ratio || '1:1'} •{' '}
                    {asset.mimeType || 'image/png'}
                  </p>
                </div>
              </div>

              {/* Stage 2: Upscaled (if applicable) */}
              {isUpscaled && (
                <div className="flex items-start gap-3 relative z-10">
                  <span className="w-4 h-4 rounded-full bg-[var(--accent-action)] ring-4 ring-[var(--bg-panel)] flex items-center justify-center shrink-0 mt-0.5 shadow-xs" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">Upscaled</span>
                      <span className="text-[10px] text-[var(--accent-indicator)] font-mono font-bold">Upscale Pipeline</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      4X RealESRGAN Ultra • Super Resolution {asset.resolution || '4K'}
                    </p>
                  </div>
                </div>
              )}

              {/* Stage 3: Vectorized (if applicable) */}
              {isVector && (
                <div className="flex items-start gap-3 relative z-10">
                  <span className="w-4 h-4 rounded-full bg-[var(--module-studio)] ring-4 ring-[var(--bg-panel)] flex items-center justify-center shrink-0 mt-0.5 shadow-xs" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">Vectorized</span>
                      <span className="text-[10px] text-[var(--module-studio-text)] font-mono font-bold">VTracer Engine</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      VTracer Bezier Splines • Vector Infinite Scalable
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Section */}
          {asset.prompt && (
            <div className="border-t border-[var(--border-structural)] pt-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
                <span>Generation Prompt</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-[11px] text-[var(--accent-cyan)] hover:underline font-sans cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--accent-success)]" />
                      <span className="text-[var(--accent-success)]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
              <blockquote className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-structural)] text-[11px] text-[var(--text-secondary)] leading-relaxed font-mono select-text">
                "{asset.prompt}"
              </blockquote>
            </div>
          )}

          {/* Stock Metadata & Compliance Checklist */}
          {(metaTitle || metaDescription || metaKeywords.length > 0 || stockMeta?.stockCategory || stockMeta?.preflightDecision) && (
            <div className="border-t border-[var(--border-structural)] pt-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
                <span>Stock Metadata &amp; Compliance</span>
                {stockMeta?.preflightDecision && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      stockMeta.preflightDecision === 'ready' || stockMeta.preflightDecision === 'approved'
                        ? 'bg-[var(--accent-success-solid)]/10 text-[var(--accent-success)] border border-[var(--accent-success)]/40'
                        : stockMeta.preflightDecision === 'failed' || stockMeta.preflightDecision === 'rejected'
                        ? 'bg-[var(--accent-error-solid)]/10 text-[var(--accent-error)] border border-[var(--accent-error)]/40'
                        : 'bg-[var(--accent-warning-solid)]/10 text-[var(--accent-warning)] border border-[var(--accent-warning)]/40'
                    }`}
                  >
                    {stockMeta.preflightDecision === 'ready' || stockMeta.preflightDecision === 'approved' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {stockMeta.preflightDecision.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              {(metaTitle || metaDescription) && (
                <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-structural)] space-y-1.5">
                  {metaTitle && (
                    <div className="text-xs font-semibold text-[var(--text-primary)] font-sans">
                      {metaTitle}
                    </div>
                  )}
                  {metaDescription && (
                    <p className="text-[11px] text-[var(--text-secondary)] font-sans leading-relaxed">
                      {metaDescription}
                    </p>
                  )}
                </div>
              )}

              {/* Keywords Tag Cloud */}
              {metaKeywords.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                    Keywords ({metaKeywords.length})
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {metaKeywords.map((kw) => (
                      <Chip key={kw} label={kw} variant="meta" color="default" className="text-[10px]" />
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                {stockMeta?.stockCategory && (
                  <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-structural)]">
                    <div className="text-[9px] uppercase text-[var(--text-muted)]">Category</div>
                    <div className="font-semibold text-[var(--text-primary)] truncate mt-0.5">
                      {stockMeta.stockCategory}
                    </div>
                  </div>
                )}
                {stockMeta?.peopleRelease && stockMeta.peopleRelease !== 'not-applicable' && (
                  <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-structural)]">
                    <div className="text-[9px] uppercase text-[var(--text-muted)]">Model Release</div>
                    <div className="font-semibold text-[var(--text-primary)] truncate mt-0.5">
                      {stockMeta.peopleRelease}
                    </div>
                  </div>
                )}
                {stockMeta?.propertyRelease && stockMeta.propertyRelease !== 'not-applicable' && (
                  <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-structural)]">
                    <div className="text-[9px] uppercase text-[var(--text-muted)]">Property Release</div>
                    <div className="font-semibold text-[var(--text-primary)] truncate mt-0.5">
                      {stockMeta.propertyRelease}
                    </div>
                  </div>
                )}
                {stockMeta?.metadataSource && (
                  <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-structural)]">
                    <div className="text-[9px] uppercase text-[var(--text-muted)]">Source</div>
                    <div className="font-semibold text-[var(--accent-cyan)] truncate mt-0.5">
                      {stockMeta.metadataSource.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
