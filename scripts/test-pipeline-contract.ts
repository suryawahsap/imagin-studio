// Phase 2/2.3 contract — canonical production core (pipeline.ts) + deterministic
// style resolver (Phase 1). Standalone assert script, runnable with npx tsx.
import assert from 'assert/strict';
import {
  buildFinalAssetObject,
  isSpecificUserInput,
  resolveFinalizeArgs,
  resolvePromptInput,
  isNativeSVGEligible,
  compactLearningEvaluation,
} from '../src/modules/studio/pipeline';
import { resolveStyleKeyFromVision } from '../src/modules/studio/engines/prompt';

// ── resolvePromptInput: canonical prompt selection ─────────────────────────
assert.equal(
  await resolvePromptInput({ skipAIExpansion: true, baseInput: 'x', enrichedInput: 'y', expansionProvider: async () => 'EXPANDED' }),
  'x',
  'skipAIExpansion must bypass provider'
);
assert.equal(
  await resolvePromptInput({ skipAIExpansion: false, baseInput: 'x', enrichedInput: 'y', expansionProvider: async () => 'EXPANDED' }),
  'EXPANDED',
  'provider output wins when allowed'
);
assert.equal(
  await resolvePromptInput({ skipAIExpansion: false, baseInput: 'x', enrichedInput: 'y', expansionProvider: async () => '' }),
  'x',
  'empty provider output falls back to baseInput'
);
assert.equal(
  await resolvePromptInput({ skipAIExpansion: false, baseInput: 'x', enrichedInput: 'y', expansionProvider: async () => { throw new Error('boom'); } }),
  'x',
  'provider failure falls back to baseInput'
);

// ── resolveFinalizeArgs: caller overrides propagate ─────────────────────────
const vs: any = { visualSettings: { aspectRatio: '16:9', outputFormat: 'JPEG', style: 'Watercolor' } };
const fa = resolveFinalizeArgs(vs, 'white', 'vector', '1:1');
assert.equal(fa.aspectRatio, '1:1', 'explicit aspect wins');
assert.equal(fa.outputFormat, 'JPEG', 'outputFormat from vectorState');
assert.equal(fa.styleKey, 'Watercolor', 'styleKey from vectorState');
assert.equal(fa.upscaleMode, 'none', 'upscale off in pipeline path');

// ── buildFinalAssetObject: lineage passthrough (production trace seed) ──────
const finalized: any = {
  dataUrl: 'data:image/png;base64,AAA', width: 800, height: 600,
  backgroundVerified: true, resolutionVerified: true, megapixels: 0.48,
  fileSizeKB: 120, fileSizeOk: true,
};
const placeholder: any = { id: 'p1', assembledPrompt: 'A', negativePrompt: 'N', batchId: 'b1' };
const vectorState: any = {
  platform: 'adobe_stock', adobeCategory: 'Animals', subcategory: 'Wildlife',
  assetType: 'vector', generationMode: 'batch', visualSettings: { style: 'Flat Commercial' },
};
const diff = { recommendation: 'go', genericityScore: 10 };
const finalAsset: any = buildFinalAssetObject({
  placeholder,
  finalized,
  baseInput: 'cat',
  assembledPrompt: 'A + layers',
  vectorState,
  systemSettings: { aiConfig: { imageModel: 'test-model' } } as any,
  resolvedBg: { mode: 'white' },
  batchId: 'b1',
  assetIndex: 0,
  categoryOverride: 'Animals',
  styleInterpretation: { visualDirective: 'flat' },
  generationMode: 'batch',
  style: 'Flat Commercial',
  canonicalIntent: { intent: 'i1' },
  constraints: { valid: true, conflicts: [] },
  intentValidation: { valid: true, missing: [] },
  conceptFingerprint: { fp: 'f1' },
  differentiation: diff,
  promptGraph: { nodes: 1 },
  productionTrace: { request: { prompt: 'cat' } },
  styleCompatibility: { verdict: 'match' },
});
assert.equal(finalAsset.lineage.canonicalIntent.intent, 'i1', 'canonicalIntent passthrough');
assert.equal(finalAsset.lineage.constraints.valid, true, 'constraints passthrough');
assert.equal(finalAsset.lineage.conceptFingerprint.fp, 'f1', 'conceptFingerprint passthrough');
assert.equal(finalAsset.lineage.promptGraph.nodes, 1, 'promptGraph passthrough');
assert.equal(finalAsset.lineage.productionTrace.request.prompt, 'cat', 'productionTrace passthrough');
assert.equal(finalAsset.lineage.styleCompatibility.verdict, 'match', 'styleCompatibility passthrough');
assert.equal(finalAsset.lineage.generationMode, 'batch', 'generationMode lineage');
assert.equal(finalAsset.lineage.generationModel, 'test-model', 'generationModel lineage');
assert.equal(finalAsset.stockMetadata.differentiation, diff, 'differentiation lands in stockMetadata');
assert.equal(finalAsset.url, finalized.dataUrl, 'final url');
assert.equal(finalAsset.isLoading, false, 'not loading');

// ── isSpecificUserInput (DNA subject locking heuristic) ─────────────────────
assert.equal(typeof isSpecificUserInput('a quick brown fox jumps over the lazy dog'), 'boolean');
assert.equal(isSpecificUserInput(''), false, 'empty is generic');
assert.equal(isNativeSVGEligible({ assetType: 'vector', outputFormat: 'SVG' }), true, 'vector SVG must use native routing');
assert.equal(isNativeSVGEligible({ assetType: 'illustration', outputFormat: 'SVG' }), false, 'illustration SVG is not native eligible');
const compactEval = compactLearningEvaluation({ status: 'adaptive_ahead' }, { assetType: 'vector', outputFormat: 'SVG' }, { assetCount: 3 });
assert.deepEqual(compactEval, { version: 1, status: 'adaptive_ahead', generated: true, assetType: 'vector', outputFormat: 'SVG', collectionAssetCount: 3, recordedAt: compactEval.recordedAt }, 'learning evaluation must be compact and deterministic apart from timestamp');

// ── resolveStyleKeyFromVision: deterministic tree (strong_v2 parity) ────────
assert.equal(resolveStyleKeyFromVision({ renderingStyle: { fillType: 'watercolor-wash' } }, 'illustration', false), 'Watercolor');
assert.equal(resolveStyleKeyFromVision({ illustrationSignals: { perspectiveType: 'isometric' } }, 'illustration', false), 'Isometric 3D');
assert.equal(resolveStyleKeyFromVision({}, 'vector', true), 'Seamless Pattern');
assert.equal(resolveStyleKeyFromVision({ peopleVisible: true }, 'photo', false), 'Environmental Portrait');
assert.equal(resolveStyleKeyFromVision({ renderingStyle: { fillType: 'flat', strokeType: 'bold-outline' }, vectorSignals: {} }, 'vector', false), 'Flat Commercial', 'no matching signal → safest fallback');

console.log('PIPELINE CONTRACT OK');
