// Test: metadata export module — pure function tests, no DOM/IO.
import assert from "assert/strict";
import type { LibraryAsset, StockMetadata } from "../src/types";
import {
  buildCsvRow, buildCsvRows, buildCsvContent, buildManifest,
  buildJsonSidecar, getCsvMetadataEligibility, resolveReleasesValue,
} from "../src/components/metadata/export/csv";

// ── Helpers ──────────────────────────────────────────────────────────────────

const base = (over: Partial<LibraryAsset> = {}): LibraryAsset => ({
  id: "lib_asset_1",
  type: "IMAGE",
  name: "Test Asset",
  url: "/storage/assets/images/test.png",
  thumbnailUrl: "/storage/assets/images/test_thumb.png",
  folder: "test",
  sourceModule: "STUDIO",
  mimeType: "image/png",
  fileSize: "12345",
  tags: [],
  createdAt: "2025-01-01T00:00:00Z",
  stockMetadata: {
    title: "Test Title",
    description: "Test Description",
    keywords: ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8", "kw9", "kw10",
      "kw11", "kw12", "kw13", "kw14", "kw15", "kw16", "kw17", "kw18", "kw19", "kw20",
      "kw21", "kw22"],
    stockCategory: "Nature",
    subcategory: "Flowers",
    contentType: "illustration",
    backgroundMode: "white",
    generativeAIDeclaration: true,
    aiTool: "imagin studio",
    peopleRelease: "",
    propertyRelease: "",
    submissionStatus: "draft",
    preflightChecks: {},
    preflightPassedAt: null,
    submittedAt: null,
    backgroundVerified: false,
    resolutionVerified: false,
    preflightDecision: null,
    preflightScore: null,
    preflightIssues: [],
    qualityScore: null,
    metadataSource: "ai" as const,
    analysisAvailable: true,
  },
  ...over,
});

// ── Test: buildCsvRow — title sanitize + slice ──────────────────────────────

const r1 = buildCsvRow(base(), "adobe_stock");
assert.equal(r1?.title, "Test Title", "title should match");
assert.equal(r1?.filename, "Test_Title__asset_1.png", "filename should use safe title + id suffix + ext");
assert.equal(r1?.keywords.split(",").length, 22, "all 22 keywords should be present");
assert.equal(r1?.generativeAi, "Yes", "Generative AI should be Yes");

// ── Test: buildCsvRow — title sanitization (special chars) ──────────────────

const special = base({ name: "Test@#$%^&*() Asset!", stockMetadata: { ...base({}).stockMetadata, title: "Test@#$%^&*() Asset!" } as StockMetadata });
const r2 = buildCsvRow(special, "adobe_stock");
assert.equal(r2?.title, "Test Asset", "special chars replaced with spaces, collapsed, trimmed");
// The exclamation mark becomes a space, then collapsed with the adjacent space, then trimmed.

// ── Test: buildCsvRow — title MaxLen slicing ────────────────────────────────

const longTitle = "A".repeat(250);
const longAsset = base({ name: longTitle, stockMetadata: { ...base({}).stockMetadata, title: longTitle } as StockMetadata });
const r3 = buildCsvRow(longAsset, "adobe_stock");
assert.equal(r3?.title?.length, 200, "title should be sliced to 200 for Adobe Stock");

// ── Test: buildCsvRow — keywords join ───────────────────────────────────────

const kwAsset = base({ stockMetadata: { ...base({}).stockMetadata, keywords: ["alpha", "beta", "gamma"] } as StockMetadata });
const r4 = buildCsvRow(kwAsset, "adobe_stock");
assert.equal(r4?.keywords, "alpha, beta, gamma", "keywords should be comma-joined");

// ── Test: buildCsvRow — category mapping ────────────────────────────────────

const catAsset = base({ stockMetadata: { ...base({}).stockMetadata, stockCategory: "Nature" } as StockMetadata });
const r5 = buildCsvRow(catAsset, "adobe_stock");
assert.equal(r5?.category, "5", "Nature → Adobe category ID 5");

// ── Test: resolveReleasesValue ──────────────────────────────────────────────

// No people/property
assert.equal(resolveReleasesValue(null), "", "null stockMetadata → empty");
assert.equal(resolveReleasesValue({}), "", "empty stockMetadata → empty");

// Fictional
assert.equal(resolveReleasesValue({ peopleAndPropertyFictional: true }), "", "fictional → empty");

// People released
assert.equal(resolveReleasesValue({ peopleRelease: "released" }), "Model Released", "people released → Model Released");

// Property released
assert.equal(resolveReleasesValue({ propertyRelease: "released" }), "Property Released", "property released → Property Released");

// People released available
assert.equal(resolveReleasesValue({ peopleReleaseAvailable: true }), "Model Released", "peopleReleaseAvailable → Model Released");

// ── Test: getCsvMetadataEligibility ─────────────────────────────────────────

//Complete asset eligible
const eligible = getCsvMetadataEligibility(base());
assert.equal(eligible.eligible, true, "complete asset should be eligible");
assert.equal(eligible.hardBlock, false, "no hard block");
assert.equal(eligible.missing, false, "no missing fields");

//Missing title ineligible
const noTitle = base({ stockMetadata: { ...base({}).stockMetadata, title: "" } as StockMetadata });
const r6 = getCsvMetadataEligibility(noTitle);
assert.equal(r6.eligible, false, "missing title → ineligible");
assert.equal(r6.missing, true, "missing title → missing");

//Preflight decision fail hard block
const failAsset = base({ stockMetadata: { ...base({}).stockMetadata, preflightDecision: "fail" as unknown as null } as StockMetadata });
const r7 = getCsvMetadataEligibility(failAsset);
assert.equal(r7.eligible, false, "preflight fail → ineligible");
assert.equal(r7.hardBlock, true, "preflight fail → hard block");

//Watermark detected hard block
const wmAsset = base({ stockMetadata: { ...base({}).stockMetadata, preflightChecks: { noWatermark: false } } as unknown as StockMetadata });
const r8 = getCsvMetadataEligibility(wmAsset);
assert.equal(r8.eligible, false, "watermark detected → ineligible");
assert.equal(r8.hardBlock, true, "watermark detected → hard block");

// ── Test: buildCsvRows — multiple assets ────────────────────────────────────

const rows = buildCsvRows([base(), base({ id: "lib_asset_2", name: "Second Asset" })], "adobe_stock");
assert.equal(rows.length, 2, "should produce 2 rows");

// ── Test: buildCsvContent — roundtrip ───────────────────────────────────────

const content = buildCsvContent([base()], "adobe_stock");
assert.ok(content, "CSV content should be produced");
assert.ok(content?.startsWith("Filename,Title,Keywords,Category,Releases,Generative AI"), "header should be unquoted");
assert.ok(content?.includes("Test Title"), "title should appear in content");
assert.ok(content?.includes("Yes"), "Generative AI Yes should appear");

// ── Test: buildManifest ─────────────────────────────────────────────────────

const manifest = buildManifest([{ id: "a1", filename: "test.png", title: "Test" }]);
assert.equal(manifest.totalAssets, 1, "manifest should count 1 asset");
assert.equal((manifest.items as any[])[0].filename, "test.png");

// ── Test: buildJsonSidecar ──────────────────────────────────────────────────

const sidecar = buildJsonSidecar(base());
assert.equal(sidecar.title, "Test Title", "sidecar title should match");
assert.equal(sidecar.id, "lib_asset_1", "sidecar id should match");

// ── Test: exportHistory entry shape ─────────────────────────────────────────

const entry = { exportedAt: Date.now(), format: "PNG", platform: "adobe_stock" };
assert.equal(typeof entry.exportedAt, "number", "exportedAt must be a number");
assert.ok(Number.isFinite(entry.exportedAt), "exportedAt must be finite");
assert.equal(typeof entry.format, "string", "format must be a string");
assert.equal(typeof entry.platform, "string", "platform must be a string");

// ── Test: downloadCsvForAssets ──────────────────────────────────────────────

import { downloadCsvForAssets } from "../src/components/metadata/export/csv";

const mixedAssets = [
  base({ id: "a1" }), // eligible
  base({ id: "a2", stockMetadata: { ...base({}).stockMetadata, title: "" } as StockMetadata }), // missing title -> ineligible
];

let lastToastMsg = "";
const res = downloadCsvForAssets(mixedAssets, {
  showToast: (msg) => { lastToastMsg = msg; }
});
assert.equal(res.exportedCount, 1, "1 asset should be exported");
assert.equal(res.skippedCount, 1, "1 asset should be skipped");
assert.ok(lastToastMsg.includes("1 asset dilewati"), "toast should report 1 asset skipped");

console.log("✓ All metadata-export tests passed");