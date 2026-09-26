import { sanitizeStockTitle, validateMetadataCompliance } from "../engines/compliance";
import { filterSpamKeywords, normalizeMetadataKeyword } from "../engines/metadata";

export type PreflightDraft = { title: string; description: string; keywords: string };

export function applyPreflightQuickFixes(draft: PreflightDraft, issues: string[]) {
  let next = { ...draft };
  let manual = 0;
  for (const issue of issues) {
    if (/title/i.test(issue)) next.title = sanitizeStockTitle(next.title);
    else if (/keyword|spam/i.test(issue)) {
      const keywords = filterSpamKeywords(next.keywords.split(",").map(normalizeMetadataKeyword).filter(Boolean));
      next.keywords = [...new Set(keywords)].slice(0, 50).join(", ");
    } else if (/description/i.test(issue)) next.description = next.description.replace(/\s+/g, " ").trim();
    else manual += 1;
  }
  const remaining = validateMetadataCompliance({ title: next.title, description: next.description, keywords: next.keywords.split(",").map((v) => v.trim()).filter(Boolean) }).issues;
  return { draft: next, manual: manual + remaining.length };
}
