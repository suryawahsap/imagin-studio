import { DEFAULT_PLATFORM } from "../registry/presets";
import { feedbackEngine } from "./storage";

export const REJECTION_TAXONOMY = {
  semantic_mismatch:  { category: "prompt",    feedbackType: "wrong_subject",    severity: "critical" },
  semantic_drift:     { category: "prompt",    feedbackType: "wrong_subject",    severity: "critical" },
  profile_mismatch:   { category: "prompt",    feedbackType: "asset_profile",    severity: "major" },
  similar_content:    { category: "diversity", feedbackType: "similarity",       severity: "major" },
  metadata_diversity: { category: "diversity", feedbackType: "similarity",       severity: "minor" },
  ip_brand:           { category: "legal",     feedbackType: "IP",               severity: "critical" },
  news_event:         { category: "legal",     feedbackType: "editorial",        severity: "critical" },
  sensitive:          { category: "legal",     feedbackType: "sensitive",        severity: "critical" },
  watermark:          { category: "technical", feedbackType: "technical_quality", severity: "major" },
  sharpness:          { category: "technical", feedbackType: "technical_quality", severity: "major" },
  file_size:          { category: "technical", feedbackType: "technical_quality", severity: "minor" },
  metadata_compliance:{ category: "legal",     feedbackType: "metadata",         severity: "major" },
  category_quality:   { category: "content",   feedbackType: "category_quality", severity: "major" },
  resolution:         { category: "technical", feedbackType: "technical_quality", severity: "major" },
  technical:          { category: "technical", feedbackType: "technical_quality", severity: "major" },
} as const;

export function classifyRejection(reasonCode = "", issueText = "") {
  const raw = `${reasonCode || ""} ${issueText || ""}`.toLowerCase();
  for (const [key, entry] of Object.entries(REJECTION_TAXONOMY)) {
    if (raw.includes(key)) return { ...entry, key };
  }
  const patterns = [
    { match: ["semantic mismatch", "wrong subject", "detected forbidden", "domain"], entry: REJECTION_TAXONOMY.semantic_mismatch },
    { match: ["profile mismatch", "asset profile", "expected pattern"], entry: REJECTION_TAXONOMY.profile_mismatch },
    { match: ["similar", "duplicate", "near-duplicate"], entry: REJECTION_TAXONOMY.similar_content },
    { match: ["ip risk", "brand", "trademark", "copyright"], entry: REJECTION_TAXONOMY.ip_brand },
    { match: ["news", "editorial", "event"], entry: REJECTION_TAXONOMY.news_event },
    { match: ["sensitive", "explicit", "violent"], entry: REJECTION_TAXONOMY.sensitive },
    { match: ["watermark", "visible text"], entry: REJECTION_TAXONOMY.watermark },
    { match: ["sharpness", "blurr", "soft"], entry: REJECTION_TAXONOMY.sharpness },
    { match: ["file size", "file too large", "45mb"], entry: REJECTION_TAXONOMY.file_size },
    { match: ["metadata compliance", "metadata contains"], entry: REJECTION_TAXONOMY.metadata_compliance },
    { match: ["category quality"], entry: REJECTION_TAXONOMY.category_quality },
    { match: ["resolution"], entry: REJECTION_TAXONOMY.resolution },
  ];
  for (const pattern of patterns) {
    if (pattern.match.some((match) => raw.includes(match))) return { ...pattern.entry, key: pattern.entry.feedbackType };
  }
  return { category: "unknown", feedbackType: "unclassified", severity: "info", key: "unclassified" };
}

export async function recordRejectionFeedback(asset: any, reasonCode: string, _ctx: any, options: any = {}) {
  if (!asset) return null;
  const taxonomy = classifyRejection(reasonCode, options.issueText);
  try {
    const qaSnapshot = {
      score: options.score ?? null,
      severity: taxonomy.severity,
      failedRule: reasonCode || taxonomy.key || "",
      intent: asset?.lineage?.promptGraph?.intent || null,
      semanticQA: asset?.stockMetadata?.semanticQA || asset?.lineage?.semanticQA || null,
      conceptFingerprint: asset?.lineage?.conceptFingerprint || null,
      feedbackType: taxonomy.feedbackType,
      category: taxonomy.category,
    };
    return await feedbackEngine.record({
      assetId: asset.id,
      qaDecision: options.qaDecision || "reject",
      reasonCode: taxonomy.key || reasonCode || "",
      action: options.action || "reject",
      note: options.note || (options.issueText || taxonomy.feedbackType),
      qaSnapshot: qaSnapshot as any,
      platform: asset.platform || DEFAULT_PLATFORM,
    });
  } catch (err) {
    console.warn("[Imagin] Rejection feedback record failed:", err);
    return null;
  }
}

export function deriveProductionPolicy(feedbackList: any[]) {
  const list = (feedbackList || []).filter((feedback) => feedback.action === "reject" || feedback.qaDecision === "reject");
  if (list.length === 0) return { sampleSize: 0, topRejectionTypes: [], perCategory: {}, suggestedActions: [] };
  const typeCount: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};
  for (const feedback of list) {
    const type = feedback.qaSnapshot?.feedbackType || "unclassified";
    const category = feedback.qaSnapshot?.category || "unknown";
    typeCount[type] = (typeCount[type] || 0) + 1;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  }
  const topRejectionTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count }));
  const suggestedActions: string[] = [];
  if ((typeCount.wrong_subject || 0) >= 2) suggestedActions.push("Banyak wrong_subject — perkuat semantic lock / forbidden domain untuk kategori terkait.");
  if ((typeCount.similarity || 0) >= 2) suggestedActions.push("Banyak similar content — tingkatkan diversity: konsep fingerprint, palette, atau komposisi.");
  if ((typeCount.technical_quality || 0) >= 2) suggestedActions.push("Banyak reject teknis — cek sharpness/watermark/file size di pipeline QA.");
  if ((typeCount.IP || 0) >= 1) suggestedActions.push("Ada reject IP/brand — perkuat compliance gate & hindari referensi merek.");
  return { sampleSize: list.length, topRejectionTypes, perCategory: categoryCount, suggestedActions, computedAt: Date.now() };
}

export { feedbackEngine };
