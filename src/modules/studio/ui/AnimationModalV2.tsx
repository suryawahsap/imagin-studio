// AnimationModalV2 — extracted dari App.tsx line 9677–9952.
// UI untuk Animation Engine V2: generate timeline animasi (AI clustering + labeling
// + planning) dari hasil SVG Trace tersimpan, preview via iframe, export ZIP.

import { Film, Loader2, Package, Sparkles, X } from "lucide-react";
import React from "react";
import type { Asset, SystemSettings } from "../types";
import { AssetPreviewImage } from "./components/AssetPreviewImage";
import {
    handleExportAnimV2Zip,
    resolveAnimationV2Assets,
    runAnimationV2Pipeline,
    saveAnimV2ToAsset,
    type AnimV2Progress,
    type AnimV2Result,
} from "../engines/animation-v2";

export interface AnimationModalV2Props {
    asset: Asset;
    assets: Asset[];
    onClose: () => void;
    aiConfig: SystemSettings["aiConfig"];
    onApiCall: () => void;
    setAssets: React.Dispatch<React.SetStateAction<any[]>>;
    showToast: (msg: string, type: string) => void;
}

export default function AnimationModalV2({
    asset,
    assets,
    onClose,
    aiConfig,
    onApiCall,
    setAssets,
    showToast,
}: AnimationModalV2Props) {
    const [customPrompt, setCustomPrompt] = React.useState('');
    const [result, setResult] = React.useState<AnimV2Result | null>(() => {
        // Restore dari asset kalau sudah pernah di-generate
        const a = asset as any;
        if (a.animV2LabeledSvg && a.animV2Package) {
            return {
                labeledSvg: a.animV2LabeledSvg,
                animPkg: a.animV2Package,
                labelResult: a.animV2LabelResult,
                previewHtml: a.animV2PreviewHtml,
                baseName: a.animV2BaseName || 'asset',
            };
        }
        return null;
    });
    const [loading, setLoading] = React.useState(false);
    const [progress, setProgress] = React.useState<AnimV2Progress | null>(null);
    const [exportLoading, setExportLoading] = React.useState(false);

    const assetTitle = asset?.stockMetadata?.title || asset?.title || 'Asset';

    const handleGenerate = async () => {
        if (loading) return;
        setLoading(true);
        setResult(null);
        setProgress({ pct: 0, label: 'Memulai pipeline…' });
        try {
            const res = await runAnimationV2Pipeline(
                asset,
                resolveAnimationV2Assets(asset, assets).sourceRasterAsset,
                assets,
                customPrompt.trim(),
                aiConfig,
                onApiCall,
                (p) => setProgress(p),
            );
            // Persist first, then expose preview
            await saveAnimV2ToAsset(asset, res, setAssets);
            setResult(res);
            showToast('Animasi siap! Preview & ZIP tersedia.', 'success');
        } catch (err: any) {
            console.error('[AnimV2] Generate gagal:', err);
            showToast('Generate animasi gagal: ' + (err?.message || 'Unknown error'), 'error');
        } finally {
            setLoading(false);
            setProgress(null);
        }
    };

    const handleDownloadZip = async () => {
        if (!result) return;
        setExportLoading(true);
        try {
            await handleExportAnimV2Zip(asset, result, showToast);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[85] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="max-w-5xl w-full bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--module-animation)]/15 text-[var(--mod-an-text)] flex items-center justify-center flex-shrink-0">
                            <Film className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-base leading-tight truncate">Animate — {assetTitle}</h3>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                                Hasil ZIP siap untuk Imagin Local · SVG artwork dipertahankan
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--bg-element)] transition-all flex-shrink-0"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">

                        {/* KIRI — PREVIEW */}
                        <div className="space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                                Preview Animasi
                            </div>

                            <div
                                className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] relative"
                                style={{ aspectRatio: '1 / 1' }}
                            >
                                {loading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-card)]">
                                        <Loader2 className="w-8 h-8 animate-spin text-[var(--mod-an-text)]" />
                                        <div className="text-center px-6">
                                            <div className="text-xs font-bold text-[var(--text-primary)] mb-1">
                                                {progress?.label || 'Memproses…'}
                                            </div>
                                            {progress && (
                                                <div className="w-48 h-1.5 bg-[var(--bg-element)] rounded-full overflow-hidden mx-auto">
                                                    <div
                                                        className="h-full bg-[var(--module-animation)] rounded-full transition-all duration-300"
                                                        style={{ width: `${progress.pct}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : result?.previewHtml ? (
                                    <iframe
                                        srcDoc={result.previewHtml}
                                        title="Animation Preview"
                                        className="w-full h-full border-0"
                                        sandbox="allow-scripts"
                                    />
                                ) : (
                                    <AssetPreviewImage
                                        src={asset.url || ''}
                                        alt={assetTitle}
                                        className="w-full h-full object-contain p-6"
                                    />
                                )}
                            </div>

                            {/* Info elemen */}
                            {result && (
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-element)] p-3 space-y-2">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                                        Elemen Terdeteksi
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.labelResult.elements.map((el: any) => (
                                            <span
                                                key={el.id}
                                                className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                                                title={`id: ${el.id}`}
                                            >
                                                {el.label}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-[9px] text-[var(--text-secondary)] font-mono">
                                        {result.animPkg.tracks.length} track · {(result.animPkg.emitters || []).length} emitter · {result.animPkg.totalDuration}ms
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* KANAN — KONTROL */}
                        <div className="space-y-4">

                            {/* Custom prompt */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-2 block">
                                    Deskripsi Animasi
                                </label>
                                <textarea
                                    value={customPrompt}
                                    onChange={e => setCustomPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 imagin-input text-xs font-mono leading-relaxed"
                                    placeholder={
                                        'Deskripsikan animasi yang kamu mau...\n\nContoh: "Roket meluncur ke atas, apinya berkobar-kobar, ada partikel angin menyapu dari kanan"\n\nAtau biarkan kosong untuk animasi otomatis sesuai aset.'
                                    }
                                />
                                <p className="text-[9px] text-[var(--text-secondary)] mt-1">
                                    Tulis dalam bahasa apa saja. AI akan menyesuaikan animasi berdasarkan aset dan deskripsimu.
                                </p>
                            </div>

                            {/* Info pipeline */}
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-element)] p-3 space-y-1.5">
                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2">
                                    Pipeline
                                </div>
                                {[
                                    { step: '1', label: 'SVG Trace', desc: resolveAnimationV2Assets(asset, assets).svgDataUrl ? 'Saved SVG Trace digunakan ' : 'Simpan hasil SVG Trace ke Galeri terlebih dahulu' },
                                    { step: '2', label: 'Clustering', desc: 'Kelompokkan path berdasarkan posisi' },
                                    { step: '3', label: 'AI Labeling', desc: 'Assign role semantik per cluster' },
                                    { step: '4', label: 'AI Planning', desc: 'Generate tracks + particle emitters' },
                                    { step: '5', label: 'Export ZIP', desc: 'scene.svg + animation.json + runtime.js' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-2">
                                        <span className="w-4 h-4 rounded-full bg-[var(--module-animation)]/20 text-[var(--mod-an-text)] text-[8px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {s.step}
                                        </span>
                                        <div>
                                            <span className="text-[10px] font-bold text-[var(--text-primary)]">{s.label}</span>
                                            <span className="text-[9px] text-[var(--text-secondary)] ml-1.5">{s.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Generate button */}
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-[var(--module-animation)] text-[var(--text-primary)] text-xs font-black flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {loading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress?.label || 'Memproses…'}</>
                                    : <><Sparkles className="w-4 h-4" /> {result ? 'Generate Ulang' : 'Generate Animasi'}</>
                                }
                            </button>

                            {/* Export ZIP */}
                            {result && (
                                <button
                                    onClick={handleDownloadZip}
                                    disabled={exportLoading}
                                    className="w-full py-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-black flex items-center justify-center gap-2 hover:border-[var(--module-animation)]/40 hover:text-[var(--mod-an-text)] transition-all disabled:opacity-50"
                                >
                                    {exportLoading
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat ZIP…</>
                                        : <><Package className="w-4 h-4" /> Download ZIP untuk Imagin Local</>
                                    }
                                </button>
                            )}

                            {/* ZIP contents info */}
                            {result && (
                                <div className="rounded-xl border border-dashed border-[var(--border-color)] p-3">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2">
                                        Isi ZIP
                                    </div>
                                    {[
                                        { file: 'scene.svg', desc: 'Artwork SVG dengan data-role labels' },
                                        { file: 'animation.json', desc: 'Timeline tracks + particle emitters' },
                                        { file: 'runtime.js', desc: 'ImaginAnimationRuntime v2 (no deps)' },
                                        { file: 'index.html', desc: 'Entry point untuk Imagin Local / Puppeteer' },
                                        { file: 'manifest.json', desc: 'Metadata aset & animasi' },
                                    ].map(f => (
                                        <div key={f.file} className="flex items-baseline gap-2 py-0.5">
                                            <span className="text-[9px] font-mono text-[var(--mod-an-text)] flex-shrink-0">{f.file}</span>
                                            <span className="text-[9px] text-[var(--text-secondary)]">{f.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
