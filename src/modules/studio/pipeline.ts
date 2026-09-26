// Studio production pipeline — diekstrak dari imagin_studio.tsx baris 8520–8750.
// runProductionPipeline: orchestrator untuk single-asset generation.
// CGA + semantic intent LIVE (lihat import intent-engine & buildCGAContext di bawah);
// icon path lanjut & preflight React-coupled tetap di caller.
//
// CONTRACT (Fase 5): pipeline.ts is engine-level and React-free. Semua preflight
// React-coupled (brand/IP block, similarity warning UI, concept genericity check,
// constraint gate, integrity check) TETAP di caller (App.tsx) — pipeline hanya
// orchestrate resolve → prompt → generate → finalize → final asset.

import type { Asset, SystemSettings, VectorState } from "./types";
import { resolveBackground, resolveExportFormat } from "./resolvers";
import { compilePrompt, expandPromptWithGemini, buildLayeredNegativePrompt } from "./engines/prompt";
import {
  buildDNAContext,
  buildCommercialRules,
  buildCGAContext,
  buildNegativePrompt,
} from "./engines/dna-engine";
import { getPaletteForCategory } from "./registry/dna";
import { CATEGORY_DNA } from "./registry/dna";
import { createBatchSession } from "./engines/prompt-helpers";
import { generateImageWithGemini, generateNativeSVGWithGemini } from "./engines/generation";
import { getLatestLearningEvaluation, saveLearningEvaluation } from "./engines/storage";
import { finalizeAsset } from "./engines/asset-finalize";
import { sanitizeVisualPromptInput } from "./utils";
import { extractSemanticIntent, validatePromptIntegrity, validateCanonicalIntent } from "./engines/intent-engine";

// ── deriveSidebarStage (line 8526) — re-exported from batch.ts ────────────
export { deriveSidebarStage } from "./engines/batch";

// ── runProductionPipeline (line 8562) ─────────────────────────────────────
// Single-asset orchestrator: resolve config → build prompt → create placeholder
// → generate image → finalize → return final asset.
//
// callbacks: {
//   onAssetCreated(placeholderAsset)  — called when placeholder is created
//   onAssetReady(finalAsset)          — called when image is finalized
//   onAssetError(assetId, error)      — called on error
//   onProgress(message)               — called for status updates
// }
// ── ProductionResult ──────────────────────────────────────────────────────
export interface ProductionResult {
  asset: Partial<Asset>;
  stageLog: string[];
  metrics: {
    promptLength: number;
    dnaUsed: string;
    styleKey: string;
  };
  warnings: string[];
  errors: string[];
}

export interface PipelineConfig {
  vectorState: VectorState;
  systemSettings: SystemSettings;
  assetIndex?: number;
  batchId?: string;
  tracker?: any;
  batchDiversity?: any;
  clusterPlan?: any;
  category?: string;
  semanticIntent?: any;
  styleInterpretation?: any;
  styleCompatibility?: any;
  manualPrompt?: string;
  manualNegativePrompt?: string;
  resolvedAspectRatio?: string;
  generationModeOverride?: string;
  iconStyleLabel?: string;
  // ── Phase 2.3 canonical delegation: caller-computed per-item inputs so
  // batch / icon / JSON drive the SAME core without duplicating logic. ──
  resolvedBackground?: { mode: string; promptHint?: string; wasOverridden?: boolean };
  resolvedOutputFormat?: string;
  finalizeAssetType?: string;
  draftStockMetadata?: any;
  cga?: any;
  expansionInput?: string;
  dnaContext?: string;
  canonicalIntent?: any;
  constraints?: any;
  intentValidation?: any;
  conceptFingerprint?: any;
  differentiation?: any;
  promptGraph?: any;
  productionTrace?: any;
  resolvedAuthority?: any;
  batchIndex?: number;
  batchSessionId?: string | null;
  seriesId?: string;
  skipAIExpansion?: boolean;
  resolutionTarget?: string;
  projectId?: string | null;
  assets?: Asset[];
  collectionMode?: boolean;
  collectionName?: string;
}

export interface PipelineCallbacks {
  onAssetCreated?: (asset: Partial<Asset>) => void;
  onAssetReady?: (asset: Partial<Asset>) => void | Promise<void>;
  onAssetError?: (assetId: string | null, error: any) => void;
  onProgress?: (message: string) => void;
  onStage?: (stage: string) => void;
  onWarning?: (warning: string) => void;
  onApiCall?: () => void;
}

export function isNativeSVGEligible(input: { assetType?: string; iconMode?: boolean; outputFormat?: string }): boolean {
  return String(input.outputFormat || "").toUpperCase() === "SVG" && (input.assetType === "vector" || Boolean(input.iconMode));
}

function svgDataUrl(svg: string): string { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
function finalizeNativeSvg(svg: string): any {
  const width = Number(svg.match(/\bwidth=["'](\d+)/i)?.[1] || 4000);
  const height = Number(svg.match(/\bheight=["'](\d+)/i)?.[1] || 4000);
  return { dataUrl: svgDataUrl(svg), width, height, backgroundVerified: true, resolutionVerified: width >= 1200 && height >= 1200, megapixels: width * height / 1e6, fileSizeKB: svg.length / 1024, fileSizeOk: svg.length / 1024 <= 45, wasUpscaled: false, upscaleScaleFactor: 1 };
}
function buildCollectionIntelligence(assets: Asset[], config: PipelineConfig): any {
  if (!config.collectionMode) return null;
  const name = String(config.collectionName || "").toLowerCase();
  const pool = assets.filter((asset: any) => (!config.projectId || asset.projectId === config.projectId) && (!name || String(asset.lineage?.collectionName || "").toLowerCase() === name));
  const roles = [...new Set(pool.map((a: any) => a.lineage?.collectionRole || a.archetypeRole).filter(Boolean))];
  const angles = [...new Set(pool.map((a: any) => a.lineage?.composition?.cameraAngle).filter(Boolean))];
  const styles = [...new Set(pool.map((a: any) => a.style).filter(Boolean))];
  return { assetCount: pool.length, roles, angles, styles, missingDimensionHints: [roles.length < 3 ? "vary subject roles" : "", angles.length < 3 ? "vary camera/composition angles" : "", styles.length < 2 ? "consider a second compatible visual treatment" : ""].filter(Boolean) };
}
function buildAdaptiveHint(evaluation: any, intelligence: any): string {
  return [evaluation?.status === "baseline_ahead" ? "Increase exploration and use a less conventional composition." : evaluation?.status === "adaptive_ahead" ? "Prefer proven commercial opportunities while retaining distinctness." : "", intelligence?.missingDimensionHints?.length ? `Collection coverage guardrails: ${intelligence.missingDimensionHints.join(", ")}.` : ""].filter(Boolean).join(" ");
}
export function compactLearningEvaluation(previous: any, asset: any, intelligence: any): any {
  return { version: 1, status: previous?.status || "insufficient_data", generated: true, assetType: asset.assetType, outputFormat: asset.outputFormat, collectionAssetCount: intelligence?.assetCount || 0, recordedAt: Date.now() };
}

export async function runProductionPipeline(
  config: PipelineConfig,
  callbacks: PipelineCallbacks = {}
): Promise<ProductionResult> {
  const {
    vectorState,
    systemSettings,
    assetIndex = 0,
    batchId = `batch_${Date.now()}`,
    tracker = null,
    batchDiversity = null,
    clusterPlan = null,
  } = config;

  // Resolve aspect ratio: override from config or use vectorState
  const aspectRatio = config.resolvedAspectRatio || vectorState.visualSettings?.aspectRatio || "4:3";
  const priorEvaluation = config.projectId ? await getLatestLearningEvaluation(config.projectId) : null;
  const collectionIntelligence = buildCollectionIntelligence(config.assets || [], config);

  const {
    onAssetCreated = () => {},
    onAssetReady = () => {},
    onAssetError = () => {},
    onProgress = () => {},
    onStage = () => {},
    onWarning = () => {},
    onApiCall = () => {},
  } = callbacks;
  const stageLog: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const metrics = { promptLength: 0, dnaUsed: '', styleKey: '' };
  const onStageWrapper = (stage: string) => {
    stageLog.push(stage);
    onStage(stage);
  };
  const onWarningWrapper = (warning: string) => {
    warnings.push(warning);
    onWarning(warning);
  };
  onStageWrapper('start');

  // Category override: use normalized category from config if provided
  const effectiveCat = config.category || vectorState.adobeCategory || vectorState.internalCategory || "";

    // baseInput: sanitize like App.tsx:13106-13108 — illustration/3d strip
  // quantity words / sheet tokens that don't belong in a single-asset prompt.
  const rawInput = vectorState.singlePromptInput?.trim() || "";
  const baseInput = (vectorState.assetType === "illustration" || vectorState.assetType === "3d")
    ? sanitizeVisualPromptInput(rawInput)
    : rawInput;
  const isIconMode = vectorState.iconMode;
  // Track placeholderId outside try so catch can signal it to caller.
  let placeholderId: string | null = null;

  // Phase 2.3: caller-supplied per-item values (manual path) — null until set.
  let resolvedBgUser: any = null;
  let expandedPromptUser: string | null = null;
  let finalState: any = null;
  let finalResolvedBg: any = null;
  let finalNegative: string | null = null;
  let finalExpanded: string | null = null;
  let manualValidity: any = null;

  try {
    // ── STEP 1: Resolve config ──
    onProgress("Resolving configuration...");
    const resolvedBg = resolveBackground(
      vectorState.visualSettings?.background,
      vectorState.assetType,
      effectiveCat,
      vectorState.subcategory,
      Boolean(vectorState._visualDirty?.background)
    );

    // ── STEP 2: Build prompt ──
    onProgress("Compiling prompt...");
    let assembledPrompt: string;
    let negativePrompt: string;
    // effectiveCat: resolved category key, used in DNA/diversity assembly AND
    // final asset lineage (STEP 6). Defined here so both icon and normal paths
    // can access the same value (icon path sets "").
    let effectiveGenerationMode = config.generationModeOverride || vectorState.generationMode;
    let effectiveStyle = config.iconStyleLabel || vectorState.visualSettings?.style || '';

    if (config.manualPrompt?.trim()) {
      // Manual prompt path — bypass all DNA/expansion/compile.
      // Caller (runBatchViaCanonical / batch planners) supplies canonical
      // background/format/metadata per item; pipeline still resolves defaults
      // when an input is not provided.
      if (config.resolvedBackground) {
        resolvedBgUser = config.resolvedBackground;
      } else if (vectorState.visualSettings?.background && vectorState.visualSettings.background !== 'auto') {
        resolvedBgUser = { mode: vectorState.visualSettings.background };
      } else {
        resolvedBgUser = { mode: 'white' };
      }
      assembledPrompt = config.manualPrompt;
      negativePrompt = config.manualNegativePrompt ?? '';
      if (config.expansionInput) expandedPromptUser = config.expansionInput;
      const manualConfig = { ...vectorState, visualSettings: { ...vectorState.visualSettings } };
      if (config.resolvedOutputFormat) manualConfig.visualSettings.outputFormat = config.resolvedOutputFormat;
      if (config.generationModeOverride) manualConfig.generationMode = config.generationModeOverride;
      finalState = manualConfig;
      finalResolvedBg = resolvedBgUser;
      finalNegative = negativePrompt;
      finalExpanded = expandedPromptUser;
      manualValidity = config.canonicalIntent ? validateCanonicalIntent(config.canonicalIntent) : null;
      // Legacy soft gate — kept for callers that still pass constraints directly.
      if (config.constraints) {
        const c = config.constraints.conflicts?.find(x => x.severity === 'error');
        if (c) {
          errors.push(c.message || 'constraint conflict');
          const gateErr: any = new Error(c.message || 'constraint conflict');
          gateErr.code = 'constraint_rejected';
          throw gateErr;
        }
      }
      if (manualValidity && !manualValidity.valid) {
        errors.push(manualValidity.missing.join(', '));
        const gateErr: any = new Error('intent invalid: ' + manualValidity.missing.join(', '));
        gateErr.code = 'intent_rejected';
        throw gateErr;
      }
      onStageWrapper('manual-prompt');
    } else if (isIconMode) {
      // Icon path: caller supplies composeIconPrompt result + icon negative via
      // manualPrompt/manualNegativePrompt; this branch is only a fallback.
      const iconStyle = vectorState.iconStyle || "flat";
      assembledPrompt = `${baseInput}. Style: ${iconStyle} commercial icon, flat design, isolated on solid background.`;
      negativePrompt = config.manualNegativePrompt || "text, watermark, logo, brand, 3D rendering, photorealism, blurry, complex background";
      effectiveGenerationMode = 'icon';
    } else {
      // Vector/illustration/3d/photo path — mirror executeGenerateNormalAssets
      // (App.tsx:13257-13389) DNA/diversity setup + expansion + compile.
      onStageWrapper("dna");
      const isSpecific = isSpecificUserInput(baseInput);
      // Phase 2.3: caller may pre-claim DNA signature (single claim per item) —
      // pipeline consumes it instead of building a second, divergent context.
      const dnaContext = config.dnaContext != null
        ? config.dnaContext
        : effectiveCat
          ? buildDNAContext(
            effectiveCat,
            vectorState.subcategory,
            tracker,
            isSpecific,
            vectorState.visualSettings?.style || "",
            vectorState.selectedSubject,
            vectorState.selectedScene,
            batchDiversity,
            clusterPlan,
            isSpecific,
            vectorState.assetType
          )
        : "";

      const commercialRules = effectiveCat
        ? buildCommercialRules(effectiveCat, vectorState.subcategory, vectorState.assetType)
        : "";
      // Style masuk ke prompt via config.styleInterpretation → [STYLE] layer (compilePrompt).
      const cga = config.cga || buildCGAContext(baseInput, assetIndex, createBatchSession());
      const marketPalette = effectiveCat ? getPaletteForCategory(effectiveCat) : "";
      const photoAuthority = vectorState.assetType === "photo"
        ? "Genuine photorealistic camera photography only; forbid illustration, vector, cartoon, cel-shaded, comic, and outlined linework."
        : "";

      // Semantic intent (used for layered negative and semantic lock)
      const semanticIntent = config.semanticIntent || extractSemanticIntent(baseInput, effectiveCat, vectorState.subcategory, vectorState.assetType);

      // Subcategory negative prompt from CATEGORY_DNA
      const subcategoryNeg = effectiveCat && vectorState.subcategory
        ? CATEGORY_DNA[effectiveCat]?.subcategories?.[vectorState.subcategory]?.conceptDNA?.negativePrompt
        : null;
      const subcategoryNegStr = Array.isArray(subcategoryNeg) ? subcategoryNeg.join(', ') : (typeof subcategoryNeg === 'string' ? subcategoryNeg : '');

      // Base negative prompt
      const baseNegative = buildNegativePrompt(
        systemSettings.commercialRules.defaultNegativePrompt,
        effectiveCat,
        vectorState.visualSettings?.style || "",
        null, // archetype — single asset
        cga.negative,
        subcategoryNegStr,
        vectorState.assetType
      );

      // Layered negative prompt (includes style/semantic layers)
      const layeredNegative = buildLayeredNegativePrompt({
        baseNegative,
        assetType: vectorState.assetType,
        categoryKey: effectiveCat,
        styleInterpretation: config.styleInterpretation || null,
        semanticIntent,
      });
      negativePrompt = layeredNegative;

      // Prompt/style expansion — skip if skipAIExpansion is true.
      onStageWrapper("expand");
      // Use pure helper to decide final user prompt (raw subject/concept text)
      const expansionState = { ...vectorState, adobeCategory: effectiveCat, internalCategory: effectiveCat };
      const finalUserPrompt = await resolvePromptInput({
        skipAIExpansion: config.skipAIExpansion ?? vectorState.skipAIExpansion,
        baseInput,
        enrichedInput: [config.expansionInput || baseInput, buildAdaptiveHint(priorEvaluation, collectionIntelligence)].filter(Boolean).join(" | "),
        expansionProvider: vectorState.skipAIExpansion
          ? undefined
          : async (_input: string) => {
              const expanded = await expandPromptWithGemini(
                baseInput, // raw subject, no layers
                "", // archetypeInstruction
                expansionState,
                systemSettings.aiConfig,
                onApiCall,
                baseNegative,
                semanticIntent,
                resolvedBg
              );
              return expanded || baseInput;
            },
      });

      onStageWrapper("compile");

      // Always compile with all layers, regardless of expansion.
      assembledPrompt = compilePrompt({
        userPrompt: finalUserPrompt,
        resolvedConfig: vectorState,
        semanticIntent,
        styleInterpretation: config.styleInterpretation || null,
        dnaContext,
        commercialRules,
        cga,
        negativePrompt: layeredNegative,
        archetypeInstruction: '',
        resolvedBg,
        marketPalette,
        styleCompatibility: config.styleCompatibility || null,
      });

      // Fix #3 (audit DNA): Prompt Integrity Check — subject hilang dari prompt
      // final = semantic drift → rejection terstruktur (caller menandai item).
      if (semanticIntent) {
        const integrityCheck = validatePromptIntegrity(assembledPrompt, semanticIntent);
        if (integrityCheck.severity === 'error') {
          console.warn('[Imagin] Prompt integrity violation:', integrityCheck.reason);
          const integrityErr: any = new Error(integrityCheck.reason);
          integrityErr.code = 'integrity_rejected';
          throw integrityErr;
        }
      }
    }

    // Set metrics
    metrics.promptLength = assembledPrompt.length;
    metrics.dnaUsed = effectiveCat || '';
    metrics.styleKey = config.iconStyleLabel || vectorState.visualSettings?.style || '';

    // ── STEP 3: Create placeholder asset ──
    placeholderId = `asset_${Date.now()}_${assetIndex}`;
    const placeholder: Partial<Asset> = {
      id: placeholderId,
      isLoading: true,
      url: null,
      assembledPrompt,
      negativePrompt,
      status: "draft",
      assetType: finalState?.assetType ?? vectorState.assetType,
      outputFormat: config.resolvedOutputFormat || resolveExportFormat({
        assetType: finalState?.assetType ?? vectorState.assetType,
        background: finalResolvedBg?.mode ?? resolvedBg.mode,
        iconMode: vectorState.iconMode,
        outputFormat: finalState?.visualSettings?.outputFormat || vectorState.visualSettings?.outputFormat || "PNG",
        explicit: Boolean(vectorState._visualDirty?.outputFormat),
      }),
      background: finalResolvedBg?.mode ?? resolvedBg.mode,
      aspectRatio: aspectRatio,
      batchId,
      createdAt: Date.now(),
    };
    // Caller-supplied per-item fields (manual/batch path) — attached loosely to
    // keep the core placeholder type-safe.
    Object.assign(placeholder, {
      type: 'IMAGE',
      isMetaLoading: false,
      favorite: false,
      prompt: finalExpanded ?? assembledPrompt,
      expandedPrompt: finalExpanded || undefined,
      generationMode: finalState?.generationMode,
      iconStyle: finalState?.iconStyle,
      adobeCategory: finalState?.adobeCategory ?? vectorState.adobeCategory,
      platform: finalState?.platform ?? vectorState.platform,
      platformCategoryId: finalState?.platformCategoryId ?? vectorState.platformCategoryId,
      subcategory: finalState?.subcategory ?? vectorState.subcategory,
      title: '',
      baseTheme: finalState?.baseTheme ?? baseInput,
      style: config.iconStyleLabel ?? finalState?.style ?? vectorState.visualSettings?.style,
      highDpiSharpness: finalState?.visualSettings?.highDpiSharpness ?? vectorState.visualSettings?.highDpiSharpness,
      batchIndex: config.batchIndex,
      batchSessionId: config.batchSessionId,
      seriesId: config.seriesId,
      stockMetadata: config.draftStockMetadata,
      resolvedConfig: config.resolvedAuthority,
    } as any);
    if (config.generationModeOverride) {
      (placeholder as any).generationMode = config.generationModeOverride;
    }
    if (config.iconStyleLabel) {
      (placeholder as any).style = config.iconStyleLabel;
    }
    onAssetCreated(placeholder);

    // ── STEP 4: Generate native SVG or raster image ──
    onStageWrapper("generate");
    const outputFormat = config.resolvedOutputFormat || (placeholder as any).outputFormat;
    const nativeSvg = isNativeSVGEligible({ assetType: vectorState.assetType, iconMode: vectorState.iconMode, outputFormat });
    let rawImageUrl: string | null = null;
    let nativeSvgText: string | null = null;
    if (nativeSvg) {
      onProgress("Generating native SVG...");
      nativeSvgText = await generateNativeSVGWithGemini(assembledPrompt, systemSettings.aiConfig, onApiCall);
    } else {
      onProgress("Generating image...");
      rawImageUrl = await generateImageWithGemini(assembledPrompt, aspectRatio, negativePrompt, systemSettings.aiConfig, onApiCall);
    }

    if (!rawImageUrl && !nativeSvgText) {
      throw new Error("Image generation completed without an image result");
    }

    // ── STEP 5: Finalize (background removal, format conversion, resolution check) ──
    onStageWrapper("finalize");
    onProgress("Finalizing asset...");
    const finalizeArgs = resolveFinalizeArgs(
      vectorState,
      finalResolvedBg?.mode ?? resolvedBg.mode,
      config.finalizeAssetType || (config.generationModeOverride === 'icon_sheet' ? "illustration" : vectorState.assetType),
      aspectRatio
    );
    const finalized: any = nativeSvgText
      ? finalizeNativeSvg(nativeSvgText)
      : await finalizeAsset(rawImageUrl!, finalizeArgs.bgMode, finalizeArgs.assetType, finalizeArgs.upscaleMode, aspectRatio, outputFormat, finalizeArgs.styleKey, config.resolutionTarget);

    // ── STEP 6: Build final asset object ──
    const finalAsset = buildFinalAssetObject({
      placeholder,
      finalized,
      baseInput,
      assembledPrompt,
      vectorState: finalState || vectorState,
      systemSettings,
      resolvedBg: finalResolvedBg || resolvedBg,
      batchId,
      assetIndex,
      categoryOverride: effectiveCat,
      styleInterpretation: config.styleInterpretation || null,
      generationMode: effectiveGenerationMode,
      style: effectiveStyle,
      canonicalIntent: config.canonicalIntent || null,
      constraints: config.constraints || null,
      intentValidation: manualValidity,
      conceptFingerprint: config.conceptFingerprint || null,
      differentiation: config.differentiation || null,
      promptGraph: config.promptGraph || null,
      productionTrace: config.productionTrace || null,
      styleCompatibility: config.styleCompatibility || null,
    });

    onStageWrapper("done");
    await onAssetReady(finalAsset);
    if (config.projectId) await saveLearningEvaluation(config.projectId, compactLearningEvaluation(priorEvaluation, finalAsset, collectionIntelligence));
    return { asset: finalAsset, stageLog, metrics, warnings, errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    // Pass placeholderId when a placeholder was already created so caller can
    // mark that asset failed; null only for pre-placeholder errors.
    onAssetError(placeholderId, err);
    throw err;
  }
}

// ── Pure helpers (exported for headless contract tests) ──────────────────
// resolveFinalizeArgs — non-upscaling finalization arguments for generated assets.
export function resolveFinalizeArgs(
  vectorState: VectorState,
  bgMode: string,
  assetType: string,
  aspect: string
): {
  bgMode: string;
  assetType: string;
  upscaleMode: string;
  aspectRatio: string;
  outputFormat: string;
  styleKey: string;
} {
  return {
    bgMode,
    assetType,
    upscaleMode: "none",
    aspectRatio: aspect,
    outputFormat: vectorState.visualSettings?.outputFormat || "PNG",
    styleKey: vectorState.visualSettings?.style || "",
  };
}

// resolvePromptInput — pure selection of final user prompt for pipeline.
// Returns the final prompt string (either baseInput or expanded) without
// applying layers; layers are applied by compilePrompt separately.
// If skipAIExpansion is true, returns baseInput.
// If expansionProvider is provided, calls it with enrichedInput; if it returns
// a truthy string, uses that; otherwise falls back to baseInput.
// On error, falls back to baseInput.
export async function resolvePromptInput({
  skipAIExpansion,
  baseInput,
  enrichedInput,
  expansionProvider,
}: {
  skipAIExpansion: boolean;
  baseInput: string;
  enrichedInput: string;
  expansionProvider?: (input: string) => Promise<string>;
}): Promise<string> {
  if (skipAIExpansion) {
    return baseInput;
  }
  if (!expansionProvider) {
    return baseInput;
  }
  try {
    const expanded = await expansionProvider(enrichedInput);
    return expanded || baseInput;
  } catch {
    return baseInput;
  }
}

// buildFinalAssetObject — pure final-asset metadata builder (STEP 6). Produces
// lineage/resolution/stockMetadata fields without DOM/IPC.
export function buildFinalAssetObject({
  placeholder,
  finalized,
  baseInput,
  assembledPrompt,
  vectorState,
  systemSettings,
  resolvedBg,
  batchId,
  assetIndex,
  categoryOverride,
  styleInterpretation,
  generationMode,
  style,
  canonicalIntent,
  constraints,
  intentValidation,
  conceptFingerprint,
  differentiation,
  promptGraph,
  productionTrace,
  styleCompatibility,
}: {
  placeholder: Partial<Asset>;
  finalized: Awaited<ReturnType<typeof finalizeAsset>>;
  baseInput: string;
  assembledPrompt: string;
  vectorState: VectorState;
  systemSettings: SystemSettings;
  resolvedBg: any;
  batchId: string;
  assetIndex: number;
  categoryOverride?: string;
  styleInterpretation?: any;
  generationMode?: string;
  style?: string;
  canonicalIntent?: any;
  constraints?: any;
  intentValidation?: any;
  conceptFingerprint?: any;
  differentiation?: any;
  promptGraph?: any;
  productionTrace?: any;
  styleCompatibility?: any;
}): Partial<Asset> {
  void assetIndex;
  const lineageCategory = categoryOverride || vectorState.adobeCategory || vectorState.internalCategory || "";
  const finalStyle = style || vectorState.visualSettings?.style || '';
  const finalGenerationMode = generationMode || vectorState.generationMode || 'single';
  return {
    ...placeholder,
    isLoading: false,
    url: finalized.dataUrl,
    resolution: {
      width: finalized.width,
      height: finalized.height,
      wasUpscaled: false,
      scaleFactor: 1,
    },
    stockMetadata: {
      ...((placeholder as any).stockMetadata || {}),
      backgroundVerified: finalized.backgroundVerified,
      resolutionVerified: finalized.resolutionVerified,
      megapixels: finalized.megapixels,
      fileSizeKB: finalized.fileSizeKB,
      fileSizeOk: finalized.fileSizeOk,
      ...(differentiation ? { differentiation } : {}),
    } as any,
    lineage: {
      originalPrompt: baseInput,
      finalPrompt: assembledPrompt,
      platform: vectorState.platform,
      category: lineageCategory,
      subcategory: vectorState.subcategory,
      assetType: vectorState.assetType,
      style: finalStyle,
      normalizedPrompt: assembledPrompt,
      dnaCategory: lineageCategory,
      assetProfile: "illustration",
      styleInterpretation: styleInterpretation || null,
      styleCompatibility: styleCompatibility || null,
      promptGraph: promptGraph || null,
      conceptFingerprint: conceptFingerprint || null,
      canonicalIntent: canonicalIntent || null,
      constraints: constraints || null,
      intentValidation: intentValidation || null,
      productionTrace: productionTrace || null,
      background: resolvedBg?.mode || vectorState.visualSettings?.background,
      generationModel: systemSettings.aiConfig.imageModel,
      generationTimestamp: Date.now(),
      parentAssetId: null,
      batchId,
      batchSessionId: null,
      variations: [],
      regeneratedFrom: null,
      compliance: null,
      similarity: null,
      qualityScore: null,
      exportHistory: [],
      generationMode: finalGenerationMode,
    } as any,
  };
}

// ── isSpecificUserInput (line ~8585) — moved here as a small util ───────
export function isSpecificUserInput(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (trimmed.length < 8) return false;
  // Heuristic: specific input biasanya ≥8 kata ATAU mengandung proper noun
  const words = trimmed.split(/\s+/);
  if (words.length >= 8) return true;
  // Capitalized word (proper noun candidate)
  return /[A-Z][a-z]+/.test(trimmed);
}
