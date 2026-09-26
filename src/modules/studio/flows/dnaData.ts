// @ts-nocheck — Studio DNA flow data/helpers extracted verbatim from App.tsx.
import { CATEGORY_DNA, CATEGORY_NEGATIVE_HINTS, GLOBAL_CGA_DATABASE, GLOBAL_DNA, MARKET_PALETTES, STYLE_PRESET_DNA, STYLE_PRESET_MAP } from '../registry/dna';
import { ANIMATION_PRESETS, DEFAULT_PLATFORM, DNA_TO_OFFICIAL_MAP, OFFICIAL_TO_DNA_MAP, PLATFORM_ADAPTERS } from '../registry/presets';
export { ACTIVITY_CONTEXTS, CAMERA_ANGLES, FRAMING_STYLES, SUBJECT_TYPES } from '../registry/presets';
export { BATCH_TIERS, FILTER_STATUS_ORDER, GENERATION_MODES, ICON_GENERATION_MODES, MAX_BATCH_COUNT, SPAM_TERMS, STATUS_CONFIG } from '../registry/constants';
import { createDNATracker, genDNASignature } from '../engines/prompt';
import { getDiversityTrackerDB } from '../engines/storage';
import { getBatchRules, pickWithBatchLimit } from '../engines/prompt-helpers';
import { resolveBackground, resolveDNAFromOfficial } from '../resolvers';
import { resolveExportFormat } from '../utils';
import { callGeminiForJSON } from '../engines/generation';
import type { VectorState } from '../types';

export { CATEGORY_DNA, CATEGORY_NEGATIVE_HINTS, DNA_TO_OFFICIAL_MAP, GLOBAL_CGA_DATABASE, GLOBAL_DNA, MARKET_PALETTES, OFFICIAL_TO_DNA_MAP, STYLE_PRESET_DNA, STYLE_PRESET_MAP };

export const ANIMATION_PRESET_MAP = Object.fromEntries(ANIMATION_PRESETS.map(p => [p.id, p]));
export const ANIMATION_DEFAULT_PRESET = 'fade-in';

export const INITIAL_VECTOR_STATE: VectorState = {
    assetType: 'vector',
    generationMode: 'single',
    quantity: 1,
    platform: DEFAULT_PLATFORM,
    platformCategoryId: null,
    internalCategory: '',
    adobeCategory: '',
    subcategory: '',
    visualSettings: {
        aspectRatio: '4:3',
        background: 'auto',
        style: 'Flat Commercial',
        highDpiSharpness: true,
        outputFormat: 'PNG',
        faceless: false,
        negativeSpace: true,
    },
    _visualDirty: {},
    singlePromptInput: '',
    iconMode: false,
    iconStyle: null,
    iconQuantity: 1,
    iconGenerationMode: 'per_canvas',
    useAIComposition: false,
    selectedSubject: null,
    selectedScene: null,
    skipAIExpansion: false,
    dnaPanelCollapsed: true,
    _assetTypeDirty: false,
    _generationModeDirty: false,
    _outputFormatDirty: false,
    svgComplexity: 'medium',
    svgTraceOptions: { preset: 'general', drawStyle: 'filled', lineQuality: 'medium', groupBy: 'color', gapFiller: true, gapFillerWidth: 2.0, smoothEdges: true },
    collectionMode: false,
    collectionName: '',
};

export const createInitialVectorState = () => ({
    ...INITIAL_VECTOR_STATE,
    visualSettings: { ...INITIAL_VECTOR_STATE.visualSettings },
    _visualDirty: {},
});

export { PRODUCTION_POLICY } from '../engines/prompt';

// App-parity tables already live in the preset registry; re-export rather than duplicate them.
export { BACKGROUND_STRATEGY, CATEGORY_BACKGROUND_STRATEGY, SUBCATEGORY_BACKGROUND_OVERRIDE, ASSET_TYPE_DEFAULT_BACKGROUND } from '../registry/presets';

export const analyzeConceptGenericity = async (input, category, subcategory, aiConfig, onApiCall) => {
    const theme = (input || '').trim();
    if (!theme) return null;

    const payload = {
        contents: [{
            parts: [{
                text: `You are an Adobe Stock market-saturation analyst. Based on your general knowledge of extremely common, oversaturated stock content patterns (not real-time search — you don't have that), assess how generic/overdone the concept below is likely to be on stock marketplaces.

Concept: "${theme}"
Category context: "${category || ''} > ${subcategory || ''}"

Consider clichés like: single object on plain white/isolated background with no context, generic handshake/business-deal poses, literal one-to-one metaphor icons, overused seasonal motifs (single flower, single leaf), stock "diverse team high-fiving" poses, generic laptop-on-desk mockups, etc.

ULTRA-SATURATED categories (score 80-100 unless there is a clearly unique differentiator like unusual POV, cultural twist, unexpected context, or non-standard composition):
- Holiday food illustrations: cupcakes/cookies/gingerbread/hot cocoa with generic festive toppings isolated on white -- tens of thousands of near-identical assets exist on stock platforms
- Christmas/winter: single ornament, single snowflake, single candy cane isolated on white
- Generic florals: single rose/sunflower/tulip isolated with no context or unique angle
- Business: handshake close-up, laptop on desk, generic lightbulb idea icon
- Nature: single autumn leaf, single tree silhouette on white
- Food: isolated single fruit/vegetable without unique style or composition
- Health/wellness: yoga silhouette, meditation pose on white
- Technology: generic circuit board, generic cloud with arrow

A concept is NOT generic just because it's simple -- judge specifically against known oversaturated patterns. A unique cultural angle, unexpected composition, or narrative context can rescue even a common subject.

Return ONLY valid JSON (no markdown, no code fences):
{
  "genericityScore": 0,
  "matchedCommonPattern": "short name of the cliché pattern this resembles, or null if none",
  "differentiationSuggestions": ["short concrete suggestion", "short concrete suggestion"],
  "recommendation": "proceed"
}

Rules:
- "genericityScore": integer 0-100. 0-30 = fresh/distinctive angle, unlikely to look like existing saturated content. 31-65 = recognizable common concept but still viable with distinct composition/context. 66-100 = heavily oversaturated stock cliché, very likely to blend into thousands of near-identical existing assets.
- "differentiationSuggestions": 2-3 short, concrete, actionable ways to make the concept more distinctive (composition, context, unexpected angle, added narrative element). Empty array if score is low and no changes needed.
- "recommendation": "proceed" (score 0-30), "differentiate" (31-65), or "reconsider" (66-100).`
            }]
        }],
        systemInstruction: {
            parts: [{ text: `You are a pragmatic stock-marketplace analyst. Judge against genuinely oversaturated patterns only, not simplicity in general. Return ONLY valid JSON.` }]
        }
    };

    try {
        const { data: parsed } = await callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'concept-differentiation' });
        if (!parsed) {
            console.warn('[Imagin AI] Failed to parse differentiation JSON.');
            return null;
        }
        const genericityScore = Math.max(0, Math.min(100, Number(parsed.genericityScore) || 0));
        const recommendation = ['proceed', 'differentiate', 'reconsider'].includes(parsed.recommendation)
            ? parsed.recommendation
            : (genericityScore >= 66 ? 'reconsider' : genericityScore >= 31 ? 'differentiate' : 'proceed');
        return {
            genericityScore,
            matchedCommonPattern: parsed.matchedCommonPattern || null,
            differentiationSuggestions: Array.isArray(parsed.differentiationSuggestions) ? parsed.differentiationSuggestions.slice(0, 3) : [],
            recommendation,
        };
    } catch (err) {
        console.error('Differentiation check failed:', err);
        return null;
    }
};

export const SUBJECT_TIER_MAP: Record<string, 'red' | 'yellow' | 'green'> = {
    apple: 'red', banana: 'red', orange: 'red', strawberry: 'red', avocado: 'red', mango: 'red', watermelon: 'red', grape: 'red', lemon: 'red', coffee: 'red',
    'coffee cup': 'red', flower: 'red', rose: 'red', sunflower: 'red', house: 'red', home: 'red', tree: 'red', car: 'red', heart: 'red', mountain: 'red', sunset: 'red', beach: 'red', ocean: 'red', sky: 'red',
    dog: 'red', cat: 'red', bird: 'red', fish: 'red', lion: 'red', business: 'red', handshake: 'red', meeting: 'red', teamwork: 'red', woman: 'red', man: 'red', people: 'red', person: 'red', family: 'red',
    food: 'red', pizza: 'red', burger: 'red', cake: 'red', bread: 'red', 'seamless pattern': 'red', floral: 'red', geometric: 'red',
    kiwi: 'yellow', papaya: 'yellow', coconut: 'yellow', pineapple: 'yellow', dragon: 'yellow', unicorn: 'yellow', robot: 'yellow', astronaut: 'yellow', technology: 'yellow', smartphone: 'yellow', laptop: 'yellow', tablet: 'yellow',
    icon: 'yellow', 'icon set': 'yellow', logo: 'yellow', watercolor: 'yellow', sketch: 'yellow', doodle: 'yellow', isometric: 'yellow', '3d': 'yellow', character: 'yellow', nature: 'yellow', garden: 'yellow', forest: 'yellow', river: 'yellow',
    rambutan: 'green', salak: 'green', durian: 'green', mangosteen: 'green', jackfruit: 'green', starfruit: 'green', longan: 'green', dragonfruit: 'green', batik: 'green', kawung: 'green', parang: 'green', ikat: 'green', songket: 'green', toraja: 'green', dayak: 'green', wayang: 'green',
    'mega mendung': 'green', truntum: 'green', poleng: 'green', 'chhath puja': 'green', 'lion capital': 'green', jagannath: 'green', saraswati: 'green', mahakal: 'green', 'ashok stambha': 'green', mycology: 'green', fungi: 'green', mushroom: 'green',
    cutaway: 'green', 'cross section': 'green', 'technical diagram': 'green', 'smart factory': 'green', 'offshore wind': 'green', 'solar farm': 'green', 'deep sea': 'green', underground: 'green',
};

export const STYLE_DIFFERENTIATORS = [
    'risograph', 'grain', 'risograph texture', 'vintage print', 'letterpress', 'botanical illustration', 'scientific illustration', 'engraving', 'woodcut', 'linocut', 'silk screen', 'duotone', 'noise gradient', 'halftone',
    'soft pop', 'clay render', 'inflatable', '3d clay', 'soft 3d', 'cutaway', 'cross-section', 'technical diagram', 'blueprint', 'watercolor wash', 'ink wash', 'gouache', 'oil pastel',
];
export const COMPOSITION_DIFFERENTIATORS = [
    'overhead', 'top-down', 'aerial', "bird's eye", 'flat lay', 'macro', 'close-up', 'extreme close-up', 'detail shot', "worm's eye", 'low angle', 'dutch angle', 'rule of thirds', 'negative space', 'asymmetric', 'cross-section', 'cutaway', 'exploded view', 'isometric',
];
export const CONTEXT_DIFFERENTIATORS = [
    'traditional', 'authentic', 'regional', 'cultural', 'ceremonial', 'pre-dawn', 'blue hour', 'golden hour', 'twilight', 'night', 'weathered', 'aged', 'worn', 'antique', 'vintage', 'steam', 'condensation', 'texture', 'grain', 'bokeh', 'heirloom', 'heritage', 'artisan', 'handcrafted',
];

export const analyzePromptDifferentiation = (prompt: string) => {
    const lower = prompt.toLowerCase();
    let subjectTier: 'red' | 'yellow' | 'green' | 'unknown' = 'unknown';
    let detectedSubject = '';
    for (const [subject, tier] of Object.entries(SUBJECT_TIER_MAP)) {
        if (lower.includes(subject) && (subjectTier === 'unknown' || tier === 'red' || (tier === 'yellow' && subjectTier === 'green'))) {
            subjectTier = tier;
            detectedSubject = subject;
        }
    }
    const matchedStyleHints = STYLE_DIFFERENTIATORS.filter(d => lower.includes(d));
    const matchedCompositionHints = COMPOSITION_DIFFERENTIATORS.filter(d => lower.includes(d));
    const matchedContextHints = CONTEXT_DIFFERENTIATORS.filter(d => lower.includes(d));
    const styleScore = Math.min(matchedStyleHints.length, 2);
    const compositionScore = Math.min(matchedCompositionHints.length, 2);
    const contextScore = Math.min(matchedContextHints.length, 2);
    const wordCount = prompt.trim().split(/\s+/).length;
    const totalScore = styleScore + compositionScore + contextScore + (wordCount >= 20 ? 1 : 0);
    const riskLevel: 'high' | 'medium' | 'low' = subjectTier === 'green' ? 'low'
        : subjectTier === 'red' ? (totalScore >= 3 ? 'medium' : 'high')
        : subjectTier === 'yellow' ? (totalScore >= 2 ? 'low' : 'medium')
        : totalScore >= 2 ? 'low' : 'medium';
    const suggestions: string[] = [];
    if (styleScore === 0) suggestions.push('Tambah style modifier: risograph, botanical illustration, clay render, cutaway');
    if (compositionScore === 0) suggestions.push('Tambah komposisi: overhead, macro, cross-section, atau asymmetric framing');
    if (contextScore === 0) suggestions.push('Tambah konteks: cultural, golden hour, condensation, weathered, atau specific material');
    if (wordCount < 15) suggestions.push('Prompt terlalu pendek — tambah detail untuk diferensiasi lebih kuat');
    if (subjectTier === 'red' && totalScore < 3) suggestions.push(`"${detectedSubject}" sangat saturated — pertimbangkan sub-niche atau variasi yang lebih spesifik`);
    return { subjectTier, detectedSubject, styleScore, compositionScore, contextScore, totalScore, riskLevel, matchedStyleHints, matchedCompositionHints, matchedContextHints, suggestions };
};

export type PromptDifferentiationResult = ReturnType<typeof analyzePromptDifferentiation>;

// 09 · ENGINES — DNA Engine (tracker, signature, context builder)
//  DNA ENGINE V5 — PROMPT ENRICHMENT

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export async function loadDiversityTracker(categoryKey) {
  const stored = await getDiversityTrackerDB(categoryKey);
  return createDNATracker(stored);
}

export function buildDNAContext(categoryKey, subcategoryKey, tracker, skipSubject = false, styleName = '', selectedSubject = null, selectedScene = null, batchDiversity = null, clusterPlan = null, userSubjectLocked = false, assetType = '') {
  const cat = CATEGORY_DNA[categoryKey];
  if (!cat) return '';

  const sub = subcategoryKey ? cat.subcategories[subcategoryKey] : null;
  const subjects = sub?.subjects;
  const de = cat.diversityEngine;
  const varKeys = Object.keys(de.microVariations);

  // EU-7: Batch diversity rules — membatasi subject/palette yang sama berulang
  // dalam SATU batch. No-op kalau batchDiversity tidak diberikan (null).
  const batchRules = batchDiversity ? getBatchRules(categoryKey) : null;

  // EU-12: Concept cluster plan — kalau diberikan (dari planConceptClusters),
  // subject/macro/motif item ini DIKUNCI ke nilai cluster-nya supaya setiap
  // item dalam batch punya konsep berbeda (bukan variasi visual). No-op kalau
  // null → perilaku lama (random per dimensi).
  const clusterSubject = clusterPlan?.subject ?? null;
  const clusterMacro = clusterPlan?.macro ?? null;
  const clusterMotif = clusterPlan?.motif ?? null;

  // EU-11: Concept DNA — field tambahan opsional per-subkategori (schema v5).
  // Kalau subkategori tidak punya conceptDNA, semua di bawah ini no-op dan
  // perilaku engine identik dengan sebelum EU-11 (backward compatible).
  const conceptDNA = sub?.conceptDNA || null;
  const hasMotifPool = Array.isArray(conceptDNA?.motif) && conceptDNA.motif.length > 0;

  let tries = 0;
  let subject, macro, scene, microKey, micro, motif, sig;

  do {
    // Fix #2 (audit DNA): user subject LOCK — kalau userSubjectLocked dan
    // selectedSubject diberikan, subject TIDAK boleh diganti DNA/random.
    // clusterSubject (EU-12) tetap prioritas tertinggi karena konsep cluster
    // memang sengaja mengunci subject per-item dalam batch.
    subject = (clusterSubject || (userSubjectLocked && selectedSubject))
      ? (clusterSubject || selectedSubject)
      : selectedSubject || ((!skipSubject && subjects)
        ? (batchDiversity ? pickWithBatchLimit(subjects, batchDiversity.subjectCounts, batchRules.sameSubcategoryMax, 'subject') : pickRandom(subjects))
        : null);
    macro = clusterMacro || (!skipSubject ? pickRandom(de.macroConcepts) : null);
    scene = selectedScene || (!skipSubject ? pickRandom(de.commercialScenes) : null);
    microKey = pickRandom(varKeys);
    micro = pickRandom(de.microVariations[microKey]);
    motif = clusterMotif || (hasMotifPool
      ? (batchDiversity ? pickWithBatchLimit(conceptDNA.motif, batchDiversity.motifCounts, batchRules.sameSubcategoryMax, 'motif') : pickRandom(conceptDNA.motif))
      : null);
    sig = genDNASignature(subject, macro, scene, microKey, micro, motif);
    tries++;
  } while (tracker && !tracker.tryClaim(sig) && tries < 20);

  const stylePreset = findStylePreset(styleName);
  const isPhoto = assetType === 'photo';
  // FIX: photo styles (lifestyleScene, corporateEditorial, cinematicWideShot, dll.) JUGA punya
  // promptTrigger yang wajib di-inject — sebelumnya kosong untuk semua foto.
  // Untuk photo: tidak pakai bracket [STYLE DNA:] agar tidak bentrok dengan photoAuthority layer;
  // inject sebagai plain text supaya model membacanya sebagai instruksi fotografi langsung.
  const styleDNA = stylePreset
    ? (isPhoto ? stylePreset.promptTrigger : `[STYLE DNA: ${stylePreset.promptTrigger}]`)
    : '';

  // conceptDNA.palette, kalau ada, dipilih random per-generate (micro-level
  // diversity) — sisanya (structure/repetition/background/visualLanguage)
  // sifatnya deskriptif tetap per-subkategori, jadi tidak perlu di-randomize.
  // EU-7: kalau batchDiversity aktif, palette yang sama dibatasi max
  // identicalPaletteMax kali per batch.
  const conceptPalette = Array.isArray(conceptDNA?.palette) && conceptDNA.palette.length > 0
    ? (batchDiversity ? pickWithBatchLimit(conceptDNA.palette, batchDiversity.paletteCounts, batchRules.identicalPaletteMax, 'palette') : pickRandom(conceptDNA.palette))
    : null;

  // EU-1..4 paket B: promptRules.mustInclude — elemen wajib hadir di visual,
  // spesifik per-subkategori (mis. "clean isolated background" untuk Geometric Shapes).
  // Array di-join sebagai instruksi koma-separated agar mudah dibaca model.
  const mustInclude = Array.isArray(conceptDNA?.promptRules?.mustInclude) && conceptDNA.promptRules.mustInclude.length > 0
    ? conceptDNA.promptRules.mustInclude.join(', ')
    : null;

  // EU-1..4 paket B: promptRules.mustAvoid — elemen yang WAJIB DIHINDARI di
  // visual (kebalikan dari mustInclude). Ini berpasangan dengan mustInclude:
  // mustInclude = apa yang harus ada, mustAvoid = apa yang tidak boleh muncul.
  // Data ini sekarang di-wire ke prompt sebagai instruksi eksplisit.
  const mustAvoid = Array.isArray(conceptDNA?.promptRules?.mustAvoid) && conceptDNA.promptRules.mustAvoid.length > 0
    ? conceptDNA.promptRules.mustAvoid.join(', ')
    : null;

  // Flatten style DNA ke natural language (hapus bracket wrapper)
  const styleDNAFlat = stylePreset ? stylePreset.promptTrigger : '';

  // Bangun natural language DNA context — NO bracket tags
  const subjectLine = subject ? subject : null;
  const styleLine = styleDNAFlat || null;
  const sceneLine = scene ? `depicted as ${scene}` : null;
  const macroLine = macro ? `evoking ${macro}` : null;
  const microLine = micro ? `${microKey}: ${micro}` : null;
  const motifLine = motif ? `motif: ${motif}` : null;
  const structureLine = conceptDNA?.structure ? conceptDNA.structure : null;
  const repetitionLine = conceptDNA?.repetition ? `variation instruction: ${conceptDNA.repetition}` : null;
  const paletteLine = conceptPalette ? `color palette: ${conceptPalette}` : null;
  // FIX: visualLanguage di photo CATEGORY_DNA (mis. Lifestyle, People) berisi instruksi
  // representasi diversity & authenticity yang penting. Sebelumnya selalu null untuk photo.
  // FIX v2: beberapa visualLanguage masih menyebut "illustration" / "flat vector" — untuk
  // photo, strip kata-kata rendering medium itu agar tidak kontradiktif dengan photoAuthority.
  const visualLangRaw = conceptDNA?.visualLanguage || null;
  const visualLangLine = visualLangRaw
    ? (isPhoto
        ? visualLangRaw
            .replace(/\b(flat vector|flat illustration|vector illustration|illustration|flat vector illustration|editorial illustration|lifestyle illustration|flat vector,?\s*)/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim() || null
        : visualLangRaw)
    : null;
  const bgTreatLine = conceptDNA?.background ? conceptDNA.background : null;
  const mustIncludeLine = mustInclude ? `include: ${mustInclude}` : null;
  const mustAvoidLine = mustAvoid ? `avoid: ${mustAvoid}` : null;

  // FIX: photo sebelumnya kehilangan visualDNA DAN subcategoryKey keduanya.
  // Photo visualDNA mengandung frasa "Flat vector illustration" yang tidak relevan —
  // kita strip itu dan pakai commercialDNA sebagai fallback yang lebih neutral,
  // ditambah subcategoryKey (selalu diperlukan untuk context spesifik kategori).
  const categoryHint = isPhoto
    ? (subcategoryKey ? subcategoryKey : (cat.commercialDNA || ''))
    : `${cat.visualDNA}${subcategoryKey ? ', ' + subcategoryKey : ''}`;

  return [
    subjectLine,
    styleLine,
    sceneLine,
    macroLine,
    microLine,
    motifLine,
    structureLine,
    repetitionLine,
    paletteLine,
    visualLangLine,
    bgTreatLine,
    categoryHint,
    mustIncludeLine,
    mustAvoidLine,
  ].filter(Boolean).join(', ');
}

// 10 · RULE ENGINE — Commercial Rules
//  DNA ENGINE V5 — COMMERCIAL RULES

export function buildCommercialRules(categoryKey, subcategoryKey = '', assetType = '') {
  const cat = CATEGORY_DNA[categoryKey];
  if (!cat && !categoryKey) return '';
  // FIX #22 (audit): kategori tak dikenal (categoryKey ada, DNA tidak) —
  // jangan lolos diam-diam; warning + lanjut dengan token compliance saja.
  if (!cat) console.warn(`[DNA] buildCommercialRules: unknown category "${categoryKey}" — output partial (compliance tokens only)`);
  const adobe = GLOBAL_DNA.adobeCompliance;
  const photo = GLOBAL_DNA.photoCompliance;
  const isPhoto = assetType === 'photo';
  const sub = subcategoryKey && cat ? cat.subcategories[subcategoryKey] : null;
  const subjects = sub?.subjects;
  const subjectList = subjects ? subjects.slice(0, 4).join(', ') : '';

  // EU-8: Generic Object DNA — hanya aktif kalau subkategori ini ditandai
  // genericObjectTags (Technology/Business/Transportation/dst yang rawan
  // menghasilkan visual mirip produk/UI/kendaraan nyata).
  const objectTags = sub?.genericObjectTags;
  const genericObjectRules = Array.isArray(objectTags) && objectTags.length > 0
    ? objectTags.map(tag => GENERIC_OBJECT_DNA[tag]).filter(Boolean).join('; ')
    : '';

  // EU-11: Concept DNA — commercialUse per-subkategori, lebih spesifik
  // daripada cat.commercialDNA yang cakupannya se-kategori. No-op kalau
  // subkategori belum punya conceptDNA.
  const conceptCommercialUse = Array.isArray(sub?.conceptDNA?.commercialUse) && sub.conceptDNA.commercialUse.length > 0
    ? sub.conceptDNA.commercialUse.join(', ')
    : '';

  // Token compliance harus sesuai assetType. Photo memakai photoCompliance
  // (tanpa noLensSimulation, tanpa "isolated white", tanpa kata "Vector")
  // — kalau tidak, model foto disuruh memproduksi gambar flat/vektor.
  const complianceToken = isPhoto
    ? `PHOTO STANDARD: ${photo.commercialQuality} ${photo.negativeSpace} ${photo.subjectClarity} ${photo.edgeQuality} ${photo.backgroundPreference} ${photo.lensDepth}`
    : `ADOBE STANDARD: ${adobe.commercialQuality} ${adobe.negativeSpace} ${adobe.subjectClarity} ${adobe.edgeQuality} ${adobe.backgroundPreference} ${adobe.noLensSimulation}`;

  return [
    complianceToken,
    cat ? `CATEGORY COMMERCIAL: ${cat.commercialDNA}` : '',
    // qualityDNA dan compositionDNA menjadi quality standard dan composition
    // guide per kategori.
    cat?.qualityDNA ? `QUALITY STANDARD: ${cat.qualityDNA}` : '',
    cat?.compositionDNA ? `COMPOSITION GUIDE: ${cat.compositionDNA}` : '',
    subcategoryKey ? `SUBCATEGORY: ${subcategoryKey}${subjectList ? ` — Suggested subjects: ${subjectList}` : ''}` : '',
    conceptCommercialUse ? `SUBCATEGORY COMMERCIAL USE: ${conceptCommercialUse}` : '',
    genericObjectRules ? `IP-SAFE OBJECT RULES: ${genericObjectRules}` : '',
  ].filter(Boolean).join(' | ');
}


// 09 · ENGINES — DNA Engine (style guidance resolver)
//  DNA ENGINE V5 — STYLE DNA


export function findStylePreset(styleName) {
  const key = (styleName || '').toLowerCase().replace(/[\s-]+/g, '');
  return STYLE_PRESET_DNA[STYLE_PRESET_MAP[key]];
}

export function buildStyleGuidance(styleName, customDirective = '', customAvoid = '') {
  if (customDirective || customAvoid) return `CUSTOM STYLE: ${customDirective || ''}${customAvoid ? ` Avoid: ${customAvoid}` : ''}`.trim();
  const preset = findStylePreset(styleName);
  return preset ? `STYLE DNA: ${preset.promptTrigger}. ${preset.characteristics}` : '';
}

export const GENERIC_OBJECT_DNA = {
  device: 'generic unbranded consumer device, no identifiable manufacturer, no distinctive product geometry, no brand-specific button layout, no logos or model markings',
  softwareUI: 'fictional generic dashboard interface, abstract simplified data visualization, no recognizable real application layout, no branded UI patterns, no company-specific interface colors, not a screenshot of any real software',
  packaging: 'generic unbranded packaging or container, no recognizable packaging silhouette of an existing product, no brand identity, no trademark-like marks or wordmarks',
  vehicle: 'generic vehicle design, no manufacturer-specific styling or badges, no distinctive trademark elements, no visible brand logos',
};

// 10 · RULE ENGINE — Category Negative Hints
//  DNA ENGINE V5 — NEGATIVE PROMPT ENGINE

export function buildCategoryNegativeHints(categoryKey) {
  return CATEGORY_NEGATIVE_HINTS[categoryKey] || '';
}

export { getPaletteForCategory } from '../registry/dna';

const ASSET_PROFILE_SUBKEYWORD_MAP = [
    { profile: 'pattern',        match: ['pattern', 'texture', 'decorative pattern', 'seamless'] },
    { profile: 'background',     match: ['background', 'texture & pattern', 'urban skyline', 'landscape'] },
    { profile: 'icon',           match: ['icon', 'icon set', 'social media icons', 'arrows & shapes', 'badges & labels'] },
    { profile: 'infographic',    match: ['infographic', 'charts', 'diagram', 'maps', 'navigation'] },
    { profile: 'character',      match: ['character', 'mascot', 'people'] },
    { profile: 'scene',          match: ['scene', 'cityscape', 'interior', 'landscape', 'travel'] },
    { profile: 'object',         match: ['object', 'equipment', 'device', 'tools', 'vehicles', 'food', 'flower'] },
];

export const resolveAssetProfile = ({ assetType, category, subcategory, iconMode }) => {
    if (iconMode) return 'icon';
    const sub = (subcategory || '').toLowerCase();
    for (const rule of ASSET_PROFILE_SUBKEYWORD_MAP) {
        if (rule.match.some(m => sub.includes(m))) return rule.profile;
    }
    if (assetType === '3d') return 'object';
    if (assetType === 'illustration') return 'scene';
    return 'illustration';
};

export const buildResolvedConfig = ({ vectorState, resolvedBg }) => {
    return resolveAll({ vectorState, resolvedBg });
};

// -
// 08 · RESOLUTION LAYER — resolveAll() (FASE 4)
// -
// Single source of truth sebelum generation. UI menyuplai intent (VectorState +
// pilihan user), Resolution Layer menghasilkan ResolvedProductionConfig penuh.
// Engine tidak menebak-nebak lagi — semua keputusan (platform, kategori, DNA,
// asset profile, style, background, format, workflow) diselesaikan di sini.
//
// Semua resolver individual yang sudah ada dipanggil di sini:
//   resolveDNAFromOfficial / resolveBackground / resolveAssetProfile /
//   resolveExportFormat / findStylePreset. resolveAll() = satu entry point.

// resolvePlatform — aktifkan platform + ambil config-nya. Fallback ke default.
// FASE 12: baca adapter aktif dari PLATFORM_ADAPTERS (satu sumber aturan platform).
export const resolvePlatform = (platformKey) => {
    const key = platformKey || DEFAULT_PLATFORM;
    const adapter = PLATFORM_ADAPTERS[key];
    if (!adapter || adapter.status !== 'active') {
        const fallback = PLATFORM_ADAPTERS[DEFAULT_PLATFORM];
        return { key: DEFAULT_PLATFORM, adapter: fallback, config: fallback?.config(), active: false };
    }
    return { key, adapter, config: adapter.config(), active: true };
};

// resolveCategory — official category + subcategory, plus derived DNA category.
export const resolveCategory = ({ platform, platformCategoryId, adobeCategory, internalCategory, subcategory }) => {
    const platformKey = platform || DEFAULT_PLATFORM;
    const official = adobeCategory || '';
    const dnaCategory = internalCategory || (official ? resolveDNAFromOfficial(platformKey, platformCategoryId, subcategory) : '') || official;
    return {
        platformCategoryId: platformCategoryId ?? null,
        category: official,
        subcategory: subcategory || '',
        dnaCategory,
    };
}; // resolveCategory

// resolveStyle — validasi nama style. Preset yang dikenal → dipetakan ke DNA
// preset; style custom → DI-PERTAHANKAN sebagai string request (tidak pernah
// di-replace ke preset lain, supaya konteks semantic user tidak berubah arah).
// Satu-satunya consumer adalah resolveAll() yang hanya butuh string request.
export const resolveStyle = (styleName) => {
    const preset = findStylePreset(styleName);
    void preset; // dipakai untuk validasi; keputusan ada di buildStyleInterpretation()
    return styleName || '';
};

// resolveCompatibility — workflow label per (assetType, iconMode).
export const resolveCompatibility = ({ assetType, iconMode }) => {
    if (iconMode) return 'stock-icon';
    if (assetType === 'illustration') return 'stock-illustration';
    if (assetType === '3d') return 'stock-3d';
    if (assetType === 'photo') return 'stock-photo';
    return 'stock-vector';
};

// resolveAll() — resolver kanonik. Menggabungkan seluruh Resolution Layer ke
// satu output ResolvedProductionConfig. `buildResolvedConfig` (back-compat)
// kini memanggil fungsi ini — tidak ada dua implementasi terpisah.
export const resolveAll = ({ vectorState, resolvedBg }) => {
    const assetType = vectorState.assetType || 'vector';
    const iconMode = vectorState.iconMode || false;
    const plat = resolvePlatform(vectorState.platform);
    const cat = resolveCategory({ ...vectorState, platform: plat.key });
    const profile = resolveAssetProfile({
        assetType,
        category: cat.category,
        subcategory: cat.subcategory,
        iconMode,
    });
    const style = resolveStyle(vectorState.visualSettings?.style);
    const bg = resolvedBg
        ? resolvedBg
        : resolveBackground(
              vectorState.visualSettings?.background || 'white',
              assetType,
              cat.dnaCategory || cat.category,
              cat.subcategory,
              Boolean(vectorState._visualDirty?.background),
          );
    const format = resolveExportFormat({
        assetType,
        background: bg.mode,
        iconMode,
        outputFormat: vectorState.visualSettings?.outputFormat || 'PNG',
        explicit: Boolean(vectorState._visualDirty?.outputFormat),
    });
    const workflow = resolveCompatibility({ assetType, iconMode });

    return {
        platform: plat.key,
        platformCategoryId: cat.platformCategoryId,
        category: cat.category,
        subcategory: cat.subcategory,
        dnaCategory: cat.dnaCategory,
        assetType,
        assetProfile: profile,
        style,
        background: bg.mode,
        color: null,
        aspectRatio: vectorState.visualSettings?.aspectRatio || '4:3',
        outputFormat: format,
        highDpiSharpness: Boolean(vectorState.visualSettings?.highDpiSharpness),
        workflow,
        resolvedFrom: resolvedBg ? 'auto' : 'default',
        resolvedAt: Date.now(),
    };
};
