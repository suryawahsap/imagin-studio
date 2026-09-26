// @ts-nocheck — live preflight closure extracted from App.tsx.
import React from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, ClipboardList, Image, Loader2, PenTool, RefreshCw, Rocket, Save, ShieldCheck, Sparkles, X, XCircle } from 'lucide-react';
import { PREFLIGHT_ITEMS } from '../../engines/compliance';
import { saveAssetDB as persistAssetDB } from '../../engines/storage';
import { METADATA_RULES } from '../../registry/presets';
import { aspectRatioToCss } from '../../utils';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { useEscapeClose } from '../useEscapeClose';
import { applyPreflightQuickFixes } from '../preflight-autofix';

export interface PreflightModalProps {
    preflightState: any;
    closePreflightModal: () => void;
    countPreflightPassed: (...args: any[]) => any;
    evaluateMetadataStatus: (...args: any[]) => any;
    preflightEdit: any;
    preflightEditDirty: boolean;
    validateMetadataCompliance: (...args: any[]) => any;
    saveAssetDB: (...args: any[]) => any;
    setAssets: any;
    selectedAssetDetail: any;
    setSelectedAssetDetail: any;
    setPreflightState: any;
    setPreflightEditDirty: any;
    showToast: (...args: any[]) => any;
    renderStatusBadge: (...args: any[]) => any;
    handleGenerateMetadata: (...args: any[]) => any;
    metaCtx: any;
    metadataGenerating: boolean;
    setGridModalAsset: any;
    openRevisionModal: (...args: any[]) => any;
    metadataStep: number;
    metaStepLabel: (...args: any[]) => any;
    metaFieldFromStep: (...args: any[]) => any;
    handleRegenField: (...args: any[]) => any;
    regenField: any;
    setPreflightEdit: any;
    highlightMetadataIssues: (...args: any[]) => any;
    normalizeMetadataKeyword: (...args: any[]) => any;
    spamTerms: string[];
    metadataNewsMarkers: string[];
    brandIpBlocklist: string[];
    governmentAgencyBlocklist: string[];
    megapixelsOf: (...args: any[]) => any;
    getAssetFileSizeKB: (...args: any[]) => any;
    formatFileSize: (...args: any[]) => any;
    submittableFromExport: string[];
    markAsSubmitted: (...args: any[]) => any;
    storageCtx: any;
    confirmBlocking: (...args: any[]) => any;
    markRejectedByAdobe: (...args: any[]) => any;
    setBlockingDialog: any;
    markSold: (...args: any[]) => any;
}

export default function PreflightModal({
    preflightState, closePreflightModal, countPreflightPassed, evaluateMetadataStatus,
    preflightEdit, preflightEditDirty, validateMetadataCompliance, saveAssetDB, setAssets,
    selectedAssetDetail, setSelectedAssetDetail, setPreflightState, setPreflightEditDirty,
    showToast, renderStatusBadge, handleGenerateMetadata, metaCtx, metadataGenerating,
    setGridModalAsset, openRevisionModal, metadataStep, metaStepLabel, metaFieldFromStep,
    handleRegenField, regenField, setPreflightEdit, highlightMetadataIssues,
    normalizeMetadataKeyword, spamTerms, metadataNewsMarkers, brandIpBlocklist,
    governmentAgencyBlocklist, megapixelsOf, getAssetFileSizeKB, formatFileSize,
    submittableFromExport, markAsSubmitted, storageCtx, confirmBlocking,
    markRejectedByAdobe, setBlockingDialog, markSold,
}: PreflightModalProps) {
        useEscapeClose(Boolean(preflightState.isOpen && preflightState.asset), closePreflightModal, () => Boolean(metadataGenerating));
        if (!preflightState.isOpen || !preflightState.asset) return null;
        const asset = preflightState.asset;
        const sm = asset.stockMetadata || {};
        const checks = sm.preflightChecks || {};
        const totalChecks = PREFLIGHT_ITEMS.length;
        const passedChecks = countPreflightPassed({ ...checks, aiDeclared: true }, sm);
        const allPassed = passedChecks === totalChecks;
        const progressPct = Math.round((passedChecks / totalChecks) * 100);

        const decision = sm.preflightDecision || (allPassed ? 'pass' : (passedChecks >= Math.ceil(totalChecks * 0.7) ? 'needs_review' : 'fail'));
        const decisionLabel = decision === 'pass' ? 'PASSED' : decision === 'needs_review' ? 'NEEDS REVIEW' : 'REJECTED';
        const decisionColor = decision === 'pass' ? 'text-[var(--accent-green)]' : decision === 'needs_review' ? 'text-[var(--accent-gold)]' : 'text-[var(--accent-red)]';

        const qs = sm.qualityScore || {};
        const hasQualityScore = qs.overall > 0;

        const edit = preflightEdit.assetId === asset.id
            ? preflightEdit
            : { assetId: asset.id, title: sm.title || asset.title || '', description: sm.description || '', keywords: (sm.keywords || []).join(', ') };
        const isEditDirty = preflightEdit.assetId === asset.id && preflightEditDirty;
        const applyAllFixes = () => {
            const issues = [
                ...(Array.isArray(sm.preflightIssues) ? sm.preflightIssues : []),
                ...Object.values(sm.preflightIssueCategories || {}).flatMap(v => Array.isArray(v) ? v : []),
            ].map(String);
            const result = applyPreflightQuickFixes(edit, [...new Set(issues)]);
            setPreflightEdit(() => ({ ...result.draft, assetId: asset.id }));
            setPreflightEditDirty(true);
            showToast(`${result.manual} perlu tindakan manual`, result.manual ? 'info' : 'success');
        };
        const savePreflightEdits = async () => {
            const keywordList = edit.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 50);
            // Validasi singkat: metadata manual yang baik harus punya title +
            // description + keywords minimum. Kalau ya, asset yang tadinya
            // rejected/needs_review naik ke metadata_ready (perbaikan manual
            // benar-benar membuka kunci status — bukan sekadar menyimpan teks).
            const titleOk = edit.title.trim().length >= METADATA_RULES.title.MIN_LEN;
            const descOk = edit.description.trim().length >= 30;
            const kwOk = keywordList.length >= METADATA_RULES.keywords.MIN_COUNT;
            // Validasi compliance metadata FINAL (konsisten dengan
            // applyMetadataFieldUpdate): edit manual dengan brand/IP/news/spam
            // TIDAK boleh unlock ke metadata_ready — hard gate Adobe tetap berlaku.
            const compliance = (titleOk && descOk && kwOk)
                ? validateMetadataCompliance({ title: edit.title.trim(), description: edit.description.trim(), keywords: keywordList })
                : null;
            const complianceCritical = compliance ? compliance.issues.some(i => i.severity === 'critical') : false;
            const existingIssues = [ ...(Array.isArray(sm.preflightIssues) ? sm.preflightIssues : []), ...Object.values(sm.preflightIssueCategories || {}).flatMap(v => Array.isArray(v) ? v : []) ].map(String).join(' ').toLowerCase();
            // PERBAIKAN: saat evaluasi setelah edit manual, JANGAN mewarisi
            // watermark block dari preflightIssues lama (bisa false-positive
            // dari canvas heuristic). Watermark hanya jadi hard block jika
            // AI secara eksplisit menandai (checks.noWatermark === false).
            // Issue lain (blur, duplicate, semantic mismatch) tetap diperiksa.
            const existingIssuesNoWatermark = existingIssues.replace(/watermark[^;.\n]*/gi, '').trim();
            const aiWatermarkBlocked = sm.preflightChecks?.noWatermark === false && Boolean(sm.evidence?.contentSafetyBasis || sm.preflightIssues?.some(i => /AI.*watermark|watermark.*AI|visibleWatermark/i.test(String(i))));
            const statusResult = evaluateMetadataStatus({
                analysisAvailable: Boolean(sm.evidence && typeof sm.evidence === 'object' && [sm.evidence.titleBasis, sm.evidence.keywordBasis, sm.evidence.categoryBasis].some(value => Array.isArray(value) && value.length > 0)),
                title: edit.title.trim(), description: edit.description.trim(), keywords: keywordList,
                categoryValid: Boolean(sm.stockCategory || asset.adobeCategory || asset.platformCategoryId != null),
                hardBlocks: [complianceCritical, /semantic mismatch|wrong subject|category quality reject|content safety reject|\b(?:brand|trademark|ip risk|copyright)\b|\bduplicate\b|near[- ]duplicate|\bblur(?:red)?\b|critical metadata compliance/i.test(existingIssuesNoWatermark), aiWatermarkBlocked, sm.ipRisk?.recommendation === 'block' || sm.ipRisk?.recommendation === 'regenerate'],
            });
            const manualFixPasses = statusResult.status === 'metadata_ready';
            const nextStatus = ['exported', 'submitted'].includes(asset.status) ? asset.status : statusResult.status;
            const updatedAsset = {
                ...asset,
                title: edit.title.trim() || asset.title,
                status: nextStatus,
                stockMetadata: {
                    ...sm,
                    title: edit.title.trim() || sm.title || '',
                    description: edit.description.trim(),
                    keywords: keywordList,
                    // Jejak perbaikan manual: manualFixedAt + preflightDecision
                    // disinkronkan supaya UI/gallery menampilkan status benar.
                    manualFixedAt: Date.now(),
                    preflightDecision: manualFixPasses ? 'pass' : sm.preflightDecision,
                    ...(compliance && compliance.issues.length > 0 ? {
                        preflightIssues: [
                            ...(sm.preflightIssues || []).filter(i => !/compliance|brand|news|spam|metadata/i.test(String(i))),
                            ...compliance.issues.map(i => `Metadata compliance: ${i.message}`),
                        ],
                    } : {}),
                    ...(manualFixPasses
                        ? {
                            preflightIssues: (sm.preflightIssues || []).filter(i => !/semantic|compliance|diversity|title|keyword|description|metadata/i.test(String(i))),
                            // Sinkronkan kategori: hapus kategori metadata (sudah
                            // diperbaiki manual); image/content tetap karena itu
                            // masalah gambar yang tidak berubah.
                            preflightIssueCategories: (() => {
                                const c = sm.preflightIssueCategories || { image: [], metadata: [], content: [] };
                                return { ...c, metadata: [] };
                            })(),
                        }
                        : {}),
                }
            };
            await saveAssetDB(updatedAsset);
            setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
            if (selectedAssetDetail?.id === asset.id) setSelectedAssetDetail(updatedAsset);
            // FIX: refresh modal preflight supaya status/metadata baru langsung tampil.
            if (preflightState.asset?.id === asset.id) setPreflightState({ ...preflightState, asset: updatedAsset });
            setPreflightEditDirty(false);
            showToast(manualFixPasses
                ? 'Metadata manual disimpan — asset kini Metadata Ready '
                : 'Metadata manual disimpan. (Title/deskripsi/keyword belum cukup untuk unlock — cek checklist.)', 'success');
        };

        return (
            <div className="fixed inset-0 z-[75] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => closePreflightModal()}>
                <div role="dialog" aria-modal="true" aria-labelledby="preflight-title" tabIndex={-1} className="max-w-5xl w-full bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]" onClick={e => e.stopPropagation()}>

                    {/* HEADER */}
                    <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${decision === 'pass' ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' : decision === 'needs_review' ? 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'}`}>
                                {decision === 'pass' ? <BadgeCheck className="w-5 h-5" /> : decision === 'needs_review' ? <AlertTriangle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                                <h3 id="preflight-title" className="font-black text-base leading-tight truncate">{sm.title || asset.title || 'Metadata Review'}</h3>
                                <p className="text-[10px] text-[var(--text-secondary)] font-medium">Adobe Stock metadata + quality evaluation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {renderStatusBadge(asset, 'md')}
                            <button onClick={() => closePreflightModal()} className="p-2 rounded-lg hover:bg-[var(--bg-element)] transition-all" aria-label="Tutup review metadata">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* ── VERDICT + PREVIEW ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-5">
                            {/* Preview */}
                            <div className="lg:col-span-2 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center p-3" style={{ aspectRatio: asset.aspectRatio ? aspectRatioToCss(asset.aspectRatio) : '4/3', maxHeight: '300px' }}>
                                {asset.url ? (
                                    <AssetPreviewImage src={asset.url} alt={sm.title || asset.title || 'Preview'} className="w-full h-full object-contain" />
                                ) : (
                                    <AlertTriangle className="w-8 h-8 text-[var(--accent-red)]" />
                                )}
                            </div>

                            {/* Verdict */}
                            <div className="lg:col-span-3 flex flex-col gap-3">
                                <div className={`rounded-xl border p-4 ${decision === 'pass' ? 'border-[var(--accent-green)]/40 bg-[var(--accent-green)]/5' : decision === 'needs_review' ? 'border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/5' : 'border-[var(--accent-red)]/40 bg-[var(--accent-red)]/5'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">AI Evaluation</span>
                                        <span className={`text-sm font-black ${decisionColor}`}>{decisionLabel}</span>
                                    </div>
                                    <div className="flex items-end justify-between mt-2">
                                        <div>
                                            <div className="text-3xl font-black leading-none">{sm.preflightScore || 0}<span className="text-sm text-[var(--text-secondary)] font-bold">/100</span></div>
                                            <div className="text-[10px] text-[var(--text-secondary)] font-medium mt-1">{passedChecks}/{totalChecks} checks lolos</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {sm.acceptancePrediction != null && (
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${sm.acceptancePrediction >= 80 ? 'border-[var(--accent-green)]/40 text-[var(--accent-green)] bg-[var(--accent-green)]/10' : sm.acceptancePrediction >= 60 ? 'border-[var(--accent-gold)]/40 text-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--accent-red)]/40 text-[var(--accent-red)] bg-[var(--accent-red)]/10'}`}>
                                                    Acceptance {sm.acceptancePrediction}%
                                                </span>
                                            )}
                                            {qs.overall > 0 && (
                                                <span className="text-[10px] font-black px-2 py-1 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)]">
                                                    Quality {qs.overall}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-element)] rounded-full overflow-hidden mt-3">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${decision === 'pass' ? 'bg-[var(--accent-green)]' : decision === 'needs_review' ? 'bg-[var(--accent-gold)]' : 'bg-[var(--accent-red)]'}`}
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Issues / passing note */}
                                {(() => {
                                    // Kategorikan alasan: kelompokkan preflightIssues / preflightIssueCategories
                                    // menjadi 5 sub-kategori aksi yang jelas & tidak ambigu untuk user.
                                    const allIssues = (sm.preflightIssues || []).map(i => String(i));
                                    const ipElements = (sm.ipRisk?.elements || []).map(el => `IP/Brand Risk: ${el}`);

                                    const groups = {
                                        metadata: [] as string[],
                                        image: [] as string[],
                                        analysis: [] as string[],
                                        compliance: [] as string[],
                                        review: [] as string[]
                                    };

                                    allIssues.forEach(iss => {
                                        if (/analysis pipeline completely failed|failed to analyze|analisis visual gagal|gagal dianalisis|ai visual analysis failed/i.test(iss)) {
                                            groups.analysis.push(iss);
                                        } else if (/IP risk|trademark|brand|merek|logo|editorial|news-event|sensitive|violent|graphic|adult|hate|compliance critical/i.test(iss)) {
                                            groups.compliance.push(iss);
                                        } else if (/sharpness|blur|soft|watermark|artifact|resolution|file size|duplicate|similar|fidelity|semantic mismatch|wrong subject|profile/i.test(iss)) {
                                            groups.image.push(iss);
                                        } else if (/title|keyword|description|metadata|compliance|news|spam|diversity/i.test(iss)) {
                                            groups.metadata.push(iss);
                                        } else {
                                            groups.review.push(iss);
                                        }
                                    });

                                    // Tambahkan IP risk elements ke compliance jika belum tercantum
                                    ipElements.forEach(ip => {
                                        if (!groups.compliance.includes(ip)) groups.compliance.push(ip);
                                    });

                                    const hasIssue = groups.metadata.length > 0 || groups.image.length > 0 || groups.analysis.length > 0 || groups.compliance.length > 0 || groups.review.length > 0;

                                    if (!hasIssue) {
                                        return (
                                            <div className="rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 p-4 flex-1 flex items-center gap-2.5">
                                                <BadgeCheck className="w-5 h-5 text-[var(--accent-green)] flex-shrink-0" />
                                                <span className="text-xs font-bold text-[var(--accent-green)]">Semua pemeriksaan lolos — metadata siap dikirim.</span>
                                            </div>
                                        );
                                    }

                                    const CatBlock = ({ title, items, color, icon, actionText, isImage, isRegenMeta, isRetryAnalysis }) => items.length === 0 ? null : (
                                        <div className="rounded-lg border p-2.5 bg-[var(--bg-card)]/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${color}`}>
                                                    <span>{icon}</span> {title} <span className="text-[9px] opacity-70">({items.length})</span>
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {isRegenMeta && asset.status !== 'submitted' && asset.url && (
                                                        <button
                                                            onClick={() => handleGenerateMetadata(asset, true, false, metaCtx)}
                                                            disabled={metadataGenerating}
                                                            className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--accent-gold)] text-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            <RefreshCw className="w-2.5 h-2.5" /> Regenerate Metadata
                                                        </button>
                                                    )}
                                                    {isImage && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); closePreflightModal(); setGridModalAsset(null); openRevisionModal(asset, e); }}
                                                            className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 hover:bg-[var(--accent-blue-solid)] hover:text-white transition-colors"
                                                        >
                                                            AI Edit Gambar
                                                        </button>
                                                    )}
                                                    {isRetryAnalysis && asset.status !== 'submitted' && asset.url && (
                                                        <button
                                                            onClick={() => handleGenerateMetadata(asset, true, false, metaCtx)}
                                                            disabled={metadataGenerating}
                                                            className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--accent-gold)] text-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            <RefreshCw className="w-2.5 h-2.5" /> Analisis Ulang
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-[9.5px] font-semibold text-[var(--text-secondary)] mb-1.5 leading-snug">{actionText}</div>
                                            <ul className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                                {items.map((iss, idx) => {
                                                    const issStr = String(iss);
                                                    const isCanvasWatermarkFP = /watermark/i.test(issStr) && !/AI.*watermark|visibleWatermark|AI signal/i.test(issStr);
                                                    return (
                                                        <li key={`${title}-${idx}`} className="text-[10px] text-[var(--text-primary)] leading-snug flex items-start gap-1.5 flex-wrap">
                                                            <span className="text-[var(--accent-red)] font-black mt-px">•</span>
                                                            <span className="flex-1">{iss}</span>
                                                            {isCanvasWatermarkFP && (
                                                                <button
                                                                    onClick={() => {
                                                                        setAssets(prev => prev.map(a => {
                                                                            if (a.id !== asset.id) return a;
                                                                            const nextSm = { ...(a.stockMetadata || {}) };
                                                                            nextSm.preflightIssues = (nextSm.preflightIssues || []).filter(i => !/watermark/i.test(String(i)));
                                                                            if (nextSm.preflightIssueCategories?.image) {
                                                                                nextSm.preflightIssueCategories = { ...nextSm.preflightIssueCategories, image: nextSm.preflightIssueCategories.image.filter(i => !/watermark/i.test(String(i))) };
                                                                            }
                                                                            nextSm.preflightChecks = { ...(nextSm.preflightChecks || {}), noWatermark: true };
                                                                            const updated = { ...a, stockMetadata: nextSm };
                                                                            void persistAssetDB(updated);
                                                                            return updated;
                                                                        }));
                                                                        showToast('Watermark false positive dihapus dari issue list.', 'success');
                                                                    }}
                                                                    className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/30 transition-colors whitespace-nowrap flex-shrink-0"
                                                                    title="Abaikan warning watermark ini — false positive dari canvas heuristic pada ilustrasi detail"
                                                                >
                                                                    Abaikan (false positive)
                                                                </button>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );

                                    return (
                                        <div className="rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--bg-element)] p-3.5 flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[280px]">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5 flex-shrink-0">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Catatan Preflight & Hasil Evaluasi
                                            </div>

                                            <CatBlock
                                                title="Masalah Metadata"
                                                items={groups.metadata}
                                                color="text-[var(--accent-gold)]"
                                                icon={<ClipboardList className="w-3 h-3" />}
                                                actionText="Perbaiki teks di editor di bawah lalu 'Save Edits', atau klik 'Regenerate Metadata'."
                                                isRegenMeta
                                            />

                                            <CatBlock
                                                title="Masalah Visual Gambar"
                                                items={groups.image}
                                                color="text-[var(--accent-red)]"
                                                icon={<Image className="w-3 h-3" />}
                                                actionText="Perhatian: Regenerate metadata TIDAK AKAN memperbaiki gambar. Gunakan tombol 'AI Edit Gambar' untuk merevisi visual."
                                                isImage
                                            />

                                            <CatBlock
                                                title="Kegagalan Analisis AI"
                                                items={groups.analysis}
                                                color="text-[var(--accent-gold)]"
                                                icon={<RefreshCw className="w-3 h-3" />}
                                                actionText="Analisis AI sebelumnya gagal/terputus. Klik 'Analisis Ulang' untuk mencoba ulang proses evaluasi."
                                                isRetryAnalysis
                                            />

                                            <CatBlock
                                                title="IP / Brand / Content Blocker"
                                                items={groups.compliance}
                                                color="text-[var(--accent-red)]"
                                                icon={<ShieldCheck className="w-3 h-3" />}
                                                actionText="Aset diblokir karena hak cipta/merek/konten. Gunakan AI Edit Gambar untuk menghapus elemen bermerek atau perbaiki teks metadata di bawah."
                                                isImage
                                                isRegenMeta
                                            />

                                            <CatBlock
                                                title="Verifikasi Manual"
                                                items={groups.review}
                                                color="text-[var(--accent-gold)]"
                                                icon={<AlertTriangle className="w-3 h-3" />}
                                                actionText="Pemeriksaan memerlukan verifikasi manual dari pengguna sebelum diunggah."
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* ── EDITOR METADATA ── */}
                        <div className="px-5 pb-5">
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                                <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-element)] flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <PenTool className="w-3.5 h-3.5" /> Edit Metadata
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={applyAllFixes} disabled={metadataGenerating} className="px-3 py-1.5 rounded-lg border border-[var(--accent-gold)]/50 text-[var(--accent-gold)] text-[10px] font-black hover:bg-[var(--accent-gold)]/10 transition-all disabled:opacity-50">
                                            Perbaiki Semua
                                        </button>
                                        {metadataGenerating && (
                                            <span className="inline-flex items-center gap-1.5 text-[var(--accent-blue)] text-[10px] font-black px-2 py-1 rounded-lg bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/30 animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" /> {metaStepLabel(metadataStep)}
                                            </span>
                                        )}
                                        {asset.status !== 'submitted' && asset.url && (
                                            <button
                                                onClick={() => handleGenerateMetadata(asset, true, false, metaCtx)}
                                                disabled={metadataGenerating}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--accent-gold)] text-black text-[10px] font-black hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                title="Jalankan ulang AI visual analysis + metadata + QA dari gambar yang sama"
                                            >
                                                <RefreshCw className="w-3 h-3" /> {metadataGenerating ? 'Memproses…' : 'Regenerate Metadata'}
                                            </button>
                                        )}
                                        {isEditDirty && (
                                            <button onClick={savePreflightEdits} className="px-3 py-1.5 rounded-lg bg-[var(--accent-green-solid)] text-white text-[10px] font-black hover:opacity-90 transition-all flex items-center gap-1.5">
                                                <Save className="w-3 h-3" /> Save Edits
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 space-y-3.5">
                                    {/* Title */}
                                    <div className={`rounded-lg border transition-all ${metadataGenerating && metaFieldFromStep(metadataStep) === 'title' ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/5 p-1.5' : 'border-transparent'}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                                                Stock Title
                                                <button
                                                    onClick={() => handleRegenField('title', metaCtx)}
                                                    disabled={metadataGenerating || !!regenField}
                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 transition-all disabled:opacity-40 ${
                                                        regenField === 'title'
                                                            ? 'bg-[var(--accent-gold)] text-black animate-pulse'
                                                            : 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 hover:bg-[var(--accent-gold)] hover:text-black'
                                                    }`}
                                                    title="Regenerate hanya title (cepat, tanpa jalankan ulang seluruh pipeline)"
                                                >
                                                    {regenField === 'title' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />} Regenerate
                                                </button>
                                            </label>
                                            <span className={`text-[9px] font-bold ${edit.title.length < METADATA_RULES.title.MIN_LEN ? 'text-[var(--accent-red)]' : edit.title.length > METADATA_RULES.title.MAX_LEN ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}>
                                                {edit.title.length}/{METADATA_RULES.title.MAX_LEN} {edit.title.length >= METADATA_RULES.title.MIN_LEN ? '' : `(min ${METADATA_RULES.title.MIN_LEN})`}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={edit.title}
                                                onChange={e => { setPreflightEdit(() => ({ ...edit, assetId: asset.id, title: e.target.value })); setPreflightEditDirty(true); }}
                                                className="w-full p-2.5 imagin-input text-sm font-medium"
                                                placeholder="Descriptive stock title..."
                                            />
                                            {metadataGenerating && metaFieldFromStep(metadataStep) === 'title' && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--bg-card)]/75 pointer-events-none">
                                                    <svg className="animate-spin w-5 h-5 text-[var(--accent-blue)]" viewBox="0 0 16 16" fill="none">
                                                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5"/>
                                                        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const segs = highlightMetadataIssues(edit.title);
                                            const hasBad = segs.some(s => s.bad);
                                            if (!hasBad) return null;
                                            return (
                                                <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 text-[11px] leading-relaxed">
                                                    <span className="text-[9px] font-bold text-[var(--accent-red)] uppercase mr-1.5"> Terdeteksi:</span>
                                                    {segs.map((s, i) => s.bad
                                                        ? <mark key={i} className="bg-[var(--accent-red)]/20 text-[var(--accent-red)] font-black rounded px-0.5">{s.text}</mark>
                                                        : <span key={i} className="text-[var(--text-primary)]">{s.text}</span>)}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    {/* Description */}
                                    <div className={`rounded-lg border transition-all ${metadataGenerating && metaFieldFromStep(metadataStep) === 'description' ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/5 p-1.5' : 'border-transparent'}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                                                Description
                                                <button
                                                    onClick={() => handleRegenField('description', metaCtx)}
                                                    disabled={metadataGenerating || !!regenField}
                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 transition-all disabled:opacity-40 ${
                                                        regenField === 'description'
                                                            ? 'bg-[var(--accent-gold)] text-black animate-pulse'
                                                            : 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 hover:bg-[var(--accent-gold)] hover:text-black'
                                                    }`}
                                                    title="Regenerate hanya description (cepat)"
                                                >
                                                    {regenField === 'description' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />} Regenerate
                                                </button>
                                            </label>
                                            <span className={`text-[9px] font-bold ${edit.description.trim().length >= 30 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                                {edit.description.trim().length} chars {edit.description.trim().length >= 30 ? '' : '(min 30)'}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={edit.description}
                                                onChange={e => { setPreflightEdit(() => ({ ...edit, assetId: asset.id, description: e.target.value })); setPreflightEditDirty(true); }}
                                                rows={3}
                                                className="w-full p-2.5 imagin-input text-sm font-medium leading-relaxed"
                                                placeholder="Commercial description for buyers..."
                                            />
                                            {metadataGenerating && metaFieldFromStep(metadataStep) === 'description' && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--bg-card)]/75 pointer-events-none">
                                                    <svg className="animate-spin w-5 h-5 text-[var(--accent-blue)]" viewBox="0 0 16 16" fill="none">
                                                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5"/>
                                                        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const segs = highlightMetadataIssues(edit.description);
                                            const hasBad = segs.some(s => s.bad);
                                            if (!hasBad) return null;
                                            return (
                                                <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 text-[11px] leading-relaxed">
                                                    <span className="text-[9px] font-bold text-[var(--accent-red)] uppercase mr-1.5"> Terdeteksi:</span>
                                                    {segs.map((s, i) => s.bad
                                                        ? <mark key={i} className="bg-[var(--accent-red)]/20 text-[var(--accent-red)] font-black rounded px-0.5">{s.text}</mark>
                                                        : <span key={i} className="text-[var(--text-primary)]">{s.text}</span>)}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    {/* Keywords */}
                                    <div className={`rounded-lg border transition-all ${metadataGenerating && metaFieldFromStep(metadataStep) === 'keywords' ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/5 p-1.5' : 'border-transparent'}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                                                Keywords
                                                <button
                                                    onClick={() => handleRegenField('keywords', metaCtx)}
                                                    disabled={metadataGenerating || !!regenField}
                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 transition-all disabled:opacity-40 ${
                                                        regenField === 'keywords'
                                                            ? 'bg-[var(--accent-gold)] text-black animate-pulse'
                                                            : 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 hover:bg-[var(--accent-gold)] hover:text-black'
                                                    }`}
                                                    title="Regenerate hanya keywords (cepat)"
                                                >
                                                    {regenField === 'keywords' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />} Regenerate
                                                </button>
                                            </label>
                                            <span className={`text-[9px] font-bold ${edit.keywords.split(',').filter(k => k.trim()).length >= METADATA_RULES.keywords.MIN_COUNT ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                                {edit.keywords.split(',').filter(k => k.trim()).length} kata {edit.keywords.split(',').filter(k => k.trim()).length >= METADATA_RULES.keywords.MIN_COUNT ? '' : `(min ${METADATA_RULES.keywords.MIN_COUNT})`}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={edit.keywords}
                                                onChange={e => { setPreflightEdit(() => ({ ...edit, assetId: asset.id, keywords: e.target.value })); setPreflightEditDirty(true); }}
                                                rows={3}
                                                className="w-full p-2.5 imagin-input text-sm font-mono leading-relaxed"
                                                placeholder="keyword1, keyword2, keyword3..."
                                            />
                                            {metadataGenerating && metaFieldFromStep(metadataStep) === 'keywords' && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--bg-card)]/75 pointer-events-none">
                                                    <svg className="animate-spin w-5 h-5 text-[var(--accent-blue)]" viewBox="0 0 16 16" fill="none">
                                                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5"/>
                                                        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const list = edit.keywords.split(',').map(k => k.trim()).filter(Boolean);
                                            const badKw = (kw) => {
                                                const norm = normalizeMetadataKeyword(kw);
                                                if (!norm) return false;
                                                if (spamTerms.some(t => t.toLowerCase() === norm)) return true;
                                                if (metadataNewsMarkers.some(m => norm.includes(m.toLowerCase()))) return true;
                                                if (brandIpBlocklist.some(t => t.toLowerCase() === norm) || governmentAgencyBlocklist.some(t => t.toLowerCase() === norm)) return true;
                                                return false;
                                            };
                                            const hasBad = list.some(badKw);
                                            if (!hasBad) return null;
                                            return (
                                                <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20">
                                                    <div className="text-[9px] font-bold text-[var(--accent-red)] uppercase mb-1"> Keyword bermasalah:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {list.map((kw, i) => (
                                                            <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badKw(kw) ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/30 line-through decoration-1' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)]'}`}>
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                     {/* Meta chips */}
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                         <div className="p-2.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)]">
                                             <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Detail Teknis</div>
                                             <div className="text-[11px] font-bold text-[var(--text-primary)] mt-0.5">
                                                  {(() => {
                                                      const resW = asset?.resolution?.width || asset?.stockMetadata?.width || null;
                                                      const resH = asset?.resolution?.height || asset?.stockMetadata?.height || null;
                                                      const dimText = resW && resH ? `${resW}×${resH}px` : null;
                                                      const mpVal = resW && resH ? megapixelsOf(resW, resH) : (asset?.stockMetadata?.megapixels ?? null);
                                                      const mpText = mpVal != null ? `${mpVal.toFixed(1)} MP` : null;
                                                      const kb = getAssetFileSizeKB(asset);
                                                      const sizeText = formatFileSize(kb);
                                                      const dimMpText = dimText && mpText ? `${dimText} = ${mpText}` : (dimText || mpText);
                                                      return [dimMpText, sizeText].filter(Boolean).join(' · ') || '—';
                                                  })()}
                                             </div>
                                         </div>
                                         <div className="p-2.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)]">
                                             <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Content Type</div>
                                            <div className="text-[11px] font-bold text-[var(--text-primary)] mt-0.5">{sm.contentType || '—'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)]">
                                            <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">People Release</div>
                                            <div className="text-[11px] font-bold text-[var(--text-primary)] mt-0.5">{sm.peopleRelease || 'not-applicable'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)]">
                                            <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Property Release</div>
                                            <div className="text-[11px] font-bold text-[var(--text-primary)] mt-0.5">{sm.propertyRelease || 'not-applicable'}</div>
                                        </div>
                                        <div className={`p-2.5 rounded-lg border ${sm.backgroundVerified ? 'bg-[var(--accent-green)]/5 border-[var(--accent-green)]/30' : 'bg-[var(--accent-red)]/5 border-[var(--accent-red)]/30'}`}>
                                            <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Background</div>
                                            <div className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${sm.backgroundVerified ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                                {sm.backgroundVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                {sm.backgroundVerified ? 'Verified' : 'Not verified'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── DETAIL GRID ── */}
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Quality */}
                            {hasQualityScore && (
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3.5">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">Quality Score</div>
                                    <div className="space-y-1.5">
                                        {[
                                            ['Composition', qs.composition, 'var(--accent-blue)'],
                                            ['Commercial', qs.commercial, 'var(--accent-green)'],
                                            ['Keywords', qs.keywords, 'var(--accent-gold)'],
                                            ['Title', qs.title, 'var(--accent-gold)'],
                                            ['Description', qs.description, 'var(--accent-gold)'],
                                        ].map(([label, val, color]) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-[var(--text-secondary)] w-20">{label}</span>
                                                <div className="flex-1 h-1.5 bg-[var(--bg-element)] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${Number(val) || 0}%`, background: color }} />
                                                </div>
                                                <span className="text-[9px] font-black w-8 text-right">{Number(val) || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Confidence + Evidence */}
                            {(() => {
                                const conf = sm.confidence || {};
                                const ev = sm.evidence || {};
                                const hasConf = Object.values(conf).some(v => typeof v === 'number' && v > 0);
                                const hasEvidence = (ev.titleBasis?.length > 0) || (ev.keywordBasis?.length > 0) || (ev.categoryBasis?.length > 0);
                                if (!hasConf && !hasEvidence) return null;
                                const confColor = (v) => v >= 75 ? 'text-[var(--accent-green)]' : v >= 60 ? 'text-[var(--accent-gold)]' : 'text-[var(--accent-red)]';
                                return (
                                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3.5">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">Confidence & Evidence</div>
                                        {hasConf && (
                                            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                                                {Object.entries(conf).filter(([, v]) => typeof v === 'number' && v > 0).map(([key, v]) => (
                                                    <div key={key} className="p-1.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)] text-center">
                                                        <div className={`text-xs font-black ${confColor(v)}`}>{Math.round(v)}%</div>
                                                        <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">{key}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {hasEvidence && (
                                            <div className="space-y-1.5">
                                                {(ev.titleBasis?.length > 0) && (
                                                    <div>
                                                        <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Title basis</div>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">{ev.titleBasis.map((x, i) => <span key={`t-${i}`} className="px-1.5 py-0.5 rounded bg-[var(--bg-element)] border border-[var(--border-color)] text-[8px] font-bold">{x}</span>)}</div>
                                                    </div>
                                                )}
                                                {(ev.keywordBasis?.length > 0) && (
                                                    <div>
                                                        <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Keyword basis</div>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">{ev.keywordBasis.map((x, i) => <span key={`k-${i}`} className="px-1.5 py-0.5 rounded bg-[var(--bg-element)] border border-[var(--border-color)] text-[8px] font-bold">{x}</span>)}</div>
                                                    </div>
                                                )}
                                                {(ev.categoryBasis?.length > 0) && (
                                                    <div>
                                                        <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Category basis</div>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">{ev.categoryBasis.map((x, i) => <span key={`c-${i}`} className="px-1.5 py-0.5 rounded bg-[var(--bg-element)] border border-[var(--border-color)] text-[8px] font-bold">{x}</span>)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Compliance & Risk */}
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3.5">
                                <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">Compliance & Risk</div>
                                <div className="space-y-2">
                                    {sm.ipRisk && (
                                        <div className={`p-2 rounded-lg border ${sm.ipRisk.score >= 71 ? 'border-[var(--accent-red)]/40 bg-[var(--accent-red)]/5' : sm.ipRisk.score >= 31 ? 'border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/5' : 'border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-[var(--text-secondary)] flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> IP / Trademark</span>
                                                <span className={`text-[10px] font-black ${sm.ipRisk.score >= 71 ? 'text-[var(--accent-red)]' : sm.ipRisk.score >= 31 ? 'text-[var(--accent-gold)]' : 'text-[var(--accent-green)]'}`}>{sm.ipRisk.score}/100</span>
                                            </div>
                                            <div className="mt-1 text-[9px] text-[var(--text-secondary)] font-medium">Rekomendasi: <span className="font-black uppercase">{String(sm.ipRisk.recommendation || 'pass')}</span></div>
                                        </div>
                                    )}
                                    {sm.differentiation?.recommendation !== 'proceed' && sm.differentiation && (
                                        <div className={`p-2 rounded-lg border ${sm.differentiation.recommendation === 'reconsider' ? 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5' : 'border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5'}`}>
                                            <div className="text-[9px] font-bold text-[var(--text-secondary)]">Marketplace Differentiation</div>
                                            <div className="text-[10px] font-black text-[var(--text-primary)]">Skor {sm.differentiation.genericityScore}/100</div>
                                        </div>
                                    )}
                                    <div className="p-2 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
                                        <div className="text-[9px] font-bold text-[var(--text-secondary)] flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Generative AI</div>
                                        <div className="text-[10px] font-bold text-[var(--accent-gold)] mt-0.5">Declared · {sm.aiTool || 'Gemini'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── SUGGESTIONS ── */}
                        {sm.suggestions?.length > 0 && (
                            <div className="px-5 pb-5">
                                <div className="rounded-xl border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-blue)] mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Saran AI</div>
                                    <ul className="space-y-1.5">
                                        {sm.suggestions.map((s, idx) => (
                                            <li key={`sug-${idx}`} className="text-[11px] text-[var(--text-primary)] leading-snug flex items-start gap-1.5">
                                                <span className="text-[var(--accent-blue)] font-black mt-px">◆</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                        <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                            {decision === 'pass'
                                ? <span className="text-[var(--accent-green)] font-bold flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" /> Siap dikirim ke Adobe Stock</span>
                                : <span className="text-[var(--accent-gold)] font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Regenerate metadata atau perbaiki manual lalu save.</span>
                            }
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {isEditDirty && (
                                <button onClick={savePreflightEdits} className="px-4 py-2 rounded-xl font-bold text-xs bg-[var(--accent-green-solid)] text-white hover:opacity-90 transition-all flex items-center gap-1.5">
                                    <Save className="w-3.5 h-3.5" /> Save Edits
                                </button>
                            )}
                            {submittableFromExport.includes(asset.status) && asset.status !== 'submitted' && (
                                <button
                                    onClick={() => {
                                        markAsSubmitted(asset, storageCtx);
                                        closePreflightModal();
                                    }}
                                    title="Konfirmasi sudah di-upload ke Adobe Stock (manual)"
                                    className="px-4 py-2 rounded-xl font-bold text-xs bg-[var(--accent-gold)] text-black hover:opacity-90 transition-all flex items-center gap-1.5"
                                >
                                    <Rocket className="w-3.5 h-3.5" /> Mark as Submitted
                                </button>
                            )}
                            {asset.status === 'submitted' && (
                                <button
                                    onClick={() => {
                                        confirmBlocking({
                                            title: 'Tandai Ditolak Adobe?',
                                            message: 'Pilih alasan penolakan (dari Adobe Stock). Ini dicatat untuk mengkalibrasi QA tool ke rejection nyata.',
                                            confirmLabel: 'Similar Content',
                                            cancelLabel: 'Batal',
                                            onConfirm: () => { markRejectedByAdobe(asset, 'similar_content', 'Adobe rejected: similar content', storageCtx); closePreflightModal(); },
                                            onClose: () => setBlockingDialog(null),
                                        });
                                    }}
                                    title="Catat penolakan Adobe (similar content) untuk kalibrasi QA"
                                    className="px-4 py-2 rounded-xl font-bold text-xs bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30 hover:bg-[var(--accent-red-solid)] hover:text-white transition-all flex items-center gap-1.5"
                                >
                                    <XCircle className="w-3.5 h-3.5" /> Rejected by Adobe
                                </button>
                            )}
                            {asset.status === 'submitted' && !asset.soldAt && (
                                <button
                                    onClick={() => { markSold(asset, storageCtx); closePreflightModal(); }}
                                    title="Tandai asset ini TERJUAL di Adobe — data untuk kalibrasi konsep laris"
                                    className="px-4 py-2 rounded-xl font-bold text-xs bg-[var(--accent-green-solid)] text-white hover:opacity-90 transition-all flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Terjual
                                </button>
                            )}
                            <button onClick={() => closePreflightModal()} className="px-4 py-2 rounded-xl font-bold text-xs bg-[var(--text-primary)] text-[var(--bg-card)] hover:opacity-90 transition-all">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
}
