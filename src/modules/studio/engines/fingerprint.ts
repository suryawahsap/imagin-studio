import type { Asset } from "../types";
import { hashString } from "../utils";
import { extractSemanticIntent } from "./intent-engine";

const FINGERPRINT_STOPWORDS = new Set([
  "a", "an", "the", "with", "of", "in", "on", "and", "for", "featuring", "to", "at",
  "by", "from", "as", "is", "are", "was", "were", "be", "this", "that", "these",
  "those", "illustration", "vector", "photo", "image", "picture", "stock",
]);

function normalizeConceptTerms(...texts: unknown[]): string[] {
  const words: string[] = [];
  for (const text of texts) {
    const raw = String(text || "").toLowerCase();
    for (const word of raw.split(/[^a-z0-9]+/)) {
      if (word.length >= 3 && !FINGERPRINT_STOPWORDS.has(word)) words.push(word);
    }
  }
  return [...new Set(words)].sort();
}

export function buildConceptFingerprint(semanticIntent: any, styleInterpretation: any = null) {
  const intent = semanticIntent || {};
  const terms = normalizeConceptTerms(
    intent.primarySubject,
    intent.subjectDomain,
    intent.assetConcept,
    (intent.lockedTerms || []).join(" "),
    intent.assetProfile,
    styleInterpretation?.visualDirective,
  );
  return { fingerprint: hashString(terms.join("|")), terms, normalized: terms.join(" ") };
}

function fingerprintsMatch(fpA: any, fpB: any): number {
  if (!fpA || !fpB) return 0;
  const a = new Set<string>(fpA.terms || []);
  const b = new Set<string>(fpB.terms || []);
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const term of a) if (b.has(term)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function getAssetConceptFingerprint(asset: Asset): ReturnType<typeof buildConceptFingerprint> | null {
  const intent = asset?.lineage?.promptGraph?.intent;
  if (intent) return buildConceptFingerprint(intent);
  if (asset?.baseTheme) {
    return buildConceptFingerprint(extractSemanticIntent(asset.baseTheme, asset.adobeCategory || "", asset.subcategory || "", asset.assetType || "vector"));
  }
  return null;
}

export function checkLibraryConceptSimilarity(
  semanticIntent: any,
  existingAssets: Asset[],
  category = "",
  threshold = 0.4,
) {
  if (!semanticIntent) return [];
  const newFp = buildConceptFingerprint(semanticIntent);
  const sameCat = existingAssets.filter((asset) =>
    (!category || asset.adobeCategory === category) &&
    asset.url && !asset.isLoading && asset.status !== "FAILED" && asset.id
  );
  const results: Array<{ id: string; title: string; score: number }> = [];
  for (const asset of sameCat) {
    const assetFp = getAssetConceptFingerprint(asset);
    if (!assetFp) continue;
    const score = fingerprintsMatch(newFp, assetFp);
    if (score >= threshold) results.push({
      id: asset.id,
      title: asset.title || asset.baseTheme || "untitled",
      score: Math.round(score * 100) / 100,
    });
  }
  return results.slice(0, 5);
}

export { checkBatchVisualSimilarity } from "./metadata";
