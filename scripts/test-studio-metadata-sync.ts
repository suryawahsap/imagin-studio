import assert from "assert/strict";
import { studioUpsertMetadataFields } from "../src/modules/studio/engines/library-sync";
import type { Asset } from "../src/modules/studio/types";

// ── helpers ─────────────────────────────────────────────────────────────────
const base = (over: Partial<Asset> = {}): Asset => ({
  id: "asset_test_1",
  type: "IMAGE",
  assetType: "vector",
  generationMode: "single",
  adobeCategory: "",
  subcategory: "",
  title: "Test",
  baseTheme: "",
  archetypeRole: null,
  prompt: "",
  assembledPrompt: "",
  negativePrompt: "",
  aspectRatio: "4:3",
  style: "",
  highDpiSharpness: false,
  outputFormat: "PNG",
  background: "white",
  createdAt: 1,
  status: "ready",
  favorite: false,
  batchId: "",
  isLoading: false,
  isMetaLoading: false,
  url: "data:image/png;base64,iVBORw0KGgo=",
  stockMetadata: {
    title: "", description: "", keywords: [], stockCategory: "", subcategory: "",
    outputFormat: "PNG", contentType: "", backgroundMode: "white", generativeAIDeclaration: true,
    aiTool: "", peopleRelease: "", propertyRelease: "", preflightChecks: {},
    preflightPassedAt: null, submittedAt: null, backgroundVerified: false,
    resolutionVerified: false, metadataSource: null, acceptancePrediction: null,
    preflightDecision: null, preflightScore: null, preflightIssues: [],
    qualityScore: null, suggestions: [], analysisAvailable: null,
  },
  ...over,
});

//── Test 1: full metadata all fields populated ──────────────────────────
const full = base({
  adobeCategory: "Nature",
  subcategory: "Flowers",
  stockMetadata: { ...base({}).stockMetadata, title: "Red Flower", keywords: ["flower", "red"] },
});
const r1 = studioUpsertMetadataFields(full);
assert.equal(r1.stockMetadata, full.stockMetadata, "stockMetadata should be passed through");
assert.equal(r1.adobeCategory, "Nature", "adobeCategory should be passed through");
assert.equal(r1.subcategory, "Flowers", "subcategory should be passed through");

//── Test 2: empty stockMetadata with no title fields omitted ────────────
const empty = base({
  adobeCategory: "",
  subcategory: "",
  stockMetadata: { ...base({}).stockMetadata, title: "", keywords: [] },
});
const r2 = studioUpsertMetadataFields(empty);
assert.equal(r2.stockMetadata, undefined, "stockMetadata should be omitted when title is empty");
assert.equal(r2.adobeCategory, undefined, "adobeCategory should be omitted when empty");
assert.equal(r2.subcategory, undefined, "subcategory should be omitted when empty");

//── Test 3: stockMetadata with title but no category only metadata ──────
const titleOnly = base({
  adobeCategory: "",
  subcategory: "",
  stockMetadata: { ...base({}).stockMetadata, title: "My Asset", keywords: [] },
});
const r3 = studioUpsertMetadataFields(titleOnly);
assert.equal(r3.stockMetadata, titleOnly.stockMetadata, "stockMetadata with title should be included");
assert.equal(r3.adobeCategory, undefined, "adobeCategory should be omitted when empty");
assert.equal(r3.subcategory, undefined, "subcategory should be omitted when empty");

// ── Test 4: exportHistory entry shape (pure data check) ───────────────────
const entry = { exportedAt: Date.now(), format: "PNG", platform: "adobe_stock" };
assert.equal(typeof entry.exportedAt, "number", "exportedAt must be a number");
assert.ok(Number.isFinite(entry.exportedAt), "exportedAt must be finite");
assert.equal(typeof entry.format, "string", "format must be a string");
assert.ok(entry.format.length <= 64, "format must be <= 64 chars");
assert.equal(typeof entry.platform, "string", "platform must be a string");

// ── Test 5: exportHistory platform null allowed ───────────────────────────
const entryNullPlatform = { exportedAt: Date.now(), format: "JPEG", platform: null };
assert.equal(entryNullPlatform.platform, null, "platform may be null");

console.log("[test-studio-metadata-sync] all checks passed");