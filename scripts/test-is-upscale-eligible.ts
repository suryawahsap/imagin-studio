// Focused real-export test for isUpscaleEligible (utils.ts, extracted from
// imagin_studio.tsx 13810-13838). Run: npx tsx scripts/test-is-upscale-eligible.ts
import assert from "node:assert/strict";
import { isUpscaleEligible } from "../src/modules/studio/utils.ts";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("is-upscale-eligible real-export test");

// ── Guards ──────────────────────────────────────────────────────────────
check("false when no url", () => {
  assert.equal(isUpscaleEligible({}), false);
  assert.equal(isUpscaleEligible(undefined), false);
  assert.equal(isUpscaleEligible({ url: "" }), false);
});
check("false while loading/upscaling", () => {
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", isLoading: true }), false);
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", isUpscaling: true }), false);
});
check("false when status FAILED", () => {
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", status: "FAILED" }), false);
});

// ── SVG both paths ───────────────────────────────────────────────────────
check("false for SVG outputFormat", () => {
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", outputFormat: "SVG" }), false);
});
check("false for data:image/svg+xml url", () => {
  assert.equal(isUpscaleEligible({ url: "data:image/svg+xml;base64,PHN2Zw==" }), false);
});

// ── Attempts 2/3 ─────────────────────────────────────────────────────────
check("attempts 2 eligible, attempts 3 not", () => {
  const base = { url: "data:image/png;base64,x", resolution: { width: 1000, height: 1000 } };
  assert.equal(isUpscaleEligible({ ...base, resolution: { width: 1000, height: 1000, upscaleAttempts: 2 } }), true);
  assert.equal(isUpscaleEligible({ ...base, resolution: { width: 1000, height: 1000, upscaleAttempts: 3 } }), false);
});

// ── Unknown resolution → eligible (currentMp null) ───────────────────────
check("unknown resolution (no width/height) is eligible", () => {
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x" }), true);
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", resolution: {} }), true);
});

// ── Below/above target (default 4k = 8MP) ────────────────────────────────
check("below 4k target (6MP) eligible", () => {
  // 3000x2000 = 6MP < 8MP
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", resolution: { width: 3000, height: 2000 } }), true);
});
check("at/above 4k target (8MP+) not eligible", () => {
  // 4000x2250 = 9MP >= 8MP
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,x", resolution: { width: 4000, height: 2250 } }), false);
});

// ── Target override (6k = 36MP) ──────────────────────────────────────────
check("resolutionTarget 6k raises bar: 9MP still eligible", () => {
  const asset = { url: "data:image/png;base64,x", resolution: { width: 4000, height: 2250 }, resolutionTarget: "6k" };
  assert.equal(isUpscaleEligible(asset), true);
});
check("resolutionTarget 6k: 36MP+ not eligible", () => {
  const asset = { url: "data:image/png;base64,x", resolution: { width: 9000, height: 4500 }, resolutionTarget: "6k" };
  assert.equal(isUpscaleEligible(asset), false);
});

// ── Ignored file size ────────────────────────────────────────────────────
check("file size does not block upscale (small bytes, low MP)", () => {
  // Tiny compressed file but only 1MP → still eligible
  assert.equal(isUpscaleEligible({ url: "data:image/png;base64,AA==", resolution: { width: 1000, height: 1000 } }), true);
});
check("file size does not trigger upscale (large bytes, high MP)", () => {
  // Huge file but 20MP → already above target, NOT eligible despite size
  const big = "data:image/png;base64," + "A".repeat(2_000_000);
  assert.equal(isUpscaleEligible({ url: big, resolution: { width: 6000, height: 3400 } }), false);
});

console.log(`[is-upscale-eligible] ${checks} assertions passed`);
