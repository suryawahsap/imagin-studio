import assert from "assert/strict";
import { setStudioApi } from "../src/modules/studio/engines/generation";
import { getBatchSlotsAI } from "../src/modules/studio/engines/composition";
import { expandPromptWithGemini } from "../src/modules/studio/engines/prompt";
import { generateMetadataAndQA, runKeywordValidationLoop } from "../src/modules/studio/engines/metadata";
import { analyzeVisualTruth } from "../src/modules/studio/engines/quality";

let response: any;
let apiCalls = 0;
setStudioApi({ studioGenerate: async () => { apiCalls++; return Array.isArray(response) ? response.shift() : response; } });
const settings: any = { aiConfig: { textModel: "test-model" } };

response = { success: true, response: { candidates: [{ content: { parts: [{ text: '["First composition","Object close-up"]' }] } }] } };
const slots = await getBatchSlotsAI(2, "coffee", settings);
assert.deepEqual(slots.map(slot => slot.role), ["AI_COMP_1", "AI_COMP_2"]);
assert.equal(slots[1].excludesPeople, true);

response = { success: false, status: 500, detail: "down" };
const fallbackSlots = await getBatchSlotsAI(2, "coffee", settings);
assert.equal(fallbackSlots.length, 2);
assert.notEqual(fallbackSlots[0].role, "AI_COMP_1");

response = { success: true, response: { candidates: [{ content: { parts: [{ text: "Expanded coffee prompt" }] } }] } };
assert.equal(await expandPromptWithGemini("coffee", "", { assetType: "vector", visualSettings: {} }, settings.aiConfig, () => {}), "Expanded coffee prompt");
response = { success: false, status: 429, detail: "limited" };
assert.match(await expandPromptWithGemini("coffee", "", { assetType: "vector", visualSettings: {} }, settings.aiConfig, () => {}), /coffee/i);

response = { success: true, response: { candidates: [{ content: { parts: [{ text: '{"title":"Coffee cup","keywords":["coffee"],"preflightDecision":"pass"}' }] } }] } };
const metadata = await generateMetadataAndQA({ asset: {}, vision: { _mimeType: "image/png", _base64Data: "abc" }, profile: "illustration" }, settings.aiConfig, () => {});
assert.equal(metadata.data.title, "Coffee cup");

response = { success: true, response: { candidates: [{ content: { parts: [{ text: "not json" }] } }] } };
const malformedMetadata = await generateMetadataAndQA({ asset: {}, vision: { _mimeType: "image/png", _base64Data: "abc" }, profile: "illustration" }, settings.aiConfig, () => {});
assert.equal(malformedMetadata.reason, "invalid_json");

apiCalls = 0;
response = { success: true, response: { candidates: [{ content: { parts: [{ text: '{"additionalKeywords":["mug","drink"]}' }] } }] } };
const toppedUp = await runKeywordValidationLoop({ keywords: ["coffee"], title: "Coffee cup", vision: { primarySubject: "cup" } }, settings.aiConfig, () => {});
assert.equal(apiCalls, 1);
assert.deepEqual(toppedUp, ["coffee", "mug", "drink"]);

response = { success: true, response: { candidates: [{ content: { parts: [{ text: '{"primarySubject":"cup","objects":["cup"],"peopleVisible":false}' }] } }] } };
const vision = await analyzeVisualTruth({ url: "data:image/png;base64,abc" }, settings.aiConfig, () => {});
assert.equal(vision.vision.primarySubject, "cup");
response = { success: true, response: { candidates: [{ content: { parts: [] } }] } };
const emptyVision = await analyzeVisualTruth({ url: "data:image/png;base64,abc" }, settings.aiConfig, () => {});
assert.equal(emptyVision.reason, "empty_response");
response = { success: false, status: 500, detail: "down" };
const failedVision = await analyzeVisualTruth({ url: "data:image/png;base64,abc" }, settings.aiConfig, () => {});
assert.equal(failedVision.vision, null);
assert.equal(failedVision.reason, "server_error");

console.log("[fase4-wave2] all checks passed");
