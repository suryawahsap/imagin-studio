// Focused real-engine test for leaf helper extractions:
//   sanitizeStockTitle / validateMetadataCompliance   (engines/compliance.ts)
//   assetFileExt                                      (resolvers.ts)
//   buildStrongExclusionInstruction                   (engines/prompt-helpers.ts)
//   MUTATION_FOCUS_BANK / COLOR_ACCENT_PALETTES / createBatchSession
//                                                    (engines/prompt-helpers.ts)
// Run: npx tsx scripts/test-extracted-helpers.ts

import assert from "node:assert/strict";
import { sanitizeStockTitle, validateMetadataCompliance } from "../src/modules/studio/engines/compliance";
import { assetFileExt } from "../src/modules/studio/resolvers";
import {
  buildStrongExclusionInstruction,
  buildSemanticLockToken,
  MUTATION_FOCUS_BANK,
  COLOR_ACCENT_PALETTES,
  createBatchSession,
} from "../src/modules/studio/engines/prompt-helpers";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("extracted-helpers real-engine test");

// ── sanitizeStockTitle: prefix/suffix/filler stripping + Adobe compliance ──
check("strips boilerplate prefixes", () => {
  assert.equal(sanitizeStockTitle("flat illustration of a red apple"), "A red apple");
  assert.equal(sanitizeStockTitle("ai generated vector graphic of a chair"), "Vector graphic of a chair");
  assert.equal(sanitizeStockTitle("Vector: modern desk lamp"), "Modern desk lamp");
});
check("strips trailing background boilerplate", () => {
  assert.equal(sanitizeStockTitle("Red apple isolated on a transparent background."), "Red apple");
  assert.equal(sanitizeStockTitle("Red apple isolated on white background."), "Red apple");
});
check("strips trailing serial IDs", () => {
  assert.equal(sanitizeStockTitle("Red apple 42"), "Red apple");
  assert.equal(sanitizeStockTitle("Red apple #42"), "Red apple");
});
check("strips filler adjectives and AI labels", () => {
  assert.equal(sanitizeStockTitle("stunning ai generated stock image of a car"), "Of a car");
  assert.equal(sanitizeStockTitle("amazing beautiful high-quality stock image"), "");
});
check("strips special characters and capitalizes first letter", () => {
  assert.equal(sanitizeStockTitle("red & green apple pie!"), "Red green apple pie");
  assert.equal(sanitizeStockTitle(""), "");
  assert.equal(sanitizeStockTitle("   "), "");
});
check("truncates beyond HARD_MAX_LEN at word boundary", () => {
  const long = "word ".repeat(60);
  const out = sanitizeStockTitle(long);
  assert.ok(out.length <= 200, `length ${out.length} <= 200`);
  assert.equal(out[0], "W");
});

// ── validateMetadataCompliance: brand/news/sensitive/spam gating ───────────
check("passes clean metadata", () => {
  const r = validateMetadataCompliance({
    title: "Red apple on white background",
    description: "Fresh red apple for commercial food photography",
    keywords: ["apple", "fruit", "food", "red"],
  });
  assert.equal(r.passed, true);
  assert.equal(r.hasCritical, false);
  assert.deepEqual(r.issues, []);
});
check("flags brand/IP references as critical", () => {
  const r = validateMetadataCompliance({
    title: "Mickey Mouse party",
    description: "A party with famous characters",
    keywords: ["party", "celebration"],
  });
  assert.equal(r.hasCritical, true);
  assert.ok(r.issues.some((i) => i.type === "brand_ip" && i.severity === "critical"));
});
check("flags news/editorial markers", () => {
  const r = validateMetadataCompliance({
    title: "Breaking news press conference",
    description: "Live coverage of an election rally",
    keywords: ["news", "event"],
  });
  assert.equal(r.hasCritical, true);
  assert.ok(r.issues.some((i) => i.type === "news_event"));
});
check("flags sensitive content", () => {
  const r = validateMetadataCompliance({
    title: "Weapon scene",
    description: "A scene with a gun pointed at camera",
    keywords: ["weapon", "action"],
  });
  assert.equal(r.hasCritical, true);
  assert.ok(r.issues.some((i) => i.type === "sensitive"));
});
check("flags spam terms as review", () => {
  const r = validateMetadataCompliance({
    title: "Vector illustration",
    description: "An awesome high quality digital asset",
    keywords: ["vector", "clip art"],
  });
  assert.ok(r.issues.some((i) => i.type === "spam" && i.severity === "review"));
  assert.equal(r.passed, false);
});
check("handles empty input without throwing", () => {
  const r = validateMetadataCompliance({ title: "", description: "", keywords: [] });
  assert.equal(r.passed, true);
});

// ── assetFileExt: data-URL mime + outputFormat fallback ────────────────────
check("derives extension from data-URL mime", () => {
  assert.equal(assetFileExt({ url: "data:image/svg+xml;base64,AAAA" }), "svg");
  assert.equal(assetFileExt({ url: "data:image/jpeg;base64,AAAA" }), "jpg");
  assert.equal(assetFileExt({ url: "data:image/png;base64,AAAA" }), "png");
});
check("falls back to outputFormat", () => {
  assert.equal(assetFileExt({ url: "data:image/bmp;base64,AAAA", outputFormat: "SVG" }), "svg");
  assert.equal(assetFileExt({ url: "", outputFormat: "JPEG" }), "jpg");
  assert.equal(assetFileExt({ url: "", outputFormat: "PNG" }), "png");
});
check("defaults to png", () => {
  assert.equal(assetFileExt({}), "png");
  assert.equal(assetFileExt(null), "png");
});

// ── buildStrongExclusionInstruction: country exclusion prompt fragment ─────
check("returns empty for missing country", () => {
  assert.equal(buildStrongExclusionInstruction(null), "");
  assert.equal(buildStrongExclusionInstruction(undefined), "");
});
check("builds base constraint", () => {
  const out = buildStrongExclusionInstruction({ country: "Japan" });
  assert.ok(out.includes("CRITICAL CONSTRAINT"));
  assert.ok(out.includes("Japan"));
  assert.ok(out.includes("ONLY authentic Japan cultural elements"));
});
check("appends overused-elements warning", () => {
  const out = buildStrongExclusionInstruction({
    country: "India",
    overused_elements: ["Taj Mahal", "elephant"],
  });
  assert.ok(out.includes("Do not default to overused landmark clichés such as: Taj Mahal, elephant"));
});
check("ignores empty overused_elements", () => {
  const out = buildStrongExclusionInstruction({ country: "Peru", overused_elements: [] });
  assert.ok(!out.includes("landmark clichés"));
});

// ── buildSemanticLockToken: SEMANTIC LOCK clause builder ─────────────────
check("returns empty for null/undefined intent", () => {
  assert.equal(buildSemanticLockToken(null), "");
  assert.equal(buildSemanticLockToken(undefined), "");
  assert.equal(buildSemanticLockToken(), "");
});
check("full intent includes primary/domain/profile/forbidden/locked layers", () => {
  const out = buildSemanticLockToken({
    primarySubject: "Balinese temple guardian",
    subjectDomain: "Indonesian architecture",
    assetProfile: "flat vector illustration",
    forbiddenDomains: ["Chinese architecture", "Japanese temples"],
    lockedTerms: ["garuda", "meru"],
  });
  assert.ok(out.includes("[PRIMARY SUBJECT — LOCKED] Balinese temple guardian."));
  assert.ok(out.includes("The primary subject MUST remain Indonesian architecture."));
  assert.ok(out.includes("[DOMAIN — LOCKED] Indonesian architecture."));
  assert.ok(out.includes("[ASSET PROFILE — LOCKED] flat vector illustration."));
  assert.ok(out.includes("[FORBIDDEN DOMAINS] Chinese architecture, Japanese temples"));
  assert.ok(out.includes("Locked terms: garuda, meru."));
});
check("forbiddenConcepts fallback when forbiddenDomains absent", () => {
  const out = buildSemanticLockToken({
    primarySubject: "Coffee shop",
    subjectDomain: "café interior",
    assetProfile: "photorealistic",
    forbiddenConcepts: ["generic stock cafe", "starbucks-like logos"],
  });
  assert.ok(out.includes("[FORBIDDEN DOMAINS] generic stock cafe, starbucks-like logos"));
  assert.ok(!out.includes("undefined"));
});
check("partial intent does not crash", () => {
  const out = buildSemanticLockToken({ rawPrompt: "A red bicycle" });
  assert.ok(out.includes("[PRIMARY SUBJECT — LOCKED] A red bicycle."));
  assert.ok(out.includes("general content")); // domain fallback
  assert.ok(out.includes("not specified"));   // profile fallback
});
check("empty forbidden lists omit forbidden layer", () => {
  const out = buildSemanticLockToken({
    primarySubject: "Desk lamp",
    subjectDomain: "product design",
    forbiddenDomains: [],
    forbiddenConcepts: [],
  });
  assert.ok(!out.includes("[FORBIDDEN DOMAINS]"));
});

// ── Batch-session cluster: MUTATION_FOCUS_BANK / COLOR_ACCENT_PALETTES / createBatchSession ─
check("MUTATION_FOCUS_BANK is array of 5 strings", () => {
  assert.ok(Array.isArray(MUTATION_FOCUS_BANK));
  assert.equal(MUTATION_FOCUS_BANK.length, 5);
  assert.equal(typeof MUTATION_FOCUS_BANK[0], "string");
});
check("COLOR_ACCENT_PALETTES is array of 5 strings", () => {
  assert.ok(Array.isArray(COLOR_ACCENT_PALETTES));
  assert.equal(COLOR_ACCENT_PALETTES.length, 5);
  assert.equal(typeof COLOR_ACCENT_PALETTES[0], "string");
});
check("MUTATION_FOCUS_BANK first element stable", () => {
  assert.ok(MUTATION_FOCUS_BANK[0].includes("regional architecture"));
  assert.ok(MUTATION_FOCUS_BANK[0].includes("NO human figures"));
});
check("createBatchSession returns expected shape", () => {
  const s = createBatchSession();
  assert.ok(s !== null && typeof s === "object");
  assert.equal(typeof s.mutatorOffset, "number");
  assert.ok(s.mutatorOffset >= 0 && s.mutatorOffset < MUTATION_FOCUS_BANK.length);
  assert.equal(typeof s.colorOffset, "number");
  assert.ok(s.colorOffset >= 0 && s.colorOffset < COLOR_ACCENT_PALETTES.length);
  assert.ok(s.usedLandmarks instanceof Set);
  assert.ok(s.usedSymbols instanceof Set);
});
check("two sessions have independent Sets", () => {
  const a = createBatchSession();
  const b = createBatchSession();
  assert.notEqual(a.usedLandmarks, b.usedLandmarks);
  assert.notEqual(a.usedSymbols, b.usedSymbols);
  a.usedLandmarks.add("x");
  assert.equal(b.usedLandmarks.size, 0); // independent
});
check("offset ranges are within bank bounds", () => {
  for (let i = 0; i < 50; i++) {
    const s = createBatchSession();
    assert.ok(s.mutatorOffset >= 0 && s.mutatorOffset < 5, `mutatorOffset ${s.mutatorOffset} out of range`);
    assert.ok(s.colorOffset >= 0 && s.colorOffset < 5, `colorOffset ${s.colorOffset} out of range`);
  }
});

console.log(`\n[extracted-helpers] all ${checks} checks passed`);
process.exit(0);