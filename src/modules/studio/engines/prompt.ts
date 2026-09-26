// Studio prompt engine — diekstrak dari imagin_studio.tsx baris 4962–4987,
// 6089–6217, 6246–6264, plus 983–1100 (composition dimension pool helpers).
// DNA registry canonical via registry/dna.ts + dna-engine.ts;
// resolveStyleKeyFromVision deterministic via vision signals.

import { markDiversityUsedDB, getDiversityTrackerDB } from "./storage";
import { ASSET_TYPE_PRESETS } from "../registry/presets";
import { CATEGORY_DNA, GLOBAL_DNA, STYLE_PRESET_DNA, STYLE_PRESET_MAP } from "../registry/dna";
import { generateText } from "./ai-bridge";
import type { Asset, SystemSettings, VectorState } from "../types";
import { findStylePreset as findStylePresetEntry, pickUnique, buildSemanticLockToken } from "./prompt-helpers";
import { buildCategoryNegativeHints, buildDNAContext as buildDNAContextImpl } from "./dna-engine";
import { ICON_STYLE_PRESETS, ICON_MASTER_NEGATIVE_PROMPT, ICON_SHEET_EXTRA_NEGATIVE } from "../registry/icon-dna";
import { ICON_GRID_OPTIONS } from "../registry/constants";

export function buildIconNegativePrompt(styleKey: string, isSheet = false): string {
  const preset = ICON_STYLE_PRESETS[styleKey as keyof typeof ICON_STYLE_PRESETS] as any;
  const filtered = preset?.negativeOverride?.length ? ICON_MASTER_NEGATIVE_PROMPT.split(", ").filter(term => !preset.negativeOverride.includes(term)).join(", ") : ICON_MASTER_NEGATIVE_PROMPT;
  return isSheet ? `${filtered}, ${ICON_SHEET_EXTRA_NEGATIVE}` : filtered;
}

export function composeIconPrompt(subjectText: string, visualDescription = "", config: any): string {
  const preset = ICON_STYLE_PRESETS[config?.iconStyle as keyof typeof ICON_STYLE_PRESETS] as any;
  if (!preset) return String(subjectText || "").trim();
  const subject = String(subjectText || "").trim() || "single icon";
  const bg = config?.visualSettings?.background === "transparent" ? "transparent" : "white";
  const category = `${config?.internalCategory || config?.adobeCategory || ""}${config?.subcategory ? ` > ${config.subcategory}` : ""}`;
  if (config?.iconGenerationMode === "sheet") {
    const option = ICON_GRID_OPTIONS.find((x: any) => x.qty === (config.iconQuantity || 4)) || ICON_GRID_OPTIONS[1];
    const { cols, rows } = option;
    const rowsText = Array.from({ length: rows }, (_, r) => `Row ${r + 1}: icons ${r * cols + 1}–${(r + 1) * cols}.`).join(" ");
    return [`Icon set theme: ${subject}.`, `Canvas shape: ${cols === rows ? "square canvas (equal width and height)" : cols > rows ? `landscape canvas (${cols}:${rows} cell proportions)` : "portrait canvas"}.`, `Single canvas. Strict ${cols} columns × ${rows} rows grid. Exactly ${option.qty} icons total.`, `Row structure: ${rowsText} There are EXACTLY ${rows} row(s).`, preset.styleDNA, `${bg} background. Zero divider lines. Zero drop shadows between icons. Zero text labels.`, `Each of the ${option.qty} icons must represent a DIFFERENT object/concept with a distinct unique silhouette.`, category ? `Category context: ${category}.` : ""].filter(Boolean).join("\n");
  }
  return [`${subject}${visualDescription ? `. ${visualDescription}` : ""}.`, "Single icon only. One clear subject. No grid, no sheet, no collection, no multiple icons.", preset.styleDNA, `${bg} background. Centered, isolated composition with generous padding on all sides.`, category ? `Category: ${category}.` : "", "STRICT: render exactly one icon on this canvas."].filter(Boolean).join("\n");
}

// ── Random / unique helpers (line 4962) ───────────────────────────────────
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── DNA Tracker (line 4964) ──────────────────────────────────────────────
export interface DNATracker {
  tryClaim(key: string): boolean;
  getSessionKeys(): string[];
  getUsedCount(): number;
  flush(categoryKey: string): Promise<void>;
}

export function createDNATracker(preloadKeys: string[] = []): DNATracker {
  const used = new Set<string>(preloadKeys);
  const sessionKeys: string[] = [];
  return {
    tryClaim(key: string): boolean {
      if (used.has(key)) return false;
      used.add(key);
      sessionKeys.push(key);
      return true;
    },
    getSessionKeys(): string[] {
      return [...sessionKeys];
    },
    getUsedCount(): number {
      return used.size;
    },
    async flush(categoryKey: string): Promise<void> {
      if (sessionKeys.length > 0) {
        await markDiversityUsedDB(categoryKey, sessionKeys);
      }
    },
  };
}

export async function loadDiversityTracker(categoryKey: string): Promise<DNATracker> {
  const stored = await getDiversityTrackerDB(categoryKey);
  return createDNATracker(stored);
}

export function genDNASignature(
  subject: string,
  macro: string,
  scene: string,
  microKey: string,
  micro: string,
  motif: string | null = null
): string {
  return motif
    ? `${subject}|${macro}|${scene}|${microKey}:${micro}|${motif}`
    : `${subject}|${macro}|${scene}|${microKey}:${micro}`;
}

// ── DEFAULT_BATCH_RULES & getBatchRules (line 6093+) — re-exported from prompt-helpers.ts ──
// Full implementation reads from CATEGORY_DNA[categoryKey]?.diversityEngine?.batchRules.
export { DEFAULT_BATCH_RULES, getBatchRules, pickWithBatchLimit, pickUnique, findStylePreset } from "./prompt-helpers";
export type { BatchRules, StylePresetEntry } from "./prompt-helpers";

// ── Batch diversity session (line 6100) ───────────────────────────────────
export interface BatchDiversitySession {
  subjectCounts: Map<string, number>;
  motifCounts: Map<string, number>;
  paletteCounts: Map<string, number>;
}

export function createBatchDiversitySession(): BatchDiversitySession {
  return { subjectCounts: new Map(), motifCounts: new Map(), paletteCounts: new Map() };
}

// pickWithBatchLimit re-exported from prompt-helpers.ts (line 64).

// ── PRODUCTION_POLICY & submission readiness (line 6147+) ────────────────
export const PRODUCTION_POLICY = {
  maxBatch: 50,
  maxSimilarVariants: 2,
  minReadyRatioToExport: 0.7,
  submissionSelection: "quality" as "quality" | "all",
  requireMetadataPass: true,
};

export type AssetReadinessStatus = "ready" | "needs_review" | "rejected" | "pending";

export function classifyAssetReadiness(asset: Asset | null | undefined): {
  status: AssetReadinessStatus;
  label: string;
  reason: string;
  priority: number;
} {
  const status = asset?.status;
  if (!asset || asset.isLoading || !asset.url) {
    return { status: "pending", label: "Pending", reason: "Belum selesai generate.", priority: 0 };
  }
  if (status === "FAILED") {
    return { status: "rejected", label: "Gagal", reason: "Generasi gagal — tidak layak submit.", priority: 4 };
  }
  if (status === "submitted" || status === "ready" || status === "exported") {
    return { status: "ready", label: "Siap", reason: "Sudah lolos preflight.", priority: 1 };
  }
  if (status === "metadata_ready") {
    return { status: "ready", label: "Siap", reason: "Metadata siap dikirim.", priority: 1 };
  }
  if (status === "rejected") {
    return { status: "rejected", label: "Ditolak", reason: "Preflight menolak asset ini.", priority: 4 };
  }
  if (status === "needs_review") {
    return { status: "needs_review", label: "Perlu Review", reason: "Periksa metadata/issue sebelum kirim.", priority: 3 };
  }
  if (status === "draft") {
    const sm: any = asset.stockMetadata || {};
    const decision = sm.preflightDecision;
    const issues = Array.isArray(sm.preflightIssues) ? sm.preflightIssues : [];
    if (decision === "fail") {
      return { status: "rejected", label: "Ditolak", reason: `Preflight: ${issues[0] || "gagal syarat kualitas"}`, priority: 4 };
    }
    if (decision === "needs_review") {
      return { status: "needs_review", label: "Perlu Review", reason: issues[0] || "Preflight butuh review.", priority: 3 };
    }
    if (decision === "pass") {
      return { status: "ready", label: "Siap", reason: "Preflight PASS.", priority: 1 };
    }
    return { status: "pending", label: "Belum Cek", reason: "Belum di-preflight.", priority: 2 };
  }
  return { status: "pending", label: "Pending", reason: "Belum diproses.", priority: 0 };
}

export function computeSubmissionReadiness(
  allAssets: Asset[],
  batchId: string | null = null
): {
  total: number;
  ready: number;
  needsReview: number;
  rejected: number;
  pending: number;
  readyRatio: number;
  recommendation: "export" | "review";
  items: Array<{ id: string } & ReturnType<typeof classifyAssetReadiness>>;
} {
  const pool = batchId ? allAssets.filter((a) => a.batchId === batchId) : allAssets;
  const items = pool.map((a) => ({ id: a.id, ...classifyAssetReadiness(a) }));
  const total = items.length;
  const ready = items.filter((i) => i.status === "ready").length;
  const needsReview = items.filter((i) => i.status === "needs_review").length;
  const rejected = items.filter((i) => i.status === "rejected").length;
  const pending = items.filter((i) => i.status === "pending").length;
  return {
    total,
    ready,
    needsReview,
    rejected,
    pending,
    readyRatio: total > 0 ? ready / total : 0,
    recommendation: total > 0 && readyRatioCouldExport(total, ready) ? "export" : "review",
    items,
  };
}

export function readyRatioCouldExport(total: number, ready: number): boolean {
  if (total === 0) return false;
  return ready / total >= PRODUCTION_POLICY.minReadyRatioToExport;
}

export function planConceptClusters(
  batchSize: number,
  categoryKey: string,
  subcategoryKey: string,
  selectedSubject: string | null = null
): Array<{ subject: string | null; macro: string | null; motif: string | null }> | null {
  const cat = CATEGORY_DNA[categoryKey];
  if (!cat) return null;
  const sub = subcategoryKey ? cat.subcategories[subcategoryKey] : null;
  const conceptDNA = sub?.conceptDNA || null;

  const usedSubjects = new Set();
  const usedMacros = new Set();
  const usedMotifs = new Set();

  const plans = [];
  for (let i = 0; i < batchSize; i++) {
    const subject = selectedSubject || (sub?.subjects?.length ? pickUnique(sub.subjects, usedSubjects) : null);
    const macro = cat.diversityEngine?.macroConcepts?.length ? pickUnique(cat.diversityEngine.macroConcepts, usedMacros) : null;
    const motif = conceptDNA?.motif?.length ? pickUnique(conceptDNA.motif, usedMotifs) : null;
    plans.push({ subject, macro, motif });
  }
  return plans;
}

// ── buildDNAContext (line 4995) — canonical delegation to dna-engine.ts ──
export function buildDNAContext(
  categoryKey: string,
  subcategoryKey: string,
  tracker?: any,
  skipSubject: boolean = false,
  styleName: string = "",
  selectedSubject: string | null = null,
  selectedScene: string | null = null,
  batchDiversity: any = null,
  clusterPlan: any = null,
  userSubjectLocked: boolean = false,
  assetType: string = ""
): string {
  return buildDNAContextImpl(
    categoryKey,
    subcategoryKey,
    tracker,
    skipSubject,
    styleName,
    selectedSubject,
    selectedScene,
    batchDiversity,
    clusterPlan,
    userSubjectLocked,
    assetType
  );
}

// ── compilePrompt — canonical prompt assembly (DNA context + style DNA + commercial rules + CGA)
export function compilePrompt({
  semanticIntent,
  resolvedConfig,
  styleInterpretation = null,
  dnaContext = '',
  commercialRules = '',
  cga = null,
  negativePrompt = '',
  archetypeInstruction = '',
  userPrompt = '',
  resolvedBg = null,
  marketPalette = '',
  styleCompatibility = null,
}: {
  semanticIntent?: any;
  resolvedConfig: VectorState;
  styleInterpretation?: any;
  dnaContext?: string;
  commercialRules?: string;
  cga?: any;
  negativePrompt?: string;
  archetypeInstruction?: string;
  userPrompt?: string;
  resolvedBg?: any;
  marketPalette?: string;
  styleCompatibility?: any;
}) {
  const cfg = resolvedConfig;
  const visualSettings = cfg.visualSettings || {};
  const assetType = cfg.assetType || 'vector';
  const preset = ASSET_TYPE_PRESETS[assetType] || ASSET_TYPE_PRESETS.vector;
  const style = (visualSettings as any)?.style || preset.style;
  const background = (visualSettings as any)?.background || preset.background;

  const globalDNA = assetType === 'photo'
    ? `[GLOBAL DNA] ${GLOBAL_DNA.photoCompliance.commercialQuality} ${GLOBAL_DNA.photoCompliance.negativeSpace} ${GLOBAL_DNA.photoCompliance.subjectClarity} ${GLOBAL_DNA.photoCompliance.edgeQuality} ${GLOBAL_DNA.photoCompliance.backgroundPreference} ${GLOBAL_DNA.photoCompliance.lensDepth} ${GLOBAL_DNA.adobeCompliance.thumbnailViability}`
    : `[GLOBAL DNA] ${GLOBAL_DNA.adobeCompliance.commercialQuality} ${GLOBAL_DNA.adobeCompliance.negativeSpace} ${GLOBAL_DNA.adobeCompliance.subjectClarity} ${GLOBAL_DNA.adobeCompliance.edgeQuality} ${GLOBAL_DNA.adobeCompliance.backgroundPreference} ${GLOBAL_DNA.adobeCompliance.noLensSimulation} ${GLOBAL_DNA.adobeCompliance.thumbnailViability}`;

  const bgEngineLayer = resolvedBg?.promptHint
    ? `[BACKGROUND ENGINE] ${resolvedBg.promptHint}`
    : (background ? `[BACKGROUND] ${background}` : '');

  const semanticLockLayer = semanticIntent ? buildSemanticLockToken(semanticIntent) : '';

  const styleLayer = styleInterpretation?.visualDirective
    ? `[STYLE] ${styleInterpretation.visualDirective}${styleInterpretation.characteristics?.length ? ` (${styleInterpretation.characteristics.join('; ')})` : ''}`
    : (style ? `[STYLE] ${style}` : '');

  const styleFlat = styleInterpretation?.visualDirective
    ? styleInterpretation.visualDirective
    : (style ? style : preset.styleHint);

  const compositionFlat = archetypeInstruction || null;

  const creativeFlat = cga?.positive
    ? cga.positive.replace(/^variation_\w+\s*\|?\s*/i, '').trim()
    : null;

  const commercialFlat = commercialRules
    ? commercialRules.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()
    : null;

  const globalFlat = assetType === 'photo'
    ? `${GLOBAL_DNA.photoCompliance.commercialQuality} ${GLOBAL_DNA.photoCompliance.negativeSpace} ${GLOBAL_DNA.photoCompliance.subjectClarity} ${GLOBAL_DNA.photoCompliance.edgeQuality} ${GLOBAL_DNA.photoCompliance.backgroundPreference} ${GLOBAL_DNA.photoCompliance.lensDepth} ${GLOBAL_DNA.adobeCompliance.thumbnailViability}`
    : `${GLOBAL_DNA.adobeCompliance.commercialQuality} ${GLOBAL_DNA.adobeCompliance.negativeSpace} ${GLOBAL_DNA.adobeCompliance.subjectClarity} ${GLOBAL_DNA.adobeCompliance.edgeQuality} ${GLOBAL_DNA.adobeCompliance.backgroundPreference} ${GLOBAL_DNA.adobeCompliance.noLensSimulation} ${GLOBAL_DNA.adobeCompliance.thumbnailViability}`;

  const bgFlat = resolvedBg?.promptHint
    ? resolvedBg.promptHint
    : (background ? background : '');
  const marketPaletteLayer = marketPalette ? `Color palette: ${marketPalette}` : '';

  const semanticFlat = semanticLockLayer
    ? semanticLockLayer.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()
    : null;

  const formatStr = (visualSettings as any)?.outputFormat || preset.outputFormat;

  const negativeFlat = negativePrompt
    ? negativePrompt
        .replace(/\[(?:ASSET|CATEGORY|SEMANTIC|COMPLIANCE|DNA)[^\]]*\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b(watermark|logo|brand mark)\b[,\s]*/gi, '')
        .trim()
        + ', watermark, logo, brand mark'
    : 'watermark, logo, brand mark, text';

  const photoAuthority = assetType === 'photo'
    ? 'AUTHORITATIVE MEDIUM: genuine photorealistic camera photography, natural photographic optics and real-world materials. Do not render as an illustration, vector graphic, cartoon, cel-shaded artwork, comic, or outlined linework.'
    : null;

  const isReferenceModePrompt = typeof userPrompt === 'string' && userPrompt.startsWith('RENDERING DIRECTIVE (from reference style):');
  const layers = isReferenceModePrompt
    ? [
        userPrompt,
        photoAuthority,
        dnaContext || null,
        marketPaletteLayer || null,
        commercialFlat || null,
        globalFlat || null,
        semanticFlat || null,
        formatStr ? `Output format: ${formatStr}.` : null,
        negativeFlat ? `Negative: ${negativeFlat}` : null,
      ].filter(Boolean)
    : [
        userPrompt || null,
        photoAuthority,
        dnaContext || null,
        marketPaletteLayer || null,
        styleFlat || null,
        creativeFlat || null,
        compositionFlat || null,
        bgFlat || null,
        commercialFlat || null,
        globalFlat || null,
        semanticFlat || null,
        formatStr ? `Output format: ${formatStr}.` : null,
        negativeFlat ? `Negative: ${negativeFlat}` : null,
      ].filter(Boolean);

  return layers.join('\n');
}

// ── STYLE_PRESET_MAP (line 5196) — re-exported from prompt-helpers.ts ──
export { STYLE_PRESET_MAP } from "./prompt-helpers";

// ── resolveStyleKeyFromVision (line 8754) — vision-driven style inference ──
export function resolveStyleKeyFromVision(
  vision: any,
  _assetType: string,
  _isPattern: boolean = false
): string {
  const rs = vision.renderingStyle || {};
  const is = vision.illustrationSignals || {};
  const ps = vision.patternSignals || {};
  const vs = vision.vectorSignals || {};
  const visualStyleRaw = String(vision.visualStyle || '').toLowerCase();

  // PHOTO — sudah bagus, kembalikan null dan biarkan preset.style handle
  if (_assetType === 'photo') {
    const people = Boolean(vision.peopleVisible) || Number(vision.peopleCount) > 0;
    if (people) return 'Environmental Portrait';
    if (/studio|portrait|headshot/.test(visualStyleRaw)) return 'Studio Portrait';
    if (/flat.lay|overhead|top.down/.test(visualStyleRaw)) return 'Flat Lay Overhead';
    if (/cinematic|wide.shot|landscape/.test(visualStyleRaw)) return 'Cinematic Wide Shot';
    if (/corporate|office|business/.test(visualStyleRaw)) return 'Corporate Editorial';
    return 'Lifestyle Scene';
  }

  // 3D
  if (_assetType === '3d') {
    if (/isometric/.test(visualStyleRaw) || is.perspectiveType === 'isometric') return 'Isometric 3D';
    if (/character|person|figure/.test(visualStyleRaw)) return '3D Character';
    if (/product|render|object/.test(visualStyleRaw)) return '3D Product Render';
    return '3D Object';
  }

  // PATTERN (vector/illustration dengan repeat)
  if (_isPattern) {
    if (rs.fillType === 'watercolor-wash' || is.artStyle === 'watercolor') return 'Watercolor';
    return 'Seamless Pattern';
  }

  // WATERCOLOR — sinyal sangat spesifik, prioritas tinggi
  if (rs.fillType === 'watercolor-wash' || is.artStyle === 'watercolor'
      || /watercolor|watercolour|aquarelle/.test(visualStyleRaw)) return 'Watercolor';

  // ISOMETRIC — dari illustrationSignals
  if (is.perspectiveType === 'isometric' || is.artStyle === 'isometric'
      || /isometric/.test(visualStyleRaw)) return 'Isometric 3D';

  // TEXTURED EDITORIAL — grain/texture visible
  if ((rs.texturePresence === 'prominent' || rs.texturePresence === 'dominant')
      && rs.fillType === 'textured' || /risograph|grain|editorial|textured/.test(visualStyleRaw)) return 'Textured Editorial';

  // HAND DRAWN — organic, variable stroke
  if (rs.strokeType === 'hand-drawn' || rs.strokeType === 'variable-weight'
      || is.artStyle === 'hand-drawn' || /hand.drawn|handdrawn|doodle|sketch/.test(visualStyleRaw)) return 'Hand-Drawn Organic';

  // BOLD FILLED — thick fills, minimal detail, high contrast
  if (rs.fillType === 'flat' && rs.strokeType === 'bold-outline'
      && rs.colorProfile === 'limited-2-4' || is.artStyle === 'retro'
      || /bold|constructivist|poster/.test(visualStyleRaw)) return 'Bold Filled';

  // MINIMAL OUTLINE — outline only, no fill
  if (rs.strokeType === 'thin-outline' && rs.fillType === 'flat'
      && (rs.colorProfile === 'monochromatic' || rs.colorProfile === 'limited-2-4')
      && !vs.hasOutlines || /minimal.outline|line.art|monoline/.test(visualStyleRaw)) return 'Minimal Outline';

  // LINE ART / LINEAL COLOR — outlines + flat fills
  if ((vs.hasOutlines && rs.fillType === 'flat')
      || is.artStyle === 'line-art' || /lineal|line.art|outline/.test(visualStyleRaw)) return 'Lineal Color';

  // CUTE KIDS — rounded, pastel, nursery
  if (/nursery|kawaii|cute.kid|children/.test(visualStyleRaw)
      || (rs.colorProfile === 'pastel' && vs.cornerStyle === 'rounded'
          && is.humanPresence !== 'none')) return 'Cute Kids & Nursery';

  // CUTE FOOD & OBJECT — semi-realistic food/object
  if (/cute.food|food.clipart|bakery|sticker/.test(visualStyleRaw)
      || (rs.fillType === 'watercolor-wash' && rs.edgeQuality === 'soft-raster'
          && /food|object|item/.test(String(vision.primarySubject || '').toLowerCase()))) return 'Cute Food & Object';

  // FLAT ROUNDED — rounded corners, soft shadow, app-style
  if (vs.cornerStyle === 'rounded' && rs.shadowType !== 'none'
      || /flat.rounded|rounded|app.illustrat|saas/.test(visualStyleRaw)) return 'Flat Rounded';

  // EDITORIAL SCENE — multi-element narrative, sophisticated
  if (vs.layoutType === 'scene' && is.humanPresence !== 'none'
      || /editorial|narrative|scene/.test(visualStyleRaw)) return 'Editorial Scene';

  // GRADIENT — gradient fills
  if (rs.fillType === 'gradient' || /gradient/.test(visualStyleRaw)) return 'Flat Commercial';

  // DEFAULT: FLAT COMMERCIAL (safest vector fallback)
  return 'Flat Commercial';
}

// ── findStylePreset re-exported from prompt-helpers.ts (line 64). ──
export function buildLayeredNegativePrompt({
  baseNegative = '',
  assetType = '',
  categoryKey = '',
  styleInterpretation = null,
  semanticIntent = null,
}) {
  const layers = [];

  if (baseNegative) layers.push(baseNegative);

  const assetLayer = {
    pattern: 'non-repeating composition, isolated single hero object, non-tileable layout, missing seam alignment',
    icon: 'complex background, multiple subjects in one icon, inconsistent stroke weight, mixed icon styles, gradients, shadows, 3D rendering',
    '3d': 'flat 2D rendering, vector flat illustration, cartoon outline, no depth, orthographic projection',
    scene: 'isolated subject on plain white background, cutout style, floating object without environment context',
  }[assetType === '3d' ? '3d' : (assetType || '')] || '';
  if (assetLayer) layers.push(`[ASSET] ${assetLayer}`);

  const categoryLayer = buildCategoryNegativeHints(categoryKey);
  if (categoryLayer && !baseNegative.includes('[CATEGORY]')) {
    layers.push(`[CATEGORY] ${categoryLayer}`);
  }

  const styleForbidden = Array.isArray(styleInterpretation?.incompatibleDomains) && styleInterpretation.incompatibleDomains.length > 0
    ? styleInterpretation.incompatibleDomains.join(', ')
    : '';
  if (styleForbidden) layers.push(`[STYLE] ${styleForbidden}`);

  const semanticForbidden = Array.isArray(semanticIntent?.forbiddenDomains) && semanticIntent.forbiddenDomains.length > 0
    ? semanticIntent.forbiddenDomains.join(', ')
    : '';
  if (semanticForbidden) layers.push(`[SEMANTIC] ${semanticForbidden}`);

  const complianceLayer = 'watermark, logo, brand mark, trademark, copyright symbol, text/typography, QR code, barcode, recognizable brand products';
  layers.push(`[COMPLIANCE] ${complianceLayer}`);

  return layers.filter(Boolean).join('; ');
}

export { createCompositionSession, generateDynamicSlot, getBatchSlots } from "./composition";
export type { CompositionSession, CompositionSlot } from "./composition";

export async function expandPromptWithGemini(
  baseTheme: string,
  archetypeContext: string = "",
  config: any,
  aiConfig: SystemSettings["aiConfig"],
  onApiCall: () => void,
  negativePromptText: string = "",
  semanticIntent: any = null,
  resolvedBg: any = null
): Promise<string> {
  const textModel = aiConfig?.textModel || "gemini-2.5-flash";
  const visualSettings = config.visualSettings || {};
  const preset = ASSET_TYPE_PRESETS[config.assetType] || ASSET_TYPE_PRESETS.vector;
  const sharpnessInstruction = visualSettings.highDpiSharpness ? "High-DPI 4K ultra-sharp rendering, pristine precision lines, flawless geometric edges, zero pixelation." : "";
  const facelessInstruction = visualSettings.faceless ? "Faceless subjects, abstract minimal features, no detailed facial features (no eyes/nose/mouth)." : "";
  const negativeSpaceInstruction = visualSettings.negativeSpace ? "Generous negative space, minimalistic composition, plenty of clean copy space around the main subject." : "";
  const resolvedBackgroundHint = resolvedBg?.promptHint || "";
  const bgLayerText = resolvedBackgroundHint || (config.assetType === "photo" ? "Full-bleed natural environmental scene, no isolated subject, contextual setting appropriate to the theme" : `Solid plain ${visualSettings.background || preset.background}`);
  const integrityBlock = semanticIntent ? [
    "", "You are a prompt EXPANSION engine, not a creative director.", "You MUST preserve the user's primary subject exactly.", "",
    `PRIMARY SUBJECT (do not change): ${semanticIntent.primarySubject || baseTheme}`,
    `DOMAIN (do not change): ${semanticIntent.subjectDomain || "general"}`,
    `ASSET PROFILE (do not change): ${semanticIntent.assetProfile || "unspecified"}`, "", "You MUST NOT:",
    "- replace the subject", "- introduce a new domain", "- substitute the object", "- reinterpret the category", "- invent unrelated objects", "",
    "You may ONLY improve:", "- visual specificity, composition, lighting, material, color, rendering quality, commercial usability, stylistic execution.",
  ] : [];
  const stylePreset = findStylePresetEntry(visualSettings.style || "");
  const styleDirective = stylePreset?.promptTrigger
    ? `${config.assetType === "photo" ? "[PHOTO STYLE DIRECTIVE]" : "[STYLE DIRECTIVE]"} ${stylePreset.promptTrigger}`
    : `[STYLE] ${visualSettings.style || preset.style}`;
  const globalDNA = config.assetType === "photo"
    ? `[PHOTO COMPLIANCE] ${GLOBAL_DNA.photoCompliance.commercialQuality} ${GLOBAL_DNA.photoCompliance.negativeSpace} ${GLOBAL_DNA.photoCompliance.subjectClarity} ${GLOBAL_DNA.photoCompliance.edgeQuality} ${GLOBAL_DNA.photoCompliance.backgroundPreference} ${GLOBAL_DNA.photoCompliance.lensDepth} ${GLOBAL_DNA.adobeCompliance.thumbnailViability}`
    : `[COMPLIANCE] ${GLOBAL_DNA.adobeCompliance.commercialQuality} ${GLOBAL_DNA.adobeCompliance.negativeSpace} ${GLOBAL_DNA.adobeCompliance.subjectClarity} ${GLOBAL_DNA.adobeCompliance.edgeQuality} ${GLOBAL_DNA.adobeCompliance.backgroundPreference} ${GLOBAL_DNA.adobeCompliance.noLensSimulation} ${GLOBAL_DNA.adobeCompliance.thumbnailViability}`;
  const sysInstruction = [
    "You are an expert prompt engineer for Adobe Stock commercial digital assets.", "Translate and expand the theme into a clean, specific image prompt.", "Use these structured layers to guide the output:", "",
    `[ASSET TYPE] ${(config.assetType || "vector").toUpperCase()} - ${preset.styleHint}`, styleDirective, globalDNA,
    `[CATEGORY] ${config.adobeCategory || ""} > ${config.subcategory || ""}`, `[BACKGROUND] ${bgLayerText}`,
    archetypeContext ? `[COMPOSITION] ${archetypeContext}` : "", `[QUALITY] ${sharpnessInstruction} ${facelessInstruction} ${negativeSpaceInstruction}`,
    `[FORMAT] ${visualSettings.outputFormat || preset.outputFormat}`,
    `[RULES] DO NOT use: stock, watermark, shutterstock, freepik, adobe, getty, white box, frame, border${negativePromptText ? `, ${negativePromptText}` : ""}`,
    "OUTPUT ONLY THE PROMPT TEXT. NO CONVERSATION. NO MARKDOWN.", ...integrityBlock,
  ].filter(Boolean).join("\n");
  const payload = { contents: [{ parts: [{ text: `Expand this theme for a commercial digital asset: ${baseTheme}` }] }], systemInstruction: { parts: [{ text: sysInstruction }] }, generationConfig: { thinkingConfig: { thinkingBudget: 0 } } };
  const fallbackDesc = config.assetType === "photo" ? "full-bleed natural environmental scene, no isolated subject, contextual depth" : "isolated on solid background";
  try {
    onApiCall();
    return await generateText(textModel, payload, true);
  } catch (err: any) {
    console.warn("[Imagin AI] expandPrompt failed:", err?.status || err);
    return `${visualSettings.style || preset.style}: Clean ${config.assetType || "vector"} asset of ${baseTheme}, ${fallbackDesc}. ${sharpnessInstruction} ${facelessInstruction} ${negativeSpaceInstruction}`;
  }
}
