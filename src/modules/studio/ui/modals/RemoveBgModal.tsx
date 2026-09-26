// @ts-nocheck
import React from 'react';
import { BadgeCheck, CheckCircle2, Image, ImagePlus, Info, Loader2, RefreshCw, Save, ShieldCheck, Sparkles, X } from 'lucide-react';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { useEscapeClose } from '../useEscapeClose';

export default function RemoveBgModal({ removeBgState, setRemoveBgState, handleApplyRemoveBgSingle, handleSaveRemoveBgResult }) {
    useEscapeClose(removeBgState.isOpen, () => { if (!removeBgState.processing) setRemoveBgState(p => ({ ...p, isOpen: false, result: null })); }, () => removeBgState.processing);
    if (!removeBgState.isOpen) return null;
    return (
<div
                    className="fixed inset-0 z-[68] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
                    onClick={() => { if (!removeBgState.processing) setRemoveBgState(p => ({ ...p, isOpen: false, result: null })); }}
                >
                    <div
                        role="dialog" aria-modal="true" aria-labelledby="remove-bg-title" tabIndex={-1} className="w-full max-w-lg bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                            <div>
                                <h3 id="remove-bg-title" className="font-black text-sm flex items-center gap-2">
                                    <ImagePlus className="w-4 h-4 text-[var(--accent-green)]" />
                                    {removeBgState.mode === 'bulk' ? 'Remove Background — Bulk' : 'Remove Background'}
                                </h3>
                                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
                                    <Info className="w-3 h-3" /> Canvas lokal 3-layer
                                </div>
                            </div>
                            <button
                                onClick={() => { if (!removeBgState.processing) setRemoveBgState(p => ({ ...p, isOpen: false, result: null })); }}
                                disabled={removeBgState.processing}
                                className="p-1.5 rounded-lg hover:bg-[var(--bg-element)] transition-all disabled:opacity-40"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 flex flex-col gap-4">

                            {/* SINGLE mode */}
                            {removeBgState.mode === 'single' && removeBgState.asset && (
                                <>
                                    {/* Before / After preview */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Image className="w-3 h-3" /> Sebelum
                                            </div>
                                            <div className="aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] bg-white flex items-center justify-center">
                                                <AssetPreviewImage src={removeBgState.asset.url} alt="original" className="w-full h-full object-contain p-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-[var(--accent-green)]" /> Sesudah
                                            </div>
                                            <div className="aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] flex items-center justify-center relative"
                                                style={{ background: '#eef1f5' }}>
                                                {removeBgState.processing ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-sm">
                                                        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-green)]" />
                                                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">Menghapus background…</span>
                                                    </div>
                                                ) : removeBgState.result ? (
                                                    <img src={removeBgState.result} alt="result" className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                                                        <ImagePlus className="w-8 h-8 opacity-20" />
                                                        <span className="text-[9px] font-bold opacity-50">Klik tombol di bawah</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Asset info */}
                                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)]">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black text-[var(--text-primary)] truncate">{removeBgState.asset.title || removeBgState.asset.baseTheme || 'Asset'}</div>
                                            <div className="text-[9px] text-[var(--text-secondary)]">{removeBgState.asset.assetType} · {removeBgState.asset.outputFormat} · {removeBgState.asset.resolution?.width || '?'}×{removeBgState.asset.resolution?.height || '?'}</div>
                                        </div>
                                        {removeBgState.result && (
                                            <div className="text-[9px] font-black text-[var(--accent-green)] flex items-center gap-1">
                                                <BadgeCheck className="w-3.5 h-3.5" /> Siap disimpan
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* BULK mode */}
                            {removeBgState.mode === 'bulk' && (
                                <div className="flex flex-col gap-3">
                                    <div className="p-4 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-xs font-black text-[var(--text-primary)]">
                                                Progress Remove Background
                                            </div>
                                            <div className="text-xs font-bold text-[var(--accent-green)]">
                                                {removeBgState.progress.current}/{removeBgState.progress.total}
                                            </div>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-[var(--accent-green)] transition-all duration-500 rounded-full"
                                                style={{ width: `${removeBgState.progress.total > 0 ? (removeBgState.progress.current / removeBgState.progress.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div className="p-2 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 text-center">
                                                <div className="font-black text-[var(--accent-green)] text-base">{removeBgState.bulkDone}</div>
                                                <div className="text-[var(--text-secondary)] font-bold">Berhasil</div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-center">
                                                <div className="font-black text-[var(--accent-red)] text-base">{removeBgState.bulkFailed}</div>
                                                <div className="text-[var(--text-secondary)] font-bold">Gagal</div>
                                            </div>
                                        </div>
                                    </div>
                                    {removeBgState.processing && (
                                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-green)]" />
                                            <span>Memproses asset {removeBgState.progress.current + 1} dari {removeBgState.progress.total}…</span>
                                        </div>
                                    )}
                                    {!removeBgState.processing && removeBgState.progress.current > 0 && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--accent-green)]">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Selesai! {removeBgState.bulkDone} asset diperbarui langsung di library.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Info box */}
                            {!removeBgState.processing && !removeBgState.result && removeBgState.mode === 'single' && (
                                <div className="flex items-start gap-2 text-[9px] text-[var(--text-secondary)]">
                                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                                    <span>Menggunakan canvas lokal. Hasilnya baik untuk vector/icon dengan background solid.</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                            <button
                                onClick={() => { if (!removeBgState.processing) setRemoveBgState(p => ({ ...p, isOpen: false, result: null })); }}
                                disabled={removeBgState.processing}
                                className="px-4 py-2 rounded-xl font-bold text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-element)] transition-all disabled:opacity-40"
                            >
                                {removeBgState.mode === 'bulk' && !removeBgState.processing ? 'Tutup' : 'Batal'}
                            </button>

                            <div className="flex items-center gap-2">
                                {removeBgState.mode === 'single' && (
                                    <>
                                        {!removeBgState.result ? (
                                            <button
                                                onClick={handleApplyRemoveBgSingle}
                                                disabled={removeBgState.processing}
                                                className="px-5 py-2 rounded-xl font-black text-xs bg-[var(--accent-green-solid)] text-white disabled:opacity-50 hover:opacity-90 transition-all flex items-center gap-1.5"
                                            >
                                                {removeBgState.processing
                                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses…</>
                                                    : <><ImagePlus className="w-3.5 h-3.5" /> Hapus Background</>
                                                }
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={handleApplyRemoveBgSingle}
                                                    disabled={removeBgState.processing}
                                                    className="px-4 py-2 rounded-xl font-bold text-xs border border-[var(--border-color)] hover:bg-[var(--bg-element)] transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                                                </button>
                                                <button
                                                    onClick={handleSaveRemoveBgResult}
                                                    className="px-5 py-2 rounded-xl font-black text-xs bg-[var(--accent-green-solid)] text-white hover:opacity-90 transition-all flex items-center gap-1.5"
                                                >
                                                    <Save className="w-3.5 h-3.5" /> Simpan ke Asset
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                                {removeBgState.mode === 'bulk' && !removeBgState.processing && removeBgState.progress.current > 0 && (
                                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                                        Asset sudah tersimpan otomatis
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
    );
}
