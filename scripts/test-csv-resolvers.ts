// Focused real-engine test for CSV export gate extraction:
//   resolveReleasesValue / getCsvMetadataEligibility (resolvers.ts)
// Run: npx tsx scripts/test-csv-resolvers.ts

import assert from "node:assert/strict";
import { resolveReleasesValue, getCsvMetadataEligibility } from "../src/modules/studio/resolvers";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("csv-resolvers real-engine test");

// ── resolveReleasesValue: release matrix ────────────────────────────────────
check("fictional people/property → empty releases column", () => {
  const r = resolveReleasesValue({
    peopleRelease: "released", propertyRelease: "released", peopleAndPropertyFictional: true,
  });
  assert.equal(r, "");
});
check("released people → Model Released", () => {
  assert.equal(resolveReleasesValue({ peopleRelease: "released" }), "Model Released");
  assert.equal(resolveReleasesValue({ peopleReleaseAvailable: true } as any), "Model Released");
});
check("released property → Property Released", () => {
  assert.equal(resolveReleasesValue({ propertyRelease: "released" }), "Property Released");
  assert.equal(resolveReleasesValue({ propertyReleaseAvailable: true } as any), "Property Released");
});
check("no people/property → empty", () => {
  assert.equal(resolveReleasesValue({}), "");
  assert.equal(resolveReleasesValue({}), "");
  assert.equal(resolveReleasesValue(null), "");
});

// ── eligibility: planned/inactive adapter hard block ───────────────────────
check("freepik (planned, no csvColumns) → hard block", () => {
  const r = getCsvMetadataEligibility({
    platform: "freepik",
    adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  });
  assert.equal(r.hardBlock, true);
  assert.equal(r.eligible, false);
});

// ── eligibility: missing metadata / category hard block (missing) ─────────
check("missing title → missing (not eligible)", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, true);
  assert.equal(r.eligible, false);
});
check("missing category → missing (platformCategoryId null)", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, true);
  assert.equal(r.eligible, false);
});

// ── eligibility: preflight watermark/logo hard block ───────────────────────
check("noWatermark=false → hard block", () => {
  const base = {
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: false, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  };
  const r = getCsvMetadataEligibility(base);
  assert.equal(r.hardBlock, true);
});
check("noLogo=false → hard block", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: false }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  });
  assert.equal(r.hardBlock, true);
});

// ── eligibility: IP score / recommendation ─────────────────────────────────
check("ipScore >= 51 → hard block", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
      ipRisk: { score: 63, recommendation: "pass" },
    },
  });
  assert.equal(r.hardBlock, true);
});
check("ipRecommendation block/regenerate → hard block", () => {
  for (const rec of ["block", "regenerate"]) {
    const r = getCsvMetadataEligibility({
      platform: "adobe_stock", adobeCategory: "Animals",
      stockMetadata: {
        title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
        preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
        ipRisk: { score: 0, recommendation: rec },
      },
    });
    assert.equal(r.hardBlock, true, `rec=${rec} should hard block`);
  }
});
check("ipScore 11-30 with pass → NOT hard block", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
      ipRisk: { score: 24, recommendation: "pass" },
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, false);
  assert.equal(r.eligible, true);
});

// ── eligibility: preflightDecision needs_review is NOT hard block ──────────
check("preflightDecision needs_review → NOT hard block", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "needs_review",
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, false);
  assert.equal(r.eligible, true);
});
check("preflightDecision fail → hard block", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords: new Array(25).fill("keyword"),
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "fail",
    },
  });
  assert.equal(r.hardBlock, true);
});

// ── eligibility: keyword filtering / min count ─────────────────────────────
check("invalid keywords filtered; fewer than 20 valid → missing", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description",
      keywords: ["valid1", "valid2", "bad;char", "bad,,comma", "bad@at", "ok word"],
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, true, "4 valid < 20 min");
  assert.equal(r.eligible, false);
});
check("exactly min keyword count → not missing", () => {
  const keywords = Array.from({ length: 20 }, (_, i) => `keyword${i}`);
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock", adobeCategory: "Animals",
    stockMetadata: {
      title: "A long enough title for the asset", description: "A sufficiently detailed description", keywords,
      preflightChecks: { noWatermark: true, noLogo: true }, metadataSource: "vision", analysisAvailable: true, preflightDecision: "pass",
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, false);
  assert.equal(r.eligible, true);
});

// ── eligibility: known-good Adobe case ─────────────────────────────────────
check("known-good eligible Adobe case", () => {
  const r = getCsvMetadataEligibility({
    platform: "adobe_stock",
    adobeCategory: "Animals",
    status: "metadata_ready",
    stockMetadata: {
      title: "A red fox in a snowy pine forest at dawn",
      description: "Detailed commercial illustration of a red fox resting in a snowy forest, warm morning light.",
      keywords: Array.from({ length: 30 }, (_, i) => `fox${i}`),
      preflightChecks: { noWatermark: true, noLogo: true },
      metadataSource: "vision",
      analysisAvailable: true,
      preflightDecision: "pass",
      ipRisk: { score: 12, recommendation: "pass" },
    },
  });
  assert.equal(r.hardBlock, false);
  assert.equal(r.missing, false);
  assert.equal(r.eligible, true);
});

console.log(`\n[csv-resolvers] all ${checks} checks passed`);
process.exit(0);
