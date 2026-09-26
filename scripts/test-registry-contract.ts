import assert from "assert/strict";
import { ICON_GRID_OPTIONS, PAGE_SIZE } from "../src/modules/studio/registry/constants";
import { SYSTEM_DEFAULT_SETTINGS } from "../src/modules/studio/registry/defaults";
import { ANIMATION_PRESETS, ASSET_TYPE_META, METADATA_RULES, PLATFORM_ADAPTERS } from "../src/modules/studio/registry/presets";
import { resolveDNAFromOfficial } from "../src/modules/studio/resolvers";
import type { NormalizedRequest } from "../src/modules/studio/types";

assert.equal(PAGE_SIZE, 50);

const request: NormalizedRequest = { prompt: "p", assetType: "vector", category: "c", subcategory: "", style: "", background: "white", aspectRatio: "1:1", platform: "adobe_stock", source: "test" };
assert.equal(request.source, "test");

assert.equal(typeof SYSTEM_DEFAULT_SETTINGS, "object");
assert.ok(Object.keys(SYSTEM_DEFAULT_SETTINGS).length > 0);
const assertNoKeyMaterial = (value: unknown): void => {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.doesNotMatch(key, /api_?key|token|secret|password/i);
    if (/key/i.test(key)) assert.equal(typeof child, "boolean", `${key} must be a boolean key-status field`);
    assertNoKeyMaterial(child);
  }
};
assertNoKeyMaterial(SYSTEM_DEFAULT_SETTINGS);

assert.ok(Object.keys(ASSET_TYPE_META).length > 0);
assert.ok(ANIMATION_PRESETS.length > 0);
assert.equal(Array.isArray(ICON_GRID_OPTIONS), true);
assert.equal(ICON_GRID_OPTIONS.length, 8);
assert.deepEqual(ICON_GRID_OPTIONS[1], { qty: 6, cols: 3, rows: 2, label: "6 icons", grid: "3×2", aspectRatio: "4:3", description: "Balanced landscape — paling populer" });

assert.deepEqual(METADATA_RULES.title, { MIN_LEN: 40, TARGET_MAX_LEN: 70, HARD_MAX_LEN: 200, MAX_LEN: 70 });
assert.deepEqual(METADATA_RULES.keywords, { TAGS_COUNT: 45, MIN_COUNT: 20, MAX_COUNT: 50 });

assert.equal(PLATFORM_ADAPTERS.adobe_stock.status, "active");
assert.equal(PLATFORM_ADAPTERS.freepik.status, "planned");
assert.equal(resolveDNAFromOfficial("adobe_stock", 3), "Business");
assert.equal(resolveDNAFromOfficial("adobe_stock", 999), "");
assert.equal(resolveDNAFromOfficial("adobe_stock", 0), "");
assert.equal(resolveDNAFromOfficial("adobe_stock", null), "");
assert.equal(resolveDNAFromOfficial("freepik", 3), "");

console.log("[registry-contract] all checks passed");
