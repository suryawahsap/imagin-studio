// @ts-nocheck
import React from 'react';
import { BadgeCheck, Check, Image, ImagePlus, Info, Layers, Loader2, Palette, RefreshCw, Save, Sparkles, Wand2, X } from 'lucide-react';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { useEscapeClose } from '../useEscapeClose';

export default function ObjectModifierModal({ objectModState, setObjectModState, handleReplicateAsset, handleApplyObjectMod, saveObjectModVariant }) {
    useEscapeClose(Boolean(objectModState.isOpen && objectModState.asset), () => { if (!objectModState.isReplicating && !objectModState.isGenerating) setObjectModState(p => ({ ...p, isOpen: false })); }, () => objectModState.isReplicating || objectModState.isGenerating);
    if (!objectModState.isOpen || !objectModState.asset) return null;
    const previewUrl = objectModState.step === 'modify' && objectModState.selectedVariantIdx >= 0
        ? (objectModState.variants[objectModState.selectedVariantIdx] || objectModState.replicatedUrl || objectModState.asset.url)
        : objectModState.step === 'modify'
        ? (objectModState.replicatedUrl || objectModState.asset.url)
        : objectModState.asset.url;
    return (
<div
                        className="fixed inset-0 z-[65] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => { if (!objectModState.isReplicating && !objectModState.isGenerating) setObjectModState(p => ({ ...p, isOpen: false })); }}
                    >
                        <div
                            role="dialog" aria-modal="true" aria-labelledby="object-modifier-title" tabIndex={-1} className="w-full max-w-5xl bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h3 id="object-modifier-title" className="font-black text-base flex items-center gap-2">
                                        <Wand2 className="w-5 h-5 text-[var(--accent-green)]" /> Object Modifier
                                    </h3>
                                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
                                        <span className={`flex items-center gap-1 font-bold ${objectModState.step === 'replicate' ? 'text-[var(--accent-gold)]' : 'text-[var(--accent-green)]'}`}>
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${objectModState.step === 'replicate' ? 'bg-[var(--accent-gold-solid)] text-white' : 'bg-[var(--accent-green-solid)] text-white'}`}>1</span>
                                            Replikasi
                                        </span>
                                        <span className="text-[var(--border-color)]">→</span>
                                        <span className={`flex items-center gap-1 font-bold ${objectModState.step === 'modify' ? 'text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] opacity-50'}`}>
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${objectModState.step === 'modify' ? 'bg-[var(--accent-blue-solid)] text-white' : 'bg-[var(--bg-element)] text-[var(--text-secondary)]'}`}>2</span>
                                            Modifikasi
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { if (!objectModState.isReplicating && !objectModState.isGenerating) setObjectModState(p => ({ ...p, isOpen: false })); }}
                                    disabled={objectModState.isReplicating || objectModState.isGenerating}
                                    className="p-2 rounded-lg hover:bg-[var(--bg-element)] transition-all disabled:opacity-40"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-[var(--bg-page)]">

                                {/* Row atas: Preview (kiri) + Controls (kanan) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                    {/* KIRI — Preview */}
                                    <div className="flex flex-col gap-2">
                                        <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                                            {objectModState.step === 'replicate' ? (
                                                <><Image className="w-3 h-3" /> Asset Original</>
                                            ) : objectModState.selectedVariantIdx >= 0 ? (
                                                <><Sparkles className="w-3 h-3 text-[var(--accent-green)]" /> Hasil Variasi {objectModState.selectedVariantIdx + 1}</>
                                            ) : (
                                                <><BadgeCheck className="w-3 h-3 text-[var(--accent-green)]" /> Hasil Replikasi</>
                                            )}
                                        </div>
                                        <div className="relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-solid-white flex items-center justify-center min-h-[220px] shadow-inner">
                                            <AssetPreviewImage src={previewUrl} alt="preview" className="w-full h-full object-contain p-2 max-h-[320px]" />
                                            {/* Badge step */}
                                            {objectModState.step === 'modify' && objectModState.selectedVariantIdx >= 0 && (
                                                <div className="absolute top-2 left-2 bg-[var(--accent-green-solid)] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                                    Variasi {objectModState.selectedVariantIdx + 1}
                                                </div>
                                            )}
                                        </div>
                                        {/* Label asset original kecil */}
                                        <div className="text-[9px] text-[var(--text-secondary)] truncate px-1">{objectModState.asset.title || objectModState.asset.baseTheme}</div>
                                    </div>

                                    {/* KANAN — Controls */}
                                    <div className="flex flex-col gap-4">

                                        {objectModState.step === 'replicate' ? (
                                            <div className="flex flex-col gap-3 h-full justify-center">
                                                <div className="p-4 rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
                                                    <div className="text-xs font-black text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                                                        <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> Step 1 — Replikasi Asset
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                                                        AI akan mereplikasi asset ini persis seperti aslinya. Ini memastikan sistem memahami komposisi, gaya, dan elemen visual sebelum modifikasi dilakukan.
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleReplicateAsset}
                                                    disabled={objectModState.isReplicating}
                                                    className="w-full py-3 bg-[var(--accent-gold-solid)] hover:opacity-90 text-white font-black rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                                                >
                                                    {objectModState.isReplicating
                                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Mereplikasi asset…</>
                                                        : <><RefreshCw className="w-4 h-4" /> Generate Sama Persis</>
                                                    }
                                                </button>
                                            </div>
                                        ) : (
                                            /* Modifikasi */
                                            <div className="flex flex-col gap-3">
                                                <div className="p-3 rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5">
                                                    <div className="text-[10px] font-black text-[var(--accent-green)] flex items-center gap-1.5 mb-0.5">
                                                        <BadgeCheck className="w-3.5 h-3.5" /> Replikasi selesai — siap dimodifikasi
                                                    </div>
                                                    <div className="text-[9px] text-[var(--text-secondary)]">Step 2: Masukkan instruksi untuk mengubah objek pada asset ini.</div>
                                                </div>

                                                {/* Edit Mode selector */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">Mode Edit</label>
                                                    <div className="flex bg-[var(--bg-element)] p-1 rounded-xl border border-[var(--border-color)]">
                                                        <button
                                                            onClick={() => setObjectModState(p => ({ ...p, editMode: 'repaint' }))}
                                                            disabled={objectModState.isGenerating}
                                                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${objectModState.editMode === 'repaint' ? 'bg-white text-[var(--accent-blue)] shadow' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                                                        >
                                                            <Palette className="w-3 h-3" /> Ubah Warna
                                                        </button>
                                                        <button
                                                            onClick={() => setObjectModState(p => ({ ...p, editMode: 'modify_objects' }))}
                                                            disabled={objectModState.isGenerating}
                                                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${objectModState.editMode === 'modify_objects' ? 'bg-white text-[var(--accent-green)] shadow' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                                                        >
                                                            <Layers className="w-3 h-3" /> Modifikasi Objek
                                                        </button>
                                                    </div>
                                                    <div className="text-[9px] text-[var(--text-secondary)] mt-1 px-1">
                                                        {objectModState.editMode === 'repaint'
                                                            ? 'Hanya ubah warna/pola — struktur & komposisi dikunci.'
                                                            : 'Tambah/hapus/ubah elemen — komposisi fleksibel.'}
                                                    </div>
                                                </div>

                                                {/* Instruction input */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">Instruksi Modifikasi</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={objectModState.instruction}
                                                            onChange={e => setObjectModState(p => ({ ...p, instruction: e.target.value }))}
                                                            onKeyDown={e => { if (e.key === 'Enter' && objectModState.instruction.trim()) handleApplyObjectMod(); }}
                                                            placeholder={objectModState.editMode === 'repaint'
                                                                ? 'e.g. Ubah warna baju jadi merah marun'
                                                                : 'e.g. Tambahkan topi di kepala karakter'}
                                                            disabled={objectModState.isGenerating}
                                                            className="flex-1 p-2.5 imagin-input text-xs font-medium"
                                                        />
                                                        <button
                                                            onClick={handleApplyObjectMod}
                                                            disabled={objectModState.isGenerating || !objectModState.instruction.trim()}
                                                            className="px-4 py-2.5 bg-[var(--accent-green-solid)] hover:opacity-90 text-white font-black rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 text-xs whitespace-nowrap"
                                                        >
                                                            {objectModState.isGenerating
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <Wand2 className="w-3.5 h-3.5" />
                                                            }
                                                            {objectModState.isGenerating ? 'Generating…' : 'Generate'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Row bawah — Grid variasi hasil (hanya muncul di step modify setelah ada variants) */}
                                {objectModState.step === 'modify' && (objectModState.variants.length > 0 || objectModState.isGenerating) && (
                                    <div>
                                        <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-[var(--accent-green)]" />
                                            {objectModState.isGenerating ? 'Sedang generate variasi…' : `${objectModState.variants.length} Variasi Hasil — klik untuk preview`}
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {objectModState.isGenerating ? (
                                                // Skeleton loading 3 card
                                                [0, 1, 2].map(i => (
                                                    <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-element)] flex flex-col items-center justify-center gap-2">
                                                        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-green)] opacity-60" />
                                                        <span className="text-[9px] text-[var(--text-secondary)] font-bold">Variasi {i + 1}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                objectModState.variants.map((variantUrl, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setObjectModState(p => ({ ...p, selectedVariantIdx: idx }))}
                                                        className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all group ${objectModState.selectedVariantIdx === idx
                                                            ? 'border-[var(--accent-green)] shadow-[0_0_0_3px_var(--accent-green)]/20 ring-1 ring-[var(--accent-green)]/30'
                                                            : 'border-[var(--border-color)] hover:border-[var(--accent-green)]/50'
                                                        }`}
                                                    >
                                                        <img src={variantUrl} alt={`Variasi ${idx + 1}`} className="w-full h-full object-contain bg-white p-1" />
                                                        {/* Badge variasi */}
                                                        <div className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${objectModState.selectedVariantIdx === idx ? 'bg-[var(--accent-green-solid)] text-white' : 'bg-black/50 text-white group-hover:bg-[var(--accent-green-solid)]'} transition-colors`}>
                                                            {idx + 1}
                                                        </div>
                                                        {/* Checkmark jika selected */}
                                                        {objectModState.selectedVariantIdx === idx && (
                                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--accent-green)] rounded-full flex items-center justify-center">
                                                                <Check className="w-2.5 h-2.5 text-white" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                        {objectModState.variants.length > 0 && (
                                            <div className="text-[9px] text-[var(--text-secondary)] mt-2 flex items-center gap-1">
                                                <Info className="w-3 h-3 flex-shrink-0" />
                                                Klik variasi untuk preview di atas. Bisa generate ulang dengan instruksi berbeda kapan saja.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0 space-y-3">
                                {objectModState.variants.length > 0 && objectModState.selectedVariantIdx >= 0 && (
                                    <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-element)] rounded-xl border border-[var(--border-color)]">
                                        <button onClick={() => setObjectModState(p => ({ ...p, saveMode: 'new' }))}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 ${objectModState.saveMode === 'new' ? 'bg-[var(--accent-green-solid)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                                            <ImagePlus className="w-3 h-3" /> Aset Baru
                                        </button>
                                        <button onClick={() => setObjectModState(p => ({ ...p, saveMode: 'overwrite' }))}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 ${objectModState.saveMode === 'overwrite' ? 'bg-[var(--accent-gold)] text-black shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                                            <RefreshCw className="w-3 h-3" /> Timpa Aset Ini
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => { if (!objectModState.isReplicating && !objectModState.isGenerating) setObjectModState(p => ({ ...p, isOpen: false })); }}
                                        disabled={objectModState.isReplicating || objectModState.isGenerating}
                                        className="px-4 py-2 rounded-xl font-bold text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-element)] transition-all disabled:opacity-40"
                                    >
                                        Tutup
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {/* Tombol generate ulang (step modify) */}
                                        {objectModState.step === 'modify' && objectModState.variants.length > 0 && (
                                            <button
                                                onClick={handleApplyObjectMod}
                                                disabled={objectModState.isGenerating || !objectModState.instruction.trim()}
                                                className="px-4 py-2 rounded-xl font-bold text-xs border border-[var(--border-color)] hover:bg-[var(--bg-element)] transition-all disabled:opacity-40 flex items-center gap-1.5"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" /> Generate Ulang
                                            </button>
                                        )}
                                        {/* Simpan ke library */}
                                        <button
                                            onClick={saveObjectModVariant}
                                            disabled={objectModState.variants.length === 0 || objectModState.selectedVariantIdx < 0 || objectModState.isGenerating}
                                            className={`px-5 py-2 rounded-xl font-black text-xs disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-1.5 ${objectModState.saveMode === 'overwrite' ? 'bg-[var(--accent-gold-solid)] text-black' : 'bg-[var(--accent-green-solid)] text-white'}`}
                                        >
                                            <Save className="w-3.5 h-3.5" />{objectModState.saveMode === 'overwrite' ? 'Timpa Aset Ini' : 'Simpan Aset Baru'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    );
}
