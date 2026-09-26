// @ts-nocheck — live richer asset modal extracted verbatim from App.tsx.
import React from 'react';
import { AlertTriangle, ClipboardList, Copy, Download, Loader2, Maximize2, Palette, PenTool, RefreshCw, Sparkles, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { STATUS_CONFIG } from '../../registry/constants';
import { aspectRatioToCss } from '../../utils';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { useEscapeClose } from '../useEscapeClose';

export interface GridAssetModalProps { [key: string]: any }

export default function GridAssetModal({ gridModalAsset, setGridModalAsset, previewZoom, setPreviewZoom, metadataGenerating, metadataStep, metaFieldFromStep, copyToClipboard, megapixelsOf, getAssetFileSizeKB, formatFileSize, retryFailedAsset, genCtx, handleDownloadSingle, showToast, handleOpenAnimateForAsset, setAssets, runAutoPreflight, openRevisionModal, setPreflightState, confirmBlocking, deleteAsset, storageCtx, handleGenerateMetadata, metaCtx, onVectorize, onUpscale }: GridAssetModalProps) {
        useEscapeClose(Boolean(gridModalAsset), () => { setPreviewZoom(1); setGridModalAsset(null); }, () => Boolean(metadataGenerating || gridModalAsset?.isLoading || gridModalAsset?.isUpscaling));
        if (!gridModalAsset) return null;
        const asset = gridModalAsset;
        const sm = asset.stockMetadata || {};
        const statusCfg = STATUS_CONFIG[asset.status] || STATUS_CONFIG.draft;
        const isDraft = asset.status === 'draft' && asset.url && !asset.isLoading;

        // Wheel zoom pada area preview (sama seperti renderDetailModal)
        const clampZoom = z => Math.min(8, Math.max(1, z));
        const handleWheel = (e) => {
            if (e.deltaY < 0) setPreviewZoom(z => clampZoom(z + 0.4));
            else setPreviewZoom(z => clampZoom(z - 0.4));
        };

        return (
            <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setPreviewZoom(1); setGridModalAsset(null); }}>
                <div role="dialog" aria-modal="true" aria-labelledby="grid-asset-title" tabIndex={-1} className="max-w-6xl w-full bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]" onClick={e => e.stopPropagation()}>

                    {/* HEADER */}
                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <h3 id="grid-asset-title" className="font-black text-base truncate">{sm.title || asset.title || 'Untitled Asset'}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                        <button onClick={() => { setPreviewZoom(1); setGridModalAsset(null); }} className="p-2 rounded-lg hover:bg-[var(--bg-element)] transition-all flex-shrink-0" aria-label="Tutup modal">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                        {/* LEFT: Large preview */}
                        <div className="lg:w-3/5 flex-shrink-0 bg-[var(--bg-card)] border-b lg:border-b-0 lg:border-r border-[var(--border-color)] relative flex items-center justify-center p-4 min-h-[250px] lg:min-h-0">
                            {asset.isLoading || asset.isUpscaling ? (
                                <div className="flex flex-col items-center justify-center text-[var(--text-secondary)]">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <span className="text-xs font-bold">{asset.isUpscaling ? 'Upscaling…' : 'Rendering…'}</span>
                                </div>
                            ) : asset.status === 'FAILED' ? (
                                <div className="flex flex-col items-center justify-center text-[var(--accent-red)]">
                                    <AlertTriangle className="w-10 h-10 mb-2" />
                                    <span className="text-sm font-bold uppercase">Generation Failed</span>
                                </div>
                            ) : (
                                <div
                                    className={`w-full h-full relative overflow-hidden ${asset.background === 'transparent' ? 'bg-checkered' : 'bg-solid-white'}`}
                                    style={{ aspectRatio: aspectRatioToCss(asset.aspectRatio), maxHeight: '100%' }}
                                    onWheel={handleWheel}
                                    title="Scroll untuk zoom"
                                >
                                    <div className="w-full h-full flex items-center justify-center p-2" style={{ width: previewZoom > 1 ? `${100 * previewZoom}%` : '100%', height: previewZoom > 1 ? `${100 * previewZoom}%` : '100%' }}>
                                        <AssetPreviewImage
                                            src={asset.url}
                                            alt={sm.title || asset.title || 'Asset'}
                                            style={{ width: `${100 * previewZoom}%`, maxWidth: 'none' }}
                                            className="object-contain select-none"
                                            draggable={false}
                                        />
                                    </div>
                                </div>
                            )}
                            {/* Zoom controls — kiri bawah */}
                            {!asset.isLoading && !asset.isUpscaling && asset.status !== 'FAILED' && (
                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full p-1.5 shadow-xl">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(z => clampZoom(z - 0.4)); }}
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                                        title="Zoom out"
                                        aria-label="Zoom out"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(1); }}
                                        className="px-2.5 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white text-[10px] font-bold flex items-center justify-center transition-all min-w-[46px]"
                                        title="Reset zoom"
                                        aria-label="Reset zoom"
                                    >
                                        {Math.round(previewZoom * 100)}%
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(z => clampZoom(z + 0.4)); }}
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                                        title="Zoom in"
                                        aria-label="Zoom in"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Metadata + Actions */}
                        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[var(--bg-card)]">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                                {/* METADATA */}
                                <div className="space-y-3 text-sm">
                                                    {[
                                                        { key: 'title',       label: 'Title',       value: sm.title || asset.title || '',  color: 'text-[var(--text-primary)]' },
                                                        { key: 'description', label: 'Description', value: sm.description || '',           color: 'text-[var(--text-secondary)]' },
                                                        { key: 'keywords',    label: 'Keywords',    value: (sm.keywords || []).join(', '), color: 'text-[var(--text-secondary)]' },
                                                    ].map(({ key, label, value, color }) => {
                                                        const thisAssetProcessing = asset.status === 'processing' && metadataGenerating;
                                                        const isActiveField = thisAssetProcessing && metaFieldFromStep(metadataStep) === key;
                                                        const isPassiveField = thisAssetProcessing && !['title','description','keywords'].includes(metaFieldFromStep(metadataStep) || '');
                                                        const showSpinner = isActiveField || isPassiveField;
                                                        return (
                                                        <div key={label} className="flex items-start gap-2 group/row">
                                                            <span className="w-[80px] flex-shrink-0 font-bold text-[var(--text-secondary)] text-xs flex items-center gap-1.5">
                                                                {showSpinner && (
                                                                    <svg className="animate-spin w-3 h-3 text-[var(--accent-blue)] flex-shrink-0" viewBox="0 0 12 12" fill="none">
                                                                        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
                                                                        <path d="M10.5 6a4.5 4.5 0 0 0-4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                                                    </svg>
                                                                )}
                                                                {label}
                                                            </span>
                                                            <span className={`flex-1 font-medium leading-relaxed break-words text-xs ${color} ${!value ? 'opacity-40' : ''}`}>
                                                                {value || '—'}
                                                            </span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(value || '', label); }}
                                                                className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover/row:opacity-100 hover:bg-[var(--bg-element)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                                                title={`Copy ${label}`}
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        );
                                                    })}
                                    <div className="flex items-center gap-2">
                                        <span className="w-[80px] flex-shrink-0 font-bold text-[var(--text-secondary)] text-xs">Category</span>
                                        <span className="font-semibold text-xs text-[var(--accent-blue)]">
                                            {sm.stockCategory || asset.adobeCategory || 'Uncategorized'} {asset.subcategory ? `› ${asset.subcategory}` : ''}
                                        </span>
                                    </div>
                                     <div className="flex items-center gap-2">
                                         <span className="w-[80px] flex-shrink-0 font-bold text-[var(--text-secondary)] text-xs">Format</span>
                                         <span className="font-semibold text-xs text-[var(--text-primary)]">
                                             {asset.outputFormat || 'PNG'} · {asset.background === 'transparent' ? 'Transparent' : asset.background === 'scene' ? 'Scene' : 'White'} bg · {asset.style || asset.assetType || 'vector'}
                                         </span>
                                     </div>
                                     {(() => {
                                          const resW = asset?.resolution?.width || asset?.stockMetadata?.width || null;
                                          const resH = asset?.resolution?.height || asset?.stockMetadata?.height || null;
                                          const dimText = resW && resH ? `${resW} × ${resH} px` : null;
                                          const mpVal = resW && resH ? megapixelsOf(resW, resH) : (asset?.stockMetadata?.megapixels ?? null);
                                          const mpText = mpVal != null ? `${mpVal.toFixed(1)} MP` : null;
                                          const kb = getAssetFileSizeKB(asset);
                                          const sizeText = formatFileSize(kb);
                                          const dimMpText = dimText && mpText ? `${dimText} = ${mpText}` : (dimText || mpText);
                                          const techText = [dimMpText, sizeText].filter(Boolean).join(' · ');
                                          if (!techText) return null;
                                          return (
                                              <div className="flex items-center gap-2">
                                                  <span className="w-[80px] flex-shrink-0 font-bold text-[var(--text-secondary)] text-xs">Detail Teknis</span>
                                                  <span className="font-semibold text-xs text-[var(--text-primary)]">
                                                      {techText}
                                                  </span>
                                              </div>
                                          );
                                      })()}
                                     {sm.qualityScore?.overall !== undefined && (
                                         <div className="flex items-center gap-2">
                                            <span className="w-[80px] flex-shrink-0 font-bold text-[var(--text-secondary)] text-xs">Quality</span>
                                            <span className="font-extrabold text-sm text-[var(--accent-green)]">{sm.qualityScore.overall} / 100</span>
                                        </div>
                                    )}
                                </div>

                                {/* ACTIONS */}
                                {!asset.isLoading && !asset.isUpscaling && (asset.url || asset.status === 'FAILED') && (
                                    <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                                        <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Actions</div>
                                        {asset.status === 'FAILED' && (
                                            <div className="p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[10px] text-[var(--accent-red)] font-bold leading-relaxed">
                                                Generasi gagal (rate limit / filter). Retry untuk mencoba lagi dengan prompt yang sama.
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {asset.status === 'FAILED' && (
                                                <button onClick={(e) => { e.stopPropagation(); retryFailedAsset(asset, genCtx); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-all flex items-center gap-1.5"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                                                </button>
                                            )}
                                            {asset.url && (
                                                <button onClick={(e) => { handleDownloadSingle(asset, e, showToast); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-all flex items-center gap-1.5"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Download
                                                </button>
                                            )}
                                            {asset.libraryAssetId && (
                                                <button onClick={(e) => { e.stopPropagation(); setGridModalAsset(null); onVectorize([asset.id]); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs font-bold text-[var(--mod-st-text)] hover:border-[var(--module-studio)] transition-all flex items-center gap-1.5"
                                                >
                                                    <PenTool className="w-3.5 h-3.5" /> ⬡ Vectorize
                                                </button>
                                            )}
                                             {(asset.assetType === 'vector' || asset.assetType === 'illustration' || asset.assetType === 'icon' || asset.url) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setGridModalAsset(null); handleOpenAnimateForAsset(asset); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs font-bold text-[var(--mod-an-text)] hover:border-[var(--module-animation)] transition-all flex items-center gap-1.5"
                                                    title="Buat Animasi Structured SVG untuk aset ini"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" /> Animate
                                                </button>
                                             )}
                                            {asset.libraryAssetId && (
                                                <button onClick={(e) => { e.stopPropagation(); setGridModalAsset(null); onUpscale([asset.id]); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs font-bold text-[var(--accent-green)] hover:border-[var(--accent-green)] transition-all flex items-center gap-1.5"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5" /> ⬆ Upscale
                                                </button>
                                            )}
                                            {asset.url && (
                                                <button onClick={(e) => { openRevisionModal(asset, e); setGridModalAsset(null); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs font-bold text-[var(--accent-blue)] hover:border-[var(--accent-blue)] transition-all flex items-center gap-1.5"
                                                >
                                                    <Palette className="w-3.5 h-3.5" /> AI Revision
                                                </button>
                                            )}
                                            {asset.url && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setGridModalAsset(null); setPreflightState({ isOpen: true, asset }); }}
                                                    className="px-3 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs font-bold text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-all flex items-center gap-1.5"
                                                    title="Buka review metadata (lihat skor, issue, dan opsi regenerate)"
                                                >
                                                    <ClipboardList className="w-3.5 h-3.5" /> Review Metadata
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); confirmBlocking({
                                                title: 'Hapus Asset?',
                                                message: `Hapus asset "${sm.title || asset.title || 'Untitled'}" secara permanen? Tindakan ini tidak bisa dibatalkan.`,
                                                confirmLabel: 'Ya, Hapus',
                                                cancelLabel: 'Batal',
                                                onConfirm: async () => { await deleteAsset(asset.id, storageCtx); setGridModalAsset(null); }
                                            }); }}
                                                className="px-3 py-2 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-all flex items-center gap-1.5"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* GENERATE METADATA BUTTON */}
                                {isDraft && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleGenerateMetadata(asset, false, false, metaCtx); }}
                                        disabled={metadataGenerating}
                                        className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-card)] text-xs font-black flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                                        <span>Generate Metadata</span>
                                    </button>
                                )}
                                {!isDraft && asset.url && !asset.isLoading && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleGenerateMetadata(asset, true, false, metaCtx); }}
                                        disabled={metadataGenerating}
                                        className="w-full py-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-[var(--accent-gold)] text-xs font-black flex items-center justify-center gap-2 hover:border-[var(--accent-gold)] transition-all disabled:opacity-50"
                                        title="Jalankan ulang AI visual analysis + metadata + QA dari gambar yang sama"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                                        <span>Regenerate Metadata</span>
                                    </button>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
