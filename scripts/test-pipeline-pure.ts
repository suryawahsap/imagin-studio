import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compilePrompt, buildLayeredNegativePrompt } from "../src/modules/studio/engines/prompt";
import { buildFinalAssetObject } from "../src/modules/studio/pipeline";
import type { VectorState, SystemSettings } from "../src/modules/studio/types";

// ── Helpers ──
const mockSystemSettings: SystemSettings = {
  commercialRules: { defaultNegativePrompt: "watermark, logo", enableDifferentiationCheck: true },
  aiConfig: { provider: "gemini", textModel: "gemini-2.5-flash", imageModel: "gemini-3.1-flash-image", hasGeminiKey: true, hasNineRouterKey: false },
};

function makeVectorState(overrides: Partial<VectorState> = {}): VectorState {
  return {
    adobeCategory: "Business",
    internalCategory: "",
    subcategory: "Charts & Infographics",
    assetType: "illustration",
    visualSettings: {
      aspectRatio: "4:3",
      background: "white",
      style: "Flat Commercial",
      highDpiSharpness: true,
      outputFormat: "PNG",
      faceless: false,
      negativeSpace: true,
      resolutionTarget: "4k",
    },
    _visualDirty: {},
    singlePromptInput: "test prompt",
    iconMode: false,
    iconStyle: null,
    iconQuantity: 1,
    iconGenerationMode: "single",
    useAIComposition: false,
    selectedSubject: null,
    selectedScene: null,
    skipAIExpansion: false,
    platform: "adobe_stock",
    ...overrides,
  };
}

// ── Tests ──
// compilePrompt for vector includes commercial/compliance/format, no photo authority.
const vecState = makeVectorState();
const vecPrompt = compilePrompt({
  userPrompt: "test subject",
  resolvedConfig: vecState,
  dnaContext: "some DNA",
  commercialRules: "no watermark, no logos",
  cga: null,
  negativePrompt: "some negative",
  archetypeInstruction: "center",
  resolvedBg: { mode: "white", promptHint: "pure white" },
  marketPalette: "blue",
  styleCompatibility: null,
});
// The canonical compiler emits flattened compliance text; check for a stable term from GLOBAL_DNA.adobeCompliance.commercialQuality.
assert.ok(vecPrompt.includes("high-end flat illustration") || vecPrompt.includes("Vector & high-end"), "vector prompt should include commercialQuality token (e.g. 'high-end flat illustration')");
assert.ok(vecPrompt.includes("Output format: PNG"), "vector prompt should include output format");
assert.ok(vecPrompt.includes("Negative:"), "vector prompt should include negative");
assert.ok(!vecPrompt.includes("AUTHORITATIVE MEDIUM"), "vector prompt should NOT include photo authority");

// compilePrompt for photo includes photoAuthority
const photoState = makeVectorState({ assetType: "photo" });
const photoPrompt = compilePrompt({
  userPrompt: "test subject",
  resolvedConfig: photoState,
  dnaContext: "",
  commercialRules: "",
  cga: null,
  negativePrompt: "",
  archetypeInstruction: "",
  resolvedBg: null,
  marketPalette: "",
  styleCompatibility: null,
});
assert.ok(photoPrompt.includes("AUTHORITATIVE MEDIUM"), "photo prompt should include photo authority");

// buildLayeredNegativePrompt includes category layer when not in baseNegative
const layered = buildLayeredNegativePrompt({
  baseNegative: "default negative",
  assetType: "illustration",
  categoryKey: "Business",
  styleInterpretation: null,
  semanticIntent: null,
});
assert.ok(layered.includes("[CATEGORY]"), "layered negative should include category layer");
// Check that compliance layer is always added
assert.ok(layered.includes("[COMPLIANCE]"), "layered negative should include compliance layer");

// buildLayeredNegativePrompt includes semantic forbidden domains
const withSemantic = buildLayeredNegativePrompt({
  baseNegative: "default",
  assetType: "illustration",
  categoryKey: "Business",
  styleInterpretation: null,
  semanticIntent: { forbiddenDomains: ["medical", "political"] } as any,
});
assert.ok(withSemantic.includes("[SEMANTIC] medical, political"), "semantic layer should include forbidden domains");

// A resolved style applies both its directive and incompatible-domain guard.
const styleInterpretation = {
  visualDirective: "controlled editorial ink wash",
  incompatibleDomains: ["photorealistic studio lighting"],
};
const styleNegative = buildLayeredNegativePrompt({
  baseNegative: "default",
  assetType: "illustration",
  categoryKey: "Business",
  styleInterpretation,
  semanticIntent: null,
});
assert.ok(styleNegative.includes("[STYLE] photorealistic studio lighting"), "style interpretation should add incompatible domain");
const stylePrompt = compilePrompt({
  userPrompt: "test subject",
  resolvedConfig: vecState,
  styleInterpretation,
  negativePrompt: styleNegative,
});
assert.ok(stylePrompt.includes("controlled editorial ink wash"), "style interpretation should add visual directive");

// buildFinalAssetObject uses categoryOverride
const mockPlaceholder: any = {
  id: "test",
  isLoading: false,
  url: null,
  assembledPrompt: "prompt",
  negativePrompt: "neg",
  status: "draft",
  assetType: "illustration",
  batchId: "batch",
  createdAt: Date.now(),
};
const mockFinalized = {
  dataUrl: "data:image/png;base64,test",
  backgroundVerified: true,
  resolutionVerified: true,
  width: 2048,
  height: 1536,
  wasUpscaled: false,
  upscaleScaleFactor: 1,
  originalDims: { width: 1024, height: 768 },
  meetsRecommended: true,
  megapixels: 3.1,
  fileSizeKB: 450,
  fileSizeOk: true,
};
const vs = makeVectorState({ adobeCategory: "RawCategory" });
const finalObj = buildFinalAssetObject({
  placeholder: mockPlaceholder,
  finalized: mockFinalized,
  baseInput: "test",
  assembledPrompt: "prompt",
  vectorState: vs,
  systemSettings: mockSystemSettings,
  resolvedBg: { mode: "white", promptHint: "white" },
  batchId: "batch",
  assetIndex: 0,
  categoryOverride: "OverrideCategory",
});
assert.equal(finalObj.lineage?.category, "OverrideCategory", "categoryOverride should set lineage.category");
assert.equal(finalObj.lineage?.dnaCategory, "OverrideCategory", "categoryOverride should set lineage.dnaCategory");

// Without override, should fall back to vectorState.adobeCategory
const finalObjNoOverride = buildFinalAssetObject({
  placeholder: mockPlaceholder,
  finalized: mockFinalized,
  baseInput: "test",
  assembledPrompt: "prompt",
  vectorState: vs,
  systemSettings: mockSystemSettings,
  resolvedBg: { mode: "white", promptHint: "white" },
  batchId: "batch",
  assetIndex: 0,
});
assert.equal(finalObjNoOverride.lineage?.category, "RawCategory", "fallback should use vectorState.adobeCategory");

// Pipeline must await its async Gallery commit callback before reporting done.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pipelineSource = fs.readFileSync(path.join(scriptDir, "../src/modules/studio/pipeline.ts"), "utf8");
assert.ok(pipelineSource.includes("await onAssetReady(finalAsset);"), "pipeline must await onAssetReady");

// ── Test 6: resolvePromptInput selection logic with call counter ──
import { resolvePromptInput } from "../src/modules/studio/pipeline";

let callCount = 0;
const countingProvider = async (input: string) => {
  callCount++;
  return `expanded: ${input}`;
};

// skipAIExpansion true -> returns baseInput, provider NOT called
callCount = 0;
const resultSkip = await resolvePromptInput({
  skipAIExpansion: true,
  baseInput: "base",
  enrichedInput: "enriched",
  expansionProvider: countingProvider,
});
assert.equal(resultSkip, "base", "skipAIExpansion should return baseInput");
assert.equal(callCount, 0, "provider should not be called when skipAIExpansion is true");

// skipAIExpansion false, expansion returns string -> expanded, provider called once
callCount = 0;
const resultExpand = await resolvePromptInput({
  skipAIExpansion: false,
  baseInput: "base",
  enrichedInput: "enriched",
  expansionProvider: countingProvider,
});
assert.equal(resultExpand, "expanded: enriched", "expansion should return expanded result");
assert.equal(callCount, 1, "provider should be called once when skipAIExpansion is false");

// skipAIExpansion false, expansion returns falsy -> baseInput, provider called
callCount = 0;
const resultFalsy = await resolvePromptInput({
  skipAIExpansion: false,
  baseInput: "base",
  enrichedInput: "enriched",
  expansionProvider: async () => { callCount++; return ""; },
});
assert.equal(resultFalsy, "base", "falsy expansion should fallback to baseInput");
assert.equal(callCount, 1, "provider should be called even if returns falsy");

// skipAIExpansion false, expansion throws -> baseInput, provider called
callCount = 0;
const resultError = await resolvePromptInput({
  skipAIExpansion: false,
  baseInput: "base",
  enrichedInput: "enriched",
  expansionProvider: async () => { callCount++; throw new Error("fail"); },
});
assert.equal(resultError, "base", "error in expansion should fallback to baseInput");
assert.equal(callCount, 1, "provider should be called even if it throws");

console.log("✓ All pure pipeline tests passed");
