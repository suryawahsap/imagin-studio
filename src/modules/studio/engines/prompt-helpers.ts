// Studio prompt helpers — diekstrak dari imagin_studio.tsx baris 6093–6132, 5246–5258.
// Helper functions for prompt engine & DNA engine. Imports from registry (no engine
// dependencies — leaf module).

import { CATEGORY_DNA, STYLE_PRESET_DNA, STYLE_PRESET_MAP } from "../registry/dna";

// DEFAULT_BATCH_RULES (legacy imagin_studio.tsx baris 6093)
export const DEFAULT_BATCH_RULES = { sameSubcategoryMax: 2, identicalPaletteMax: 2 };

// ── getBatchRules (line 6095) ───────────────────────────────────────────
export interface BatchRules {
  sameSubcategoryMax: number;
  identicalPaletteMax: number;
  [key: string]: any;
}
export function getBatchRules(categoryKey: string): BatchRules {
  const cat = CATEGORY_DNA[categoryKey] as any;
  return { ...DEFAULT_BATCH_RULES, ...(cat?.diversityEngine?.batchRules || {}) };
}

// ── pickWithBatchLimit (line 6108) ──────────────────────────────────────
export function pickWithBatchLimit<T>(pool: T[], counts: Map<T, number>, max: number, _label?: string): T | null {
  if (!pool || pool.length === 0) return null;
  const candidates = pool.filter((p) => (counts.get(p) || 0) < max);
  if (candidates.length === 0) {
    const fresh: T[] = [];
    let min = Infinity;
    pool.forEach((p) => {
      const c = counts.get(p) || 0;
      if (c < min) min = c;
    });
    pool.forEach((p) => {
      const c = counts.get(p) || 0;
      if (c === min) fresh.push(p);
    });
    const picked = fresh[Math.floor(Math.random() * fresh.length)];
    counts.set(picked, (counts.get(picked) || 0) + 1);
    return picked;
  }
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  counts.set(picked, (counts.get(picked) || 0) + 1);
  return picked;
}

// ── pickUnique (line 6121) ──────────────────────────────────────────────
export function pickUnique<T>(pool: T[], usedSet: Set<T>): T {
  const available = pool.filter((item) => !usedSet.has(item));
  if (available.length > 0) {
    const picked = available[Math.floor(Math.random() * available.length)];
    usedSet.add(picked);
    return picked;
  }
  usedSet.clear();
  const fresh = pool[Math.floor(Math.random() * pool.length)];
  usedSet.add(fresh);
  return fresh;
}

// ── findStylePreset (line 5248) — reconciled to frozen App behavior ──────
export interface StylePresetEntry {
  promptTrigger: string;
  characteristics: string;
  negativePrompt: string;
  [key: string]: any;
}
export function findStylePreset(styleName: string | null | undefined): StylePresetEntry | null {
  if (!styleName) return null;
  // Normalize: strip whitespace/hyphens → spaceless lowercase, resolve through
  // the frozen-compatible STYLE_PRESET_MAP (spaceless → camelCase), then index
  // STYLE_PRESET_DNA with the camelCase key.
  const key = String(styleName).toLowerCase().replace(/[\s-]+/g, "");
  const camelKey = STYLE_PRESET_MAP[key];
  return camelKey ? (STYLE_PRESET_DNA as any)[camelKey] || null : null;
}

// ── STYLE_PRESET_MAP — re-exported from registry/dna.ts (frozen-compatible
//    spaceless → camelCase map). Single source of truth; avoids duplicate
//    divergent maps.  Preserves public export for prompt.ts re-export.
export { STYLE_PRESET_MAP } from "../registry/dna";

// ── buildStrongExclusionInstruction (line 6263) ───────────────────────────
export function buildStrongExclusionInstruction(countryObj) {
  if (!countryObj) return "";
  var base =
    "CRITICAL CONSTRAINT: This illustration must depict ONLY authentic " +
    countryObj.country +
    " cultural elements as described. Do not include clothing, architecture, or symbols from any other country or culture. Every visual element must be traceable specifically to " +
    countryObj.country +
    " heritage.";
  // Instruksi eksplisit-positif: down-weight landmark/cliché yang terlalu
  // dominan secara statistik (overused_elements) — kecuali yang dipilih
  // sebagai Primary setting (dihandle di buildCGAContext).
  if (Array.isArray(countryObj.overused_elements) && countryObj.overused_elements.length) {
    base += " Do not default to overused landmark clichés such as: " + countryObj.overused_elements.join(", ") + ".";
  }
  return base;
}

// ── Batch-session cluster (line 6049): mutation focus bank + color accents ─
export const MUTATION_FOCUS_BANK = [
  'Focus strictly on iconic regional architecture and monuments. NO human figures, clean vector environment.',
  'Focus on authentic cultural crafts, traditional objects, ceramics, or textiles arranged as clean flat-lay still life.',
  'Standalone minimalist emblem badge or crest design, vector icon style, isolated centered composition.',
  'Focus on diverse local citizens celebrating, dynamic natural postures, waist-up or full body group shot.',
  'Elegant decorative frame or border surrounding clean empty copy space for text overlay.',
];

export const COLOR_ACCENT_PALETTES = [
  'Dominant Crimson Red with Gold and Warm White accents',
  'Iznik Cobalt Blue and Turquoise ceramic color scheme',
  'Warm Terracotta, Sand Gold, and Mahogany wood palette',
  'Minimalist Monochrome Red and White high-contrast palette',
  'Deep Forest Green and Antique Gold vintage palette',
];

export function createBatchSession() {
  return {
    mutatorOffset: Math.floor(Math.random() * MUTATION_FOCUS_BANK.length),
    colorOffset: Math.floor(Math.random() * COLOR_ACCENT_PALETTES.length),
    usedLandmarks: new Set(),
    usedSymbols: new Set(),
  };
}

// ── buildSemanticLockToken (line 13531) ─────────────────────────────────
function buildSemanticLockToken(semanticIntent) {
  if (!semanticIntent) return '';
  const primary = semanticIntent.primarySubject || semanticIntent.rawPrompt || '';
  const domain = semanticIntent.subjectDomain || semanticIntent.domain || 'general content';
  const profile = semanticIntent.assetProfile || 'not specified';
  const forbidden = Array.isArray(semanticIntent.forbiddenDomains) && semanticIntent.forbiddenDomains.length > 0
    ? semanticIntent.forbiddenDomains.join(', ')
    : (semanticIntent.forbiddenConcepts || []).join(', ');
  const lockedTerms = Array.isArray(semanticIntent.lockedTerms) && semanticIntent.lockedTerms.length > 0
    ? ` Locked terms: ${semanticIntent.lockedTerms.join(', ')}.`
    : '';

  return [
    `[PRIMARY SUBJECT — LOCKED] ${primary}.`,
    `The primary subject MUST remain ${domain}. Do not replace, reinterpret, substitute, or transform the primary subject into another domain.${lockedTerms}`,
    `[DOMAIN — LOCKED] ${domain}.`,
    `[ASSET PROFILE — LOCKED] ${profile}.`,
    forbidden ? `[FORBIDDEN DOMAINS] ${forbidden} — these must NOT become the primary subject.` : '',
  ].filter(Boolean).join(' ');
}
export { buildSemanticLockToken };
