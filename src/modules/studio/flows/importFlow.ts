// @ts-nocheck — Studio import and backup flow extracted with explicit context.
import { ADOBE_CATEGORY_TAXONOMY } from '../registry/presets';
import { STYLE_PRESET_DNA } from '../registry/dna';
import { findStylePreset } from './dnaData';
import { resolveReferenceGenerationSettings } from './generationFlow';
import { analyzeVisualTruth } from '../engines/quality';
import { createDraftStockMetadata } from '../engines/metadata';
import { processImportedJSON, validateImportedJSON } from '../engines/import-engine';
import { getHistoryDB, loadStudioAssets, saveAssetDB, saveHistoryLog } from '../engines/storage';
import { fileSizeKBFromDataUrl, getFormatResolutionPolicy, megapixelsOf } from '../utils';
import { addHistory } from './assetActionsFlow';
import { loadJSZip } from '../../../utils/loadJszip';
const DB_NAME = 'IMAGIN_Studio_DB';
const studioCollection = async (name) => {
    const result = await window.api.studioStoreGet(name);
    if (!result.success) throw new Error(result.detail || `Failed to read ${name}`);
    return result.items || [];
};

export const saveBatchProgress = async (sessionId, promptIndex, batchId, batchData) => {
try {
    await window.api?.studioBatchResumeSet?.({ sessionId, promptIndex, batchId, batch: batchData });
} catch (e) { console.warn('Failed to save batch progress:', e); }
};

export const clearBatchProgress = async () => {
try { await window.api?.studioBatchResumeSet?.(null); } catch (e) {}
};

export const loadBatchProgress = async () => {
try {
    const res = await window.api?.studioBatchResumeGet?.();
    return res?.success ? (res.data ?? null) : null;
} catch { return null; }
};

export const handleJSONFileUpload = (e, actions) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processImportedJSON(ev.target.result, actions);
    reader.readAsText(file);
    e.target.value = '';
};

export const handleJsonBatchFileSelected = (e, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;

        // Validasi ekstensi + ukuran (max 2MB per file)
        const validFiles = [];
        const rejected = [];
        for (const f of files) {
            if (!f.name.toLowerCase().endsWith('.json')) {
                rejected.push(`${f.name}: harus .json`);
                continue;
            }
            if (f.size > 2 * 1024 * 1024) {
                rejected.push(`${f.name}: >2MB`);
                continue;
            }
            validFiles.push(f);
        }
        if (rejected.length) showToast(rejected.join('; '), 'error');
        if (validFiles.length === 0) return;

        // Baca semua file paralel
        const readers = validFiles.map(file => new Promise<{ file: File, text: string }>((resolve, reject) => {
            const r = new FileReader();
            r.onload = ev => resolve({ file, text: String(ev.target.result || '') });
            r.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
            r.readAsText(file);
        }));

        Promise.all(readers).then(results => {
            // Parse + validasi tiap file. error → tandai di preview (tapi jangan tolak seluruhnya).
            const items = results.map(({ file, text }) => {
                const item: any = { fileName: file.name, text, selected: true, error: null, batchName: null, promptCount: 0 };
                try {
                    const raw = JSON.parse(text);
                    if (!raw || typeof raw !== 'object') throw new Error('Root bukan object');
                    if (!raw.batch_name || typeof raw.batch_name !== 'string') throw new Error('batch_name hilang');
                    if (!Array.isArray(raw.prompts)) throw new Error('prompts bukan array');
                    if (raw.prompts.length === 0) throw new Error('prompts kosong');
                    if (raw.prompts.length > 200) throw new Error(`Prompts ${raw.prompts.length} > max 200`);
                    const validation = validateImportedJSON(raw);
                    if (!validation.valid) throw new Error(validation.errors[0] || 'Validasi gagal');
                    item.batchName = raw.batch_name;
                    item.promptCount = raw.prompts.length;
                    item._raw = raw;
                } catch (err: any) {
                    item.error = err?.message || 'Parse gagal';
                    item.selected = false; // tidak bisa dipilih kalau error
                }
                return item;
            });

            // 1 file valid → langsung populate paste editor (flow lama, paling umum).
            const validItems = items.filter(i => !i.error);
            if (items.length === 1 && validItems.length === 1) {
                setPasteJsonInput(validItems[0].text);
                setPasteJsonErrors([]);
                setJsonModalTab('paste');
                setImportPasteModalOpen(true);
                showToast(`File ${validItems[0].fileName} dimuat — klik Validate & Import`, 'success');
                return;
            }

            // Multi-file ATAK 1 file error → preview modal
            setBatchImportPreview({ files: items });
        }).catch(err => {
            showToast('Gagal membaca file: ' + (err?.message || err), 'error');
        });
    };

export const handleReferenceImageSelected = async (e, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
            showToast('Reference image must be a PNG, JPEG, or WebP raster image.', 'error');
            return;
        }
        setReferenceInferredSettings(null);
        const analysisToken = ++referenceAnalysisTokenRef.current;
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Reference image could not be read.'));
                reader.onabort = () => reject(new Error('Reference image read was cancelled.'));
                reader.readAsDataURL(file);
            });
            // Simpan preview segera agar user melihat aset sudah terimport (UX: preview / button toggle)
            if (referenceAnalysisTokenRef.current !== analysisToken) return;
            setLastReferencePreview({ url: dataUrl as string, name: file.name });
            setIsReferenceAnalyzing(true);
            showToast('Menganalisis referensi visual…', 'info');
            const referenceAsset = {
                id: `reference_${Date.now()}`,
                type: 'IMAGE', assetType: 'photo', generationMode: 'reference-import',
                adobeCategory: '', subcategory: '', title: '', baseTheme: file.name,
                archetypeRole: null, prompt: '', assembledPrompt: '', negativePrompt: '',
                aspectRatio: 'AUTO', style: '', highDpiSharpness: false, outputFormat: 'PNG',
                background: 'scene', createdAt: Date.now(), status: 'draft', favorite: false,
                batchId: '', isLoading: false, isMetaLoading: false, url: dataUrl,
                stockMetadata: createDraftStockMetadata({ assetType: 'photo', background: 'scene', outputFormat: 'PNG' }),
            };
            const result = await analyzeVisualTruth(referenceAsset, systemSettings.aiConfig, incrementApiCallCounter);
            if (referenceAnalysisTokenRef.current !== analysisToken) return;
            if (!result.vision) {
                setReferenceInferredSettings(null);
                showToast('Reference image analysis failed. Please try another image.', 'error');
                return;
            }
            const vision = result.vision;
            const latestPlatform = vectorStateRef.current?.platform || vectorState.platform;
            const inferred = resolveReferenceGenerationSettings(vision, latestPlatform);
            const list = value => Array.isArray(value) ? value.filter(Boolean).join(', ') : value;
            // FIX 3: Build reference prompt with STYLE_PRESET_DNA.promptTrigger injected as rendering directive.
            // This replaces the old generic "rendering style" text with the full style DNA from the preset,
            // giving Gemini Image the same rich rendering instructions it gets in normal generation.
            const subjectText = vision.subject || vision.primarySubject || 'the visible subject';

            // ── FIX 3A: Build asset-type-specific rendering directive from vision signals ──
            const rs = vision.renderingStyle || {};
            const vs = vision.vectorSignals || {};
            const is_ = vision.illustrationSignals || {};
            const ps = vision.patternSignals || {};

            const buildReferenceRenderingDirective = (assetType, style, vision, rs, vs, is_, ps) => {
                if (assetType === 'photo') {
                    return `MEDIUM LOCK: photorealistic camera photography. Real optical lens, physically plausible light and texture. Do NOT render as illustration, vector, cartoon, or 3D.`;
                }
                if (assetType === '3d') {
                    const isIso = /isometric/.test(String(vision.visualStyle || '').toLowerCase()) || is_.perspectiveType === 'isometric';
                    return `MEDIUM LOCK: ${isIso ? 'isometric 3D illustration, strict 45-degree parallel projection, no perspective distortion' : '3D rendered illustration, studio three-point lighting, soft shadows, photorealistic materials'}. Do NOT render as flat 2D illustration or photography.`;
                }
                // For vector/illustration/pattern: inject full STYLE_PRESET_DNA promptTrigger
                const stylePresetData = findStylePreset(style);
                const styleDNATrigger = stylePresetData ? stylePresetData.promptTrigger : null;
                const styleNegative = stylePresetData ? stylePresetData.negativePrompt : null;

                // Build rendering signals from vision as reinforcement
                const renderSignals = [
                    rs.strokeType && rs.strokeType !== 'none' ? `outlines: ${rs.strokeType}` : (vs.hasOutlines === false ? 'no outlines' : null),
                    rs.fillType ? `fill: ${rs.fillType}` : null,
                    rs.shadowType && rs.shadowType !== 'none' ? `shadow: ${rs.shadowType}` : 'no shadows',
                    rs.colorProfile ? `color profile: ${rs.colorProfile} (approx ${rs.colorCount || '4'} colors)` : null,
                    vs.cornerStyle === 'rounded' ? 'rounded corners throughout' : (vs.cornerStyle === 'sharp' ? 'sharp corners' : null),
                    rs.backgroundTreatment ? `background: ${rs.backgroundTreatment}` : null,
                    is_.perspectiveType && is_.perspectiveType !== 'flat-2d' ? `perspective: ${is_.perspectiveType}` : null,
                    is_.texturePresence && is_.texturePresence !== 'none' ? `texture: ${is_.texturePresence}` : null,
                    ps.repeatType && ps.repeatType !== 'none' ? `pattern repeat: ${ps.repeatType}, density: ${ps.elementDensity || 'medium'}` : null,
                ].filter(Boolean).join(', ');

                const parts = [
                    styleDNATrigger ? `RENDERING DIRECTIVE (from reference style): ${styleDNATrigger}` : `MEDIUM LOCK: digital illustration, vector graphic.`,
                    renderSignals ? `VISUAL SIGNALS FROM REFERENCE: ${renderSignals}` : null,
                    styleNegative ? `AVOID: ${Array.isArray(styleNegative) ? styleNegative.join(', ') : styleNegative}` : null,
                ].filter(Boolean);
                return parts.join('\n');
            };

            const renderingDirective = buildReferenceRenderingDirective(inferred.assetType, inferred.style, vision, rs, vs, is_, ps);

            // ── Build color lock ──
            const colorLock = (() => {
                const colorList = Array.isArray(vision.colors) ? vision.colors.slice(0, 6).join(', ') : '';
                const profileDesc = { 'limited-2-4': 'limited palette', 'monochromatic': 'monochromatic', 'muted': 'muted/desaturated', 'vibrant-saturated': 'vibrant saturated', 'pastel': 'soft pastel' }[rs.colorProfile] || 'color palette';
                return colorList ? `COLOR LOCK: ${profileDesc} — ${colorList}` : null;
            })();

            // ── Build subject + visual DNA lines ──
            const moodText = vision.mood ? `mood: ${vision.mood}` : null;
            const lightingText = vision.lighting ? `lighting: ${vision.lighting}` : null;
            const cameraText = vision.cameraAngle ? `perspective: ${vision.cameraAngle}` : null;
            const compositionText = vision.composition ? `composition: ${vision.composition}` : null;
            const environmentText = (inferred.assetType === 'photo' && vision.environment) ? `setting: ${vision.environment}` : null;
            const objectsText = list(vision.objects) ? `visible elements: ${list(vision.objects)}` : null;
            const patternHint = vision.patternType && !/not a pattern|no pattern|none/i.test(vision.patternType) ? `pattern type: ${vision.patternType}` : null;

            const visualDNALines = [moodText, lightingText, cameraText, compositionText, colorLock, environmentText, patternHint, objectsText].filter(Boolean);

            // ── FIX 3B: Assemble final prompt with rendering directive as FIRST block ──
            const prompt = [
                renderingDirective,
                `SUBJECT: Create an original ${inferred.assetType} asset inspired by the reference. Subject/theme: "${subjectText}".`,
                visualDNALines.length ? `VISUAL DNA FROM REFERENCE:
${visualDNALines.join('\n')}` : null,
                `CONSTRAINTS: Keep result meaningfully original. Exclude brand names, logos, trademarks, readable text, copyrighted characters, recognizable product trade dress.`,
                inferred.assetType !== 'photo' ? `Do not convert a single-subject reference into a repeating pattern unless the reference itself is an all-over seamless pattern.` : null,
                `Adobe Stock commercial microstock asset, professional quality.`,
            ].filter(Boolean).join('\n\n');

            // FIX 4: Force skipAIExpansion=true for reference mode.
            // expandPromptWithGemini re-interprets the prompt and DESTROYS the carefully-built
            // rendering directive above. Reference mode must go straight to compilePrompt.
            if (referenceAnalysisTokenRef.current !== analysisToken) return;
            // Apply inferred settings and prompt as one state transition. This is
            // deliberately deferred when the latest prompt is non-empty so the
            // confirmation cannot leave mixed old/new generation settings.
            const applyPrompt = () => {
                if (referenceAnalysisTokenRef.current !== analysisToken) return;
                setReferenceInferredSettings({ assetType: inferred.assetType, style: inferred.style, aspectRatio: inferred.aspectRatio, outputFormat: inferred.preset.outputFormat, background: inferred.preset.background });
                setVectorState(prev => ({
                    ...prev,
                    assetType: inferred.assetType,
                    generationMode: 'single',
                    quantity: 1,
                    singlePromptInput: prompt,
                    skipAIExpansion: true,
                    visualSettings: {
                        ...prev.visualSettings,
                        aspectRatio: inferred.aspectRatio,
                        style: inferred.style,
                        background: inferred.preset.background,
                        outputFormat: inferred.preset.outputFormat,
                        highDpiSharpness: inferred.preset.highDpiSharpness,
                        faceless: inferred.preset.faceless,
                        negativeSpace: inferred.preset.negativeSpace,
                    },
                    _assetTypeDirty: false,
                    _visualDirty: {},
                    platform: latestPlatform,
                    platformCategoryId: inferred.platformCategoryId,
                    internalCategory: inferred.internalCategory,
                    adobeCategory: inferred.category || prev.adobeCategory,
                    subcategory: inferred.category
                        ? (inferred.subcategory || ADOBE_CATEGORY_TAXONOMY[inferred.category]?.[0] || '')
                        : prev.subcategory,
                    selectedSubject: null,
                    selectedScene: null,
                }));
            };
            const latestPrompt = (vectorStateRef.current?.singlePromptInput || '').trim();
            if (latestPrompt) {
                setReferencePromptConfirmation({ prompt, onConfirm: () => { if (referenceAnalysisTokenRef.current !== analysisToken) return; applyPrompt(); setReferencePromptConfirmation({ prompt: '', onConfirm: null }); } });
            } else applyPrompt();
            showToast('Reference image analyzed and generation prompt prepared.', 'success');
        } catch (err) {
            console.error('Reference image import failed:', err);
            showToast('Reference image import failed: ' + (err?.message || 'Unknown error'), 'error');
        } finally {
            if (referenceAnalysisTokenRef.current === analysisToken) setIsReferenceAnalyzing(false);
        }
    };

export const handleImportImageSelected = async (e, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        const MAX_IMPORTS = 100;
        const imageTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
        const extensionOf = name => name.toLowerCase().split('.').pop() || '';
        const imageTypeOf = file => imageTypes[extensionOf(file.name)] === file.type ||
            (!file.type && imageTypes[extensionOf(file.name)]);
        const readDataUrl = blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
                reader.onabort = () => reject(new Error('Pembacaan gambar dibatalkan.'));
                reader.readAsDataURL(blob);
            });
        const decodeImage = dataUrl => new Promise((resolve, reject) => {
                const image = new window.Image();
                image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
                image.onerror = () => reject(new Error('Gambar tidak dapat dimuat atau formatnya tidak didukung.'));
                image.src = dataUrl;
            });
        const importedAssets = [];
        let skipped = 0;
        const candidates = [];
        for (const file of files) {
            if (extensionOf(file.name) === 'zip' || file.type === 'application/zip') {
                try {
                    const zip = await (await loadJSZip()).loadAsync(file);
                    for (const entry of Object.values(zip.files)) {
                        if (entry.dir || !imageTypes[extensionOf(entry.name)]) continue;
                        if (candidates.length >= MAX_IMPORTS) { skipped++; continue; }
                        const safeName = entry.name.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_') || 'imported-image';
                        candidates.push({ file: await entry.async('blob'), name: safeName });
                    }
                } catch (err) {
                    skipped++;
                    console.error('ZIP image import failed:', err);
                }
            } else if (imageTypeOf(file)) candidates.push({ file, name: file.name });
            else skipped++;
        }
        for (const candidate of candidates) {
            if (importedAssets.length >= MAX_IMPORTS) { skipped++; continue; }
            try {
                const type = imageTypes[extensionOf(candidate.name)];
                if (candidate.file.type && candidate.file.type !== type) throw new Error('Format gambar tidak cocok.');
                let dataUrl = await readDataUrl(candidate.file);
                const { width, height } = await decodeImage(dataUrl);
                // WebP is not a native Adobe export format — re-encode to JPEG when labeled JPEG
                if (extensionOf(candidate.name) === 'webp') {
                    const webpImg = await new Promise((res, rej) => { const im = new window.Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('WebP decode failed')); im.src = dataUrl; });
                    const c = document.createElement('canvas'); c.width = (webpImg as any).naturalWidth; c.height = (webpImg as any).naturalHeight;
                    const cx = c.getContext('2d'); cx.drawImage(webpImg as any, 0, 0);
                    dataUrl = c.toDataURL('image/jpeg', 0.92);
                }
                const gcd = (a, b) => b ? gcd(b, a % b) : a;
                const divisor = gcd(width, height);
                const aspectRatio = `${width / divisor}:${height / divisor}`;
                const outputFormat = type === 'image/png' ? 'PNG' : 'JPEG';
                const importedMp = megapixelsOf(width, height);
                const importedPolicy = getFormatResolutionPolicy(outputFormat);
                const importedDraft = createDraftStockMetadata({ assetType: 'photo', background: 'scene', outputFormat });
                importedDraft.megapixels = Math.round(importedMp * 10) / 10;
                importedDraft.fileSizeKB = fileSizeKBFromDataUrl(dataUrl);
                importedDraft.fileSizeOk = (importedDraft.fileSizeKB || 0) <= importedPolicy.maxFileSizeMB * 1024;
                importedDraft.resolutionVerified = importedMp >= importedPolicy.minimumMegapixels && importedMp <= importedPolicy.maximumMegapixels;
                importedDraft.backgroundVerified = true;
                importedDraft.metadataSource = 'import';
                importedDraft.analysisAvailable = false;
                const importedAsset = {
                id: `asset_${Date.now()}_${importedAssets.length}_${Math.random().toString(36).slice(2, 7)}`,
                type: 'IMAGE', assetType: 'photo', generationMode: 'imported',
                adobeCategory: '', subcategory: '', title: '',
                baseTheme: candidate.name.replace(/\.[^.]+$/, ''), archetypeRole: null,
                prompt: '', assembledPrompt: '', negativePrompt: '', aspectRatio,
                style: 'Authentic Photography', highDpiSharpness: false, outputFormat,
                background: 'scene', createdAt: Date.now(), status: 'draft',
                favorite: false, batchId: '', isLoading: false, isMetaLoading: false,
                url: dataUrl, stockMetadata: importedDraft,
                resolution: { width, height, wasUpscaled: false, scaleFactor: 1 },
                };
                const saveResult = await saveAssetDB(importedAsset);
                if (!saveResult.success) {
                    skipped++;
                    continue;
                }
                importedAssets.push(importedAsset);
            } catch (err) {
                skipped++;
                console.error('Image import failed:', candidate.name, err);
            }
        }
        if (importedAssets.length) setAssets(prev => [...importedAssets, ...prev]);
        showToast(`Import gambar selesai: ${importedAssets.length} diimpor, ${skipped} dilewati${candidates.length > MAX_IMPORTS ? ` (batas ${MAX_IMPORTS})` : ''}.`, importedAssets.length ? 'success' : 'error');
    };

export const copyToClipboard = async (text, label, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const successMsg = `${label} copied to clipboard! `;
        try {
            // Clipboard API diblokir permissions policy di dalam iframe Gemini Canvas
            // ("writeText is not allowed") — jangan andalkan sebagai satu-satunya jalur.
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                showToast(successMsg, 'success');
                return;
            }
            throw new Error('clipboard API unavailable');
        } catch {
            // Fallback: textarea off-screen + execCommand('copy') — jalur legacy yang
            // masih diizinkan di iframe sandbox asal dipicu user gesture.
            try {
                const ta = document.createElement('textarea');
                ta.value = String(text ?? '');
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (!ok) throw new Error('execCommand copy failed');
                showToast(successMsg, 'success');
            } catch {
                showToast(`Failed to copy ${label}`, 'error');
            }
        }
    };

export const exportAllData = async (ctx) => {
    try {
        const allAssets = await getAssetsDB(); const allHistory = await getHistoryDB();
        const collections = {};
        for (const name of ['history', 'projects', 'feedback', 'diversity_tracker', 'qa_results', 'compliance_results', 'learning_evaluations']) collections[name] = await studioCollection(name);
        const backup = { exportedAt: new Date().toISOString(), dbName: DB_NAME, assets: allAssets, history: allHistory, collections };
        const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = `imagin_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
        ctx.showToast(`Backup diekspor: ${allAssets.length} asset, ${allHistory.length} log.`, 'success');
    } catch (err) { console.error('Export failed:', err); ctx.showToast('Export gagal: ' + err.message, 'error'); }
};
export const importAllData = async (file, ctx) => {
    try {
        const backup = JSON.parse(await file.text());
        if (!Array.isArray(backup.assets)) throw new Error('Format file backup tidak valid (field "assets" tidak ditemukan).');
        let restoredCount = 0;
        let skippedCount = 0;
        for (const asset of backup.assets) {
            const result = await saveAssetDB(asset);
            if (result.success) restoredCount++;
            else skippedCount++;
        }
        const collections = backup.collections || {};
        if (backup.collections && typeof collections === 'object') for (const [collection, records] of Object.entries(collections)) {
            if (!Array.isArray(records)) continue;
            await window.api.studioStoreCommit({ collection, ops: [{ type: 'replaceAll', records }] });
        }
        else if (Array.isArray(backup.history)) for (const h of backup.history) await saveHistoryLog(h);
        // Reload gallery using loadStudioAssets (canonical or fallback)
        const { assets, status } = await loadStudioAssets();
        if (status !== 'unavailable') ctx.setAssets(assets);
        const history = await getHistoryDB();
        ctx.setHistoryLogs(history);
        ctx.showToast(status === 'unavailable'
            ? `Import selesai: ${restoredCount} asset tersimpan${skippedCount > 0 ? `, ${skippedCount} gagal` : ''}; Gallery belum dapat dimuat.`
            : `Import selesai: ${restoredCount} asset dipulihkan${skippedCount > 0 ? `, ${skippedCount} gagal` : ''}.`, restoredCount > 0 ? 'success' : 'error');
        if (restoredCount > 0) {
            await addHistory(`Imported backup from ${backup.exportedAt || 'unknown date'} (${restoredCount} assets restored${skippedCount > 0 ? `, ${skippedCount} failed` : ''})`, ctx);
        }
    } catch (err) { console.error('Import failed:', err); ctx.showToast('Import gagal: ' + err.message, 'error'); }
};
