// Focused real-engine test for pure helper extractions:
//   reasonCodeForIssue        (engines/quality.ts)
//   detectVisualProfile       (engines/quality.ts)
//   computeTitleSimilarity    (engines/metadata.ts)
//   detectSensitiveContent    (engines/compliance.ts)
// Run: npx tsx scripts/test-engine-helpers.ts

import assert from "node:assert/strict";
import { reasonCodeForIssue, detectVisualProfile } from "../src/modules/studio/engines/quality";
import { computeTitleSimilarity } from "../src/modules/studio/engines/metadata";
import { detectSensitiveContent } from "../src/modules/studio/engines/compliance";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("engine-helpers real-service test");

// ── reasonCodeForIssue: issue string → reason code ──────────────────────────
check("reasonCodeForIssue maps issue text to reason code", () => {
  assert.equal(reasonCodeForIssue("image is blurry"), "QA_SHARPNESS");
  assert.equal(reasonCodeForIssue("resolution too low"), "QA_RESOLUTION");
  assert.equal(reasonCodeForIssue("file size exceeds 45mb"), "QA_FILESIZE");
  assert.equal(reasonCodeForIssue("looks similar to another asset"), "QA_VISUAL_SIMILARITY");
  assert.equal(reasonCodeForIssue("possible brand logo"), "IP_BRAND");
  assert.equal(reasonCodeForIssue("contains watermark"), "QA_WATERMARK");
  assert.equal(reasonCodeForIssue("unrelated text"), "QA_METADATA");
  assert.equal(reasonCodeForIssue(""), "QA_METADATA");
});

// ── detectVisualProfile: profile matrix (deterministic, no AI) ─────────────
check("detectVisualProfile resolves assetProfile/icon first", () => {
  assert.equal(detectVisualProfile({}, { assetProfile: "icon" }), "icon");
  assert.equal(detectVisualProfile({}, { assetProfile: "Pattern" }), "pattern");
});

check("detectVisualProfile resolves assetType 3d", () => {
  assert.equal(detectVisualProfile({}, { assetType: "3d" }), "3d");
});

check("detectVisualProfile resolves patternType signal", () => {
  assert.equal(detectVisualProfile({ patternType: "seamless" }, {}), "pattern");
  assert.equal(detectVisualProfile({ patternType: "not a pattern" }, {}), "other");
});

check("detectVisualProfile resolves repeating composition", () => {
  assert.equal(detectVisualProfile({ composition: "repeating motif across tile" }, {}), "pattern");
  assert.equal(detectVisualProfile({ composition: "single centered subject" }, {}), "other");
});

check("detectVisualProfile resolves icon subcategory", () => {
  assert.equal(detectVisualProfile({}, { subcategory: "social media icons" }), "icon");
});

check("detectVisualProfile resolves isometric visualStyle to 3d", () => {
  assert.equal(detectVisualProfile({ visualStyle: "isometric render" }, {}), "3d");
});

check("detectVisualProfile falls back to illustration", () => {
  assert.equal(detectVisualProfile({}, { assetType: "illustration" }), "illustration");
});

check("detectVisualProfile falls back to other", () => {
  assert.equal(detectVisualProfile({}, {}), "other");
});

// ── computeTitleSimilarity: Jaccard on >2-char words ───────────────────────
check("computeTitleSimilarity returns 0..1 Jaccard similarity", () => {
  assert.equal(computeTitleSimilarity("red apple", "red apple"), 1);
  assert.equal(computeTitleSimilarity("red apple", "green banana"), 0);
  assert.equal(computeTitleSimilarity("", "anything"), 0);
  assert.equal(computeTitleSimilarity("a b", "c d"), 0); // all words ≤2 chars
  // "red" and "apple" overlap → 1/3
  const partial = computeTitleSimilarity("red apple", "red banana");
  assert.ok(partial > 0 && partial < 1, `expected partial, got ${partial}`);
  assert.equal(computeTitleSimilarity("red apple", "red apple pie"), 2 / 3);
});

// ── detectSensitiveContent: marker table lookup ────────────────────────────
check("detectSensitiveContent flags sensitive markers", () => {
  assert.deepEqual(detectSensitiveContent(""), { detected: false, category: null, reason: null });
  assert.deepEqual(detectSensitiveContent("a peaceful landscape"), {
    detected: false,
    category: null,
    reason: null,
  });
  const hit = detectSensitiveContent("woman holding a gun pointed at camera");
  assert.equal(hit.detected, true);
  assert.equal(hit.category, "sensitive");
  assert.equal(typeof hit.reason, "string");
  assert.ok(["gun pointed", "pointing a gun", "weapon aimed"].includes(hit.reason!));
  const hit2 = detectSensitiveContent("graphic violence in background");
  assert.equal(hit2.detected, true);
  assert.equal(hit2.reason, "graphic violence");
});

console.log(`\n[engine-helpers] all ${checks} checks passed`);
process.exit(0);