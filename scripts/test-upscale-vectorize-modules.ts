import assert from "assert/strict";
import UpscaleModule from "../src/components/upscale/UpscaleModule";
import VectorizeModule from "../src/components/vectorize/VectorizeModule";
import { scaleSteps, formatSteps, detectAssetType } from "../src/components/upscale/types";
import { tracingToPayload, TRACING_DEFAULTS } from "../src/components/vectorize/types";
import { resolveIconPreset } from "../electron/services/vec/vec-config";

// Assert component exports exist
assert(typeof UpscaleModule === "function", "UpscaleModule must be a component function");
assert(typeof VectorizeModule === "function", "VectorizeModule must be a component function");

// Assert upscale scale steps calculations
assert.deepEqual(scaleSteps("2x", 2), [2]);
assert.deepEqual(scaleSteps("4x", 4), [4]);
assert.deepEqual(scaleSteps("4k", 2), [3840]);
assert.equal(formatSteps("2x", 2), "2x");
assert.equal(formatSteps("4k", 2), "4K (3840px)");

// Assert vectorize tracingToPayload
const flatPayload = tracingToPayload(TRACING_DEFAULTS["flat-icon"]);
assert.equal(flatPayload.mode, "spline");
assert.equal(flatPayload.clustering, "color-cluster");
assert.equal(flatPayload.maxColors, 16);
assert.equal(resolveIconPreset("outline", "flat-icon")?.vtracerArgs.pathPrecision, 0.1);
assert.equal(resolveIconPreset("gradient", "flat-icon")?.vtracerArgs.maxColors, 32);
assert.equal(resolveIconPreset("glyph", "flat-icon")?.assetType, "flat-icon");
assert.equal(resolveIconPreset("unknown", "photo"), null);

console.log("✓ All upscale and vectorize module contract tests passed");
