// Studio quality engine — diekstrak dari imagin_studio.tsx baris 5598–5716, 6929–7080.
// Pure client-side QA: visual fingerprint, sharpness, quality gate, finalize.
// Canvas background removal (3-layer pipeline) di-skip untuk simplicity;
// caller dapat memanggil helper canvas terpisah jika perlu.

import {
  RESOLUTION_POLICY,
} from "../utils";
import { toDataURL } from "../utils";
import { callGeminiForJSON } from "./generation";
import { generateMetadataAndQA, runKeywordValidationLoop } from "./metadata";

// ── Image dimensions (line 6929) ─────────────────────────────────────────
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

// ── Visual fingerprint: dHash (line 6953) ─────────────────────────────────
const _dHashCache = new Map<string, string | null>();

export function computeDHash(dataUrl: string | null | undefined): Promise<string | null> {
  if (!dataUrl) return Promise.resolve(null);
  if (_dHashCache.has(dataUrl)) return Promise.resolve(_dHashCache.get(dataUrl) || null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 9;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          _dHashCache.set(dataUrl, null);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        const gray = new Array(SIZE * SIZE);
        for (let i = 0; i < gray.length; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
        let bits = "";
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE - 1; x++) {
            bits += gray[y * SIZE + x] > gray[y * SIZE + x + 1] ? "1" : "0";
          }
        }
        let hex = "";
        for (let i = 0; i < bits.length; i += 4) {
          hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
        }
        const hash = hex.padStart(18, "0");
        _dHashCache.set(dataUrl, hash);
        resolve(hash);
      } catch {
        _dHashCache.set(dataUrl, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      _dHashCache.set(dataUrl, null);
      resolve(null);
    };
    img.src = dataUrl;
  });
}

const HASH_BITS = 72;

export function hammingDistance(hexA: string | null, hexB: string | null): number {
  if (!hexA || !hexB) return 1;
  try {
    const maxLen = Math.max(hexA.length, hexB.length);
    const a = hexA.padStart(maxLen, "0");
    const b = hexB.padStart(maxLen, "0");
    let diff = 0;
    for (let i = 0; i < maxLen; i++) {
      let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
      while (x) {
        diff += x & 1;
        x >>= 1;
      }
    }
    return diff / HASH_BITS;
  } catch {
    return 1;
  }
}

export async function computeVisualSimilarity(
  dataUrlA: string | null | undefined,
  dataUrlB: string | null | undefined
): Promise<number> {
  if (!dataUrlA || !dataUrlB) return 0;
  const [hashA, hashB] = await Promise.all([computeDHash(dataUrlA), computeDHash(dataUrlB)]);
  if (!hashA || !hashB) return 0;
  return 1 - hammingDistance(hashA, hashB);
}

// ── Sharpness (line 7038) ────────────────────────────────────────────────
export const SHARPNESS = {
  MIN_GOOD: 20,
  MIN_WARN: 8,
  SAMPLE_SIZE: 96,
};

export function assessSharpness(
  dataUrl: string
): Promise<{ score: number; verdict: "sharp" | "soft" | "blurred" } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = SHARPNESS.SAMPLE_SIZE;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        const gray = new Array(SIZE * SIZE);
        for (let i = 0; i < gray.length; i++) {
          gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        }
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        for (let y = 1; y < SIZE - 1; y++) {
          for (let x = 1; x < SIZE - 1; x++) {
            const idx = y * SIZE + x;
            const lap =
              -gray[idx - SIZE - 1] -
              gray[idx - SIZE] -
              gray[idx - SIZE + 1] -
              gray[idx - 1] +
              8 * gray[idx] -
              gray[idx + 1] -
              gray[idx + SIZE - 1] -
              gray[idx + SIZE] -
              gray[idx + SIZE + 1];
            sum += lap;
            sumSq += lap * lap;
            count++;
          }
        }
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        const verdict: "sharp" | "soft" | "blurred" =
          variance >= SHARPNESS.MIN_GOOD ? "sharp" : variance >= SHARPNESS.MIN_WARN ? "soft" : "blurred";
        resolve({ score: variance, verdict });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// ── TECHNICAL_QA constant (line 7088) ─────────────────────────────────────
// Multi-metrik threshold. Fungsi assessTechnicalQuality (canvas penuh) di-skip
// untuk step 4 — caller bisa pakai assessSharpness sebagai entry sederhana.
export const TECHNICAL_QA = {
  QA_VERSION: "1.0",
  sharpness: SHARPNESS,
  edge: { minEdgeDensity: 0.06, gradientThreshold: 24 },
  noise: { clean: 9, mild: 16, photographic: 60 },
  compression: { boundaryBiasClean: 1.45, boundaryBiasMild: 2.0, blockSize: 8, sampleSize: 256 },
  oversharpen: { overshootRatioClean: 0.1, overshootRatioMild: 0.18 },
  exposure: { clipSharp: 5, clipHot: 250, clipFractionWarn: 0.1, clipFractionFail: 0.4 },
};

// ── QUALITY_GATE (line 5598) ─────────────────────────────────────────────
export const QUALITY_GATE: Record<string, { severity: string; strategy: string }> = {
  QA_RESOLUTION: { severity: "critical", strategy: "upscale" },
  QA_SHARPNESS: { severity: "critical", strategy: "upscale" },
  QA_FILESIZE: { severity: "warning", strategy: "recompress" },
  QA_VISUAL_SIMILARITY: { severity: "warning", strategy: "regenerate_new_concept" },
  QA_METADATA_DIVERSITY: { severity: "warning", strategy: "change_metadata" },
  QA_NEWS_EVENT: { severity: "critical", strategy: "regenerate_new_concept" },
  QA_SENSITIVE: { severity: "critical", strategy: "regenerate_new_concept" },
  QA_PROFILE: { severity: "critical", strategy: "regenerate_new_concept" },
  QA_CATEGORY: { severity: "warning", strategy: "change_metadata" },
  QA_METADATA: { severity: "warning", strategy: "change_metadata" },
  IP_BRAND: { severity: "critical", strategy: "regenerate_new_concept" },
  QA_TITLE: { severity: "warning", strategy: "change_metadata" },
  QA_KEYWORDS: { severity: "warning", strategy: "change_metadata" },
  QA_TECHNOISE: { severity: "major", strategy: "modify_prompt" },
  QA_COMPRESSION: { severity: "major", strategy: "recompress" },
  QA_OVERSHARPEN: { severity: "major", strategy: "modify_prompt" },
  QA_EXPOSURE: { severity: "major", strategy: "modify_prompt" },
  QA_WATERMARK: { severity: "critical", strategy: "regenerate_new_concept" },
  QA_BATCH_DIVERSITY: { severity: "warning", strategy: "regenerate_new_concept" },
};

// Terapkan heuristic: issue string → reasonCode.
export function reasonCodeForIssue(issueText: string): string {
  const t = (issueText || "").toLowerCase();
  if (t.includes("sharpness") || t.includes("blur")) return "QA_SHARPNESS";
  if (t.includes("resolution") || t.includes("mp") || t.includes("dimension")) return "QA_RESOLUTION";
  if (t.includes("file size") || t.includes("45mb") || t.includes("mb")) return "QA_FILESIZE";
  if (t.includes("similar")) return "QA_VISUAL_SIMILARITY";
  // [FIX W1-4] "batch diversity" dicek sebelum cabang 'diversity' generik —
  // sebelumnya jatuh ke QA_METADATA_DIVERSITY (change_metadata) alih-alih
  // QA_BATCH_DIVERSITY (regenerate_new_concept).
  if (t.includes("batch diversity") || t.includes("near-duplicate") || t.includes("duplicate in batch")) return "QA_BATCH_DIVERSITY";
  if (t.includes("duplicate") || t.includes("diversity")) return "QA_METADATA_DIVERSITY";
  if (t.includes("news") || t.includes("editorial")) return "QA_NEWS_EVENT";
  if (t.includes("sensitive")) return "QA_SENSITIVE";
  if (t.includes("profile") || t.includes("pattern") || t.includes("stroke") || t.includes("motif")) return "QA_PROFILE";
  if (t.includes("category")) return "QA_CATEGORY";
  if (t.includes("ip risk") || t.includes("brand") || t.includes("logo")) return "IP_BRAND";
  if (t.includes("watermark")) return "QA_WATERMARK";
  if (t.includes("noise")) return "QA_TECHNOISE";
  if (t.includes("compression") || t.includes("blocking") || t.includes("artifact")) return "QA_COMPRESSION";
  if (t.includes("oversharpen") || t.includes("halo") || t.includes("ringing")) return "QA_OVERSHARPEN";
  if (t.includes("exposure") || t.includes("clip") || t.includes("overexposed") || t.includes("underexposed")) return "QA_EXPOSURE";
  if (t.includes("title")) return "QA_TITLE";
  if (t.includes("keyword")) return "QA_KEYWORDS";
  return "QA_METADATA";
}

// Bangun rekomendasi regenerasi TERSTRUKTUR dari reasonCode.
export function buildRegenerationRecommendation(
  reasonCode: string,
  analysis: any
): { strategy: string; preserve: string[]; change: string[]; negativeAdditions: string[]; regeneratePrompt: string } {
  const primarySubject = analysis?.primarySubject || "";
  const environment = analysis?.environment || "";
  const style = analysis?.visualStyle || "";
  const base = analysis?.suggestions && Array.isArray(analysis.suggestions) ? analysis.suggestions : [];
  const preserve = [primarySubject, environment, style].filter(Boolean);
  const strategy = (QUALITY_GATE[reasonCode] || QUALITY_GATE.QA_METADATA).strategy || null;
  switch (reasonCode) {
    case "QA_WATERMARK":
      return {
        strategy: strategy || "regenerate_new_concept",
        preserve,
        change: ["remove any watermark/overlay text"],
        negativeAdditions: ["watermark", "overlay text", "logo"],
        regeneratePrompt: `Regenerate ${primarySubject || "subject"} with NO watermark or overlay text, clean edges, high-fidelity render.`,
      };
    case "QA_TECHNOISE":
      return {
        strategy: strategy || "modify_prompt",
        preserve,
        change: ["reduce sensor noise, clean flat areas"],
        negativeAdditions: ["noise", "grain artifacts", "speckle"],
        regeneratePrompt: `Regenerate ${primarySubject || "subject"}, clean denoised rendition with smooth gradients.`,
      };
    case "QA_COMPRESSION":
      return {
        strategy: strategy || "recompress",
        preserve,
        change: ["export lossless / higher bitrate, avoid 8×8 block boundaries"],
        negativeAdditions: ["compression artifacts", "blocking", "jpeg artifacts"],
        regeneratePrompt: "",
      };
    case "QA_OVERSHARPEN":
      return {
        strategy: strategy || "modify_prompt",
        preserve,
        change: ["soften edges, remove ringing/halo"],
        negativeAdditions: ["oversharpened", "halo", "ringing"],
        regeneratePrompt: `Regenerate ${primarySubject || "subject"} with natural, non-oversharpened edges.`,
      };
    // FIX #21 (audit): QA_SHARPNESS tidak punya case — jatuh ke default
    // (change_metadata) padahal strategy-nya 'upscale'. Rekomendasi
    // regenerasi kini konsisten dengan buildRejectionAwarePlan.
    case "QA_SHARPNESS":
      return {
        strategy: strategy || "upscale",
        preserve,
        change: ["upscale / re-render at higher resolution with sharpening control"],
        negativeAdditions: ["blur", "soft focus", "out of focus"],
        regeneratePrompt: `Regenerate ${primarySubject || "subject"} in crisp focus with sharp, clean detail.`,
      };
    case "QA_EXPOSURE":
      return {
        strategy: strategy || "modify_prompt",
        preserve,
        change: ["fix clipping — balanced highlights and shadows"],
        negativeAdditions: ["blown highlights", "crushed shadows", "overexposed", "underexposed"],
        regeneratePrompt: `Regenerate ${primarySubject || "subject"} with balanced exposure, no clipped highlights/shadows.`,
      };
    case "QA_VISUAL_SIMILARITY":
    case "QA_BATCH_DIVERSITY":
      return {
        strategy: strategy || "regenerate_new_concept",
        preserve: [],
        change: [`new distinct concept, not a variant of ${primarySubject || "existing asset"}`],
        negativeAdditions: [],
        regeneratePrompt: `Generate a NEW, clearly distinct concept — do not repeat ${preserve.join(" / ") || "the previous composition"}, vary angle/subject/setting.`,
      };
    case "IP_BRAND":
      return {
        strategy: strategy || "regenerate_new_concept",
        preserve,
        change: ["remove all brand/logo/IP-referencing elements"],
        negativeAdditions: ["brand", "logo", "trademark", "government emblem"],
        regeneratePrompt: `Regenerate ${primarySubject || "subject"} with NO recognizable brand/IP; keep it generic and royalty-free.`,
      };
    default:
      return {
        strategy: strategy || "change_metadata",
        preserve: [],
        change: base.length ? [base[0]] : ["review metadata and/or regenerate"],
        negativeAdditions: [],
        regeneratePrompt: "",
      };
  }
}

// Bangun QAResult dari outcome preflight. Simplified version.
export function buildQualityGateResult({
  assetId,
  decision,
  score,
  issues = [],
  analysis = null,
  qaIssues = [],
  qaVersion = TECHNICAL_QA.QA_VERSION,
}: {
  assetId: string;
  decision: "pass" | "needs_review" | "fail";
  score: number;
  issues?: string[];
  analysis?: any;
  qaIssues?: any[];
  qaVersion?: string;
}) {
  const pipelineDecision = decision;
  const hasIssues = Array.isArray(issues) && issues.length > 0;
  const structured = Array.isArray(qaIssues) ? qaIssues : [];

  const rank: Record<string, number> = { critical: 4, major: 3, warning: 2, info: 1 };
  const worstIssue = structured.length
    ? structured.reduce((a: any, b: any) => ((rank[b.severity] || 1) > (rank[a.severity] || 1) ? b : a), structured[0])
    : null;
  const hasInspectable = Array.isArray(structured) && structured.length > 0;

  let gateDecision: string;
  let reasonCode = "QA_METADATA";
  let severity = "warning";
  let strategy: string | null = null;

  if (pipelineDecision === "fail") {
    const ipBlock = (issues || []).some((i) => reasonCodeForIssue(i) === "IP_BRAND");
    gateDecision = ipBlock ? "reject" : "regenerate";
  } else if (pipelineDecision === "needs_review") {
    gateDecision = "needs_review";
  } else if (pipelineDecision === "pass" && (hasIssues || hasInspectable)) {
    gateDecision = "pass_with_warning";
  } else {
    gateDecision = "pass";
  }

  if (hasInspectable && worstIssue) {
    reasonCode = worstIssue.id || reasonCodeForIssue(worstIssue.message || worstIssue.type || "");
    severity = worstIssue.severity;
    strategy = (QUALITY_GATE[reasonCode] || QUALITY_GATE.QA_METADATA).strategy;
  } else if (hasIssues) {
    reasonCode = reasonCodeForIssue(issues[0]);
    severity = (QUALITY_GATE[reasonCode] || QUALITY_GATE.QA_METADATA).severity;
    strategy = (QUALITY_GATE[reasonCode] || QUALITY_GATE.QA_METADATA).strategy;
  }

  const regeneration = reasonCode ? buildRegenerationRecommendation(reasonCode, analysis) : null;
  const primaryIssue = issues[0] || (worstIssue ? worstIssue.message : "");

  return {
    assetId,
    decision: gateDecision as "pass" | "pass_with_warning" | "needs_review" | "regenerate" | "reject",
    score,
    qaVersion,
    layers: {
      technical: { passed: !structured.some((q: any) => q.severity === "critical"), score, confidence: 0.7, detail: "" },
      visual: { passed: true, score, confidence: 0.7, detail: "" },
      assetProfile: { passed: true, score, confidence: 0.7, detail: "" },
      commercial: { passed: !issues.some((i) => reasonCodeForIssue(i) === "IP_BRAND"), score, confidence: 0.7, detail: "" },
    },
    issues: structured.length ? structured : (issues || []).map((msg: string, i: number) => ({
      id: `ISSUE_${i}`,
      type: reasonCodeForIssue(msg),
      severity: (QUALITY_GATE[reasonCodeForIssue(msg)] || QUALITY_GATE.QA_METADATA).severity,
      confidence: 0.7,
      score: 0,
      threshold: 0,
      evidence: "",
      message: msg,
    })),
    gate: {
      reasonCode,
      severity: severity as "info" | "warning" | "major" | "critical",
      failedRule: reasonCode,
      recommendation: primaryIssue || "Review",
      regenerationStrategy: strategy,
    },
    regeneration,
    checkedAt: Date.now(),
  };
}

// ── finalizeAsset ──────────────────────────────────────────────────────────
// Stub "simplified" lama (skip background-removal/upscale) DIHAPUS —
// canonical finalizeAsset ada di engines/asset-finalize.ts (full: 3-layer bg
// removal + auto-upscale + resolution policy). pipeline.ts kini import dari sana.

// Re-export constants used elsewhere
export { RESOLUTION_POLICY };

// ── detectVisualProfile (frozen line 19742) — extracted verbatim ──────────
// STEP 3 — VISUAL PROFILE DETECTION (deterministic, NO AI call)
// Pattern vs Icon vs Illustration vs 3D vs Other butuh aturan metadata & QA
// yang berbeda (lihat ASSET PROFILE QA RULES di Layer B+C). Prioritas sinyal:
// assetProfile/assetType eksplisit dari App() > sinyal visual dari Layer A.
export const detectVisualProfile = (vision, asset) => {
    const explicit = String(asset?.assetProfile || '').toLowerCase();
    if (['pattern', 'icon', 'illustration', '3d'].includes(explicit)) return explicit;

    const assetType = String(asset?.assetType || '').toLowerCase();
    if (assetType === '3d') return '3d';

    const patternType = String(vision?.patternType || '').toLowerCase();
    if (patternType && patternType !== 'not a pattern' && patternType !== 'none') return 'pattern';

    const composition = String(vision?.composition || '').toLowerCase();
    if (composition.includes('repeat') || composition.includes('tiling') || composition.includes('all-over') || composition.includes('all over')) {
        return 'pattern';
    }

    if (asset?.subcategory && /icon/i.test(asset.subcategory)) return 'icon';

    const style = String(vision?.visualStyle || '').toLowerCase();
    if (style.includes('icon') || style.includes('glyph') || style.includes('sticker')) return 'icon';
    if (style.includes('3d') || style.includes('render')) return '3d';

    if (assetType === 'illustration') return 'illustration';

    return 'other';
};


export const analyzeVisualTruth = async (asset, aiConfig, onApiCall) => {
    const imageDataUrl = await toDataURL(asset?.url);
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
        // toDataURL only understands data: and blob: URLs — anything else
        // (missing url, revoked blob, remote http(s) url) silently returns
        // null here. This is a "never even reached the API" failure.
        console.error('[Imagin AI] Layer A (vision) skipped — asset.url is missing or not a readable image (data:/blob: only). url:', asset?.url);
        return { vision: null, reason: 'no_image' };
    }

    const mimeType = imageDataUrl.match(/data:(.*?);base64/)?.[1] || 'image/png';
    const base64Data = imageDataUrl.split(',')[1];

    const payload = {
        contents: [{
            parts: [
                {
                    text: `Look ONLY at the attached image. Report strictly what is visually present — nothing else.
Do not guess a title, keywords, category, or commercial use. Do not assume any external context or intent.
If something is not clearly visible, leave it empty or false rather than guessing.

Return ONLY valid JSON, no markdown, no explanation, no code fences:

{
  "primarySubject": "the single most prominent visual subject, 1-3 words",
  "subject": "slightly more descriptive version of the primary subject",
  "objects": ["visible object 1", "visible object 2"],
  "colors": ["dominant color 1", "dominant color 2", "dominant color 3"],
  "environment": "background/setting actually visible (e.g. plain background, indoor scene, transparent)",
  "visualStyle": "actual rendering style visible (e.g. flat vector, 3d render, watercolor, photo-real)",
  "composition": "how elements are arranged (e.g. single subject centered, repeating all-over pattern)",
  "patternType": "seamless repeating pattern / geometric pattern / not a pattern",
  "backgroundDescription": "literal description of the background as rendered",
  "visualElements": ["notable visible visual element 1", "notable visible visual element 2"],
  "mood": "overall mood/atmosphere actually visible (e.g. cheerful, calm, dramatic, cozy, energetic)",
  "lighting": "lighting actually visible (e.g. soft studio light, natural window light, dramatic rim light, flat even illustration light, isometric 3d studio lighting)",
  "cameraAngle": "camera angle / perspective actually visible (e.g. eye-level front view, three-quarter, top-down flat lay, isometric 30-degree, low angle, close-up macro, wide establishing shot)",
  "renderingStyle": {
    "strokeType": "none | thin-outline | bold-outline | variable-weight | hand-drawn",
    "fillType": "flat | gradient | textured | hatched | watercolor-wash | cel-shaded",
    "shadowType": "none | drop-shadow | inner-shadow | long-shadow | soft-glow",
    "edgeQuality": "crisp-vector | soft-raster | rough-sketch | smooth-organic",
    "colorProfile": "monochromatic | limited-2-4 | full-palette | muted | vibrant-saturated | pastel",
    "colorCount": "estimated number of distinct colors as integer, e.g. 3",
    "backgroundTreatment": "transparent | solid-white | solid-color | gradient | scene | paper-texture"
  },
  "vectorSignals": {
    "isGeometric": false,
    "hasOutlines": false,
    "outlineWeight": "none | hairline | medium | bold",
    "cornerStyle": "sharp | rounded | mixed",
    "iconComplexity": "minimal | moderate | detailed",
    "layoutType": "single-object | grouped-objects | scene | pattern-repeat | grid"
  },
  "illustrationSignals": {
    "artStyle": "flat | isometric | cartoon | realistic-painterly | line-art | collage | retro | geometric | watercolor | hand-drawn",
    "humanPresence": "none | silhouette | stylized | realistic",
    "perspectiveType": "flat-2d | slight-3d | isometric | one-point | two-point | bird-eye | worm-eye",
    "texturePresence": "none | subtle | prominent | dominant"
  },
  "patternSignals": {
    "repeatType": "seamless-tile | half-drop | brick | stripe | radial | scattered | organic | none",
    "elementDensity": "sparse | medium | dense | packed",
    "scaleMix": "uniform | multi-scale | hero-and-fill",
    "hasWhiteSpace": false
  },
  "visibleText": false,
  "visibleLogo": false,
  "visibleWatermark": false,
  "peopleVisible": false,
  "peopleCount": 0,
  "peopleRecognizable": false,
  "peopleBasedOnRealPerson": false,
  "ipRiskVisualNotes": "short note ONLY if something resembles a real brand, character, or product, else empty string"
}

RENDERING STYLE FIELDS EXPLANATION:
- "renderingStyle": report ONLY what is literally visible in the rendering technique. If flat fills with no texture: fillType=flat. If outlines present and bold: strokeType=bold-outline. If no outlines at all: strokeType=none.
- "vectorSignals": fill ONLY if this appears to be a vector/illustration/icon. isGeometric=true if shapes are built from circles, rectangles, polygons.
- "illustrationSignals": fill for any non-photo non-3d artwork. artStyle must be the single closest match from the enum values above.
- "patternSignals": fill ONLY if the image is or contains a repeating pattern. repeatType=none if not a pattern.

PEOPLE FIELDS EXPLANATION:
- "peopleVisible": true only if at least one person or human figure is visible.
- "peopleCount": number of distinct people/figures visible (0 if none). Estimate if crowd.
- "peopleRecognizable": true ONLY if a person's identity would be recognizable (clear face resembling a specific identifiable real individual).
- "peopleBasedOnRealPerson": true ONLY if the depicted person is clearly meant to represent a specific real, identifiable individual (e.g. a celebrity, public figure). Generic/fictional figures are false.
- If no people are visible, peopleRecognizable and peopleBasedOnRealPerson MUST be false.`
                },
                { inlineData: { mimeType, data: base64Data } }
            ]
        }],
        systemInstruction: {
            parts: [{
                text: `You are a strict visual inspector. You only report what is literally visible in the image. You have no knowledge of what the image was intended to be, you never received a text prompt, and you never assume or infer intent beyond what is visibly rendered. Output English only. Return ONLY valid JSON.`
            }]
        },
        // AUDIT FIX: without this, "thinking" models (gemini-2.5+/3.x flash)
        // can burn the whole output budget on invisible reasoning and return
        // an empty/truncated response. thinkingBudget: 0 disables that for
        // this call (we don't need chain-of-thought, just a small JSON
        // object), and maxOutputTokens gives generous headroom regardless.
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 3072,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    const { data: parsed, reason } = await callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'vision-analysis (Layer A)' });
    if (!parsed) return { vision: null, reason: reason || 'vision_failed' };

    return {
        vision: {
        primarySubject: parsed.primarySubject || '',
        subject: parsed.subject || parsed.primarySubject || '',
        objects: Array.isArray(parsed.objects) ? parsed.objects : [],
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        environment: parsed.environment || '',
        visualStyle: parsed.visualStyle || '',
        composition: parsed.composition || '',
        patternType: parsed.patternType || '',
        backgroundDescription: parsed.backgroundDescription || parsed.environment || '',
        visualElements: Array.isArray(parsed.visualElements) ? parsed.visualElements : [],
        mood: parsed.mood || '',
        lighting: parsed.lighting || '',
        cameraAngle: parsed.cameraAngle || '',
        visibleText: !!parsed.visibleText,
        visibleLogo: !!parsed.visibleLogo,
        visibleWatermark: !!parsed.visibleWatermark,
        peopleVisible: !!parsed.peopleVisible,
        peopleCount: Number(parsed.peopleCount) > 0 ? Number(parsed.peopleCount) : (parsed.peopleVisible ? 1 : 0),
        peopleRecognizable: !!parsed.peopleRecognizable,
        peopleBasedOnRealPerson: !!parsed.peopleBasedOnRealPerson,
        ipRiskVisualNotes: parsed.ipRiskVisualNotes || '',
        // FIX 1: structured rendering signals for reference fidelity
        renderingStyle: parsed.renderingStyle && typeof parsed.renderingStyle === 'object' ? {
            strokeType: parsed.renderingStyle.strokeType || 'none',
            fillType: parsed.renderingStyle.fillType || 'flat',
            shadowType: parsed.renderingStyle.shadowType || 'none',
            edgeQuality: parsed.renderingStyle.edgeQuality || 'crisp-vector',
            colorProfile: parsed.renderingStyle.colorProfile || 'full-palette',
            colorCount: parsed.renderingStyle.colorCount || '4',
            backgroundTreatment: parsed.renderingStyle.backgroundTreatment || 'solid-white',
        } : null,
        vectorSignals: parsed.vectorSignals && typeof parsed.vectorSignals === 'object' ? {
            isGeometric: !!parsed.vectorSignals.isGeometric,
            hasOutlines: !!parsed.vectorSignals.hasOutlines,
            outlineWeight: parsed.vectorSignals.outlineWeight || 'none',
            cornerStyle: parsed.vectorSignals.cornerStyle || 'sharp',
            iconComplexity: parsed.vectorSignals.iconComplexity || 'moderate',
            layoutType: parsed.vectorSignals.layoutType || 'single-object',
        } : null,
        illustrationSignals: parsed.illustrationSignals && typeof parsed.illustrationSignals === 'object' ? {
            artStyle: parsed.illustrationSignals.artStyle || 'flat',
            humanPresence: parsed.illustrationSignals.humanPresence || 'none',
            perspectiveType: parsed.illustrationSignals.perspectiveType || 'flat-2d',
            texturePresence: parsed.illustrationSignals.texturePresence || 'none',
        } : null,
        patternSignals: parsed.patternSignals && typeof parsed.patternSignals === 'object' ? {
            repeatType: parsed.patternSignals.repeatType || 'none',
            elementDensity: parsed.patternSignals.elementDensity || 'medium',
            scaleMix: parsed.patternSignals.scaleMix || 'uniform',
            hasWhiteSpace: !!parsed.patternSignals.hasWhiteSpace,
        } : null,
        // Simpan image mentah supaya Layer B+C tidak perlu fetch/encode ulang.
        _mimeType: mimeType,
        _base64Data: base64Data,
        },
        reason: null,
    };
};

export const analyzeAssetForPreflight = async (asset, aiConfig, onApiCall, onFailureReason) => {
    // Layer A — pure vision, zero context.
    const { vision, reason: visionFailReason } = await analyzeVisualTruth(asset, aiConfig, onApiCall);
    if (!vision) {
        onFailureReason?.(visionFailReason || 'vision_failed');
        return null;
    }

    // Step 3 — deterministic profile detection.
    const profile = detectVisualProfile(vision, asset);

    // AUDIT FIX: this pipeline now makes 2-3 sequential Gemini calls per
    // asset (Layer A, Layer B+C, optional keyword top-up) instead of the
    // previous single call. A small stagger between them reduces the odds of
    // bursting past a Gemini free-tier RPM limit within one asset — the
    // per-asset 600ms pause in handleBulkGenerateMetadata only throttles
    // between assets, not between calls within the same asset.
    await new Promise(r => setTimeout(r, 350));

    // Layer B + C — metadata generation + validator + QA, vision-grounded.
    const { data: parsed, reason: metaFailReason } = await generateMetadataAndQA({ asset, vision, profile }, aiConfig, onApiCall);
    if (!parsed) {
        onFailureReason?.(metaFailReason || 'metadata_failed');
        return null;
    }

    // Keyword validation loop — top up before falling back to deterministic expansion.
    const keywords = await runKeywordValidationLoop(
        { keywords: parsed.keywords, title: parsed.title, vision },
        aiConfig,
        onApiCall
    );

    return {
        ...parsed,
        keywords,

        // Layer A — exposed both nested (visualAnalysis) and flattened, for
        // backward compatibility with existing callers (buildFinalStockMetadata
        // reads analysis.primarySubject / analysis.colors / etc. directly).
        visualAnalysis: {
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
            // Spec workflow poin 5: data orang dari Layer A (vision zero-context).
            peopleVisible: vision.peopleVisible,
            peopleCount: vision.peopleCount,
            peopleRecognizable: vision.peopleRecognizable,
            peopleBasedOnRealPerson: vision.peopleBasedOnRealPerson,
        },
        primarySubject: vision.primarySubject,
        subject: vision.subject,
        objects: vision.objects,
        colors: vision.colors,
        patternType: vision.patternType,
        visualStyle: vision.visualStyle,
        composition: vision.composition,
        backgroundDescription: vision.backgroundDescription,
        visualElements: vision.visualElements,

        // Step 3 result, exposed for UI/QA branching.
        assetProfileDetected: profile,
    };
};
