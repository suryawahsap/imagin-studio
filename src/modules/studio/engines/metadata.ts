// Studio metadata engine — diekstrak dari imagin_studio.tsx baris 6596–6631,
// 19303–19481. Pure metadata builders + batch similarity scoring.
// Metadata builders, AI metadata/QA, and batch similarity scoring.

import { METADATA_RULES } from "../registry/presets";
import { SPAM_TERMS } from "../registry/constants";
import { computeDHash, computeVisualSimilarity, hammingDistance } from "./quality";
import type { Asset, StockMetadata } from "../types";
import { callGeminiForJSON } from "./generation";
import { sanitizeStockTitle } from "./compliance";

const SEO_CONFIG = { title: { idealMin: 55, idealMax: 70, sweetSpot: 60 }, keywords: { min: 25, max: 49 } };
export const normalizeMetadataKeyword = (value: any = "") => String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();


// ── buildDraftStockMetadata (line 6596) ────────────────────────────────────
export interface BuildDraftStockMetadataArgs {
  assetType?: string;
  background?: string;
  outputFormat?: string;
  stockCategory?: string;
  subcategory?: string;
}

export function buildDraftStockMetadata({
  assetType = "vector",
  background = "white",
  outputFormat = "PNG",
  stockCategory = "",
  subcategory = "",
}: BuildDraftStockMetadataArgs = {}): StockMetadata {
  return {
    title: "",
    description: "",
    keywords: [],
    metadataVersion: "v2",
    stockCategory,
    subcategory,
    contentType: assetType === "photo" ? "photo" : assetType === "3d" ? "illustration-3d" : "illustration",
    outputFormat,
    backgroundMode:
      background === "transparent"
        ? "transparent"
        : background === "greenscreen"
        ? "greenscreen"
        : background === "scene"
        ? "scene"
        : "white",
    generativeAIDeclaration: true,
    aiDeclared: true, // mirrors generativeAIDeclaration for PREFLIGHT_ITEMS autoRule
    aiTool: "Google Gemini Image Generation",
    peopleRelease: "not-applicable",
    propertyRelease: "not-applicable",
    preflightChecks: {},
    preflightPassedAt: null,
    submittedAt: null,
    backgroundVerified: false,
    resolutionVerified: false,
    preflightDecision: null,
    preflightScore: null,
    preflightIssues: [],
    qualityScore: null,
    acceptancePrediction: null,
    suggestions: [],
    metadataSource: null,
    analysisAvailable: null,
  };
}

// Backward-compat alias
export const createDraftStockMetadata = buildDraftStockMetadata;

// ── buildMetadataFallback (line 19303) ────────────────────────────────────
// Fallback metadata ketika pipeline AI gagal total. Pakai subcategory/adobeCategory
// (BUKAN teks prompt baseTheme) sehingga tetap berbahasa Inggris & aman compliance.
export function buildMetadataFallback(asset: Partial<Asset> | null | undefined): {
  title: string;
  description: string;
  keywords: string[];
} {
  const clean = (s: any) => String(s || "").replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const capWord = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  const cap = (s: any) => clean(s).split(" ").map(capWord).join(" ");

  const assetType = (asset?.assetType || "vector").toLowerCase();
  const svgAsset = asset?.outputFormat === "SVG";
  const subject = cap(asset?.subcategory || asset?.adobeCategory || (svgAsset ? "SVG vector art" : "commercial design"));
  const style = clean(String(asset?.style || "").toLowerCase());
  const title =
    [subject, style ? `${capWord(style)} style` : "", svgAsset ? "SVG" : ""]
      .filter(Boolean)
      .join(" ")
      .slice(0, METADATA_RULES.title.MAX_LEN) || "Vector illustration";

  const useCase =
    assetType === "vector" || svgAsset
      ? "Ideal for surface design, packaging, stationery, web, and digital backgrounds."
      : assetType === "illustration"
      ? "Suitable for editorial, marketing, and creative design projects."
      : "Suitable for commercial design, marketing, web, print, and creative applications.";
  const description = `${subject}. ${useCase}`;

  const genericTerms = [
    "vector",
    "illustration",
    "design",
    "pattern",
    "commercial",
    "stock",
    "graphic",
    "creative",
    "digital",
    "background",
    "decoration",
    svgAsset && "svg",
  ];
  const kw = new Set([
    ...subject.toLowerCase().split(/\s+/),
    ...clean(asset?.adobeCategory || "").toLowerCase().split(/\s+/),
    ...clean(asset?.subcategory || "").toLowerCase().split(/\s+/),
    ...genericTerms.filter(Boolean) as string[],
  ]);
  const keywords = [...kw]
    .map((k) => k.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((k) => k.length >= 3)
    .slice(0, METADATA_RULES.keywords.MAX_COUNT);

  return { title, description, keywords };
}

// ── evaluateMetadataStatus (line 19339) ───────────────────────────────────
export function evaluateMetadataStatus({
  analysisAvailable = true,
  analysisFailed = false,
  title = "",
  description = "",
  keywords = [],
  categoryValid = true,
  hardBlocks = [] as any[],
}: {
  analysisAvailable?: boolean;
  analysisFailed?: boolean;
  title?: string;
  description?: string;
  keywords?: string[];
  categoryValid?: boolean;
  hardBlocks?: any[];
}) {
  const locallyValid =
    String(title).trim().length >= METADATA_RULES.title.MIN_LEN &&
    String(description).trim().length >= 30 &&
    (Array.isArray(keywords) ? keywords : []).length >= METADATA_RULES.keywords.MIN_COUNT &&
    categoryValid;
  const hardBlocked = hardBlocks.some(Boolean);
  return {
    status: hardBlocked
      ? ("rejected" as const)
      : !analysisAvailable || analysisFailed
      ? ("needs_review" as const)
      : locallyValid
      ? ("metadata_ready" as const)
      : ("needs_review" as const),
    locallyValid,
    hardBlocked,
  };
}

// ── computeTitleSimilarity (line 19346) ───────────────────────────────────
export function computeTitleSimilarity(a: string = "", b: string = ""): number {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  const setA = words(a);
  const setB = words(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export function checkBatchTitleSimilarity(
  batchId: string | null | undefined,
  allAssets: Asset[],
  threshold: number = 0.65
): string[] | undefined {
  const batch = allAssets.filter(
    (a) => a.batchId === batchId && a.title && !a.isLoading && a.status !== "FAILED"
  );
  if (batch.length < 2) return;
  const similar: string[] = [];
  for (let i = 0; i < batch.length; i++) {
    for (let j = i + 1; j < batch.length; j++) {
      const score = computeTitleSimilarity(batch[i].title || "", batch[j].title || "");
      if (score >= threshold) {
        similar.push(`"${(batch[i].title || "").slice(0, 30)}…" ↔ "${(batch[j].title || "").slice(0, 30)}…"`);
      }
    }
  }
  return similar;
}

// ── Visual batch similarity (line 19375) ──────────────────────────────────
export async function checkBatchVisualSimilarity(
  batchId: string | null | undefined,
  allAssets: Asset[],
  threshold: number = 0.8
): Promise<string[]> {
  const batch = allAssets.filter(
    (a) => a.batchId === batchId && a.url && !a.isLoading && a.status !== "FAILED"
  );
  if (batch.length < 2) return [];
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < batch.length; i++) for (let j = i + 1; j < batch.length; j++) pairs.push([i, j]);
  const scores = await Promise.all(
    pairs.map(([i, j]) => computeVisualSimilarity(batch[i].url || undefined, batch[j].url || undefined))
  );
  const similar: string[] = [];
  pairs.forEach(([i, j], idx) => {
    if (scores[idx] >= threshold) {
      similar.push(
        `"${(batch[i].title || "untitled").slice(0, 30)}…" ↔ "${(batch[j].title || "untitled").slice(0, 30)}…" (${Math.round(scores[idx] * 100)}%)`
      );
    }
  });
  return similar;
}

// ── computeBatchDiversityScore (line 19396) ───────────────────────────────
export async function computeBatchDiversityScore(
  batchId: string | null | undefined,
  allAssets: Asset[],
  thresholds: { duplicate: number; titleSim: number } = { duplicate: 0.8, titleSim: 0.65 }
) {
  const batch = allAssets.filter(
    (a) => a.batchId === batchId && a.url && !a.isLoading && a.status !== "FAILED"
  );
  const n = batch.length;
  if (n < 2) {
    return {
      diversity: 100,
      duplicateRatio: 0,
      repeatedSubject: 0,
      sameComposition: 0,
      keepTopK: Math.max(1, n),
      pairs: [],
      score: 100,
    };
  }

  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  const visScores = await Promise.all(
    pairs.map(([i, j]) => computeVisualSimilarity(batch[i].url || undefined, batch[j].url || undefined))
  );
  const duplicatePairs: Array<[string, string, number]> = [];
  const subjectPairs: Array<[string, string, number]> = [];
  pairs.forEach(([i, j], idx) => {
    const vis = visScores[idx];
    if (vis >= thresholds.duplicate) {
      duplicatePairs.push([batch[i].title || "untitled", batch[j].title || "untitled", vis]);
    }
    const tsim = computeTitleSimilarity(batch[i].title || "", batch[j].title || "");
    if (tsim >= thresholds.titleSim) {
      subjectPairs.push([batch[i].title || "untitled", batch[j].title || "untitled", tsim]);
    }
  });
  const totalPairs = (n * (n - 1)) / 2 || 1;
  const duplicateRatio = duplicatePairs.length / totalPairs;

  const uniqueSubjects = new Set<string>();
  subjectPairs.forEach(([a, b]) => {
    uniqueSubjects.add(a);
    uniqueSubjects.add(b);
  });
  const repeatedSubject = subjectPairs.length / totalPairs;

  const compositionPairs = duplicatePairs.filter(([, , s]) => s < 0.9 && s >= thresholds.duplicate);
  const sameComposition = compositionPairs.length / totalPairs;

  let diversity = 100 * (1 - duplicateRatio) - 10 * repeatedSubject - 10 * sameComposition;
  diversity = Math.round(Math.max(0, Math.min(100, diversity)));
  const keepTopK = Math.max(1, Math.min(6, Math.max(4, Math.floor(0.3 * n))));

  return {
    diversity,
    duplicateRatio: +duplicateRatio.toFixed(3),
    repeatedSubject: +repeatedSubject.toFixed(3),
    sameComposition: +sameComposition.toFixed(3),
    keepTopK,
    pairs: { duplicates: duplicatePairs.slice(0, 8), subjects: subjectPairs.slice(0, 8) },
    score: diversity,
  };
}

// ── checkLibraryVisualSimilarity (line 19444) ─────────────────────────────
export async function checkLibraryVisualSimilarity(
  targetUrl: string | null | undefined,
  targetId: string,
  targetCategory: string,
  allAssets: Asset[],
  threshold: number = 0.85
) {
  if (!targetUrl) return null;
  const others = allAssets.filter(
    (a) =>
      a.id !== targetId &&
      a.adobeCategory === targetCategory &&
      a.url &&
      !a.isLoading &&
      a.status !== "FAILED"
  );
  if (others.length === 0) return null;
  const targetHash = await computeDHash(targetUrl);
  if (!targetHash) return null;
  let worst: { id: string | null; title: string; score: number } = { id: null, title: "", score: 0 };
  for (const other of others) {
    const otherHash = await computeDHash(other.url || undefined);
    if (!otherHash) continue;
    const score = 1 - hammingDistance(targetHash, otherHash);
    if (score > worst.score) worst = { id: other.id, title: other.title || "untitled", score };
  }
  return worst.score >= threshold ? worst : null;
}

// ── enforceMetadataDiversity (line 19460) ─────────────────────────────────
export function enforceMetadataDiversity(
  title: string,
  batchId: string | null | undefined,
  allAssets: Asset[],
  threshold: number = 0.65
): string[] {
  if (!title || !batchId) return [];
  const sameBatch = allAssets.filter(
    (a) =>
      a.batchId === batchId &&
      a.id &&
      a.title &&
      a.title !== title &&
      a.status !== "FAILED" &&
      !a.isLoading
  );
  const conflicts: string[] = [];
  for (const other of sameBatch) {
    const score = computeTitleSimilarity(title, other.title || "");
    if (score >= threshold) {
      conflicts.push(`"${title.slice(0, 30)}…" mirip "${(other.title || "").slice(0, 30)}…" (${Math.round(score * 100)}%)`);
    }
  }
  return conflicts.slice(0, 3);
}

// ── checkPreGenerationSimilarity (line 19473) ─────────────────────────────
export function checkPreGenerationSimilarity(
  input: string,
  category: string,
  existingAssets: Asset[]
): string[] {
  const sameCat = existingAssets.filter(
    (a) => a.adobeCategory === category && a.title && !a.isLoading && a.status !== "FAILED"
  );
  if (sameCat.length === 0) return [];
  const similar = sameCat.filter((a) => {
    const target = a.title || a.baseTheme || "";
    return computeTitleSimilarity(input, target) >= 0.6;
  });
  return similar.slice(0, 5).map((a) => a.title || a.baseTheme || "untitled");
}

// ── Spam filter helper ────────────────────────────────────────────────────
// Filter keyword yang mengandung SPAM_TERMS (untuk Adobe Stock compliance).
export function filterSpamKeywords(keywords: string[]): string[] {
  const spamSet = new Set(SPAM_TERMS.map((s) => s.toLowerCase()));
  return keywords.filter((k) => !spamSet.has(k.toLowerCase()));
}

const CATEGORY_QUALITY_RULES = {
  'Abstract': {
    checks: { clichePattern: 'visually cliched or copied-looking abstract pattern (identical to widely available templates)', lowEffort: 'low-effort lazy gradient or single flat shape presented as a complete asset' },
  },
  'Animals': {
    checks: { deformedAnatomy: 'deformed animal anatomy, extra/missing limbs, physically impossible posture', uncannyFur: 'melted or waxy fur/feather texture that reads as clearly AI-generated' },
  },
  'Buildings and Architecture': {
    checks: { brokenPerspective: 'broken perspective, leaning walls, impossible window placement', meltedDetails: 'melted or fused architectural details (windows merging, roofs collapsing into walls)' },
  },
  'Business': {
    checks: { stagedClutter: 'cluttered chaotic desk that distracts from the professional message', clonePeople: 'identical clone-like people (same face reused across figures)' },
  },
  'Education': {
    checks: { wrongMath: 'nonsensical or incorrect text/math/periodic table content in an educational context', clicheStock: 'overly staged classroom stock cliche with no real teaching moment' },
  },
  'Food and Drink': {
    checks: { spoiledFood: 'spoiled, moldy, or clearly inedible food presented as appetizing', meltedFood: 'waxy melted texture that ruins appetizing appeal' },
  },
  'Health and Medicine': {
    checks: { unsanitary: 'visually unsanitary conditions, exposed medical waste, dirty surfaces in a clinical context', intimidating: 'intimidating, gruesome, or fear-inducing medical imagery that is not appropriate for stock' },
  },
  'Holidays and Celebrations': {
    checks: { cheapDecoration: 'cheap, low-effort decoration or gift that reads as unfinished', gaudyClash: 'gaudy clashing color scheme with no visual harmony' },
  },
  'Illustrations and Clipart': {
    checks: { outdatedClipeffect: 'outdated clip-art look (bevel/emboss, heavy drop shadow, low-detail silhouettes)', roughEdges: 'rough pixelated edges, inconsistent stroke weights, messy linework' },
  },
  'Industrial': {
    checks: { unsafeEquipment: 'visually unsafe, broken, or dangerously rigged equipment/workspace', burntWear: 'excessive wear, rust, or damage that reads as abandoned rather than operational' },
  },
  'Landscapes': {
    checks: { fakeHDR: 'blown-out fake HDR look with unnatural saturation', clicheAngle: 'overly tourist-trap angle with heavy vignette that hides the scene' },
  },
  'Lifestyle': {
    checks: { forcedPose: 'forced, awkward, or unnatural pose that breaks the authentic feel', cgiClutter: 'CGI-perfect cluttered interior that looks unreal' },
  },
  'Nature': {
    checks: { plasticLook: 'plastic, artificial-looking plants/animals with unrealistic color grading', badBlur: 'blurry out-of-focus subject presented as a finished asset' },
  },
  'Objects': {
    checks: { cheapToy: 'cheap plastic-toy appearance for an object meant to be premium', distortion: 'perspective distortion or melting geometry on hard objects' },
  },
  'People': {
    checks: { cloneFaces: 'identical clone-like faces across multiple people', missingLimbs: 'missing or fused limbs/hands in a visible way' },
  },
  'Religion and Culture': {
    checks: { offensive: 'offensive, disrespectful, or stereotypical portrayal of a culture or religion', wrongSymbols: 'wrong or invented sacred symbols presented as authentic' },
  },
  'Science': {
    checks: { wrongFormulas: 'nonsensical formulas, made-up chemical structures, or pseudoscience diagrams', brokenLabware: 'broken lab glassware or physically impossible experiment setup' },
  },
  'Signs and Symbols': {
    checks: { illegibleText: 'illegible, garbled, or truncated text within a sign/symbol context', inconsistentStroke: 'inconsistent stroke weights making the symbol look amateur' },
  },
  'Sports': {
    checks: { noSportContext: 'generic silhouette with no sport-specific equipment or context', brokenAnatomy: 'impossible athletic anatomy or contorted body position' },
  },
  'Technology': {
    checks: { datedHardware: 'dated 90s-era hardware aesthetic presented as modern tech', brokenUI: 'broken, glitchy, or physically impossible UI panels' },
  },
  'Transportation': {
    checks: { floatingVehicle: 'floating vehicle with no ground shadow or surface contact', toyLike: 'toy-like plastic appearance that undermines catalog quality' },
  },
  'Travel': {
    checks: { touristClaustration: 'tourist-trap angle with crowds and litter dominating the scene', fakePostcard: 'over-processed fake postcard look' },
  },
};

// buildCategoryQualityInstruction() — membangun instruksi per kategori untuk
// di-inject ke prompt analyzeAssetForPreflight. No-op (string kosong) kalau
// kategori tidak terdaftar di CATEGORY_QUALITY_RULES — backward compatible.
function buildCategoryQualityInstruction(categoryKey) {
  const rules = CATEGORY_QUALITY_RULES[categoryKey];
  if (!rules) return '';
  const flagLines = Object.entries(rules.checks)
    .map(([key, desc]) => `- "${key}": TRUE if ${desc}`)
    .join('\n');
  return `CATEGORY QUALITY RULES (MANDATORY — EU-6, for "${categoryKey}"):
- Inspect the image ONLY for these category-specific quality flaws.
- Return "categoryQuality": { "${Object.keys(rules.checks).join('", "')}": false } with the keys above.
- A flagged check means the asset has a category-specific quality defect that buyers reject.
- "quality_category_decision": "fail" if ANY flagged check is true, otherwise "pass".
- "quality_category_issue": short string naming the failing check (empty if "pass").
${flagLines}`;
}

export const generateMetadataAndQA = async ({ asset, vision, profile }, aiConfig, onApiCall) => {
    const mimeType = vision?._mimeType;
    const base64Data = vision?._base64Data;
    if (!mimeType || !base64Data) {
        console.error('[Imagin AI] Layer B+C skipped — Layer A result has no cached image data.');
        return { data: null, reason: 'missing_vision_image' };
    }

    const MAX_LEN = METADATA_RULES.title.MAX_LEN;

    const payload = {
        contents: [{
            parts: [
                {
                    text: `Write Adobe Stock metadata and run quality/compliance QA for this image.

════════════════════════════════════════
VISUAL TRUTH (Layer A — ALREADY VERIFIED FROM THE IMAGE, AUTHORITATIVE)
════════════════════════════════════════
This was independently extracted by inspecting ONLY the image, with no text prompt involved. Treat it as ground truth about what is visible.
${JSON.stringify({
    primarySubject: vision.primarySubject,
    subject: vision.subject,
    objects: vision.objects,
    colors: vision.colors,
    environment: vision.environment,
    visualStyle: vision.visualStyle,
    composition: vision.composition,
    patternType: vision.patternType,
    backgroundDescription: vision.backgroundDescription,
    visualElements: vision.visualElements,
    visibleText: vision.visibleText,
    visibleLogo: vision.visibleLogo,
    peopleVisible: vision.peopleVisible,
    peopleCount: vision.peopleCount,
    peopleRecognizable: vision.peopleRecognizable,
    peopleBasedOnRealPerson: vision.peopleBasedOnRealPerson,
}, null, 2)}

Detected visual profile (step 3, deterministic): "${profile}"

════════════════════════════════════════
ASSET CONTEXT — REFERENCE ONLY, LOWEST PRIORITY, DO NOT COPY LITERALLY
════════════════════════════════════════
- This is the original generation intent. It is NOT visual evidence and MUST NOT be copied directly into title, description, or keywords unless the VISUAL TRUTH above independently supports it.
- Never use a category, subcategory, or theme word as a keyword merely because it appears here.
- If this context conflicts with the VISUAL TRUTH above, ALWAYS trust the VISUAL TRUTH.
- Original theme hint: "${asset.baseTheme || asset.title || ''}"
- Suggested category: "${asset.adobeCategory || ''} > ${asset.subcategory || ''}"
- Background mode: ${asset.background === 'transparent'
    ? 'Transparent (alpha channel)'
    : asset.background === 'greenscreen'
        ? 'Green Screen (chroma key #00B140, solid green background for VFX compositing)'
        : asset.background === 'scene'
            ? 'Scene (Environmental, full-frame)'
            : (asset.background || 'white')}

PRIORITY ORDER FOR EVERYTHING BELOW: IMAGE + VISUAL TRUTH  >  VISUAL PROFILE  >  ASSET CONTEXT. Never the reverse.

════════════════════════════════════════
TITLE RULES (MANDATORY — READ CAREFULLY)
════════════════════════════════════════
WHAT A GOOD TITLE DOES:
- A good title sells the VALUE and PURPOSE of the asset to a buyer.
- It explains what the image IS, what it is FOR, and WHO would use it.
- Think: "Why would someone search for and buy this image?"
- Do NOT just list what is visible — describe the USE CASE and COMMERCIAL INTENT.

TITLE STRUCTURE (follow this order):
1. Start with the PRIMARY SUBJECT (must match keyword #1 exactly, grounded in VISUAL TRUTH).
2. Add the most important CONTEXT or SETTING (where, when, mood, style).
3. Add the USE CASE or COMMERCIAL VALUE when natural (what it is for).

TITLE REQUIREMENTS — SEO OPTIMIZED (Adobe URL + Mobile Display 2026):
- Length: Minimum ${METADATA_RULES.title.MIN_LEN} (hard), SEO sweet-spot ${SEO_CONFIG.title.idealMin}–${SEO_CONFIG.title.idealMax} chars (ideal ${SEO_CONFIG.title.sweetSpot}). Never below 50 for SEO, never exceed 70 visible (max ${MAX_LEN}). Title becomes URL — keep under 70 to avoid truncation on mobile.
- SEO front-load: PRIMARY searchable noun must be within FIRST 5 WORDS (first 7-10 words carry heaviest title weight). Start with specific noun ("Businesswoman working") NOT adjective ("Happy professional").
- Must be clear descriptive phrase (sentence-case, NOT Title Case) — NOT keyword list, NOT fragment.
- Must uniquely summarize main subject + context + commercial purpose (Subject + Action/Context + Style/Color formula).
- Include key details (who, what, where, why, mood, style) when visibly supported — helps Google Images discovery.
- Use natural English, proper grammar, buyer-intent language.
- ONLY letters, numbers, and spaces. NO punctuation, symbols, commas, hyphens, apostrophes, emojis.
- The FIRST WORD of the title MUST exactly match the FIRST keyword in the keywords array (Adobe extra bump when all title important words also in top 10 keywords).

TITLE BANNED STARTS (NEVER begin with these):
Flat, Vector, Illustration, 3D, Icon, Image, Picture, Stock, Artwork, Design, Graphic, Drawing, Clip, Abstract, Simple, Basic, Minimal, Cute, Beautiful, Colorful, Isolated, Background

TITLE BANNED PHRASES (NEVER include):
- Generic promotional filler: High Quality, Best Quality, Beautiful, Amazing, Stunning, Premium, Elegant
- AI labels: AI Generated, AI Art, Generated by AI, AI Created, Generative AI
- Stock labels: Stock Asset, Commercial Asset, Stock Image, Stock Photo, Stock Vector, Free to Use, Royalty Free
- Background filler: on white background, on transparent background, isolated on white, isolated background
- Dates, event names, news references, brand names, trademark names, personal names
- Catatan: "Modern", "Creative", "Professional" TIDAK dilarang sebagai kata sifat
  kontekstual yang menggambarkan subjek (mis. "Modern Office", "Creative Team",
  "Professional Workspace") — yang dilarang hanya pemakaiannya sebagai filler
  kosong tanpa makna.

TITLE EXAMPLES:
BAD: "Flat vector illustration of a cat" (starts with banned word, describes format not value)
BAD: "Beautiful colorful flower" (promotional filler, no use case)
BAD: "Cat" (single word, no context)
BAD: "Cat on white background" (background filler, no value)
GOOD: "Playful Kitten Resting in Cozy Indoor Scene for Pet Content" (subject + context + use case)
GOOD: "Tropical Floral Pattern for Summer Fabric and Surface Design" (subject + application)
GOOD: "Coffee Shop Interior Scene with Warm Lighting for Cafe Branding" (subject + mood + use case)

════════════════════════════════════════
DESCRIPTION RULES (MANDATORY)
════════════════════════════════════════
- Write 2–3 complete natural English sentences.
- Target 180–320 characters total. Prioritize accuracy and clarity over length.
- FIRST sentence: Describe what the image depicts — primary subject, visible elements, visual style, mood — grounded in VISUAL TRUTH.
- SECOND sentence: Describe specific visible details — colors, textures, composition, patterns, environment.
- THIRD sentence (optional): Mention specific commercial applications that naturally match the asset type.
- Use only English. Only letters, numbers, spaces allowed. No special characters or symbols.
- NEVER repeat the title verbatim followed by generic filler.
- NEVER use formulas like "[title]. Commercial stock asset." or "[title]. High quality design."
- NEVER use promotional language: high quality, professional, beautiful, amazing, stunning, premium.
- NEVER mention AI generated, AI art, stock asset, stock image, or marketplace names (Adobe, Shutterstock).
- NEVER mention file formats (PNG, JPEG, SVG, EPS), image resolution, or generation process.
- NEVER claim seamless, tileable, editable, scalable, transparent, or vector unless visibly verifiable.
- NEVER invent people, places, events, brands, products, or cultural references not visible in the image.
- NEVER use these words anywhere in the description: illustration, vector, vector illustration, vector graphics, stock vector, flat 2d, graphic design, eps, digital asset, clipart, concept art, high resolution, high quality, free to use, ai generated, ai art, amazing, beautiful, awesome, stunning, best quality, commercial use.

════════════════════════════════════════
KEYWORD RULES — SEO OPTIMIZED FOR ADOBE STOCK SEARCH 2026 (MANDATORY)
════════════════════════════════════════
CRITICAL SEO: Adobe Stock search weights first 7 keywords ultra-heavy (>50% ranking signal) and first 10 heavy.
Position your MOST SPECIFIC, MOST COMMERCIALLY VALUABLE terms in #1-7, NOT broad filler.
GENERATE BETWEEN ${SEO_CONFIG.keywords.min} AND ${SEO_CONFIG.keywords.max} KEYWORDS. SEO target 30–40 (max 49 effective).
Quality > quantity, but fill to 30 when image supports it — unused slots = missed search coverage. NEVER invent irrelevant filler to pad.
The keywords array MUST contain unique English items before returning JSON.

KEYWORD ORDERING — SEO WEIGHTED (follow precisely, algorithm reads sequentially):
- #1: PRIMARY SUBJECT from VISUAL TRUTH — single noun, must EXACTLY match FIRST WORD of title (Adobe extra bump).
- #2–5: Core subject synonyms/variants — ABOUT THE SUBJECT ITSELF, not color/style/use-case. Use SINGULAR nouns (Adobe maps plural→singular automatically, "cat"+"cats" wastes slot).
- #6–10: Expand subject — visible objects/visual elements from VISUAL TRUTH. These 10 = heavy weight — keep most specific & buyer-intent here.
- #11–20: Visible characteristics — color palette (singular: "red" not "red color"), visual style, mood, texture, composition, environment, season, pattern type, material, pose, behavior. Only visibly grounded.
- #21–30: Commercial context & use-cases — industry, audience, application (e.g. "surface design","packaging","social media"), platform/theme. Think BUYER QUERY: "what would a buyer type to FIND this?"
- #31–40: Long-tail & conceptual — viewpoint ("aerial view","close up"), setting ("indoors","isolated"), number of people ("no people","one person"), location if verifiable, conceptual mood ("solitude" only if visibly conveyed).

SEO KEYWORD QUALITY RULES (Adobe Guide Jun 2026):
- Every keyword MUST be directly relevant to VISUAL TRUTH — spam = ranking penalty / rejection.
- ENGLISH ONLY. No Indonesian. Use local spelling "color" not "colour" for US market (Adobe auto-translates).
- UNIQUE — no duplicates, no near-duplicates. Do NOT include both singular+plural ("cat","cats") — keep singular.
- NO generic filler as standalone: image, picture, artwork, asset, design, visual, content, stock, commercial, beautiful, high quality, amazing, stunning, premium. "creative/modern/professional" only if part of real buyer phrase.
- NO brand/trademark, NO personal names, NO event/news, NO dates, NO camera specs.
- Format: letters, numbers, spaces only (commas only to separate list). Max TWO WORDS per keyword. Use 1 word for most, 2 words for common dictionary phrases ("social media","seamless pattern","aerial view"). NEVER "red dress" as 1 keyword unless dictionary — split to "red","dress" for broader indexing.
- If no people visible → MUST include "no people","nobody" (Adobe guide — critical for buyer filter).
- If people visible → include count ("one person","two people","group of people") + fictional if applicable.
- Mix broad + niche, conceptual + descriptive. Concept ("solitude","teamwork") only if visibly conveyed — don't hallucinate.
- Cover USAGE & COMMERCIAL VALUE, not just literal objects.
- Do NOT pull from asset context (theme/category) unless VISUAL TRUTH supports it — otherwise spam.

KEYWORD EXAMPLE (domestic cat image) — SEO ORDERED:
#1 cat (primary, matches title first word)
#2–5: kitten, feline, domestic cat, tabby  (singular, subject synonyms)
#6–10: pet, companion animal, fur, whiskers, mammal (subject expand — still top weight)
#11–20: orange, fluffy, sitting, resting, indoor, portrait, close up, soft (characteristics)
#21–30: pet care, animal lover, cat content, pet adoption, no people (if applicable — but cat has no people? use indoors)
#31+: lifestyle, domestic (long-tail)

This is ONLY an example. Generate based on VISUAL TRUTH, not this list.

FINAL KEYWORD VALIDATION (SEO — do this before JSON):
1. Count: ${SEO_CONFIG.keywords.min}–${SEO_CONFIG.keywords.max}? SEO target 30–40.
2. Keyword #1 === first title word (lowercase comparison)?
3. #1–7 are MOST SPECIFIC & commercially valuable (not broad "design","background")?
4. All keywords English, singular where possible, unique, no plural dup?
5. No keyword >2 words (except whitelisted common phrase)? Split "red dress" → "red","dress".
6. Contains "no people"/"nobody" if vision.peopleVisible===false? Contains count if people visible?
7. All top 10 reflect VISUAL TRUTH + include title important words?
8. No filler, brand, dates, symbols, spam?
9. Buyer-intent covered (use-case terms that drive actual buyer queries, not just object list)?
10. Relevance > padding — did you stop before adding weak filler?

VISUAL IP RISK RULES (MANDATORY — EU-9):
- Inspect the image ONLY for visual resemblance to real, identifiable intellectual property, regardless of what the asset context intended.
- Flag recognizable brand logos or wordmarks, trademark-like symbols, product designs resembling a specific real manufacturer, software or app UI resembling a real identifiable application or platform, packaging resembling a real product, copyrighted characters or mascots, and distinctive real vehicle badges or styling.
- Generic, unbranded devices, UI, packaging, and vehicles with NO identifiable real-world counterpart are SAFE.
- Do not flag genuinely generic shapes merely because they depict a device, dashboard, vehicle, or product category.
- VISUAL TRUTH already flagged this note if relevant: "${vision.ipRiskVisualNotes || 'none'}"
- ipRiskScore must be an integer from 0 to 100.
- 0–10 means no detected IP risk.
- 11–30 means generic device or UI with low risk.
- 31–50 means recognizable-interface risk worth review.
- 51–70 means logo-like or trademark-like element present.
- 71–100 means identifiable brand, product, or character.
- ipDetectedElements must be an array of short strings describing flagged elements.
- Return an empty array when nothing is flagged.
- ipRecommendation must be pass for score 0–30, review for 31–50, regenerate for 51–70, or block for 71–100.

${buildCategoryQualityInstruction(asset.adobeCategory || asset.subcategory || '')}

CONTENT SAFETY RULES (PHASE P0 — MANDATORY):
- newsEventDetected is true ONLY if the VISUAL clearly depicts a real news event, real current affair, or identifiable real-world incident, date, or person from the news.
- Generic conceptual or decorative illustrations of everyday life are FALSE.
- sensitiveContent must be one of: graphic_violence, hate_symbols, adult, self_harm, drug_abuse, none.
- contentSafetyVerdict must be pass or fail.
- Hard fail if newsEventDetected is true OR sensitiveContent is not none.
- This is a commercial stock submission. Editorial content is not allowed.
- contentSafetyReason must contain a short explanation when verdict is fail, otherwise an empty string.

PEOPLE & RELEASE ANALYSIS RULES (MANDATORY — spec workflow poin 5):
- Based on the VISUAL TRUTH people fields above (peopleVisible / peopleCount / peopleRecognizable / peopleBasedOnRealPerson), set:
  - peopleDetected: true if peopleVisible is true OR any human figure is visible.
  - peopleRecognizableIdentity: true ONLY if an identifiable real individual is depicted (recognizable real person, e.g. a celebrity or public figure). Fictional, generic, silhouette, cartoon, or AI-invented people are false.
  - peopleReleaseRequired: true ONLY if an identifiable real person is depicted (real people require a model release). Fictional/AI-invented people do NOT require a release.
  - peopleReleaseAvailable: true only if a signed model release exists for the depicted person — this is a manual fact, so default to false.
  - peopleAndPropertyFictional: true when recognizable-looking people or property in the image are fictional (AI-generated / invented), which enables the Adobe "People and Property are fictional" checkbox. Set true for any AI-generated human or property that is NOT a real identifiable individual/brand.
- Adobe rule: real identifiable people require a model release; AI-generated people that merely LOOK real but are fictional must be labeled "People and Property are fictional" instead.
- Also set propertyDetected / propertyReleaseRequired / propertyReleaseAvailable using the same logic for recognizable private property (e.g. distinctive real buildings, artworks, branded objects).

SCORING RULES (MANDATORY):
- All score fields must be integers between 0 and 100.
- No decimals.
- score is the overall preflight score from 0–100.
- Use 85 or higher for pass.
- Use 70–84 for needs_review.
- Use below 70 for fail.
- quality_composition is visual composition quality from 0–100.
- quality_commercial is commercial viability for stock market from 0–100.
- quality_keywords is keyword relevance and SEO quality from 0–100.
- quality_title is title quality against the rules from 0–100.
- quality_description is description quality from 0–100.
- quality_overall is the weighted average of the quality scores from 0–100.
- acceptancePrediction is estimated Adobe Stock acceptance probability from 0–100.

ASSET PROFILE QA RULES (FASE 8 — MANDATORY, PROFILE-SPECIFIC):
- The detected asset profile is: "${profile}" (asset type hint: "${asset.assetType || 'vector'}").
- Pattern profile means seamless pattern or repeating surface design.
- For pattern profile:
  - patternSeamContinuity: 0–100. Higher means edges tile seamlessly without visible seams or hard cut lines.
  - patternRepeatConsistency: 0–100. Higher means repeat unit is consistent with uniform rhythm and no random interruptions.
  - patternMotifIntegrity: 0–100. Higher means motifs remain intact and are not cropped awkwardly at tile edges.
  - patternTilingOk: true ONLY if the pattern genuinely tiles edge to edge with no dropped edges.
- Icon profile means flat icon, glyph, or sticker.
- For icon profile:
  - iconStrokeConsistency: 0–100. Higher means stroke weight is uniform.
  - iconShapeIntegrity: 0–100. Higher means shapes are geometrically clean.
  - iconStyleConsistency: 0–100. Higher means the whole icon set uses one coherent visual style.
- Illustration profile means editorial or vector illustration and scene artwork.
- For illustration profile:
  - illustrationSubjectIntegrity: 0–100. Higher means subject is intact, recognizable, and not distorted or amputated.
  - illustrationCompositionClarity: 0–100. Higher means there is a clear focal point without confusing clutter.
  - illustrationVisualClarity: 0–100. Higher means crisp edges without muddy gradients or unintended smudges.
- For any other profile, return these fields as null.
- Only set the fields matching the detected profile.
- Any asset profile score below 60 means assetProfileDecision must be regenerate.
- Score 60–74 means review.
- Score 75 or higher means pass.
- The overall preflight decision may still be lowered by these checks.

CONFIDENCE RULES (MANDATORY — spec workflow):
- confidence.title: 0–100, how confident you are that the title accurately and completely describes the main visible subject and its commercial value.
- confidence.category: 0–100, how confident you are that the chosen category is the best official Adobe category match for what is actually visible.
- confidence.keywords: 0–100, how confident you are that the keywords are highly relevant, complete, and well-ordered.
- A confidence below 60 in any field is a signal the metadata may need review.

EVIDENCE RULES (MANDATORY — spec workflow):
- evidence.titleBasis: 2–4 short strings listing the VISUAL TRUTH fields that directly support the title (e.g. primary subject, environment, visual style).
- evidence.keywordBasis: 2–4 short strings listing the VISUAL TRUTH fields that directly support the keyword selection (e.g. subject, objects, colors, pattern type).
- evidence.categoryBasis: 1–3 short strings listing the VISUAL TRUTH fields that justify the category choice (e.g. subject, scene, use case).
- Evidence MUST come from VISUAL TRUTH — never from asset context/theme.

OUTPUT FORMAT (MANDATORY):
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT return code fences.
- Do NOT return explanations before or after the JSON.
- Use exactly the following JSON structure:

{
  "title": "Primary visible subject with meaningful context",
  "description": "Two or three natural commercial sentences describing only what is visibly present and useful applications.",
  "keywords": [
    "primary",
    "keyword",
    "keyword phrase"
  ],
  "category": "best matching Adobe category",
  "subcategory": "best matching subcategory",

  "preflightDecision": "pass",
  "score": 0,

  "quality_composition": 0,
  "quality_commercial": 0,
  "quality_keywords": 0,
  "quality_title": 0,
  "quality_description": 0,
  "quality_overall": 0,

  "acceptancePrediction": 0,
  "issues": [],
  "suggestions": [],

  "confidence": {
    "title": 0,
    "category": 0,
    "keywords": 0
  },

  "evidence": {
    "titleBasis": [],
    "keywordBasis": [],
    "categoryBasis": []
  },

  "ipRiskScore": 0,
  "ipDetectedElements": [],
  "ipRecommendation": "pass",

  "categoryQuality": {},
  "quality_category_decision": "pass",
  "quality_category_issue": "",

  "newsEventDetected": false,
  "sensitiveContent": "none",
  "contentSafetyVerdict": "pass",
  "contentSafetyReason": "",

  "assetProfileDecision": "pass",
  "assetProfileIssue": "",

  "assetProfileChecks": {
    "patternSeamContinuity": null,
    "patternRepeatConsistency": null,
    "patternMotifIntegrity": null,
    "patternTilingOk": null,
    "iconStrokeConsistency": null,
    "iconShapeIntegrity": null,
    "iconStyleConsistency": null,
    "illustrationSubjectIntegrity": null,
    "illustrationCompositionClarity": null,
    "illustrationVisualClarity": null
  },

  "checks": {
    "noText": true,
    "noLogo": true,
    "noWatermark": true,
    "noArtifacts": true,
    "commercial": true,
    "peopleRelease": true,
    "propRelease": true
  },

  "people": {
    "peopleDetected": false,
    "peopleRecognizableIdentity": false,
    "peopleReleaseRequired": false,
    "peopleReleaseAvailable": false,
    "peopleAndPropertyFictional": false,
    "propertyDetected": false,
    "propertyReleaseRequired": false,
    "propertyReleaseAvailable": false
  }
}
`
                },
                { inlineData: { mimeType, data: base64Data } }
            ]
        }],
        systemInstruction: {
            parts: [{
                text: `You are an expert Adobe Stock reviewer, visual quality inspector, and metadata specialist. You are given a pre-verified VISUAL TRUTH extracted directly from the image — treat it as ground truth and let it override any asset context that conflicts with it. Follow all instructions exactly. CRITICAL: ALL output fields — title, description, keywords, and all text values — MUST be written in English only. Never use Indonesian, never use any other language. Never invent visual information. Return ONLY valid JSON matching the requested schema.`
            }]
        },
        // AUDIT FIX: this is the biggest output of the whole pipeline (title +
        // description + 45 keywords + category + full QA/scoring/profile
        // block). Without an explicit generous maxOutputTokens, a "thinking"
        // model can truncate this well before the JSON closes — every parse
        // strategy then fails and the call looks like a generic failure.
        // thinkingBudget: 0 keeps the whole budget available for the actual
        // JSON output instead of invisible reasoning tokens.
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.55,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    return callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'metadata+QA (Layer B+C)' });
};

export const runKeywordValidationLoop = async ({ keywords, title, vision }, aiConfig, onApiCall) => {
    const MIN_COUNT = METADATA_RULES.keywords.MIN_COUNT;
    const MAX_COUNT = METADATA_RULES.keywords.MAX_COUNT;
    const current = Array.isArray(keywords) ? keywords : [];

    // Spec workflow: target 25–35, relevansi > jumlah. Top-up hanya wajib kalau
    // masih di bawah MIN_COUNT — jangan memaksa sampai TAGS_COUNT (45) karena itu
    // justru mendorong keyword stuffing yang tidak relevan.
    if (current.length >= MIN_COUNT) return current;

    // Small stagger before this 3rd sequential call — see note in
    // analyzeAssetForPreflight about per-asset RPM bursts.
    await new Promise(r => setTimeout(r, 350));

    const need = MIN_COUNT - current.length;
    const payload = {
        contents: [{
            parts: [{
                text: `You previously generated only ${current.length} Adobe Stock keywords for an image, but at least ${MIN_COUNT} are required (target 25–35, max ${MAX_COUNT}).

Existing keywords: ${JSON.stringify(current)}
Title: "${title || ''}"
Primary subject (verified from image): "${vision?.primarySubject || ''}"
Visible objects: ${JSON.stringify(vision?.objects || [])}
Visible colors: ${JSON.stringify(vision?.colors || [])}
Visual style: "${vision?.visualStyle || ''}"

Generate ${need} ADDITIONAL unique English keywords (max 2 words each) that are NOT already in the existing list. Only add keywords directly supported by what is visible in the image — do NOT pad with weak or generic terms. Follow the same rules as before: subject synonyms and visible objects first, then visible characteristics (color/style/mood/texture), then commercial/use-case terms. No duplicates or near-duplicates of the existing list. No brand names, no filler words.

Return ONLY valid JSON: {"additionalKeywords": ["...", "..."]}`
            }]
        }],
        systemInstruction: {
            parts: [{ text: `You are an Adobe Stock keyword specialist completing an incomplete keyword list. Output English only. Return ONLY valid JSON.` }]
        },
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.5,
            maxOutputTokens: 1536,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    const { data: retryParsed } = await callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'keyword-completion (retry)' });

    if (retryParsed && Array.isArray(retryParsed.additionalKeywords)) {
        const seen = new Set(current.map(k => normalizeMetadataKeyword(k)));
        const merged = [...current];

        for (const kw of retryParsed.additionalKeywords) {
            const norm = normalizeMetadataKeyword(kw);
            if (norm && !seen.has(norm)) {
                seen.add(norm);
                merged.push(kw);
            }
            if (merged.length >= MIN_COUNT) break;
        }

        return merged;
    }

    return current;
};

const REGEN_FIELD_PROMPTS = {
    title: (vision, current, issues) => [
        `Rewrite ONLY the Adobe Stock title for this image. Do not output description or keywords.`,
        ``,
        `VISUAL TRUTH (verified from the image, authoritative):`,
        JSON.stringify({
            primarySubject: vision?.primarySubject,
            subject: vision?.subject,
            objects: vision?.objects,
            colors: vision?.colors,
            environment: vision?.environment,
            visualStyle: vision?.visualStyle,
            composition: vision?.composition,
            patternType: vision?.patternType,
        }, null, 2),
        ``,
        `CURRENT TITLE (has problems): "${current}"`,
        issues && issues.length ? `PROBLEMS with current title:\n- ${issues.join('\n- ')}` : '',
        ``,
        `TITLE RULES:`,
        `- Min 40 chars, max 60 chars. Only letters, numbers, spaces. NO punctuation/symbols/emojis.`,
        `- Start with the primary subject (from VISUAL TRUTH).`,
        `- NO banned starts: Flat, Vector, Illustration, 3D, Icon, Image, Picture, Stock, Artwork, Design, Graphic, Drawing, Clip, Abstract, Simple, Basic, Minimal, Cute, Beautiful, Colorful, Isolated, Background.`,
        `- NO filler: high quality, beautiful, amazing, stunning, premium, elegant, AI generated, stock asset.`,
        `- NO brand names, no news/event references, no dates, no personal names.`,
        `- Describe value/use case, not just what is visible.`,
        ``,
        `Return ONLY valid JSON: {"title": "..."}`,
    ].filter(Boolean).join('\n'),

    description: (vision, current, issues) => [
        `Rewrite ONLY the Adobe Stock description for this image. Do not output title or keywords.`,
        ``,
        `VISUAL TRUTH (verified from the image, authoritative):`,
        JSON.stringify({
            primarySubject: vision?.primarySubject,
            objects: vision?.objects,
            colors: vision?.colors,
            environment: vision?.environment,
            visualStyle: vision?.visualStyle,
            composition: vision?.composition,
            backgroundDescription: vision?.backgroundDescription,
        }, null, 2),
        ``,
        `CURRENT DESCRIPTION (has problems): "${current}"`,
        issues && issues.length ? `PROBLEMS with current description:\n- ${issues.join('\n- ')}` : '',
        ``,
        `DESCRIPTION RULES:`,
        `- 2-3 complete natural English sentences, target 180-320 chars total.`,
        `- Only letters, numbers, spaces, ., ! and ? allowed.`,
        `- First sentence: what the image depicts (subject, style, mood) from VISUAL TRUTH.`,
        `- Second: visible details (colors, textures, composition, environment).`,
        `- Third (optional): commercial use case.`,
        `- NO promotional filler (high quality, beautiful, stunning, premium).`,
        `- NO AI/stock labels, NO file formats, NO brand names, NO news references.`,
        `- NEVER invent things not visible in the image.`,
        ``,
        `Return ONLY valid JSON: {"description": "..."}`,
    ].filter(Boolean).join('\n'),

    keywords: (vision, current, issues) => [
        `Rewrite ONLY the Adobe Stock keywords for this image. Do not output title or description.`,
        ``,
        `VISUAL TRUTH (verified from the image, authoritative):`,
        JSON.stringify({
            primarySubject: vision?.primarySubject,
            objects: vision?.objects,
            colors: vision?.colors,
            environment: vision?.environment,
            visualStyle: vision?.visualStyle,
            composition: vision?.composition,
            patternType: vision?.patternType,
        }, null, 2),
        ``,
        `CURRENT KEYWORDS (some have problems): ${JSON.stringify(current)}`,
        issues && issues.length ? `PROBLEMS with current keywords:\n- ${issues.join('\n- ')}` : '',
        ``,
        `KEYWORD RULES:`,
        `- ${METADATA_RULES.keywords.MIN_COUNT}-${METADATA_RULES.keywords.MAX_COUNT} unique English keywords (target 25-35). Max 2 words each.`,
        `- Keyword #1 MUST be the primary subject and match the first word of the title.`,
        `- NO filler: image, picture, artwork, asset, stock, high quality, beautiful, ai generated, etc.`,
        `- NO brand names, no news markers, no dates, no spam terms.`,
        `- Only letters, numbers, spaces, commas to separate. No symbols/emojis.`,
        `- All keywords must be directly supported by VISUAL TRUTH.`,
        ``,
        `Return ONLY valid JSON: {"keywords": ["...", "..."]}`,
    ].filter(Boolean).join('\n'),
};

// Regenerate satu field metadata via 1 call AI ringan.
// `vision` = asset.stockMetadata.visualAnalysis (hasil preflight sebelumnya).
// Return field baru atau null kalau gagal.
export const regenerateMetadataField = async ({ asset, field, vision, issues = [], aiConfig, onApiCall }) => {
    if (!['title', 'description', 'keywords'].includes(field)) return null;
    if (!asset?.url) return null;

    const sm = asset.stockMetadata || {};
    const current = field === 'keywords'
        ? (Array.isArray(sm.keywords) ? sm.keywords : [])
        : (sm[field] || '');

    const buildPrompt = REGEN_FIELD_PROMPTS[field];
    const payload = {
        contents: [{ parts: [{ text: buildPrompt(vision, current, issues) }] }],
        systemInstruction: {
            parts: [{
                text: `You are an Adobe Stock metadata specialist. Rewrite ONLY the requested field in English. Ground everything in the VISUAL TRUTH provided. Return ONLY valid JSON with exactly one key. Never use Indonesian.`
            }]
        },
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.5,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    const { data: parsed, reason } = await callGeminiForJSON({
        payload,
        aiConfig,
        onApiCall,
        label: `regenerate-${field}`,
    });
    if (!parsed) return null;

    let value = null;
    if (field === 'title') value = parsed.title;
    else if (field === 'description') value = parsed.description;
    else if (field === 'keywords') value = Array.isArray(parsed.keywords) ? parsed.keywords : null;

    if (!value || (typeof value === 'string' && !value.trim())) return null;

    // Post-process: bersihkan banned/spam terms dari hasil AI sebelum dikembalikan.
    if (field === 'description' && typeof value === 'string') {
        const descReplacements: [RegExp, string][] = [
            [/\billustration\b/gi, 'artwork'],
            [/\bvector\s+illustration\b/gi, 'artwork'],
            [/\bvector\s+graphic[s]?\b/gi, 'artwork'],
            [/\bstock\s+vector\b/gi, 'commercial artwork'],
            [/\bflat\s+2d\b/gi, 'flat design'],
            [/\bai[\s-]generated\b/gi, ''],
            [/\bai\s+art\b/gi, ''],
            [/\bgenerated\s+by\s+ai\b/gi, ''],
            [/\bhigh[\s-]quality\b/gi, ''],
            [/\bhigh\s+resolution\b/gi, ''],
            [/\bfree\s+to\s+use\b/gi, ''],
            [/\bamazing\b/gi, ''],
            [/\bbeautiful\b/gi, ''],
            [/\bstunning\b/gi, ''],
            [/\bclipart\b/gi, 'design element'],
            [/\bconcept\s+art\b/gi, 'artwork'],
        ];
        for (const [pattern, replacement] of descReplacements) {
            value = (value as string).replace(pattern, replacement);
        }
        value = (value as string).replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').replace(/\s+,/g, ',').trim();
    } else if (field === 'title' && typeof value === 'string') {
        value = sanitizeStockTitle(value as string);
    } else if (field === 'keywords' && Array.isArray(value)) {
        value = (value as string[]).filter(kw => {
            const k = normalizeMetadataKeyword(kw);
            return !SPAM_TERMS.some(term => k === term.toLowerCase() || k === normalizeMetadataKeyword(term));
        });
    }

    return value;
};
