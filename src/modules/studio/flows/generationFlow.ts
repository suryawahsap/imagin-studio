// @ts-nocheck — Studio generation flow extracted with explicit context.
import { ASSET_TYPE_PRESETS, STYLES_BY_ASSET_TYPE, PLATFORM_ADAPTERS, ADOBE_CATEGORY_TAXONOMY, DEFAULT_PLATFORM } from '../registry/presets';
import { ICON_STYLE_PRESETS } from '../registry/icon-dna';
import { ICON_GRID_OPTIONS } from '../registry/constants';
import { sanitizeIconThemeInput, sanitizeVisualPromptInput, extractLeadingIconCount, checkBrandSafety, DEFAULT_RESOLUTION_TARGET, resolveExportFormat, isSpecificUserInput } from '../utils';
import { CONTENT_SAFETY_RULES, detectNewsEvent, detectSensitiveContent } from '../engines/compliance';
import { createBatchDiversitySession, planConceptClusters, compilePrompt, buildLayeredNegativePrompt, resolveStyleKeyFromVision as resolveStyleKeyFromVisionImpl } from '../engines/prompt';
import { generateImageWithGemini, callGeminiForJSON } from '../engines/generation';
import { getBatchSlots, getBatchSlotsAI } from '../engines/composition';
import { buildConceptFingerprint, checkLibraryConceptSimilarity } from '../engines/fingerprint';
import { validateRequestIntake, normalizeRequest } from '../engines/import-engine';
import { createProductionJob, updateJobItemWithStage, getJobDB, saveJobDB, jobEngine } from '../engines/job-engine';
import { projectEngine } from '../engines/project-engine';
import { extractSemanticIntent, assessStyleCompatibility, buildCanonicalIntent, validateCanonicalIntent, resolveConstraints, validatePromptIntegrity } from '../engines/intent-engine';
import { createBatchSession, buildSemanticLockToken } from '../engines/prompt-helpers';
import { buildCGAContext, buildNegativePrompt, buildCategoryNegativeHints } from '../engines/dna-engine';
import { resolveBackground, resolveDNAFromOfficial } from '../resolvers';
import { buildResolvedConfig } from './dnaData';
import { runProductionPipeline } from '../pipeline';
import { isFinalSaveCommitted } from '../engines/library-sync';
import { reasonCodeForIssue } from '../engines/quality';

/**
 * Shared batch generator via canonical pipeline.
 * Processes an array of items, each with its own config, using runProductionPipeline.
 * Handles pause/cancel, progress, asset creation/ready/error, and optional job updates.
 */
export async function runBatchViaCanonical(
  items: Array<{
    config: Omit<PipelineConfig, 'systemSettings' | 'assetIndex' | 'batchId' | 'tracker' | 'batchDiversity'>;
    itemIndex: number;
    presetRejection?: { stage: string; error: string };
  }>,
  ctx: {
    systemSettings: SystemSettings;
    batchId: string;
    tracker: any;
    batchDiversity: any;
    saveAssetDB: any;
    pauseRef: React.MutableRefObject<boolean>;
    cancelRef: React.MutableRefObject<boolean>;
    showToast: (msg: string, type: string) => void;
    incrementApiCallCounter: () => void;
    onProgress: (current: number, total: number) => void;
    onAssetCreated: (asset: Partial<Asset>) => void;
    onAssetReady: (asset: Partial<Asset>) => Promise<void>;
    onAssetError: (assetId: string | null, err: any) => void;
    updateJobItem?: (itemId: string, stage: string, data: any) => Promise<void>;
    getJobItemId?: (index: number) => string;
    concurrency?: number;
    beforeItem?: (item: any, itemIndex: number) => Promise<void> | void;
    onItemResult?: (itemIndex: number, outcome: 'success' | 'failed', info?: { stage?: string; error?: string; code?: string }) => Promise<void> | void;
    throttleMs?: number;
    projectId?: string | null;
  }
): Promise<{ successCount: number; failedCount: number; wasCancelled: boolean }> {
  const {
    systemSettings,
    batchId,
    tracker,
    batchDiversity,
    saveAssetDB,
    pauseRef,
    cancelRef,
    showToast,
    incrementApiCallCounter,
    onProgress,
    onAssetCreated,
    onAssetReady,
    onAssetError,
    updateJobItem,
    getJobItemId,
    concurrency = 1,
    beforeItem,
    onItemResult,
    throttleMs,
    projectId,
  } = ctx;

  const total = items.length;
  let successCount = 0;
  let failedCount = 0;
  let wasCancelled = false;

  const processItem = async (item: typeof items[0]) => {
    const { config, itemIndex, presetRejection } = item;
    if (cancelRef.current) {
      return { success: false, index: itemIndex, cancelled: true };
    }
    // Per-item planning (JSON): beforeItem computes canonical inputs + gates;
    // presetRejection may be set here → item skipped without pipeline
    // (no double UI sync — mirrors old loop semantics).
    try { await beforeItem?.(item, itemIndex); } catch (e) { console.warn('[Batch] beforeItem hook error:', e); }
    if (cancelRef.current) {
      return { success: false, index: itemIndex, cancelled: true };
    }
    if (presetRejection) {
      failedCount++;
      if (updateJobItem && getJobItemId) {
        await updateJobItem(getJobItemId(itemIndex), presetRejection.stage, { status: 'rejected', error: presetRejection.error, finishedAt: Date.now() });
      }
      await onItemResult?.(itemIndex, 'failed', { stage: presetRejection.stage, error: presetRejection.error });
      return { success: false, index: itemIndex };
    }
    // Update job stage if provided
    if (updateJobItem && getJobItemId) {
      await updateJobItem(getJobItemId(itemIndex), 'generating', { status: 'running', startedAt: Date.now() });
    }

    try {
      const result = await runProductionPipeline(
        {
          ...config,
          systemSettings,
          assetIndex: itemIndex,
          batchId,
          tracker,
          batchDiversity,
          projectId,
        },
        {
          onAssetCreated,
          onAssetReady: async (asset) => {
            await onAssetReady(asset);
          },
          onAssetError: (assetId, err) => {
            onAssetError(assetId, err);
          },
          onProgress: () => {},
          onStage: () => {},
          onWarning: (w) => showToast(w, 'info'),
          onApiCall: incrementApiCallCounter,
        }
      );
      if (result?.asset?.id) {
        successCount++;
        if (updateJobItem && getJobItemId) {
          await updateJobItem(getJobItemId(itemIndex), 'generate_done', { status: 'completed', assetId: result.asset.id, finishedAt: Date.now() });
        }
        await onItemResult?.(itemIndex, 'success');
        return { success: true, index: itemIndex };
      } else {
        failedCount++;
        if (updateJobItem && getJobItemId) {
          await updateJobItem(getJobItemId(itemIndex), 'generate_failed', { status: 'failed', error: 'No asset returned', finishedAt: Date.now() });
        }
        await onItemResult?.(itemIndex, 'failed', { stage: 'generate_failed', error: 'No asset returned' });
        return { success: false, index: itemIndex };
      }
    } catch (err: any) {
      failedCount++;
      // Structured pipeline rejections (constraint/integrity/intent/save) → job
      // stage pakai err.code; sisanya generic. onAssetError TIDAK dipanggil di
      // sini — pipeline catch sudah memanggilnya sebelum rethrow (hindari toast
      // ganda).
      const code = err?.code;
      const stage = code === 'save_failed' ? 'generate_failed' : (code || 'generate_failed');
      const status = code && code !== 'save_failed' ? 'rejected' : 'failed';
      if (updateJobItem && getJobItemId) {
        await updateJobItem(getJobItemId(itemIndex), stage, { status, error: err instanceof Error ? err.message : String(err), finishedAt: Date.now() });
      }
      await onItemResult?.(itemIndex, 'failed', { stage, error: err instanceof Error ? err.message : String(err), code });
      return { success: false, index: itemIndex };
    }
  };

  // Process in chunks with concurrency
  for (let start = 0; start < total; start += concurrency) {
    if (cancelRef.current || pauseRef.current) {
      wasCancelled = true;
      break;
    }
    const chunk = items.slice(start, start + concurrency);
    const chunkPromises = chunk.map(item => processItem(item));
    const results = await Promise.allSettled(chunkPromises);
    for (const r of results) {
      if (r.status === 'fulfilled') {
        // Already counted inside processItem
      } else {
        failedCount++;
      }
    }
    onProgress(Math.min(start + concurrency, total), total);
    // Throttle antar item supaya tidak kena rate limit (mirror JSON batch lama).
    if (throttleMs && start + concurrency < total && !cancelRef.current && !pauseRef.current) {
      await new Promise(r => setTimeout(r, throttleMs));
    }
  }

  return { successCount, failedCount, wasCancelled };
}

export function resetMultiFileToastIndex(ctx) {
    ctx.lastNotifiedFileIdxRef.current = -1;
}

export function notifyMultiFileBoundary(ctx) {
    const files = ctx.importedBatch?.files;
    if (!files || files.length <= 1 || ctx.importedBatch?.status !== 'generating') return;
    const completed = ctx.batchQueue.completed;
    for (let i = 0; i < files.length - 1; i++) {
        const f = files[i];
        if (completed > f.endIndex && ctx.lastNotifiedFileIdxRef.current < i) {
            ctx.lastNotifiedFileIdxRef.current = i;
            const displayName = f.displayBatchName || f.batchName;
            const next = files[i + 1];
            const nextName = next ? (next.displayBatchName || next.batchName) : '';
            ctx.showToast(` File ${i + 1} "${displayName}" selesai (${f.promptCount} prompts). Lanjut ke file ${i + 2} "${nextName}"...`, 'success');
            break;
        }
    }
}

export function resetSidebarToManual(ctx) {
    ctx.clearBatchProgress();
    ctx.setImportedBatch(null);
    ctx.setBatchQueue(ctx.createIdleBatchQueue());
    ctx.setVectorState(ctx.createInitialVectorState());
    ctx.setPasteJsonInput('');
    ctx.setPasteJsonErrors([]);
    ctx.setJsonModalTab('paste');
    ctx.setIsBatchPauseRequested(false);
    ctx.pauseBatchRef.current = false;
    ctx.discardBatchRef.current = false;
    ctx.cancelGenerationRef.current = false;
    ctx.generationLockRef.current = false;
    ctx.lastNotifiedFileIdxRef.current = -1;
}

export function cancelJsonImport(ctx) {
    ctx.clearBatchProgress();
    if (ctx.isRenderingAssets) {
        ctx.discardBatchRef.current = true;
        ctx.cancelGenerationRef.current = true;
        ctx.pauseBatchRef.current = false;
        ctx.setIsBatchPauseRequested(false);
        ctx.showToast('Batch akan dibatalkan setelah prompt yang sedang berjalan selesai.', 'info');
        return;
    }
    ctx.resetSidebarToManual();
    ctx.showToast('JSON preset cancelled.', 'info');
}

export function handleAssetTypeChange(newType, ctx) {
    const preset = ASSET_TYPE_PRESETS[newType];
    if (!preset) return;
    ctx.setReferenceInferredSettings(null);
    ctx.setVectorState(prev => {
        const newVisual = { ...prev.visualSettings };
        const dirty = prev._visualDirty || {};
        ['aspectRatio', 'style', 'background', 'outputFormat', 'highDpiSharpness', 'faceless', 'negativeSpace'].forEach(k => {
            if (!dirty[k] && preset[k] !== undefined) newVisual[k] = preset[k];
        });
        const validStyles = STYLES_BY_ASSET_TYPE[newType] || [];
        const reset = { assetType: newType, generationMode: 'single', quantity: 1, visualSettings: newVisual, _assetTypeDirty: true, iconMode: false, iconStyle: null, iconQuantity: 1, iconGenerationMode: 'per_canvas', _generationModeDirty: false };
        if (dirty.style && !validStyles.includes(newVisual.style)) {
            const { style: _removed, ...restDirty } = dirty;
            return { ...prev, ...reset, _visualDirty: restDirty };
        }
        if (!dirty.style && !validStyles.includes(newVisual.style)) newVisual.style = validStyles[0];
        return { ...prev, ...reset };
    });
}

export function handleVisualSettingChange(key, value, ctx) {
    ctx.setReferenceInferredSettings(null);
    ctx.setVectorState(prev => ({ ...prev, visualSettings: { ...prev.visualSettings, [key]: value }, _visualDirty: { ...prev._visualDirty, [key]: true } }));
}

export function handleMasterPromptBlur(ctx) {
    const { vectorState } = ctx;
    if (!vectorState.iconMode) return;
    const raw = vectorState.singlePromptInput;
    const detectedCount = vectorState.iconGenerationMode === 'per_canvas' ? extractLeadingIconCount(raw) : null;
    const cleaned = sanitizeIconThemeInput(raw);
    if (cleaned === raw && !detectedCount) return;
    const shouldSyncQuantity = detectedCount != null && detectedCount !== vectorState.iconQuantity;
    ctx.setVectorState(prev => ({ ...prev, singlePromptInput: cleaned, iconQuantity: shouldSyncQuantity ? detectedCount : prev.iconQuantity }));
    if (shouldSyncQuantity) ctx.showToast(`Terdeteksi angka ${detectedCount} di prompt — disinkron ke "Icons to Generate". Prompt dibersihkan jadi tema saja.`, 'info');
    else if (cleaned !== raw) ctx.showToast('Prompt dibersihkan: kata jumlah/istilah mode dihapus, tersisa tema saja.', 'info');
}

export function handleResetToPreset(ctx) {
    const preset = ASSET_TYPE_PRESETS[ctx.vectorState.assetType];
    if (!preset) return;
    ctx.setReferenceInferredSettings(null);
    ctx.setVectorState(prev => ({ ...prev, visualSettings: { ...prev.visualSettings, aspectRatio: preset.aspectRatio, style: STYLES_BY_ASSET_TYPE[prev.assetType]?.[0] || preset.style, background: preset.background, outputFormat: preset.outputFormat, highDpiSharpness: preset.highDpiSharpness, faceless: preset.faceless, negativeSpace: preset.negativeSpace, customDirective: '', customAvoid: '' }, _visualDirty: {} }));
    ctx.showToast('Visual settings reset to asset type preset.', 'info');
}

export function checkPromptSafety(text, ctx) {
    if (!text || !text.trim()) return { safe: true, warnings: [], brandHits: [] };
    const brandHits = checkBrandSafety(text);
    const warnings = [];
    if (brandHits.length > 0) warnings.push(`Brand/IP detected: ${brandHits.join(', ')}`);
    const news = detectNewsEvent(text, ctx.adobeCategory || '');
    if (news.detected) warnings.push(`News-event reference detected ("${news.reference}") — Adobe rejects editorial/newsworthy content in commercial stock.`);
    const sensitive = detectSensitiveContent(text);
    if (sensitive.detected) warnings.push(`Sensitive content detected ("${sensitive.reason}") — blocked by Adobe Stock.`);
    return { safe: brandHits.length === 0 && !news.detected && !sensitive.detected, warnings, brandHits, safetyRules: CONTENT_SAFETY_RULES };
}

// canonical: engines/prompt.ts (single source truth, strong_v2 deterministic tree)
export const resolveStyleKeyFromVision = resolveStyleKeyFromVisionImpl;

// Infer safe generation settings from visual truth only. No API calls: reference
// imports must remain usable even when the optional vision pass is incomplete.
export const resolveReferenceGenerationSettings = (vision = {}, platform = DEFAULT_PLATFORM) => {
    const platformKey = PLATFORM_ADAPTERS[platform]?.status === 'active' ? platform : DEFAULT_PLATFORM;
    const adapter = PLATFORM_ADAPTERS[platformKey];
    // Pisahkan sinyal agar patternType "not a pattern" tidak jadi false-positive.
    const visualStyleRaw = String(vision.visualStyle || '').toLowerCase();
    const compositionRaw = String(vision.composition || '').toLowerCase();
    const patternTypeRaw = String(vision.patternType || '').toLowerCase();
    const environmentRaw = String(vision.environment || '').toLowerCase();
    const subjectRaw = String(vision.subject || vision.primarySubject || '').toLowerCase();
    const text = [vision.visualStyle, vision.composition, vision.patternType, vision.environment, vision.subject, vision.primarySubject].filter(Boolean).join(' ').toLowerCase();
    const people = Boolean(vision.peopleVisible) || Number(vision.peopleCount) > 0;
    const isPattern = (() => {
        if (/not a pattern|no pattern|not pattern|none|no repeating|without pattern/.test(patternTypeRaw)) return false;
        if (/\b(seamless|repeating|repeat|tile|all[-\s]*over)\b/.test(patternTypeRaw) && /\bpattern\b/.test(patternTypeRaw)) return true;
        if (/^(seamless repeating pattern|geometric pattern|floral pattern|tiling pattern|abstract pattern)/.test(patternTypeRaw)) return true;
        const combined = `${visualStyleRaw} ${compositionRaw}`;
        if (/\bpattern\b/.test(combined) && /\b(seamless|repeating|repeat|tile|all[-\s]*over)\b/.test(combined)) return true;
        // composition "repeating all-over pattern" eksplisit juga dianggap pattern
        if (/repeating all-over|all-over pattern/.test(compositionRaw)) return true;
        return false;
    })();
    const cameraAngleRaw = String(vision.cameraAngle || '').toLowerCase();
    const is3d = /\b3d\b|three[- ]dimensional|render|isometric|cgi|product render/.test(visualStyleRaw + ' ' + compositionRaw + ' ' + cameraAngleRaw);
    const isPhoto = /photo|photograph|photoreal|realistic|camera|portrait|natural light|lifestyle/.test(visualStyleRaw + ' ' + environmentRaw) || people || (/indoor|outdoor|landscape|scene|environment/.test(environmentRaw) && !isPattern);
    const isIllustration = /illustrat|watercolor|paint|drawing|hand[- ]drawn|artwork|vector illustration|flat vector/.test(visualStyleRaw + ' ' + cameraAngleRaw);
    const assetType = isPhoto ? 'photo' : is3d ? '3d' : isPattern ? 'vector' : isIllustration ? 'illustration' : 'vector';
    const preset = ASSET_TYPE_PRESETS[assetType] || ASSET_TYPE_PRESETS.vector;
    const validStyles = STYLES_BY_ASSET_TYPE[assetType] || STYLES_BY_ASSET_TYPE.vector;
    // FIX 2: Use deterministic resolveStyleKeyFromVision instead of fuzzy regex.
    // resolveStyleKeyFromVision reads structured renderingStyle/illustrationSignals/patternSignals
    // from vision to produce the exact sidebar style name that maps to a STYLE_PRESET_DNA entry.
    const resolvedStyleKey = resolveStyleKeyFromVision(vision, assetType, isPattern);
    const style = validStyles.includes(resolvedStyleKey) ? resolvedStyleKey : (preset.style || validStyles[0]);

    const categoryMatch = [
        [/animal|pet|wildlife|bird|insect|cat|dog|kitten|feline/, 'Animals', 1],
        [/building|architecture|interior|city|urban/, 'Buildings and Architecture', 2],
        [/business|office|finance|team|corporate/, 'Business', 3],
        [/food|drink|beverage|kitchen|bakery/, 'Food and Drink', 7],
        [/mountain|beach|ocean|forest|landscape|skyline/, 'Landscapes', 11],
        [/people|person|portrait|family|human/, 'People', 13],
        [/flower|plant|tree|nature|botanical|floral/, 'Nature', 14],
        [/technology|computer|phone|digital|robot|device/, 'Technology', 19],
        [/car|vehicle|transport|airplane|ship/, 'Transportation', 20],
        [/sport|fitness|athlete/, 'Sports', 18],
    ].find(([pattern]) => pattern.test(text) || pattern.test(subjectRaw));
    const category = categoryMatch?.[1] || (isPattern ? 'Illustrations and Clipart' : assetType === 'photo' ? 'Lifestyle' : 'Objects');
    const platformCategoryId = categoryMatch?.[2] || ({
        'Illustrations and Clipart': 8, Lifestyle: 12, Objects: 8,
    }[category] || 8);
    const subcategory = (ADOBE_CATEGORY_TAXONOMY[category] || [])[0] || '';
    const internalCategory = resolveDNAFromOfficial(platformKey, platformCategoryId, subcategory) || category;
    const safeCategory = ADOBE_CATEGORY_TAXONOMY[internalCategory] ? internalCategory : category;
    return {
        assetType,
        style: validStyles.includes(style) ? style : validStyles[0] || preset.style,
        aspectRatio: preset.aspectRatio,
        preset,
        platformCategoryId: adapter?.categories?.some(c => c.id === platformCategoryId) ? platformCategoryId : 8,
        internalCategory,
        category: safeCategory,
        subcategory: (ADOBE_CATEGORY_TAXONOMY[safeCategory] || [])[0] || '',
    };
};



export const ICON_VARIATION_VISUALS = [
    'front view, object centered and symmetrical, minimal composition',
    'three-quarter angle view, object slightly rotated, subtle depth in perspective',
    'side profile view, clean silhouette, strong recognizable outline',
    'close-up detail view emphasizing the main feature or handle of the subject',
    'object shown with subtle motion lines suggesting active use, dynamic composition',
    'top-down view, simplified flat layout, clear readable shape',
    'object paired with one small complementary accent element that reinforces its purpose',
    'back view with a distinctive identifying detail, minimal and clean',
];

export const buildIconVariationVisuals = (theme, count) => {
    if (!count || count < 1) return [];
    const base = sanitizeIconThemeInput(theme) || 'subject';
    const out = [];
    for (let i = 0; i < count; i++) {
        const detail = ICON_VARIATION_VISUALS[i % ICON_VARIATION_VISUALS.length];
        const idx = Math.floor(i / ICON_VARIATION_VISUALS.length);
        out.push({
            title: idx === 0 ? `${base} — ${detail.split(',')[0]}` : `${base} ${i + 1}`,
            subject: base,
            visualDescription: `${detail}${idx > 0 ? ` (concept variant ${idx + 1})` : ''}`,
        });
    }
    return out;
};

export const composeFinalPrompt = (conceptText, isRevision = false, revisionInstruction = '', archetypeInstruction = '', config, resolvedBg?: ResolvedBackground, semanticIntent = null, styleInterpretation = null) => {
        const visualSettings = config.visualSettings || {};
        const preset = ASSET_TYPE_PRESETS[config.assetType] || ASSET_TYPE_PRESETS.vector;
        const sharpnessToken = visualSettings.highDpiSharpness ? "High-DPI 4K ultra-sharp rendering, pristine precision lines." : "";
        const facelessToken = visualSettings.faceless ? "Faceless subjects, abstract minimal facial details." : "";
        const negativeSpaceToken = visualSettings.negativeSpace ? "Generous negative copy space around subject." : "";
        const categoryContext = `Creative Collection: ${config.internalCategory || config.adobeCategory || ''} > ${config.subcategory || ''}.`;
        // EU-5: resolvedBg.promptHint dipakai untuk non-special backgrounds;
        // transparent & greenscreen selalu override (user intent eksplisit).
        const bgDesc = visualSettings.background === 'transparent'
            ? 'no background (transparent alpha), subject isolated'
            : visualSettings.background === 'greenscreen'
            ? 'solid pure chroma-key green background (#00B140), subject fully isolated on bright green screen, no shadow bleed onto background'
            : visualSettings.background === 'scene'
            ? 'natural environmental scene background, full contextual depth, realistic setting appropriate to subject, authentic location or interior, ambient lighting consistent with scene'
            : resolvedBg?.promptHint ?? `pure ${visualSettings.background || preset.background} background`;
        // Photo = full-frame lifestyle: hardcode "Isolated subject" tidak berlaku.
        const isolatedClause = config.assetType === 'photo' ? '' : 'Isolated subject,';
        const photoAuthorityClause = config.assetType === 'photo'
            ? 'HARD PHOTO AUTHORITY: photorealistic camera-captured photography only, real optical lens, physically plausible natural light and photographic texture; not illustration, not vector, not 3D render, not CGI, not digital painting.'
            : '';
        const globalRules = `${preset.styleHint}. ${photoAuthorityClause} ${isolatedClause} ${bgDesc}. ${negativeSpaceToken} ${sharpnessToken} ${facelessToken}`.replace(/\s+/g, ' ').trim();
        // Sprint 2: Style Interpretation — visual directive (preset/custom) dipakai
        // sebagai deskripsi rendering; style tidak pernah mengganti subject.
        const styleDesc = styleInterpretation?.visualDirective
            ? styleInterpretation.visualDirective
            : (visualSettings.style || preset.style);
        const visual = `Aspect Ratio: ${visualSettings.aspectRatio || preset.aspectRatio}, Style: ${styleDesc}`;
        const archetypeClause = archetypeInstruction ? ` | Composition Archetype (MUST FOLLOW): ${archetypeInstruction}` : '';
        // Fix #3 (audit DNA): SEMANTIC LOCK — user intent tidak boleh diganti oleh expansion.
        const semanticLockClause = semanticIntent ? ` | ${buildSemanticLockToken(semanticIntent)}` : '';

        if (isRevision) {
            return `${globalRules} | ${visual} | ${categoryContext} | Concept: ${conceptText} | Revision: ${revisionInstruction}${semanticLockClause}`;
        }
        return `${globalRules} | ${visual} | ${categoryContext} | Concept: ${conceptText}${archetypeClause}${semanticLockClause}`;
    };

// Thin wrapper → compilePrompt (Sprint 3, Phase 18 unified path). Dipertahankan
// untuk backward-compat: callsite lama (revision, preview prompt) tetap jalan,
// dan semua callsite sidebar/JSON otomatis memakai deterministic compiler.
export const buildPromptV2 = (userPrompt, dnaContext, commercialRules, styleGuidance, cga, negativePrompt, archetypeInstruction = '', config, resolvedBg?: ResolvedBackground, semanticIntent = null, styleInterpretation = null, ctx) => {
        return compilePrompt({
            semanticIntent,
            resolvedConfig: config,
            styleInterpretation,
            dnaContext,
            commercialRules,
            cga,
            negativePrompt,
            archetypeInstruction,
            userPrompt,
            resolvedBg,
            styleCompatibility: null,
        }, ctx);
    };



export function buildRegenerationPlan(intent, semanticQA, extra = {}) {
  const reinforce = [];
  const remove = [];
  if (semanticQA?.verdict === 'wrong_subject') {
    if (intent?.subject?.primary) reinforce.push(`PRIMARY SUBJECT: ${intent.subject.primary}`);
    if (intent?.subject?.domain) reinforce.push(`DOMAIN: ${intent.subject.domain}`);
    remove.push(...(semanticQA.detectedDomains || []));
  }
  // FIX: IP regenerate — AI mendeteksi elemen brand/IP di gambar. Plan regenerasi
  // harus eksplisit meminta versi generik bebas merek (sebelumnya tidak ada plan,
  // jadi auto-regen IP tidak pernah menghasilkan prompt yang benar).
  if (extra?.ipRegenerate && Array.isArray(extra.ipElements)) {
    remove.push(...extra.ipElements.filter(Boolean));
    reinforce.push('GENERIC, ROYALTY-FREE depiction — no recognizable brand, logo, trademark, or government emblem.');
  }
  return {
    reinforce,
    remove,
    preserve: [
      intent?.subject?.primary,
      intent?.asset?.assetType,
      intent?.style?.requested,
      intent?.aspectRatio,
    ].filter(Boolean),
  };
}



export function buildProductionTrace({
  request = {}, semanticIntent = null, resolvedConfig = null, styleInterpretation = null,
  promptGraph = null, constraints = null, finalPrompt = '', negativePrompt = '',
  generationModel = '', conceptFingerprint = null, semanticQA = null, qualityGate = null,
  compliance = null, metadata = null,
}) {
  return {
    request,
    normalizedRequest: request,
    resolvedConfig,
    semanticIntent,
    styleInterpretation,
    promptGraph,
    constraints,
    finalPrompt,
    negativePrompt,
    generationModel,
    conceptFingerprint,
    semanticQA,
    qualityGate,
    compliance,
    metadata,
    tracedAt: Date.now(),
  };
}



// Cache in-memory: styleName (lowercase) → StyleInterpretation.
const STYLE_CACHE = new Map();

const STYLE_INTERPRETATION_EMPTY = {
    styleName: '',
    status: 'custom',
    visualDirective: '',
    characteristics: [],
    preferredProfiles: [],
    preferredDomains: [],
    incompatibleDomains: [],
    confidence: 0,
};

// Interpreter Gemini — style name + konteks subject → visual rendering directives
// (bukan subject). FASE 11: subject-aware — Gemini tahu subject LOCKED dan hanya
// mendeskripsikan bagaimana style diterapkan ke subject itu, tidak pernah menggantinya.
// Output kontrak:
//   { styleName, visualDirective, characteristics[], preferredProfiles[],
//     preferredDomains[], incompatibleDomains[], confidence }
// Gagal/timeout/invalid JSON → fallback preserve-as-is (visualDirective =
// styleName, confidence 0) supaya custom style tetap dipakai, tidak di-replace.
async function interpretStyleWithGemini(styleName, aiConfig, onApiCall, semanticIntent = null) {
    const primarySubject = semanticIntent?.primarySubject || '';
    const domain = semanticIntent?.subjectDomain || semanticIntent?.domain || '';
    const assetProfile = semanticIntent?.assetProfile || '';
    const assetType = semanticIntent?.assetType || '';

    // Konteks subject (kalau ada) — Gemini wajib mendeskripsikan style UNTUK subject ini.
    const subjectContextBlock = primarySubject
        ? [
            `The user's PRIMARY SUBJECT is: "${primarySubject}".`,
            `Domain: ${domain || 'not specified'}.`,
            `Asset type: ${assetType || 'not specified'}, profile: ${assetProfile || 'not specified'}.`,
            `You MUST describe how the "${styleName}" style renders THIS subject.`,
        ].join('\n')
        : '';

    const payload = {
        contents: [{
            parts: [{
                text: `You are a visual style interpreter for commercial stock illustration prompts.

Interpret the style name below into VISUAL RENDERING DIRECTIVES ONLY.

${subjectContextBlock}

CRITICAL RULES:
- The subject is LOCKED. You describe RENDERING of the subject, never a different subject.
- "${styleName}" applied to "${primarySubject || "the user's subject"}" must still depict ${primarySubject || 'the subject'}.
- Style affects linework, color, texture, lighting, shape language, composition feel — NEVER the identity of the subject.
- If the style name contains a domain hint (e.g. "Minimal Botanical"), interpret it as RENDERING VOCABULARY (botanical linework, organic forms), NOT as a subject replacement.
- Do NOT say "instead of X draw Y". The subject never changes.
- Describe HOW things are rendered (linework, color treatment, texture, lighting, composition feel).
- NEVER invent, infer, or change the SUBJECT.
- "Cottage Garden" must describe a soft hand-drawn rendering style applied to the subject — NOT change the subject into a garden.
- "Cyberpunk" must describe neon/high-tech rendering applied to the subject — it may plausibly apply to any subject.
- "Flat Commercial" → clean flat vector rendering.

Style name: "${styleName}"

Return ONLY valid JSON (no markdown, no code fences):
{
  "visualDirective": "one concise directive string, max 220 chars",
  "characteristics": ["3-5 short rendering traits"],
  "preferredProfiles": ["pattern", "icon", "illustration", "3d", "scene", "object", "background", "infographic", "character"],
  "preferredDomains": ["short domain tags this style naturally suits, e.g. botanical, nature, floral, garden, lifestyle, technology, abstract"],
  "incompatibleDomains": ["domains where this style would be a very awkward fit (keep to 0-3, empty if none obvious)"],
  "confidence": 0
}

Rules:
- "confidence": 0-1, how confident you are in the interpretation (0.5+ = reasonable, 0.8+ = high).
- "preferredDomains": 2-5 short lowercase tags. Include obvious fits only.
- "incompatibleDomains": leave EMPTY unless the mismatch is striking — do not force conflicts.
- "visualDirective": must describe RENDERING only, never name a subject.`
            }],
        }],
        systemInstruction: {
            parts: [{ text: 'You interpret STYLE only, applied to the given LOCKED subject. You never decide subjects, objects, or scenes. Output English. Return ONLY valid JSON.' }]
        },
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    const { data, reason } = await callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'style-interpretation' });

    if (!data) {
        console.warn(`[Imagin] Style interpreter failed (${reason || 'unknown'}) for "${styleName}" — preserve as custom.`);
        return { ...STYLE_INTERPRETATION_EMPTY, styleName, visualDirective: styleName };
    }

    const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
    return {
        styleName,
        status: 'custom',
        visualDirective: String(data.visualDirective || styleName).trim(),
        characteristics: Array.isArray(data.characteristics) ? data.characteristics.map(String).slice(0, 5) : [],
        preferredProfiles: Array.isArray(data.preferredProfiles) ? data.preferredProfiles.map(String).slice(0, 6) : [],
        preferredDomains: Array.isArray(data.preferredDomains) ? data.preferredDomains.map(String).map(d => d.toLowerCase()).slice(0, 6) : [],
        incompatibleDomains: Array.isArray(data.incompatibleDomains) ? data.incompatibleDomains.map(String).map(d => d.toLowerCase()).slice(0, 3) : [],
        confidence,
    };
}

// Interpretasi style dari registry preset — deterministic, tanpa API call.
// Preset dipakai langsung sebagai interpretation (Phase 2: known → preset).
export function buildStyleInterpretation(styleName, ctx) {
    const preset = ctx.findStylePreset(styleName);
    if (!preset) return null;
    return {
        styleName: styleName || '',
        status: 'preset',
        visualDirective: preset.promptTrigger || '',
        characteristics: preset.characteristics ? [preset.characteristics] : [],
        preferredProfiles: [],
        preferredDomains: [],
        incompatibleDomains: [],
        confidence: 1,
    };
}

// Entry point: preset → deterministic; custom → Gemini (di-cache per style name).
// FASE 11: semanticIntent diteruskan ke interpreter — subject-aware.
export async function getStyleInterpretation(styleName, aiConfig, onApiCall, semanticIntent = null, ctx, customOverride = null) {
    const name = (styleName || '').trim();
    // A6: custom style override — directive/avoid dari Sidebar menggantikan lapisan preset ([STYLE]).
    if (customOverride && (customOverride.directive || customOverride.avoid)) {
        const parts = [];
        if (customOverride.directive) parts.push(`CUSTOM STYLE DNA: ${customOverride.directive}`);
        if (customOverride.avoid) parts.push(`CUSTOM STYLE AVOID: ${customOverride.avoid}`);
        return {
            styleName: name || 'custom',
            status: 'custom',
            visualDirective: parts.join(' · '),
            characteristics: [],
            preferredProfiles: [],
            preferredDomains: [],
            incompatibleDomains: [],
            confidence: 1,
        };
    }
    if (!name) return null;

    // Preset selalu deterministic — tidak di-cache, tidak perlu API.
    const presetInterpretation = buildStyleInterpretation(name, ctx);
    if (presetInterpretation) return presetInterpretation;

    // Custom → cache per style name (tanpa subject — style adalah rendering
    // vocabulary stabil lintas subject).
    const cacheKey = name.toLowerCase();
    if (STYLE_CACHE.has(cacheKey)) return STYLE_CACHE.get(cacheKey);

    const interpretation = await interpretStyleWithGemini(name, aiConfig, onApiCall, semanticIntent);
    STYLE_CACHE.set(cacheKey, interpretation);
    return interpretation;
}



export function buildPromptGraph({
  semanticIntent, resolvedConfig, styleInterpretation, dnaContext,
  commercialRules, cga, negativePrompt, archetypeInstruction, userPrompt,
  resolvedBg, styleCompatibility,
}) {
  return {
    intent: semanticIntent ? {
      rawPrompt: semanticIntent.rawPrompt || '',
      primarySubject: semanticIntent.primarySubject || '',
      subjectDomain: semanticIntent.subjectDomain || '',
      assetConcept: semanticIntent.assetConcept || '',
      assetProfile: semanticIntent.assetProfile || null,
      lockedTerms: semanticIntent.lockedTerms || [],
      forbiddenDomains: semanticIntent.forbiddenDomains || [],
    } : null,
    subject: semanticIntent?.primarySubject || '',
    domain: semanticIntent?.subjectDomain || '',
    assetProfile: semanticIntent?.assetProfile || resolvedConfig?.assetProfile || null,
    style: styleInterpretation ? {
      name: styleInterpretation.styleName || '',
      status: styleInterpretation.status || 'custom',
      visualDirective: styleInterpretation.visualDirective || '',
      confidence: styleInterpretation.confidence || 0,
    } : { name: resolvedConfig?.style || '', status: 'unknown' },
    background: resolvedBg?.mode || resolvedConfig?.background || '',
    commercial: commercialRules || '',
    negative: negativePrompt || '',
    composition: archetypeInstruction || '',
    userPrompt: userPrompt || '',
    styleCompatibility: styleCompatibility || null,
  };
}

// Layered Negative Prompt (Phase 16) — 6 layer terstruktur.
// Layer lama (buildNegativePrompt) tetap jadi base; di sini ditambah layer
// SEMANTIC (forbidden domains) + STYLE (incompatible domains dari interpreter).


// PREVIEW HELPER — Synchronous prompt preview untuk "Lihat Prompt" button.
// Mereplikasi resolve chain generate path (buildDNAContext → buildCommercialRules
// → buildNegativePrompt → resolveBackground → compilePrompt) tanpa async calls
// (skip styleInterpretation & expandPromptWithGemini — tidak diperlukan preview).
export function buildPreviewPrompt(vectorState, systemSettings, ctx) {
  const { buildDNAContext, buildCommercialRules, getPaletteForCategory, CATEGORY_DNA } = ctx;
  const baseInput = vectorState.singlePromptInput?.trim() || 'prompt kosong';
  const effectiveCat = vectorState.adobeCategory || '';
  const isSpecific = isSpecificUserInput(baseInput);

  const dnaContext = effectiveCat
    ? buildDNAContext(
        effectiveCat,
        vectorState.subcategory,
        null,            // tracker null — preview tidak perlu diversity tracking
        isSpecific,
        vectorState.visualSettings?.style || '',
        vectorState.selectedSubject,
        vectorState.selectedScene,
        null,            // batchDiversity null
        null,            // clusterPlan null
        isSpecific,
        vectorState.assetType,
      )
    : '';
  const weightedDNA = dnaContext;

  const commercialRules = effectiveCat
    ? buildCommercialRules(effectiveCat, vectorState.subcategory, vectorState.assetType)
    : '';
  const marketPalette = getPaletteForCategory(effectiveCat);

  const cga = buildCGAContext(baseInput, 0, null);

  const resolvedBg = resolveBackground(
    vectorState.visualSettings?.background,
    vectorState.assetType,
    effectiveCat,
    vectorState.subcategory,
    Boolean(vectorState._visualDirty?.background),
  );

  const _subNegArr = CATEGORY_DNA[effectiveCat]?.subcategories?.[vectorState.subcategory]?.conceptDNA?.negativePrompt;
  const subcategoryNeg = Array.isArray(_subNegArr) && _subNegArr.length > 0 ? _subNegArr.join(', ') : '';

  const negativePrompt = buildNegativePrompt(
    systemSettings?.commercialRules?.defaultNegativePrompt,
    effectiveCat,
    vectorState.visualSettings?.style,
    null,   // archetype null
    cga.negative,
    subcategoryNeg,
    vectorState.assetType,
  );

  const semanticIntent = extractSemanticIntent(baseInput, effectiveCat, vectorState.subcategory, vectorState.assetType);

  const layeredNegative = buildLayeredNegativePrompt({
    baseNegative: negativePrompt,
    assetType: vectorState.assetType,
    categoryKey: effectiveCat,
    styleInterpretation: null,   // skip async — preview only
    semanticIntent,
  }, ctx);

  return compilePrompt({
    semanticIntent,
    resolvedConfig: vectorState,
    styleInterpretation: null,
    dnaContext: weightedDNA,
    commercialRules,
    cga,
    negativePrompt: layeredNegative,
    archetypeInstruction: '',
    userPrompt: baseInput,
    resolvedBg,
    marketPalette,
    styleCompatibility: null,
  }, ctx);
}

// Deterministic Prompt Compiler (Phase 9). Input identik → output identik.
// DIPAKAI oleh sidebar & JSON batch (unified path, Phase 18). `buildPromptV2`
// dipertahankan sebagai thin wrapper di atas fungsi ini (backward-compat).




export function assessProfileMatch(assetProfile, visionAnalysis) {
  const profile = (assetProfile || '').toLowerCase();
  if (!profile || !visionAnalysis) return { verdict: 'unknown', confidence: 0, reason: 'no profile or vision' };

  const patternType = String(visionAnalysis.patternType || '').toLowerCase();
  const composition = String(visionAnalysis.composition || '').toLowerCase();
  const subject = String(visionAnalysis.primarySubject || '').toLowerCase();

  if (profile === 'pattern') {
    // 'not a pattern' / 'no pattern' harus TIDAK dianggap pattern (fix substring bug).
    const patternTypeLower = patternType;
    const explicitNoPattern = patternTypeLower.includes('not a pattern') || patternTypeLower.includes('no pattern') || patternTypeLower.includes('not pattern');
    const isPattern = !explicitNoPattern && (patternTypeLower.includes('pattern') || composition.includes('repeat') || composition.includes('tile'));
    const isSingleHero = composition.includes('single') || composition.includes('isolated') || subject.includes('single');
    if (isPattern && !isSingleHero) return { verdict: 'match', confidence: 0.85, reason: 'pattern detected' };
    if (isSingleHero && !isPattern) return { verdict: 'mismatch', confidence: 0.8, reason: 'isolated single object, expected pattern' };
    return { verdict: 'unknown', confidence: 0.5, reason: 'pattern ambiguous' };
  }

  if (profile === 'icon') {
    const isIsolated = composition.includes('isolated') || composition.includes('single') || composition.includes('centered');
    if (isIsolated) return { verdict: 'match', confidence: 0.8, reason: 'isolated single object' };
    return { verdict: 'unknown', confidence: 0.5, reason: 'icon composition ambiguous' };
  }

  // Fase B (thumbnail hero): untuk profile non-pattern (illustration/object/
  // scene), komposisi yang "busy/cluttered" merusak keterbacaan di thumbnail
  // kandidat review. Hanya menurunkan, tidak pernah menaikkan.
  if (profile === 'illustration' || profile === 'object' || profile === 'scene') {
    const busySignals = ['busy', 'cluttered', 'crowded', 'chaotic', 'multiple competing', 'cluttered background'];
    const isBusy = busySignals.some(sig => composition.includes(sig));
    if (isBusy) {
      return { verdict: 'mismatch', confidence: 0.7, reason: `composition reads as busy/cluttered — weak hero at thumbnail size (${composition})` };
    }
  }

  return { verdict: 'unknown', confidence: 0.5, reason: `no rule for profile ${profile}` };
}



export const executeGenerateNormalAssets = async (ctx) => {
        const { vectorState, setVectorState, systemSettings, assets, setAssets, setBlockingDialog, importedBatch, setImportedBatch, batchQueue, setBatchQueue, setIsBatchPauseRequested, pauseBatchRef, discardBatchRef, cancelGenerationRef, setIsRenderingAssets, setGenerationProgress, setPromptSafety, showToast, resetSidebarToManual, checkBatchTitleSimilarity, checkPreGenerationSimilarity, analyzeConceptGenericity, incrementApiCallCounter, checkBatchVisualSimilarity, computeBatchDiversityScore, runAutoPreflight, lockSettings, activeProjectId } = ctx;
        const { MAX_BATCH_COUNT, loadBatchProgress, loadDiversityTracker, generateAnimationCode, saveAssetDB, createInitialVectorState, buildDNAContext, buildCommercialRules, buildStyleGuidance, getPaletteForCategory, CATEGORY_DNA, createDraftStockMetadata, finalizeAsset, saveBatchProgress, clearBatchProgress, normalizeJobRecord } = ctx;
        const rawInput = vectorState.singlePromptInput.trim();
        if (!rawInput) {
            showToast('Please enter a prompt or theme.', 'error');
            return;
        }

        // FASE 8: Request Intake — blocking validation sebelum pipeline.
        const intakeCheck = validateRequestIntake({
            prompt: rawInput,
            assetType: vectorState.assetType,
            category: vectorState.adobeCategory || vectorState.internalCategory,
            platform: vectorState.platform,
        });
        if (!intakeCheck.valid) {
            showToast(`Request tidak valid: ${intakeCheck.errors.join(', ')}`, 'error');
            return;
        }
        // FASE 8: Normalize — request sidebar → NormalizedRequest seragam.
        // Canonical intake: downstream engines consume normalizedRequest as single source of truth
        const normalizedRequest = normalizeRequest({
            ...vectorState,
            prompt: rawInput,
            source: 'sidebar',
        });
        // Keep sanitized baseInput for visuals; request authority comes from the
        // normalized intake object.

        const baseInput = (vectorState.assetType === 'illustration' || vectorState.assetType === '3d')
            ? sanitizeVisualPromptInput(rawInput)
            : rawInput;

        if ((vectorState.assetType === 'illustration' || vectorState.assetType === '3d') && !baseInput) {
            showToast('Tema kosong setelah kata jumlah/instruksi dibersihkan. Tulis tema yang lebih deskriptif.', 'error');
            return;
        }

        const brandHits = checkBrandSafety(baseInput);
        if (brandHits.length > 0) {
            setBlockingDialog({
                title: 'Brand/IP Content Detected',
                message: `"${brandHits.join(', ')}" terdeteksi di prompt. Adobe Stock akan menolak konten bermerek. Hapus istilah tersebut dari prompt Anda.`,
                onClose: () => setBlockingDialog(null),
            });
            return;
        }

        const similarExisting = checkPreGenerationSimilarity(baseInput, vectorState.internalCategory || vectorState.adobeCategory, assets);
        if (similarExisting.length >= 3) {
            showToast(` Subject "${baseInput.slice(0, 40)}" sudah mirip dengan ${similarExisting.length} asset existing (${similarExisting[0]}…). Pertimbangkan pilih subject lain untuk diversity.`, 'info');
        }

        // EU-10: Marketplace Differentiation — cek genericity konsep sekali per
        // request (baseInput dipakai bareng untuk semua asset di batch ini),
        // BUKAN per asset, biar biaya API tidak berkali lipat sia-sia.
        let differentiationResult = null;
        if (systemSettings.commercialRules.enableDifferentiationCheck) {
            differentiationResult = await analyzeConceptGenericity(
                baseInput,
                vectorState.internalCategory || vectorState.adobeCategory,
                vectorState.subcategory,
                systemSettings.aiConfig,
                incrementApiCallCounter
            );
            if (differentiationResult?.recommendation === 'reconsider') {
                const patternNote = differentiationResult.matchedCommonPattern ? `\n\nPola tersaturasi terdeteksi: "${differentiationResult.matchedCommonPattern}"` : '';
                const suggestions = differentiationResult.differentiationSuggestions.length > 0 ? `\n\nSaran diferensiasi:\n${differentiationResult.differentiationSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '';
                const confirmed = await new Promise<boolean>(resolve => setBlockingDialog({
                    title: `Konsep Terlalu Umum (Skor Saturasi: ${differentiationResult.genericityScore}/100)`,
                    message: `"${baseInput.slice(0, 60)}${baseInput.length > 60 ? '...' : ''}" kemungkinan besar akan DITOLAK Adobe Stock sebagai "Similar content in our collection" -- tema ini sudah sangat tersaturasi di marketplace.${patternNote}${suggestions}\n\nEdit prompt dengan angle/konteks yang lebih unik sebelum generate.`,
                    confirmLabel: 'Tetap Generate (Risiko Ditolak)', cancelLabel: 'Edit Prompt Dulu',
                    onClose: () => { setBlockingDialog(null); resolve(true); },
                    onCancel: () => { setBlockingDialog(null); resolve(false); },
                }));
                if (!confirmed) return;
            } else if (differentiationResult?.recommendation === 'differentiate' && differentiationResult.differentiationSuggestions[0]) {
                showToast(` Konsep cukup umum. Saran diferensiasi: ${differentiationResult.differentiationSuggestions[0]}`, 'info');
            }
        }

        cancelGenerationRef.current = false;
        // Reset pause request di awal — supaya generate baru (termasuk resume)
        // tidak langsung ter-pause oleh sisa request lama (FASE D2).
        pauseBatchRef.current = false;
        setIsRenderingAssets(true);

        const batchId = `Batch #${Math.floor(100 + Math.random() * 900)}`;
        const resumeSessionId = `normal-${Date.now()}`;

        // HARD LIMIT — caps batch size (MAX_BATCH_COUNT = 20)
        const countToGenerate = Math.min(vectorState.quantity || 1, MAX_BATCH_COUNT);

        // FASE D2 — Batch mode resume: kalau ada progress tersimpan dari batch
        // yang di-pause, lanjutkan dari item berikutnya (bukan mulai ulang).
        // Hanya resume kalau progress berasal dari batch NORMAL (batch data
        // berisi vectorState) — progress JSON batch punya struktur berbeda.
        const isBatchMode = vectorState.generationMode === 'batch';
        // FASE D2 — concurrency berbeda: single → 2 (paralel), batch → 1 (sequential).
        const CONCURRENCY = isBatchMode ? 1 : 2;
        let startIndex = 0;
        if (isBatchMode) {
            const saved = await loadBatchProgress();
            const isNormalBatchProgress = saved && saved.batch && saved.batch.vectorState && !saved.batch.importedBatch;
            // Resume hanya kalau prompt SAMA (user tidak mengubah prompt) —
            // kalau prompt beda, mulai dari 0 dengan prompt baru.
            const samePrompt = isNormalBatchProgress && saved.batch.prompt === baseInput;
            if (samePrompt && saved.promptIndex > 0 && saved.promptIndex < countToGenerate) {
                startIndex = saved.promptIndex;
                showToast(`Melanjutkan batch dari item ${startIndex + 1}/${countToGenerate} (batch sebelumnya dijeda).`, 'info');
            }
        }

        setGenerationProgress({ current: startIndex, total: countToGenerate });
        showToast(`Initiating generation of ${countToGenerate} ${vectorState.assetType} asset(s)...`, 'info');

        const batchArchetypes = countToGenerate > 1
            ? vectorState.useAIComposition
                ? await getBatchSlotsAI(countToGenerate, baseInput, systemSettings)
                : getBatchSlots(countToGenerate)
            : null;

        const batchSession = createBatchSession();
        const effectiveCat = normalizedRequest.category;
        const dnaTracker = await loadDiversityTracker(effectiveCat);

        // FASE 5 (pipeline.ts): SINGLE normal asset → runProductionPipeline.
        // Hanya 1 asset normal (non-icon, non-batch). Batch (quantity>1), icon,
        // JSON, dan ProductionJob stages TIDAK disentuh. Semua preflight di atas
        // (intake, brand, similarity, differentiation) tetap caller-side.
        if (!isBatchMode && countToGenerate === 1 && !vectorState.iconMode) {
            const singleBatchId = `Batch #${Math.floor(100 + Math.random() * 900)}`;
            const singleSemanticIntent = extractSemanticIntent(baseInput, effectiveCat, vectorState.subcategory, vectorState.assetType);
            const singleStyleInterpretation = await getStyleInterpretation(vectorState.visualSettings.style, systemSettings.aiConfig, incrementApiCallCounter, singleSemanticIntent, ctx, (vectorState.visualSettings.customDirective || vectorState.visualSettings.customAvoid) ? { directive: vectorState.visualSettings.customDirective, avoid: vectorState.visualSettings.customAvoid } : null);
            const singleStyleCompatibility = singleStyleInterpretation ? assessStyleCompatibility(singleStyleInterpretation, singleSemanticIntent) : null;
            // Capture the placeholder created by the pipeline so onAssetError can
            // persist a FAILED copy (mirror old normal path App.tsx:13601-13608).
            let pipelinePlaceholder = null;
            let singlePipelineSaveFailed = false;
            try {
const finalAsset = await runProductionPipeline(
    {
        vectorState,
        systemSettings,
        assetIndex: 0,
        batchId: singleBatchId,
        tracker: dnaTracker,
        batchDiversity: createBatchDiversitySession(),
        clusterPlan: null,
        category: effectiveCat,
        semanticIntent: singleSemanticIntent,
        styleInterpretation: singleStyleInterpretation,
        styleCompatibility: singleStyleCompatibility,
        projectId: activeProjectId,
    },
                    {
                        onAssetCreated: (ph) => { pipelinePlaceholder = ph; setAssets(prev => [...prev, ph]); },
                        onAssetReady: async (asset) => {
                            // IMAGIN LOCAL paket (opsional, non-blocking) — mirror live path.
                            if (vectorState.assetType === 'vector' || vectorState.iconMode) {
                                try {
                                    const anim = await generateAnimationCode(asset, systemSettings.aiConfig, incrementApiCallCounter);
                                    if (anim) {
                                        asset.imaginLocalFragment = anim.fragment;
                                        asset.imaginLocalCss = anim.css;
                                        asset.imaginLocalMetadata = anim.metadata;
                                        asset.imaginLocalPreviewHtml = anim.previewHtml;
                                        asset.imaginLocalBaseName = anim.baseName;
                                        asset.imaginLocalPaket = { fragment: anim.fragment, css: anim.css, metadata: anim.metadata, baseName: anim.baseName };
                                        asset.animationHtml = anim.previewHtml;
                                        asset.animationCss = anim.css;
                                        asset.animationPreset = anim.presetId;
                                    }
                                } catch (animErr) {
                                    console.warn('[Imagin] IMAGIN Local paket gagal (opsional):', animErr);
                                }
                            }
                            const saveRes = await saveAssetDB(asset);
                            if (!isFinalSaveCommitted(saveRes)) {
                                // Gallery commit failed: keep the recovery IDB record
                                // (already marked error by saveAssetDB), show failure,
                                // mark placeholder FAILED — do NOT claim a completed
                                // final Gallery asset nor the success toast.
                                singlePipelineSaveFailed = true;
                                const failedAsset = { ...asset, isLoading: false, status: 'FAILED', librarySyncState: 'error' };
                                setAssets(prev => prev.map(a => a.id === asset.id ? failedAsset : a));
                                showToast(`Asset gagal disimpan ke Gallery: ${saveRes?.detail || 'Library sync failed'}`, 'error');
                                return;
                            }
                            setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
                        },
                        onAssetError: async (assetId, err) => {
                            console.error('Generation Error:', err);
                            if (assetId && pipelinePlaceholder) {
                                const failedAsset = { ...pipelinePlaceholder, isLoading: false, status: 'FAILED' };
                                setAssets(prev => prev.map(a => a.id === assetId ? failedAsset : a));
                                try { await saveAssetDB(failedAsset); } catch (persistErr) { console.warn('[Imagin] Failed asset persist error:', persistErr); }
                            }
                            showToast(`Generation stopped due to an error: ${err?.message || err}`, 'error');
                        },
                        onProgress: () => {},
                        onStage: (stage) => {
                            if (stage === 'generate') setGenerationProgress({ current: 1, total: 1 });
                        },
                        onWarning: (w) => showToast(w, 'info'),
                        onApiCall: incrementApiCallCounter,
                    }
                );
                if (finalAsset?.id && !singlePipelineSaveFailed) {
                    setGenerationProgress({ current: 1, total: 1 });
                    showToast('Generation completed successfully  (1/1)', 'success');
                }
            } catch (error) {
                // onAssetError sudah menampilkan toast; tangkap dan log agar tidak
                // menjadi unhandled rejection (pipeline.ts rethrows setelah onAssetError).
                console.error('[Imagin] Single pipeline error:', error);
            } finally {
                dnaTracker.flush(effectiveCat);
                setIsRenderingAssets(false);
                setGenerationProgress({ current: 0, total: 0 });
                cancelGenerationRef.current = false;
                if (lockSettings) {
                    setVectorState(prev => ({ ...prev, singlePromptInput: '' }));
                } else {
                    setVectorState(createInitialVectorState());
                }
                setPromptSafety({ safe: true, warnings: [], brandHits: [] });
            }
            return;
        }

        // FASE D3 — ProductionJob sebagai unit produksi: buat SEBELUM generate,
        // update per item (stage + status + assetId). Bukan catatan post-hoc.
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const jobItems = Array.from({ length: countToGenerate }, (_, idx) => ({
            itemId: `${jobId}_item_${idx}`,
            jobId,
            index: idx,
            prompt: baseInput,
            subject: null,
            macroConcept: null,
            motif: null,
            clusterPlan: null,
            status: idx < startIndex ? 'completed' : 'queued',
            assetId: null,
            error: null,
            createdAt: Date.now(),
            stageLog: [],
            apiCalls: 0,
            startedAt: null,
            finishedAt: null,
        }));
        const productionJob = createProductionJob({
            jobId,
            request: {
                platform: normalizedRequest.platform,
                category: effectiveCat,
                subcategory: normalizedRequest.subcategory,
                quantity: countToGenerate,
                assetType: normalizedRequest.assetType,
                iconMode: Boolean(vectorState.iconMode),
                generationMode: vectorState.generationMode,
                prompt: normalizedRequest.prompt,
                visualSettings: { ...vectorState.visualSettings, style: normalizedRequest.style, background: normalizedRequest.background, aspectRatio: normalizedRequest.aspectRatio },
                skipAIExpansion: vectorState.skipAIExpansion,
                createdAt: Date.now(),
            },
            total: countToGenerate,
            batchId,
            batchSessionId: batchSession.id,
            concurrency: CONCURRENCY,
            items: jobItems,
        });
        jobEngine.createJob({ ...productionJob, completed: startIndex, status: 'running', startedAt: Date.now() }).catch(err => console.warn('[Imagin] Job create failed:', err));

        // EU-7: session batch-level untuk diversity rules (subject/palette/motif
        // yang sama dibatasi muncul berulang dalam satu batch). Satu session untuk
        // seluruh batch, di-pass ke setiap buildDNAContext.
        const batchDiversity = createBatchDiversitySession();
        // EU-12: concept cluster plan — memecah batch menjadi N cluster konsep yang
        // beda (subject+macro+motif unik per item), bukan variasi visual dari satu
        // subjek. Null kalau batch size 1 atau kategori tidak dikenal (no-op).
        const conceptClusters = countToGenerate > 1
            ? planConceptClusters(countToGenerate, effectiveCat, vectorState.subcategory, vectorState.selectedSubject)
            : null;
        // successCount dimulai dari startIndex (item resume sudah selesai di
        // sesi sebelumnya) supaya progress & toast akurat.
        let successCount = startIndex;
        let wasCancelled = false;
        const completedAssets = [];

        // (Deklarasi CONCURRENCY dipindah ke atas — dekat isBatchMode — karena
        // dipakai oleh createProductionJob sebelum baris ini. Jangan deklarasi ulang.)

        try {
            // Build items for canonical batch generator.
            const items = [];
            for (let i = startIndex; i < countToGenerate; i++) {
                const cluster = conceptClusters?.[i] || null;
                const semanticIntentForItem = extractSemanticIntent(baseInput, effectiveCat, vectorState.subcategory, vectorState.assetType);
                const styleInterpretationForItem = vectorState.iconMode
                    ? null
                    : await getStyleInterpretation(vectorState.visualSettings.style, systemSettings.aiConfig, incrementApiCallCounter, semanticIntentForItem, ctx, (vectorState.visualSettings.customDirective || vectorState.visualSettings.customAvoid) ? { directive: vectorState.visualSettings.customDirective, avoid: vectorState.visualSettings.customAvoid } : null);
                const styleCompatibilityForItem = styleInterpretationForItem
                    ? assessStyleCompatibility(styleInterpretationForItem, semanticIntentForItem)
                    : null;
                items.push({
                    config: {
                        vectorState: { ...vectorState, singlePromptInput: baseInput },
                        assetIndex: i,
                        clusterPlan: cluster,
                        category: effectiveCat,
                        semanticIntent: semanticIntentForItem,
                        styleInterpretation: styleInterpretationForItem,
                        styleCompatibility: styleCompatibilityForItem,
                        // no manualPrompt -> normal DNA path
                    },
                    itemIndex: i,
                });
            }

            // Run via canonical pipeline.
            const result = await runBatchViaCanonical(items, {
                systemSettings,
                batchId,
                tracker: dnaTracker,
                batchDiversity,
                projectId: activeProjectId,
                saveAssetDB,
                pauseRef: pauseBatchRef,
                cancelRef: cancelGenerationRef,
                showToast,
                incrementApiCallCounter,
                onProgress: (current, total) => {
                    setGenerationProgress({ current, total });
                    if (isBatchMode && current > startIndex && current < countToGenerate) {
                        saveBatchProgress(resumeSessionId, current, batchId, { vectorState: { ...vectorState, singlePromptInput: baseInput }, prompt: baseInput, status: 'running', currentIndex: current });
                    }
                },
                onAssetCreated: (asset) => { setAssets(prev => [...prev, asset]); },
                onAssetReady: async (asset) => {
                    // IMAGIN LOCAL paket (opsional)
                    if (vectorState.assetType === 'vector' || vectorState.iconMode) {
                        try {
                            const anim = await generateAnimationCode(asset, systemSettings.aiConfig, incrementApiCallCounter);
                            if (anim) {
                                asset.imaginLocalFragment = anim.fragment;
                                asset.imaginLocalCss = anim.css;
                                asset.imaginLocalMetadata = anim.metadata;
                                asset.imaginLocalPreviewHtml = anim.previewHtml;
                                asset.imaginLocalBaseName = anim.baseName;
                                asset.imaginLocalPaket = { fragment: anim.fragment, css: anim.css, metadata: anim.metadata, baseName: anim.baseName };
                                asset.animationHtml = anim.previewHtml;
                                asset.animationCss = anim.css;
                                asset.animationPreset = anim.presetId;
                            }
                        } catch (animErr) {
                            console.warn('[Imagin] IMAGIN Local paket gagal (opsional):', animErr);
                        }
                    }
                    const saveRes = await saveAssetDB(asset);
                    if (!isFinalSaveCommitted(saveRes)) {
                        const failedAsset = { ...asset, isLoading: false, status: 'FAILED', librarySyncState: 'error' };
                        setAssets(prev => prev.map(a => a.id === asset.id ? failedAsset : a));
                        showToast(`Asset gagal disimpan ke Gallery: ${saveRes?.detail || 'Library sync failed'}`, 'error');
                        return;
                    }
                    setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
                    completedAssets.push(asset);
                },
                onAssetError: (assetId, err) => {
                    console.error('Generation Error:', err);
                    if (assetId) {
                        const failedAsset = { id: assetId, isLoading: false, status: 'FAILED' };
                        setAssets(prev => prev.map(a => a.id === assetId ? failedAsset : a));
                        try { saveAssetDB(failedAsset); } catch (persistErr) { console.warn('[Imagin] Failed asset persist error:', persistErr); }
                    }
                    showToast(`Generation stopped due to an error: ${err?.message || err}`, 'error');
                },
                updateJobItem: updateJobItemWithStage,
                getJobItemId: (idx) => jobItems[idx]?.itemId,
                concurrency: CONCURRENCY,
            });

            successCount = result.successCount;
            failedCount = result.failedCount;
            wasCancelled = result.wasCancelled;

            if (isBatchMode) {
                if (!wasCancelled) clearBatchProgress();
                else if (!cancelGenerationRef.current) {
                    // Jeda eksplisit: checkpoint 'paused' hanya saat user menekan Jeda.
                    const processed = Math.min(startIndex + successCount + failedCount, countToGenerate);
                    saveBatchProgress(resumeSessionId, processed, batchId, { vectorState: { ...vectorState, singlePromptInput: baseInput }, prompt: baseInput, status: 'paused', currentIndex: processed });
                }
            }

            // FASE D3: finalisasi job — status completed/paused + finishedAt.
            try {
                const rawJob = await getJobDB(jobId);
                const job = rawJob ? normalizeJobRecord(rawJob) : null;
                if (job) {
                    await saveJobDB({
                        ...job,
                        status: wasCancelled ? 'paused' : (successCount < countToGenerate ? 'failed' : 'completed'),
                        finishedAt: wasCancelled ? null : Date.now(),
                    });
                }
            } catch (jobErr) {
                console.warn('[Imagin] Job finalize failed:', jobErr);
            }

            if (wasCancelled) {
                showToast(`Generation dibatalkan. ${successCount}/${countToGenerate} asset berhasil dibuat sebelum dihentikan.`, 'info');
            } else {
                showToast(`Generation completed successfully  (${successCount}/${countToGenerate})`, 'success');
                if (successCount > 1) {
                    const similar = checkBatchTitleSimilarity(batchId, completedAssets);
                    if (similar?.length) {
                        showToast(` ${similar.length} pasang title mirip terdeteksi di batch ini — Adobe mungkin menolak sebagai "too similar". Gunakan tombol Regenerate Metadata per-asset.`, 'info');
                    }
                    const visualSimilar = await checkBatchVisualSimilarity(batchId, completedAssets);
                    if (visualSimilar?.length) {
                        showToast(` ${visualSimilar.length} pasang asset MIRIP SECARA VISUAL di batch ini — Adobe menolak sebagai "duplicate/similar". Pertimbangkan regenerate item yang mirip.`, 'info');
                    }
                    const diversity = await computeBatchDiversityScore(batchId, completedAssets);
                    if (diversity && diversity.diversity < 70 && successCount > 2) {
                        showToast(` Batch diversity ${diversity.diversity}/100 (duplicate ${(diversity.duplicateRatio * 100).toFixed(0)}%, konsep berulang ${(diversity.repeatedSubject * 100).toFixed(0)}%) — Adobe tolak "too similar". Rekomendasi: pertahankan ±${diversity.keepTopK} asset paling beragam.`, 'info');
                    }
                }
            }
        } catch (error) {
            console.error('Generation Error:', error);
            showToast(`Generation stopped due to an error: ${error.message}`, 'error');
        } finally {
            dnaTracker.flush(effectiveCat);
            setIsRenderingAssets(false);
            setGenerationProgress({ current: 0, total: 0 });
            cancelGenerationRef.current = false;
            // Batch normal yang di-PAUSE: pertahankan vectorState (mode batch +
            // prompt) supaya tombol generate berikutnya resume dari progress —
            // bukan reset ke default (FASE D2).
            if (!(isBatchMode && pauseBatchRef.current)) {
                if (lockSettings) {
                    // Toggle "Simpan Setting": pertahankan SEMUA setting, hanya
                    // kosongkan prompt supaya tinggal ganti prompt lalu generate.
                    setVectorState(prev => ({ ...prev, singlePromptInput: '' }));
                } else {
                    setVectorState(createInitialVectorState());
                }
            }
            setPromptSafety({ safe: true, warnings: [], brandHits: [] });
        }
    };

export const executeGenerateIconAssets = async (ctx) => {
        const { vectorState, setVectorState, systemSettings, assets, setAssets, setBlockingDialog, importedBatch, setImportedBatch, batchQueue, setBatchQueue, setIsBatchPauseRequested, pauseBatchRef, discardBatchRef, cancelGenerationRef, generationLockRef, setIsRenderingAssets, setGenerationProgress, setPromptSafety, showToast, resetSidebarToManual, checkBatchTitleSimilarity, checkPreGenerationSimilarity, incrementApiCallCounter, runAutoPreflight, lockSettings } = ctx;
        const { buildIconNegativePrompt, composeIconPrompt, createDraftStockMetadata, saveAssetDB, generateAnimationCode, createInitialVectorState } = ctx;
        const rawInput = vectorState.singlePromptInput.trim();
        if (!rawInput) {
            showToast('Please enter a prompt or theme.', 'error');
            return;
        }
        if (!vectorState.iconStyle || !ICON_STYLE_PRESETS[vectorState.iconStyle]) {
            showToast('Pilih salah satu Icon Style dulu sebelum generate.', 'error');
            return;
        }

        const themeOnly = sanitizeIconThemeInput(rawInput);
        if (!themeOnly) {
            showToast('Tema icon kosong setelah kata jumlah/instruksi dibersihkan. Tulis tema seperti: "Christmas and New Year festive icons".', 'error');
            return;
        }

        const brandHits = checkBrandSafety(themeOnly);
        if (brandHits.length > 0) {
            setBlockingDialog({
                title: 'Brand/IP Content Detected',
                message: `"${brandHits.join(', ')}" terdeteksi di prompt. Adobe Stock akan menolak konten bermerek. Hapus istilah tersebut dari prompt Anda.`,
                onClose: () => setBlockingDialog(null),
            });
            return;
        }

        const stylePreset = ICON_STYLE_PRESETS[vectorState.iconStyle];
        const isSheet = vectorState.iconGenerationMode === 'sheet';
        const negativePrompt = buildIconNegativePrompt(vectorState.iconStyle, isSheet);

        cancelGenerationRef.current = false;
        setIsRenderingAssets(true);

        const batchId = `IconBatch #${Math.floor(100 + Math.random() * 900)}`;

        // Sheet: qty harus dari ICON_GRID_OPTIONS — fallback ke 6 kalau invalid
        const validSheetQty = ICON_GRID_OPTIONS.map(g => g.qty);
        const iconQuantity = isSheet
            ? (validSheetQty.includes(vectorState.iconQuantity) ? vectorState.iconQuantity : 6)
            : (vectorState.iconQuantity || 1);
        const countToGenerate = isSheet ? 1 : iconQuantity;

        setGenerationProgress({ current: 0, total: countToGenerate });
        showToast(`Initiating ${stylePreset.label} icon generation (${vectorState.iconGenerationMode})...`, 'info');

        let manifest = [{ title: themeOnly, subject: themeOnly, visualDescription: '' }];
        if (!isSheet && countToGenerate > 1) {
            manifest = buildIconVariationVisuals(themeOnly, countToGenerate);
        }

        let successCount = 0;
        let wasCancelled = false;
        const completedAssets = [];

        try {
            // Phase 2.3 — canonical: per-item prompt/bg/format dihitung di sini
            // (planner flow), generation/finalize/persist lewat runProductionPipeline.
            const items = [];
            for (let i = 0; i < countToGenerate; i++) {
                const entry = isSheet ? { title: themeOnly, subject: themeOnly, visualDescription: '' } : (manifest[i] || manifest[0]);
                const iconConfig = isSheet ? { ...vectorState, iconQuantity } : vectorState;
                // FASE 4: Icon prompt lewat compilePrompt untuk konsistensi
                // compliance layer, negative prompt, dan format — sama dengan vector path.
                const iconRawPrompt = isSheet
                    ? composeIconPrompt(themeOnly, '', iconConfig)
                    : composeIconPrompt(entry.subject || entry.title, entry.visualDescription, iconConfig);

                const iconNeg = buildIconNegativePrompt(vectorState.iconStyle, isSheet);

                const assembled = compilePrompt({
                    semanticIntent: null,
                    resolvedConfig: vectorState,
                    styleInterpretation: null,
                    dnaContext: '',
                    commercialRules: '',
                    cga: { positive: '', negative: '' },
                    negativePrompt: iconNeg,
                    archetypeInstruction: '',
                    userPrompt: iconRawPrompt,
                    styleCompatibility: null,
                }, ctx);

                // Icon mode tidak lewat resolveBackground() (EU-5) — 'auto'
                // di-resolve manual ke 'white' supaya prompt & compositing sinkron.
                const iconBg = (vectorState.visualSettings.background && vectorState.visualSettings.background !== 'auto')
                    ? vectorState.visualSettings.background
                    : 'white';
                const resolvedFormat = resolveExportFormat({
                    assetType: 'vector',
                    background: iconBg,
                    iconMode: true,
                    outputFormat: vectorState.visualSettings.outputFormat,
                    explicit: Boolean(vectorState._visualDirty?.outputFormat),
                });

                const sheetAspectRatio = isSheet
                    ? (ICON_GRID_OPTIONS.find(g => g.qty === iconQuantity)?.aspectRatio ?? '1:1')
                    : '1:1';

                items.push({
                    config: {
                        vectorState: {
                            ...vectorState,
                            singlePromptInput: isSheet ? themeOnly : (entry.subject || entry.title || themeOnly),
                            iconMode: true,
                        },
                        category: '',
                        manualPrompt: assembled,
                        manualNegativePrompt: negativePrompt,
                        resolvedAspectRatio: sheetAspectRatio,
                        generationModeOverride: isSheet ? 'icon_sheet' : 'icon_per_canvas',
                        iconStyleLabel: stylePreset.label,
                        resolvedBackground: { mode: iconBg },
                        resolvedOutputFormat: resolvedFormat,
                        finalizeAssetType: isSheet ? 'illustration' : 'icon',
                        iconStyleKey: vectorState.iconStyle,
                        draftStockMetadata: createDraftStockMetadata({
                            assetType: 'vector',
                            background: iconBg,
                            outputFormat: resolvedFormat,
                            stockCategory: vectorState.adobeCategory,
                            subcategory: vectorState.subcategory,
                        }),
                    },
                    itemIndex: i,
                });
            }

            const result = await runBatchViaCanonical(items, {
                systemSettings,
                batchId,
                tracker: null,
                batchDiversity: null,
                projectId: ctx.activeProjectId,
                saveAssetDB,
                pauseRef: pauseBatchRef,
                cancelRef: cancelGenerationRef,
                showToast,
                incrementApiCallCounter,
                onProgress: (current, totalN) => setGenerationProgress({ current: Math.max(current, 1), total: totalN }),
                onAssetCreated: (asset) => { setAssets(prev => [...prev, asset]); },
                onAssetReady: async (asset) => {
                    // IMAGIN LOCAL PAKET: icon selalu dapat paket aset. Gagal →
                    // null (tidak memblokir pipeline).
                    try {
                        const anim = await generateAnimationCode(asset, systemSettings.aiConfig, incrementApiCallCounter);
                        if (anim) {
                            asset.imaginLocalFragment = anim.fragment;
                            asset.imaginLocalCss = anim.css;
                            asset.imaginLocalMetadata = anim.metadata;
                            asset.imaginLocalPreviewHtml = anim.previewHtml;
                            asset.imaginLocalBaseName = anim.baseName;
                            asset.imaginLocalPaket = { fragment: anim.fragment, css: anim.css, metadata: anim.metadata, baseName: anim.baseName };
                            // Backward-compat
                            asset.animationHtml = anim.previewHtml;
                            asset.animationCss = anim.css;
                            asset.animationPreset = anim.presetId;
                        }
                    } catch (animErr) {
                        console.warn('[Imagin] Icon IMAGIN Local paket gagal (opsional):', animErr);
                    }
                    const saveRes = await saveAssetDB(asset);
                    if (!isFinalSaveCommitted(saveRes)) {
                        // Gallery commit failed: keep the recovery IDB record (already
                        // marked error by saveAssetDB) out of the final gallery state;
                        // surface failure — pipeline akan lempar err.code='save_failed'.
                        const failedAsset = { ...asset, isLoading: false, status: 'FAILED', librarySyncState: 'error' };
                        setAssets(prev => prev.map(a => a.id === asset.id ? failedAsset : a));
                        showToast(`Icon gagal disimpan ke Gallery: ${saveRes?.detail || 'Library sync failed'}`, 'error');
                        const err: any = new Error(saveRes?.detail || 'Library sync failed');
                        err.code = 'save_failed';
                        throw err;
                    }
                    setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
                    completedAssets.push(asset);
                },
                onAssetError: (assetId, err) => {
                    console.error('Icon Generation Error:', err);
                    if (assetId) {
                        const failedAsset = { id: assetId, isLoading: false, status: 'FAILED' };
                        setAssets(prev => prev.map(a => a.id === assetId ? failedAsset : a));
                        try { saveAssetDB(failedAsset); } catch (persistErr) { console.warn('[Imagin] Failed asset persist error:', persistErr); }
                    }
                    showToast(`Icon generation error: ${err?.message || err}`, 'error');
                },
                concurrency: 1,
            });

            successCount = result.successCount;
            wasCancelled = result.wasCancelled;

            if (wasCancelled) {
                showToast(`Generation dibatalkan. ${successCount}/${countToGenerate} icon berhasil dibuat sebelum dihentikan.`, 'info');
            } else {
                showToast(`Icon generation completed  (${successCount}/${countToGenerate}) — Style: ${stylePreset.label}`, 'success');
                if (successCount > 1) {
                    const similar = checkBatchTitleSimilarity(batchId, completedAssets);
                    if (similar?.length) {
                        showToast(` ${similar.length} pasang title mirip terdeteksi di batch ini — Adobe mungkin menolak sebagai "too similar". Gunakan tombol Regenerate Metadata per-asset.`, 'info');
                    }
                }
            }
        } catch (error) {
            console.error('Icon Generation Error:', error);
            showToast(`Icon generation stopped due to an error: ${error.message}`, 'error');
        } finally {
            setIsRenderingAssets(false);
            setGenerationProgress({ current: 0, total: 0 });
            cancelGenerationRef.current = false;
            if (lockSettings) {
                // Toggle "Simpan Setting": pertahankan SEMUA setting (termasuk
                // pilihan icon mode) — hanya kosongkan prompt.
                setVectorState(prev => ({ ...prev, singlePromptInput: '' }));
            } else {
                // FIX: Pertahankan pilihan icon mode (iconMode, iconStyle, iconGenerationMode,
                // iconQuantity) supaya user tidak perlu re-select setiap kali generate.
                // Hanya reset prompt input dan safety state.
                setVectorState(prev => ({
                    ...createInitialVectorState(),
                    iconMode: prev.iconMode,
                    iconStyle: prev.iconStyle,
                    iconGenerationMode: prev.iconGenerationMode,
                    iconQuantity: prev.iconQuantity,
                }));
            }
            setPromptSafety({ safe: true, warnings: [], brandHits: [] });
        }
    };
    // ponytail: icon generation finally block above shares the same reset as normal generation

/**
 * Dispatch selection for the generate entry point. `masterPromptMode` is the
 * authority: a retained `importedBatch` must NEVER hijack generation while the
 * user is in 'single' mode. Explicit 'json' only runs a usable batch; otherwise
 * it falls through to the single path (mirrors eligibility gating).
 *
 * Legacy callers that don't thread a mode (undefined) keep the historical
 * dispatch so existing batch save/restore + resume call sites keep working.
 * Exported pure so the dispatch contract (not just eligibility) can regress.
 */
export function selectGenerationDispatch({ masterPromptMode, importedBatch }: any): 'json' | 'single' {
    const statusUsable = importedBatch?.status === 'ready' || importedBatch?.status === 'paused';
    const hasPrompts = Array.isArray(importedBatch?.prompts) && importedBatch.prompts.length > 0;
    if (masterPromptMode === 'json') return statusUsable && hasPrompts ? 'json' : 'single';
    if (masterPromptMode === 'single' || masterPromptMode === 'import') return 'single';
    // No explicit mode → preserve legacy dispatch for other call sites.
    return statusUsable ? 'json' : 'single';
}

export const executeGenerateAssets = async (ctx) => {
        const { vectorState, setVectorState, systemSettings, assets, setAssets, setBlockingDialog, importedBatch, setImportedBatch, batchQueue, setBatchQueue, setIsBatchPauseRequested, pauseBatchRef, discardBatchRef, cancelGenerationRef, generationLockRef, setIsRenderingAssets, setGenerationProgress, setPromptSafety, showToast, resetSidebarToManual, checkBatchTitleSimilarity, checkPreGenerationSimilarity, incrementApiCallCounter } = ctx;
        // FIX BUG-1: guard ref re-entry — mencegah double-click memicu dua proses
        // generate paralel. Diset di sini (SEBELUM await pertama di bawah) karena
        // setIsRenderingAssets(true) baru dipanggil setelah beberapa await (brand
        // check, similarity, analyzeConceptGenericity) yang bisa berlangsung lama.
        if (generationLockRef.current) {
            showToast('Generasi sedang berjalan — tunggu proses ini selesai.', 'info');
            return;
        }
        generationLockRef.current = true;
        try {
            // MASTER PROMPT MODE menentukan jalur eksekusi:
            // 'single' WAJIB mengabaikan importedBatch yang masih tersimpan.
            if (selectGenerationDispatch(ctx) === 'json') {
                const resumeIdx = importedBatch.status === 'paused' ? (importedBatch.currentIndex ?? batchQueue.currentIndex ?? batchQueue.completed) : 0;
                await executeJSONBatchGeneration(resumeIdx, ctx);
                return;
            }

            // MODE MANUAL (Kode Lama)
            const rawInput = vectorState.singlePromptInput.trim();
            if (!rawInput) { showToast('Please enter a prompt or theme.', 'error'); return; }

            if (vectorState.iconMode && vectorState.assetType !== 'photo') {
                await executeGenerateIconAssets(ctx); // Pastikan di fungsi ini Math.min(x, 5) tetap ada
            } else {
                await executeGenerateNormalAssets(ctx); // Pastikan di fungsi ini Math.min(x, 5) tetap ada
            }
        } finally {
            generationLockRef.current = false;
        }
    };

// [09.06] BATCH ENGINE — batchEngine object
//         Entry point terpusat untuk semua mode generate (single, batch, icon).
//         Rule: Orchestrates engines. No React. No UI state mutation directly —
//               semua state update via callbacks yang diinject dari App().
export const batchEngine = {
    // Dispatcher — pilih mode berdasarkan state (JSON batch / icon / normal).
    async run(ctx) {
        return executeGenerateAssets(ctx);
    },
    // Resume / start JSON batch.
    async runJSON(resumeIdx, ctx) {
        return executeJSONBatchGeneration(resumeIdx, ctx);
    },
    // Sidebar normal (vector/illustration/3d/photo).
    async runNormal(ctx) {
        return executeGenerateNormalAssets(ctx);
    },
    // Icon mode.
    async runIcon(ctx) {
        return executeGenerateIconAssets(ctx);
    },
};

export const executeJSONBatchGeneration = async (resumeFromIndex = 0, ctx) => {
    const { vectorState, setVectorState, systemSettings, assets, setAssets, setBlockingDialog, importedBatch, setImportedBatch, batchQueue, setBatchQueue, setIsBatchPauseRequested, pauseBatchRef, discardBatchRef, cancelGenerationRef, setIsRenderingAssets, setGenerationProgress, setPromptSafety, showToast, resetSidebarToManual, checkBatchTitleSimilarity, checkPreGenerationSimilarity, analyzeConceptGenericity, incrementApiCallCounter, activeProjectId, runAutoPreflight, lockSettings } = ctx;
    const { loadDiversityTracker, buildDNAContext, buildCommercialRules, buildStyleGuidance, getPaletteForCategory, CATEGORY_DNA, GLOBAL_DNA, buildIconNegativePrompt, composeIconPrompt, createDraftStockMetadata, saveAssetDB, saveBatchProgress, clearBatchProgress, batchQueueReducer, createIdleBatchQueue, normalizeJobRecord } = ctx;
    if (!importedBatch || !importedBatch.prompts.length) return;

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}`;
    const batchId = `Batch_${importedBatch.id}`;
    const total = importedBatch.prompts.length;

    // FIX #6 (audit): baseline counter saat resume batch paused — jangan
    // dari resumeFromIndex (menelan failed ke completed), jangan dari
    // batchQueue sisa run lama saat start fresh.
    const resuming = importedBatch.status === 'paused';
    const baselineCompleted = resuming ? (importedBatch.completedBeforePause ?? batchQueue.completed ?? 0) : 0;
    const baselineFailed = resuming ? (importedBatch.failedBeforePause ?? batchQueue.failed ?? 0) : 0;

    cancelGenerationRef.current = false;
    pauseBatchRef.current = false;
    discardBatchRef.current = false;
    setIsBatchPauseRequested(false);

    setIsRenderingAssets(true);
    setImportedBatch(prev => ({ ...prev, status: 'generating', currentIndex: resumeFromIndex }));
    setBatchQueue({
        isRunning: true,
        isPaused: false,
        currentIndex: resumeFromIndex,
        total,
        // FIX #6 (audit): resume tidak boleh menelan hitungan gagal lama ke
        // 'completed' — index resume = completed + failed saat pause. Simpan
        // baseline keduanya agar laporan tidak menggelembungkan "berhasil".
        completed: baselineCompleted,
        failed: baselineFailed,
        phase: 'generating',
        sessionId,
        batchId,
    });
    setGenerationProgress({ current: resumeFromIndex, total });
    showToast(` Batch dimulai dari prompt ${resumeFromIndex + 1}/${total}...`, 'info');

    const batchPrompts = importedBatch.prompts.slice(resumeFromIndex);
    const batchSimilarCount = batchPrompts.filter(p => checkPreGenerationSimilarity(p.prompt, p.adobeCategory || 'Business', assets).length >= 3).length;
    if (batchSimilarCount > 0) {
        showToast(` ${batchSimilarCount} prompt dalam batch ini mirip dengan asset existing. Pertimbangkan ganti subject untuk diversity.`, 'info');
    }

    let completed = baselineCompleted;
    let failed = baselineFailed;
    let wasCancelled = false;
    const firstCategory = importedBatch.prompts[0]?.adobeCategory || importedBatch.defaults?.adobeCategory || 'Business';
    const dnaTracker = await loadDiversityTracker(firstCategory);
    const batchSession = createBatchSession();
    // EU-7: session batch-level untuk diversity rules lintas item di JSON batch.
    const batchDiversity = createBatchDiversitySession();
    // EU-10: akumulasi hasil genericity check per prompt — ditampilkan sebagai
    // SATU toast ringkasan di akhir batch, bukan per-item, biar tidak spam toast
    // untuk batch besar.
    let reconsiderCount = 0;

    // FASE D3 — ProductionJob sebagai unit produksi (JSON path): buat SEBELUM
    // loop, update per item. Konsisten dengan normal path.
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const jobItems = importedBatch.prompts.map((p, idx) => ({
        itemId: `${jobId}_item_${idx}`,
        jobId,
        index: idx,
        prompt: p.prompt || '',
        subject: p.subject || null,
        macroConcept: p.macroConcept || null,
        motif: p.motif || null,
        clusterPlan: p.clusterPlan || null,
        status: idx < resumeFromIndex ? 'completed' : 'queued',
        assetId: null,
        error: null,
        createdAt: Date.now(),
        stageLog: [],
        apiCalls: 0,
        startedAt: null,
        finishedAt: null,
    }));
    const productionJob = createProductionJob({
        jobId,
        request: {
            platform: normalizeRequest({ ...importedBatch.defaults, platform: importedBatch.platform }).platform,
            category: normalizeRequest({ ...importedBatch.defaults, adobeCategory: importedBatch.defaults?.adobeCategory || importedBatch.prompts[0]?.adobeCategory || 'Business' }).category,
            subcategory: importedBatch.defaults?.subcategory || '',
            quantity: total,
            assetType: normalizeRequest(importedBatch.defaults).assetType,
            iconMode: Boolean(importedBatch.defaults?.iconMode),
            generationMode: 'json_batch',
            prompt: importedBatch.prompts[0]?.prompt || '',
            createdAt: Date.now(),
        },
        total,
        batchId,
        batchSessionId: batchSession?.id || null,
        concurrency: 1,
        items: jobItems,
    });
    jobEngine.createJob({ ...productionJob, completed: baselineCompleted, status: 'running', startedAt: Date.now() }).catch(err => console.warn('[Imagin] Job create failed:', err));

    // Phase 2.3 — canonical: per-item planning (intake/DNA/style/gates) dihitung
    // di sini menjadi ProductionPlan; generation/finalize/persist lewat
    // runProductionPipeline via runBatchViaCanonical (satu inti).
    const items = [];
    let planningCancelled = false;
    for (let i = resumeFromIndex; i < total; i++) {
        if (cancelGenerationRef.current || pauseBatchRef.current) {
            planningCancelled = true;
            break;
        }
        const currentConfig = importedBatch.prompts[i];
        // FASE 8: Request Intake per item — item invalid di-skip (bukan stop batch).
        const itemIntake = validateRequestIntake({
            prompt: currentConfig.prompt,
            assetType: currentConfig.assetType,
            category: currentConfig.adobeCategory,
            platform: currentConfig.platform || vectorState.platform,
        });
        if (!itemIntake.valid) {
            console.warn(`[Batch] Item ${i + 1} intake invalid: ${itemIntake.errors.join(', ')} — skipped.`);
            items.push({
                config: { vectorState: { ...vectorState, singlePromptInput: currentConfig.prompt } },
                itemIndex: i,
                presetRejection: { stage: 'intake_rejected', error: itemIntake.errors.join(', ') },
            });
            continue;
        }
        // FASE 8: Normalize per item → NormalizedRequest seragam.
        const normalizedRequest = normalizeRequest({
            ...currentConfig,
            platform: currentConfig.platform || vectorState.platform,
            source: 'json',
        });
        // Resolve background/authority sebelum sync UI state.
        const resolvedBg = currentConfig.iconMode
            ? { mode: normalizedRequest.background, promptHint: '', wasOverridden: false }
            : resolveBackground(normalizedRequest.background, normalizedRequest.assetType, normalizedRequest.category, normalizedRequest.subcategory, true);
        const authorityInput = {
            ...vectorState,
            assetType: normalizedRequest.assetType,
            platform: normalizedRequest.platform,
            platformCategoryId: currentConfig.platformCategoryId ?? vectorState.platformCategoryId,
            internalCategory: normalizedRequest.category,
            adobeCategory: normalizedRequest.category,
            subcategory: normalizedRequest.subcategory,
            iconMode: currentConfig.iconMode,
            visualSettings: {
                ...vectorState.visualSettings,
                aspectRatio: normalizedRequest.aspectRatio,
                style: normalizedRequest.style,
                background: normalizedRequest.background,
                outputFormat: currentConfig.outputFormat,
                highDpiSharpness: currentConfig.highDpiSharpness,
                faceless: currentConfig.faceless,
                negativeSpace: currentConfig.negativeSpace,
            },
        };
        const resolvedAuthority = buildResolvedConfig({ vectorState: authorityInput, resolvedBg });

        // JSON-driven sidebar config untuk item ini (sync ke UI via beforeItem).
        const syncedVectorState = {
            ...vectorState,
            singlePromptInput: normalizedRequest.prompt,
            assetType: normalizedRequest.assetType,
            adobeCategory: normalizedRequest.category,
            platform: normalizedRequest.platform,
            platformCategoryId: currentConfig.platformCategoryId ?? vectorState.platformCategoryId,
            subcategory: normalizedRequest.subcategory,
            iconMode: currentConfig.iconMode,
            iconStyle: currentConfig.iconStyle,
            iconGenerationMode: currentConfig.iconGenerationMode,
            iconQuantity: currentConfig.iconQuantity,
            selectedSubject: currentConfig.selectedSubject ?? vectorState.selectedSubject,
            selectedScene: currentConfig.selectedScene ?? vectorState.selectedScene,
            skipAIExpansion: currentConfig.skipAIExpansion ?? vectorState.skipAIExpansion,
            visualSettings: {
                ...vectorState.visualSettings,
                aspectRatio: currentConfig.aspectRatio,
                style: currentConfig.style,
                background: currentConfig.background,
                outputFormat: resolvedAuthority.outputFormat,
                highDpiSharpness: currentConfig.highDpiSharpness,
                faceless: currentConfig.faceless,
                negativeSpace: currentConfig.negativeSpace,
            },
        };

        const isSpecific = isSpecificUserInput(currentConfig.prompt);
        // Fix #2 (audit DNA): subject eksplisit di JSON = LOCKED. Icon mode tanpa DNA.
        const jsonSubjectLocked = isSpecific || Boolean(currentConfig.selectedSubject || currentConfig.subject);
        const itemPlan = { config: null, itemIndex: i };

        if (currentConfig.iconMode) {
            // Icon-mode JSON item: composeIconPrompt hasil planner → manualPrompt.
            const iconStylePreset = ICON_STYLE_PRESETS[currentConfig.iconStyle] || null;
            const isSheet = currentConfig.iconGenerationMode === 'sheet';
            const iconNeg = buildIconNegativePrompt(currentConfig.iconStyle) + ', ' + GLOBAL_DNA.universalNegativePrompt;
            const expandedIcon = sanitizeIconThemeInput(currentConfig.prompt);
            const iconAssembled = composeIconPrompt(expandedIcon, '', syncedVectorState);
            const iconBg = (currentConfig.background && currentConfig.background !== 'auto')
                ? currentConfig.background
                : 'white';
            const iconFormat = resolveExportFormat({
                assetType: 'vector',
                background: iconBg,
                iconMode: true,
                outputFormat: currentConfig.outputFormat || resolvedAuthority.outputFormat,
                explicit: Boolean(currentConfig._formatExplicit),
            });
            itemPlan.config = {
                vectorState: syncedVectorState,
                category: currentConfig.adobeCategory || '',
                manualPrompt: iconAssembled,
                manualNegativePrompt: iconNeg,
                resolvedAspectRatio: currentConfig.aspectRatio || '1:1',
                generationModeOverride: isSheet ? 'icon_sheet' : 'icon_per_canvas',
                iconStyleLabel: iconStylePreset?.label || currentConfig.iconStyle || '',
                resolvedBackground: { mode: iconBg },
                resolvedOutputFormat: iconFormat,
                finalizeAssetType: isSheet ? 'illustration' : 'icon',
                iconStyleKey: currentConfig.iconStyle,
                draftStockMetadata: createDraftStockMetadata({
                    assetType: 'vector',
                    background: iconBg,
                    outputFormat: iconFormat,
                    stockCategory: currentConfig.adobeCategory,
                    subcategory: currentConfig.subcategory,
                }),
                batchIndex: i + 1,
                batchSessionId: sessionId,
                seriesId: syncedVectorState.collectionMode
                    ? `series_${(syncedVectorState.collectionName || 'collection').replace(/\s+/g, '_').toLowerCase()}_${sessionId}`
                    : undefined,
            };
            items.push(itemPlan);
            continue;
        }

        // EU-7: DNA context — SATU signature diklaim per item di sini (planning),
        // pipeline mengonsumsi signature yang sama (tanpa build kedua).
        const dnaContext = buildDNAContext(currentConfig.adobeCategory, currentConfig.subcategory, dnaTracker, isSpecific, currentConfig.style, syncedVectorState.selectedSubject, syncedVectorState.selectedScene, batchDiversity, null, jsonSubjectLocked, currentConfig.assetType);
        const weightedDNA = dnaContext;
        const commercialRules = buildCommercialRules(currentConfig.adobeCategory, currentConfig.subcategory, currentConfig.assetType);
        const styleGuidance = buildStyleGuidance(currentConfig.style, currentConfig.customDirective || syncedVectorState?.visualSettings?.customDirective || '', currentConfig.customAvoid || syncedVectorState?.visualSettings?.customAvoid || '');
        const cga = buildCGAContext(currentConfig.prompt, i, batchSession);
        // Fase B: palette komersial per kategori (JSON batch path).
        const marketPalette = getPaletteForCategory(currentConfig.adobeCategory || '');
        const dnaPrefix = [commercialRules, styleGuidance, cga.positive, weightedDNA, marketPalette ? `Color palette: ${marketPalette}` : ''].filter(Boolean).join(' | ');

        // EU-10: Marketplace Differentiation per prompt.
        let differentiationResult = null;
        if (systemSettings.commercialRules.enableDifferentiationCheck) {
            differentiationResult = await analyzeConceptGenericity(
                currentConfig.prompt,
                currentConfig.adobeCategory,
                currentConfig.subcategory,
                systemSettings.aiConfig,
                incrementApiCallCounter
            );
            if (differentiationResult?.recommendation === 'reconsider') reconsiderCount++;
        }

        const skipAI = syncedVectorState.skipAIExpansion;
        // EU-1..4 paket B: conceptDNA.negativePrompt per-subkategori untuk batch mode.
        const _batchSubNegArr = CATEGORY_DNA[currentConfig.adobeCategory]?.subcategories?.[currentConfig.subcategory]?.conceptDNA?.negativePrompt;
        const batchSubcategoryNeg = Array.isArray(_batchSubNegArr) && _batchSubNegArr.length > 0 ? _batchSubNegArr.join(', ') : '';

        const negativePrompt = buildNegativePrompt(
            systemSettings.commercialRules.defaultNegativePrompt,
            currentConfig.adobeCategory,
            currentConfig.style,
            null,
            cga.negative,
            batchSubcategoryNeg,
            currentConfig.assetType
        );
        const basePrompt = dnaPrefix ? `${dnaPrefix} | ${currentConfig.prompt}` : currentConfig.prompt;
        // Fix #3 (audit DNA): semantic intent dari prompt JSON — semantic lock +
        // integrity check. Sprint 1: subcategory/assetType ikut di-pass.
        const semanticIntent = extractSemanticIntent(currentConfig.prompt, currentConfig.adobeCategory, currentConfig.subcategory, currentConfig.assetType);
        // Sprint 2: Style Interpretation — preset → deterministic; custom → Gemini.
        const styleInterpretation = await getStyleInterpretation(currentConfig.style, systemSettings.aiConfig, incrementApiCallCounter, semanticIntent, ctx);
        const styleCompatibility = styleInterpretation && semanticIntent
            ? assessStyleCompatibility(styleInterpretation, semanticIntent)
            : null;
        // Sprint 5 (Phase 15): Concept fingerprint untuk batch.
        const conceptFingerprint = buildConceptFingerprint(semanticIntent, styleInterpretation);
        // Sprint 3 (Phase 16): Layered negative prompt untuk batch.
        const layeredNegativePrompt = buildLayeredNegativePrompt({
            baseNegative: negativePrompt,
            assetType: currentConfig.assetType,
            categoryKey: currentConfig.adobeCategory,
            styleInterpretation,
            semanticIntent,
        });

        // AI expansion didelegasikan ke pipeline (expansionInput = basePrompt
        // dengan dnaPrefix) — SATU expand call per item, bukan dua. skipAI
        // di-handle pipeline via skipAIExpansion (compile tanpa API).
        if (cancelGenerationRef.current || pauseBatchRef.current) {
            planningCancelled = true;
            break;
        }

        // Sprint 3 (Phase 7): PromptGraph untuk batch.
        const promptGraph = buildPromptGraph({
            semanticIntent,
            resolvedConfig: syncedVectorState,
            styleInterpretation,
            dnaContext: weightedDNA,
            commercialRules,
            cga,
            negativePrompt: layeredNegativePrompt,
            archetypeInstruction: '',
            userPrompt: currentConfig.prompt,
            resolvedBg,
            styleCompatibility,
        }, ctx);

        // FASE 7: Canonical intent + constraints untuk batch.
        const canonicalIntent = buildCanonicalIntent({
            semanticIntent,
            request: {
                ...syncedVectorState,
                style: currentConfig.style,
                background: currentConfig.background,
                aspectRatio: currentConfig.aspectRatio,
                source: 'json',
            },
            styleInterpretation,
            resolvedBg,
        });
        const constraints = canonicalIntent
            ? resolveConstraints(canonicalIntent, weightedDNA)
            : null;
        const intentValidation = canonicalIntent
            ? validateCanonicalIntent(canonicalIntent)
            : null;

        // FASE 8: Compatibility Gate blocking — item conflict error di-skip.
        if (constraints) {
            const blockingConflict = constraints.conflicts.find(c => c.severity === 'error');
            if (blockingConflict) {
                console.warn(`[Batch] Item ${i + 1} constraint error: ${blockingConflict.message} — skipped.`);
                items.push({
                    config: { vectorState: syncedVectorState, category: currentConfig.adobeCategory },
                    itemIndex: i,
                    presetRejection: { stage: 'constraint_rejected', error: blockingConflict.message },
                });
                continue;
            }
        }
        if (intentValidation && !intentValidation.valid) {
            console.warn(`[Batch] Item ${i + 1} intent invalid: ${intentValidation.missing.join(', ')} — skipped.`);
            items.push({
                config: { vectorState: syncedVectorState, category: currentConfig.adobeCategory },
                itemIndex: i,
                presetRejection: { stage: 'intent_rejected', error: intentValidation.missing.join(', ') },
            });
            continue;
        }

        const resolvedFormat = resolveExportFormat({
            assetType: resolvedAuthority.assetType,
            background: resolvedBg.mode,
            iconMode: currentConfig.iconMode,
            outputFormat: currentConfig.outputFormat,
            explicit: Boolean(currentConfig._formatExplicit),
        });

        itemPlan.config = {
            vectorState: syncedVectorState,
            category: currentConfig.adobeCategory || normalizedRequest.category,
            semanticIntent,
            styleInterpretation,
            styleCompatibility,
            cga,
            dnaContext: weightedDNA,
            expansionInput: basePrompt,
            skipAIExpansion: skipAI,
            canonicalIntent,
            constraints,
            intentValidation,
            conceptFingerprint,
            differentiation: differentiationResult,
            promptGraph,
            resolvedBackground: { mode: resolvedBg.mode, promptHint: resolvedBg.promptHint, wasOverridden: resolvedBg.wasOverridden },
            resolvedOutputFormat: resolvedFormat,
            resolvedAspectRatio: currentConfig.aspectRatio,
            generationModeOverride: 'batch',
            finalizeAssetType: currentConfig.assetType,
            resolutionTarget: currentConfig.resolutionTarget || DEFAULT_RESOLUTION_TARGET,
            iconStyleLabel: currentConfig.style,
            draftStockMetadata: {
                ...createDraftStockMetadata({
                    assetType: resolvedAuthority.assetType,
                    background: resolvedBg.mode,
                    outputFormat: resolvedFormat,
                    stockCategory: resolvedAuthority.category,
                    subcategory: resolvedAuthority.subcategory,
                }),
                differentiation: differentiationResult,
            },
            resolvedAuthority,
            batchIndex: i + 1,
            batchSessionId: sessionId,
            seriesId: syncedVectorState.collectionMode
                ? `series_${(syncedVectorState.collectionName || 'collection').replace(/\s+/g, '_').toLowerCase()}_${sessionId}`
                : undefined,
        };
        items.push(itemPlan);
    }

    if (!planningCancelled) {
        const result = await runBatchViaCanonical(items, {
            systemSettings,
            batchId,
            tracker: dnaTracker,
            batchDiversity,
            projectId: activeProjectId,
            saveAssetDB,
            pauseRef: pauseBatchRef,
            cancelRef: cancelGenerationRef,
            showToast,
            incrementApiCallCounter,
            // Progress dimiliki beforeItem (mirror loop lama: update di awal item);
            // onProgress helper di-no-op untuk menghindari penulisan ganda.
            onProgress: () => {},
            beforeItem: (item) => {
                // JSON-driven sidebar sync + checkpoint — JUST-IN-TIME per item
                // (persis seperti loop lama: sync → checkpoint → generate).
                // Item dengan presetRejection (gate tercapai di planning) TIDAK
                // di-sync/checkpoint — mirror loop lama: reject = skip tanpa
                // sentuh UI/checkpoint; item deterministik re-reject saat resume.
                if (item.presetRejection) return;
                const cfg = item.config || {};
                if (cfg.vectorState) setVectorState(cfg.vectorState);
                setImportedBatch(prev => ({ ...prev, currentIndex: item.itemIndex }));
                setBatchQueue(prev => ({ ...prev, currentIndex: item.itemIndex, completed }));
                setGenerationProgress({ current: item.itemIndex + 1, total });
                // Simpan checkpoint untuk resume
                saveBatchProgress(sessionId, item.itemIndex + 1, batchId, { ...importedBatch, status: 'paused', currentIndex: item.itemIndex + 1 });
            },
            onAssetCreated: (asset) => { setAssets(prev => [...prev, asset]); },
            onAssetReady: async (asset) => {
                const saveRes = await saveAssetDB(asset);
                if (!isFinalSaveCommitted(saveRes)) {
                    // Gallery commit failed: keep the recovery IDB record (already
                    // marked error by saveAssetDB) out of the final gallery state;
                    // surface failure — helper menangkap err.code='save_failed'.
                    const failedAsset = { ...asset, isLoading: false, status: 'FAILED', librarySyncState: 'error' };
                    setAssets(prev => prev.map(a => a.id === asset.id ? failedAsset : a));
                    showToast(` Prompt gagal disimpan ke Gallery: ${saveRes?.detail || 'Library sync failed'}`, 'error');
                    const err: any = new Error(saveRes?.detail || 'Library sync failed');
                    err.code = 'save_failed';
                    throw err;
                }
                setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
            },
            onAssetError: (assetId, err) => {
                console.error('[Batch] Generation error:', err);
                if (assetId) {
                    const failedAsset = { id: assetId, isLoading: false, status: 'FAILED' };
                    setAssets(prev => prev.map(a => a.id === assetId ? failedAsset : a));
                    try { saveAssetDB(failedAsset); } catch (persistErr) { console.warn('[Imagin] Failed asset persist error:', persistErr); }
                }
            },
            onItemResult: (idx, outcome) => {
                if (outcome === 'success') {
                    completed++;
                    setBatchQueue(prev => batchQueueReducer(prev, { type: 'completed' }));
                } else {
                    failed++;
                    setBatchQueue(prev => batchQueueReducer(prev, { type: 'failed' }));
                }
            },
            updateJobItem: updateJobItemWithStage,
            getJobItemId: (idx) => jobItems[idx]?.itemId,
            concurrency: 1,
            throttleMs: 800,
        });
        completed = result.successCount + baselineCompleted;
        failed = result.failedCount + baselineFailed;
        wasCancelled = result.wasCancelled;
    } else {
        wasCancelled = true;
    }

    clearBatchProgress();

    dnaTracker.flush(firstCategory);

    if (discardBatchRef.current) {
        discardBatchRef.current = false;
        cancelGenerationRef.current = false;
        setIsRenderingAssets(false);
        setGenerationProgress({ current: 0, total: 0 });
        resetSidebarToManual();
        showToast(`Batch dibatalkan. ${completed}/${total} image selesai sebelum berhenti.`, 'info');
        return;
    }

    const finalStatus = wasCancelled ? 'paused' : 'images_done';
    setImportedBatch(prev => wasCancelled ? { ...prev, status: finalStatus, currentIndex: Math.min(completed + failed, total), completedBeforePause: completed, failedBeforePause: failed } : null);
    setBatchQueue(prev => wasCancelled ? { ...prev, isRunning: false, isPaused: true, phase: 'paused', currentIndex: Math.min(completed + failed, total), completed, failed } : createIdleBatchQueue());
    if (!wasCancelled) {
        if (lockSettings) {
            // Mode kunci: hanya clear prompt, semua setting lain dipertahankan
            setVectorState(prev => ({ ...prev, singlePromptInput: '' }));
        } else {
            // Mode normal: reset penuh (behavior lama)
            setVectorState(prev => ({ ...prev, iconMode: false, iconStyle: null, singlePromptInput: '' }));
        }
    }
    setIsBatchPauseRequested(false);
    setIsRenderingAssets(false);
    setGenerationProgress({ current: 0, total: 0 });
    cancelGenerationRef.current = false;

    // FASE D3: finalisasi ProductionJob yang dibuat SEBELUM loop — update status
    // final + counters (bukan create baru post-hoc).
    try {
        const rawJob = await getJobDB(jobId);
        const job = rawJob ? normalizeJobRecord(rawJob) : null;
        if (job) {
            await saveJobDB({
                ...job,
                completed,
                failed,
                status: wasCancelled ? 'paused' : (failed > 0 ? 'failed' : 'completed'),
                finishedAt: wasCancelled ? null : Date.now(),
                lastResumeState: wasCancelled ? { itemId: jobItems[completed]?.itemId || null, progress: completed } : null,
            });
        }
        if (activeProjectId) {
            const proj = await projectEngine.open(activeProjectId);
            if (proj) await projectEngine.attachJob(proj, jobId);
        }
    } catch (jobErr) {
        console.warn('[Imagin] Job finalize failed:', jobErr);
    }

    if (wasCancelled) {
        showToast(`Batch dijeda. ${completed}/${total} image selesai. Klik Resume untuk melanjutkan.`, 'info');
    } else {
        showToast(` Semua image selesai! ${completed}/${total} berhasil, ${failed} gagal. Sekarang generate metadata.`, 'success');
        if (reconsiderCount > 0) {
            showToast(` ${reconsiderCount} prompt terdeteksi mengikuti pola stock yang sangat tersaturasi. Cek badge "Differentiation" di kartu asset sebelum submit.`, 'info');
        }
    }
};

export const cancelGeneration = (ctx) => {
    const { cancelGenerationRef, pauseBatchRef, setIsBatchPauseRequested, showToast, clearBatchProgress } = ctx;
    cancelGenerationRef.current = true;
    pauseBatchRef.current = false;
    setIsBatchPauseRequested(false);
    // Hentikan = buang checkpoint; save in-flight berikutnya tetap 'running' sehingga recovery gate mengabaikannya.
    void clearBatchProgress?.();
    showToast('Menghentikan generation setelah prompt yang sedang diproses selesai...', 'info');
};

export const retryFailedAsset = async (asset, ctx) => {
        const { setAssets, showToast, systemSettings, incrementApiCallCounter } = ctx;
        const { finalizeAsset, saveAssetDB } = ctx;
        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isLoading: true } : a));
        try {
            const rawImageUrl = await generateImageWithGemini(asset.assembledPrompt, asset.aspectRatio, asset.negativePrompt, systemSettings.aiConfig, incrementApiCallCounter);
            if (!rawImageUrl) {
                setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isLoading: false, status: 'FAILED' } : a));
                showToast('Retry gagal lagi (rate limit/filter). Coba lagi beberapa saat.', 'error');
                return;
            }
            const assetTypeForUpscale = asset.generationMode?.startsWith('icon') ? 'icon' : (asset.assetType || 'vector');
            const finalized = await finalizeAsset(rawImageUrl, asset.background, assetTypeForUpscale, 'none', asset.aspectRatio || '4:3', asset.outputFormat || 'PNG', asset.style || '', asset.resolutionTarget || DEFAULT_RESOLUTION_TARGET);
            const { dataUrl: finalImageUrl, backgroundVerified, resolutionVerified, width: finalW, height: finalH } = finalized;
            const completedAsset = {
                ...asset, url: finalImageUrl, isLoading: false, status: 'draft', resolutionTarget: undefined, // SSOT Fix
                svgUrls: undefined,   // STEP 10b: gambar regenerasi → cache SVG invalid
                svgStats: undefined,
                resolution: { width: finalW, height: finalH, wasUpscaled: false, scaleFactor: 1 },
                stockMetadata: {
                    ...asset.stockMetadata,
                    backgroundVerified,
                    resolutionVerified,
                    megapixels: finalized.megapixels,
                    fileSizeKB: finalized.fileSizeKB,
                    fileSizeOk: finalized.fileSizeOk,
                },
            };
            const saveRes = await saveAssetDB(completedAsset);
            if (!isFinalSaveCommitted(saveRes)) {
                // Gallery commit failed: keep the recovery IDB record (already
                // marked error by saveAssetDB) out of the final gallery state;
                // do not claim a regenerated completed asset. Surface failure.
                const failedAsset = { ...completedAsset, isLoading: false, status: 'FAILED', librarySyncState: 'error' };
                setAssets(prev => prev.map(a => a.id === asset.id ? failedAsset : a));
                showToast(`Asset gagal disimpan ke Gallery: ${saveRes?.detail || 'Library sync failed'}`, 'error');
                return;
            }
            setAssets(prev => prev.map(a => a.id === asset.id ? completedAsset : a));
            showToast('Asset berhasil di-regenerate! ', 'success');
        } catch (err) {
            console.error('Retry error:', err);
            setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isLoading: false, status: 'FAILED' } : a));
            showToast('Retry error: ' + err.message, 'error');
        }
    };




export const estimateAssetApiCalls = (asset) => {
    if (!asset) return 0;
    const stages = Array.isArray(asset.stageLog) ? asset.stageLog : [];
    const hasVision = stages.some(s => s.stage === 'vision_analysis');
    let calls = 0;
    if (hasVision) calls += 2; // vision (Layer A) + metadata (Layer B+C)
    // Auto-regen: setiap attempt = generate + preflight ulang.
    const regenAttempt = asset.lineage?.autoRegeneration?.attempt || 0;
    calls += regenAttempt * 2;
    return calls;
};



const QUALITY_GATE = {
    // reasonCode → metadata gate (severity, strategy default).
    QA_RESOLUTION:   { severity: 'critical', strategy: 'upscale' },
    QA_SHARPNESS:    { severity: 'critical', strategy: 'upscale' },
    QA_FILESIZE:     { severity: 'warning',  strategy: 'recompress' },
    QA_VISUAL_SIMILARITY: { severity: 'warning', strategy: 'regenerate_new_concept' },
    QA_METADATA_DIVERSITY: { severity: 'warning', strategy: 'change_metadata' },
    QA_NEWS_EVENT:   { severity: 'critical', strategy: 'regenerate_new_concept' },
    QA_SENSITIVE:    { severity: 'critical', strategy: 'regenerate_new_concept' },
    QA_PROFILE:      { severity: 'critical', strategy: 'regenerate_new_concept' },
    QA_CATEGORY:     { severity: 'warning',  strategy: 'change_metadata' },
    QA_METADATA:     { severity: 'warning',  strategy: 'change_metadata' },
    IP_BRAND:        { severity: 'critical', strategy: 'regenerate_new_concept' },
    QA_TITLE:        { severity: 'warning',  strategy: 'change_metadata' },
    QA_KEYWORDS:     { severity: 'warning',  strategy: 'change_metadata' },
    QA_TECHNOISE:    { severity: 'major',    strategy: 'modify_prompt' },
    QA_COMPRESSION:  { severity: 'major',    strategy: 'recompress' },
    QA_OVERSHARPEN:  { severity: 'major',    strategy: 'modify_prompt' },
    QA_EXPOSURE:     { severity: 'major',    strategy: 'modify_prompt' },
    QA_WATERMARK:    { severity: 'critical', strategy: 'regenerate_new_concept' },
    QA_BATCH_DIVERSITY: { severity: 'warning', strategy: 'regenerate_new_concept' },
};

// Terapkan heuristic: issue string → reasonCode. Paling tidak presisi (regex)
// tapi cukup untuk men-tag setiap issue ke gate rule yang sesuai.


// Bangun rekomendasi regenerasi TERSTRUKTUR (QA-aset poin 29) dari reasonCode.
// preserve = konsep yang dipertahankan, change + negativeAdditions + prompt =
// input langsung ke Prompt Engine supaya regenerasi otomatis bisa di-feed.
export function buildRegenerationRecommendation(reasonCode, analysis) {
    const primarySubject = analysis?.primarySubject || '';
    const environment = analysis?.environment || '';
    const style = analysis?.visualStyle || '';
    const base = (analysis?.suggestions && Array.isArray(analysis.suggestions) ? analysis.suggestions : []);
    const preserve = [primarySubject, environment, style].filter(Boolean);
    const strategy = (QUALITY_GATE[reasonCode] || QUALITY_GATE.QA_METADATA).strategy || null;
    switch (reasonCode) {
        case 'QA_WATERMARK':
            return { strategy: strategy || 'regenerate_new_concept', preserve, change: ['remove any watermark/overlay text'], negativeAdditions: ['watermark', 'overlay text', 'logo'], regeneratePrompt: `Regenerate ${primarySubject || 'subject'} with NO watermark or overlay text, clean edges, high-fidelity render.` };
        case 'QA_TECHNOISE':
            return { strategy: strategy || 'modify_prompt', preserve, change: ['reduce sensor noise, clean flat areas'], negativeAdditions: ['noise', 'grain artifacts', 'speckle'], regeneratePrompt: `Regenerate ${primarySubject || 'subject'}, clean denoised rendition with smooth gradients.` };
        case 'QA_COMPRESSION':
            return { strategy: strategy || 'recompress', preserve, change: ['export lossless / higher bitrate, avoid 8×8 block boundaries'], negativeAdditions: ['compression artifacts', 'blocking', 'jpeg artifacts'], regeneratePrompt: '' };
        case 'QA_OVERSHARPEN':
            return { strategy: strategy || 'modify_prompt', preserve, change: ['soften edges, remove ringing/halo'], negativeAdditions: ['oversharpened', 'halo', 'ringing'], regeneratePrompt: `Regenerate ${primarySubject || 'subject'} with natural, non-oversharpened edges.` };
        case 'QA_EXPOSURE':
            return { strategy: strategy || 'modify_prompt', preserve, change: ['fix clipping — balanced highlights and shadows'], negativeAdditions: ['blown highlights', 'crushed shadows', 'overexposed', 'underexposed'], regeneratePrompt: `Regenerate ${primarySubject || 'subject'} with balanced exposure, no clipped highlights/shadows.` };
        case 'QA_VISUAL_SIMILARITY':
        case 'QA_BATCH_DIVERSITY':
            return { strategy: strategy || 'regenerate_new_concept', preserve: [], change: [`new distinct concept, not a variant of ${primarySubject || 'existing asset'}`], negativeAdditions: [], regeneratePrompt: `Generate a NEW, clearly distinct concept — do not repeat ${preserve.join(' / ') || 'the previous composition'}, vary angle/subject/setting.` };
        case 'IP_BRAND':
            return { strategy: strategy || 'regenerate_new_concept', preserve, change: ['remove all brand/logo/IP-referencing elements'], negativeAdditions: ['brand', 'logo', 'trademark', 'government emblem'], regeneratePrompt: `Regenerate ${primarySubject || 'subject'} with NO recognizable brand/IP; keep it generic and royalty-free.` };
        default:
            return { strategy: strategy || 'change_metadata', preserve: [], change: base.length ? [base[0]] : ['review metadata and/or regenerate'], negativeAdditions: [], regeneratePrompt: '' };
    }
}

// Bangun QAResult dari outcome preflight. `analysis` = respons AI
// analyzeAssetForPreflight (bisa null), `issues` = array issue teks terhitung,
// `qaIssues` = array QAIssue terstruktur dari engine technical QA. reasonCode
// prioritas: issue QA terstruktur (lebih presisi) → fallback regex teks.
export function buildQualityGateResult({ assetId, decision, score, issues = [], analysis = null, qaIssues = [], qaVersion = TECHNICAL_QA.QA_VERSION }) {
    const pipelineDecision = decision; // pass | needs_review | fail
    const hasIssues = Array.isArray(issues) && issues.length > 0;
    const structured = Array.isArray(qaIssues) ? qaIssues : [];

    // Severity rank: critical > major > warning > info (QA-aset decision matrix).
    const rank = { critical: 4, major: 3, warning: 2, info: 1 };
    const worstIssue = structured.length
        ? structured.reduce((a, b) => ((rank[b.severity] || 1) > (rank[a.severity] || 1) ? b : a), structured[0])
        : null;
    const hasInspectable = Array.isArray(structured) && structured.length > 0;

    // Pilih decision gate + reasonCode utama: dari issue QA terstruktur paling
    // parah, lalu jatuh ke regex teks bila tidak ada QA engine issue.
    let gateDecision;
    let primaryIssue = '';
    let reasonCode = 'QA_METADATA';
    let severity = 'warning';
    let strategy = null;

    if (pipelineDecision === 'fail') {
        const ipBlock = (issues || []).some(i => reasonCodeForIssue(i) === 'IP_BRAND');
        gateDecision = ipBlock ? 'reject' : 'regenerate';
    } else if (pipelineDecision === 'needs_review') {
        gateDecision = 'needs_review';
    } else if (pipelineDecision === 'pass' && (hasIssues || hasInspectable)) {
        gateDecision = 'pass_with_warning';
    } else {
        gateDecision = 'pass';
    }

    if (hasInspectable && (gateDecision === 'regenerate' || gateDecision === 'reject' || gateDecision === 'needs_review' || (gateDecision === 'pass_with_warning' && worstIssue.severity === 'major'))) {
        // Decision matrix QA-aset poin 18: MAJOR + high confidence → reject-level
        // regenerate; MAJOR + uncertain → needs_review. Jadi reasonCode diambil
        // dari issue terstruktur paling parah bila severity-nya signifikan.
        primaryIssue = worstIssue.message;
        reasonCode = reasonCodeForIssue('[technical] ' + worstIssue.message + ' ' + worstIssue.type);
        if (worstIssue.severity === 'critical') {
            severity = 'critical';
            // critical QA engine issue = hard regenerate (keculai IP yang skip di sini).
            if (gateDecision !== 'reject') gateDecision = 'regenerate';
        } else if (worstIssue.severity === 'major') {
            severity = gateDecision === 'needs_review' ? 'warning' : 'critical';
        } else {
            severity = 'warning';
        }
    } else {
        primaryIssue = Array.isArray(issues) && issues[0] ? issues[0]
            : (gateDecision === 'pass' ? 'Asset passed all quality gates.' : 'Preflight requires attention.');
        reasonCode = reasonCodeForIssue(primaryIssue);
        // pipelineDecision 'fail' sudah dipetakan ke reject/regenerate di atas;
        // pastikan strategi sesuai IP_BRAND bila issue menunjuk ke sana.
        if (pipelineDecision === 'fail') {
            gateDecision = (issues || []).some(i => reasonCodeForIssue(i) === 'IP_BRAND') ? 'reject' : 'regenerate';
        }
    }

    const gateMeta = QUALITY_GATE[reasonCode] || QUALITY_GATE.QA_METADATA;
    if (pipelineDecision === 'fail') severity = 'critical';
    strategy = gateMeta.strategy;

    // Map ke QAResult per layer (best-effort dari analysis + issues).
    const technicalChecks = analysis?.checks || {};
    const profileDecisionRaw = analysis?.assetProfileDecision || 'pass';
    const techConf = worstIssue && worstIssue.type === 'sharpness' ? worstIssue.confidence : 1;
    return {
        assetId,
        decision: gateDecision,
        score: Math.max(0, Math.min(100, Math.round(Number(score) || 0))),
        qaVersion,
        layers: {
            technical: {
                passed: !(gateDecision === 'regenerate' || gateDecision === 'reject'),
                score: Number(analysis?.quality_composition) || score || 0,
                confidence: techConf,
                detail: primaryIssue || 'No technical defects detected.',
            },
            visual: {
                passed: !(gateDecision === 'regenerate' || gateDecision === 'reject'),
                score: Number(analysis?.quality_commercial) || score || 0,
                confidence: 1,
                detail: primaryIssue || 'Visual quality within acceptable range.',
            },
            assetProfile: {
                passed: profileDecisionRaw !== 'regenerate' && profileDecisionRaw !== 'reject',
                score: (() => {
                    const pc = analysis?.assetProfileChecks;
                    if (pc && typeof pc === 'object') {
                        const nums = Object.values(pc).filter(v => typeof v === 'number');
                        if (nums.length) return Math.round(Math.min(...nums));
                    }
                    return 0;
                })(),
                confidence: 1,
                detail: analysis?.assetProfileIssue || (profileDecisionRaw === 'pass' ? 'Profile-specific QA passed.' : 'No profile check returned.'),
            },
            commercial: {
                passed: gateDecision !== 'reject',
                score: Number(analysis?.acceptancePrediction) || score || 0,
                confidence: 1,
                detail: gateDecision === 'reject' ? primaryIssue : 'Commercial signals acceptable.',
            },
        },
        issues: structured,
        gate: {
            reasonCode,
            severity,
            failedRule: gateDecision === 'pass' || gateDecision === 'pass_with_warning' ? '' : reasonCodeForIssue(primaryIssue),
            recommendation: primaryIssue || 'Asset passed all quality gates.',
            regenerationStrategy: gateDecision === 'pass' || gateDecision === 'pass_with_warning' ? null : strategy,
        },
        regeneration: gateDecision === 'pass' || gateDecision === 'pass_with_warning' ? null : buildRegenerationRecommendation(reasonCode, analysis),
        checkedAt: Date.now(),
    };
}
