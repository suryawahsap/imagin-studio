// @ts-nocheck
/**
 * Gallery Inspector — markup mengikuti design reference
 * (imagin_studio_gallery_module/code.html → data-purpose="inspector-panel"),
 * palet dinormalisasi ke token Studio. Dipasang sebagai panel kanan (docked)
 * sesuai mockup, dengan empty state saat belum ada aset dipilih.
 */
import React from 'react';
import type { LibraryAsset } from '../../../types';

export interface GalleryInspectorPanelProps {
  asset: LibraryAsset | null;
  resolvedUrl?: string;
  favorite?: boolean;
  onClose: () => void;
  onDownload?: (asset: LibraryAsset) => void;
  onReveal?: (asset: LibraryAsset) => void;
  onToggleFavorite?: (asset: LibraryAsset) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onVectorize?: (assetId: string) => void;
  onAnimate?: (assetId: string) => void;
  onUpscale?: (assetId: string) => void;
  onEditMetadata?: (assetId: string) => void;
}

function formatBytes(bytes?: string | number): string | null {
  if (bytes === undefined || bytes === null || bytes === '') return null;
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (Number.isNaN(n) || n <= 0) return null;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function formatDate(value?: string | number): string | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return null;
  }
}

const IconButton = ({ onClick, title, label, children }: any) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={label || title}
    className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800/50 transition cursor-pointer"
  >
    {children}
  </button>
);

export default function GalleryInspectorPanel({
  asset,
  resolvedUrl,
  favorite = false,
  onClose,
  onDownload,
  onReveal,
  onToggleFavorite,
  onRename,
  onDelete,
  onVectorize,
  onAnimate,
  onUpscale,
  onEditMetadata,
}: GalleryInspectorPanelProps) {
  const isVector = asset?.type === 'VECTOR';
  const isUpscaled = Boolean(
    asset?.status === 'Upscaled' ||
    asset?.sourceModule === 'UPSCALE' ||
    (typeof asset?.resolution === 'string' && asset.resolution.includes('4K'))
  );
  const resolution = typeof asset?.resolution === 'string' ? asset.resolution : asset?.resolution ? `${asset.resolution}` : null;
  const size = formatBytes(asset?.fileSize ?? asset?.size);
  const created = formatDate(asset?.createdAt);
  const settings = asset?.settings || {};

  const stages = [
    { key: 'created', label: 'Created', module: asset?.sourceModule || 'Studio', dot: 'bg-cyan-500', text: 'text-cyan-400', detail: [settings.model || asset?.generationModel, settings.steps ? `${settings.steps} Steps` : null, settings.cfgScale ? `CFG ${settings.cfgScale}` : null].filter(Boolean).join(' • ') || (asset?.prompt ? 'Prompt tersimpan' : 'Aset masuk library') },
    isUpscaled ? { key: 'upscaled', label: 'Upscaled', module: 'Upscale', dot: 'bg-blue-500', text: 'text-blue-400', detail: `4X RealESRGAN Ultra${resolution ? ` • ${resolution}` : ''}` } : null,
    isVector ? { key: 'vectorized', label: 'Vectorized', module: 'Vectorize', dot: 'bg-purple-500', text: 'text-purple-400', detail: 'VTracer Bezier Curves' } : null,
  ].filter(Boolean) as any[];

  const params = [
    { label: 'Seed', value: settings.seed ?? asset?.seed },
    { label: 'Model', value: settings.model || asset?.generationModel },
    { label: 'Aspect Ratio', value: asset?.aspectRatio || settings.aspectRatio },
    { label: 'Sampler', value: settings.sampler },
    { label: 'Source Module', value: asset?.sourceModule },
    { label: 'Date Added', value: created },
  ].filter(r => r.value !== undefined && r.value !== null && r.value !== '');

  return (
    <aside
      className="w-[300px] shrink-0 bg-[var(--bg-panel)] border-l border-[var(--border-structural)] flex flex-col overflow-hidden"
      aria-label="Asset details"
      data-purpose="inspector-panel"
    >
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-structural)] flex items-center justify-between shrink-0 bg-[var(--bg-panel)]">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Asset Details</span>
        </div>
        <div className="flex items-center gap-0.5">
          {asset && onToggleFavorite && (
            <IconButton onClick={() => onToggleFavorite(asset)} title={favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}>
              <svg className={`w-4 h-4 ${favorite ? 'text-amber-400' : ''}`} fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </IconButton>
          )}
          {asset && onRename && (
            <IconButton
              onClick={() => {
                const next = window.prompt('Nama baru:', asset.name || '');
                if (next && next.trim()) onRename(asset.id, next.trim());
              }}
              title="Ganti nama"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </IconButton>
          )}
          {asset && onDelete && (
            <IconButton onClick={() => onDelete(asset.id)} title="Hapus aset">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          )}
          <IconButton onClick={onClose} title="Bersihkan pilihan">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
      </div>

      {!asset ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text-muted)] px-6">
          <div className="w-12 h-12 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Belum ada aset dipilih</p>
          <p className="text-[11px] leading-relaxed">Klik salah satu aset di galeri untuk melihat detail, lineage, dan parameternya.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Preview */}
          <div className="space-y-2.5">
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-structural)] bg-[var(--bg-void)] shadow-md flex items-center justify-center">
              {resolvedUrl ? (
                <img src={resolvedUrl} alt={asset.name || 'asset'} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">preview tidak tersedia</span>
              )}
              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-white/10">
                #{String(asset.id || '').slice(-8)}
              </div>
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-cyan-400 border border-white/10">
                {(asset.mimeType || '').includes('svg') || isVector ? 'SVG' : ((asset.mimeType || '').includes('png') ? 'PNG' : (asset.type || 'FILE'))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-white tracking-tight truncate" title={asset.name}>
                {asset.name || 'Untitled'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {asset.type} {resolution ? `• ${resolution}` : ''} {size ? '•' : ''}{' '}
                {size && <span className="text-cyan-400 font-semibold">{size}</span>}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onDownload?.(asset)}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download</span>
              </button>
              <button
                onClick={() => onEditMetadata?.(asset.id)}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md bg-[#141b2b] hover:bg-[#202b3d] text-slate-200 border border-[#26354a] font-medium text-xs transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Metadata</span>
              </button>
            </div>
            <button
              onClick={() => onReveal?.(asset)}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-md bg-[#0e131f] hover:bg-[#192230] text-slate-400 hover:text-slate-200 border border-[#1f2838] text-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>Show in Folder</span>
            </button>

            {(isVector ? onVectorize !== undefined : false) || (asset.type === 'IMAGE' && (onUpscale || onVectorize)) ? (
              <div className="grid grid-cols-2 gap-2">
                {onUpscale && (asset.type === 'IMAGE' || asset.type === 'VECTOR') && (
                  <button
                    onClick={() => onUpscale(asset.id)}
                    className="py-1.5 rounded-md bg-[#0e131f] hover:bg-[#192230] text-slate-400 hover:text-slate-200 border border-[#1f2838] text-[11px] transition cursor-pointer"
                  >
                    Send to Upscale
                  </button>
                )}
                {onVectorize && asset.type === 'IMAGE' && (
                  <button
                    onClick={() => onVectorize(asset.id)}
                    className="py-1.5 rounded-md bg-[#0e131f] hover:bg-[#192230] text-slate-400 hover:text-slate-200 border border-[#1f2838] text-[11px] transition cursor-pointer"
                  >
                    Send to Vectorize
                  </button>
                )}
                {isVector && onAnimate && (
                  <button
                    onClick={() => onAnimate(asset.id)}
                    className="col-span-2 py-1.5 rounded-md bg-[#0e131f] hover:bg-[#192230] text-slate-400 hover:text-slate-200 border border-[#1f2838] text-[11px] transition cursor-pointer"
                  >
                    Send to Remotion
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* Synthesis Lineage */}
          <div className="border-t border-[#1e293b] pt-3.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              <span>Synthesis Lineage</span>
              <span className="text-cyan-500 font-mono font-medium">{stages.length} Stages</span>
            </div>
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-[#1c2637] before:z-0 ml-1">
              {stages.map(stage => (
                <div key={stage.key} className="flex items-start space-x-3 relative z-10">
                  <span className={`w-4 h-4 rounded-full ${stage.dot} ring-4 ring-[#07090e] shrink-0 mt-0.5`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{stage.label}</span>
                      <span className={`text-[10px] ${stage.text} font-mono`}>{stage.module}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={stage.detail}>{stage.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parameters */}
          {params.length > 0 && (
            <div className="border-t border-[#1e293b] pt-3.5 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Parameters &amp; Seed</div>
              <div className="space-y-1.5 text-[11px] font-mono">
                {params.map((row, i) => (
                  <div key={row.label} className={`flex justify-between py-1 ${i < params.length - 1 ? 'border-b border-[#121826]' : ''}`}>
                    <span className="text-slate-400">{row.label}</span>
                    <span className="text-slate-200 truncate max-w-[150px]" title={String(row.value)}>{String(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt */}
          {asset.prompt && (
            <div className="border-t border-[#1e293b] pt-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Generation Prompt</div>
              <blockquote className="p-2.5 rounded bg-[#101520] border border-[#1d2738] text-[11px] text-slate-300 leading-relaxed font-mono">
                {asset.prompt}
              </blockquote>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
