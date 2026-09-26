import assert from "node:assert/strict";
import {
  ESTIMATED_COST_PER_CALL_USD,
  estimateApiCalls,
  estimateCostUsd,
  formatFileSize,
  getAssetFileSizeKB,
  hashString,
} from "../src/modules/studio/utils";

const check = (name, fn) => {
  fn();
  console.log(`  ✓ ${name}`);
};

console.log("utils-extraction real-engine test");

check("getAssetFileSizeKB handles data urls", () => {
  assert.equal(getAssetFileSizeKB({}), null);
  assert.equal(getAssetFileSizeKB({ url: `data:image/png;base64,${"a".repeat(4096)}` }), 3);
  assert.equal(getAssetFileSizeKB({ url: "data:text/plain,hello%20world" }), 0);
});
check("formatFileSize handles KB and MB", () => {
  assert.equal(formatFileSize(null), "—");
  assert.equal(formatFileSize(512), "512 KB");
  assert.equal(formatFileSize(1536), "1.5 MB");
});
check("hashString is deterministic", () => {
  assert.equal(hashString(""), "811c9dc5");
  assert.equal(hashString("hello"), "a82fb4a1");
});
check("estimateApiCalls covers generation modes", () => {
  assert.equal(estimateApiCalls({ iconMode: true, iconGenerationMode: "sheet" }, {}), 1);
  assert.equal(estimateApiCalls({ quantity: 3, skipAIExpansion: false }, { commercialRules: { enableDifferentiationCheck: true } }), 7);
  assert.equal(estimateApiCalls({ quantity: 3, skipAIExpansion: true, useAIComposition: true }, {}), 4);
});
check("estimateCostUsd uses configured rate", () => {
  assert.equal(ESTIMATED_COST_PER_CALL_USD, 0.01);
  assert.equal(estimateCostUsd(3), "0.030");
  assert.equal(estimateCostUsd(undefined), "0.000");
});

console.log("[utils-extraction] assertions passed");
