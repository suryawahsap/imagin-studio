import assert from "assert/strict";
import { buildConceptFingerprint, checkLibraryConceptSimilarity } from "../src/modules/studio/engines/fingerprint";
import { classifyRejection, deriveProductionPolicy } from "../src/modules/studio/engines/feedback";
import { normalizeRequest, validateRequestIntake } from "../src/modules/studio/engines/import-engine";

const intent = { primarySubject: "Red botanical flower", subjectDomain: "nature", assetConcept: "botanical flower", lockedTerms: ["flower"] };
assert.deepEqual(buildConceptFingerprint(intent), buildConceptFingerprint(intent));
const assets: any[] = [{ id: "match", url: "x", adobeCategory: "Nature", title: "Flower", lineage: { promptGraph: { intent } } }];
assert.equal(checkLibraryConceptSimilarity(intent, assets, "Nature").length, 1);
assert.equal(checkLibraryConceptSimilarity({ primarySubject: "business computer", subjectDomain: "technology" }, assets, "Nature").length, 0);

assert.equal(classifyRejection("semantic_mismatch").feedbackType, "wrong_subject");
assert.equal(classifyRejection("", "possible trademark brand").feedbackType, "IP");
assert.equal(classifyRejection("unknown").feedbackType, "unclassified");
const policy = deriveProductionPolicy([
  { action: "reject", qaSnapshot: { feedbackType: "wrong_subject", category: "prompt" } },
  { qaDecision: "reject", qaSnapshot: { feedbackType: "wrong_subject", category: "prompt" } },
]);
assert.equal(policy.sampleSize, 2);
assert.deepEqual(policy.topRejectionTypes[0], { type: "wrong_subject", count: 2 });
assert.equal(policy.suggestedActions.length, 1);

assert.deepEqual(normalizeRequest({ singlePromptInput: "  flower  " }), {
  prompt: "flower", assetType: "vector", category: "", subcategory: "", style: "", background: "white",
  aspectRatio: "4:3", platform: "adobe_stock", source: "sidebar",
});
assert.deepEqual(validateRequestIntake({ prompt: "x", assetType: "", category: "", platform: "" }).errors,
  ["PROMPT_TOO_SHORT", "ASSET_TYPE_MISSING", "CATEGORY_MISSING", "PLATFORM_MISSING"]);

console.log("[fase4-wave1] all checks passed");
