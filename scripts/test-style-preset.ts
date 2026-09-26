// Focused real-engine test for findStylePreset reconciliation.
// Verifies frozen-compatible spaceless normalization via STYLE_PRESET_MAP.
// Run: npx tsx scripts/test-style-preset.ts

import assert from "node:assert/strict";
import { findStylePreset, STYLE_PRESET_MAP } from "../src/modules/studio/engines/prompt-helpers";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("style-preset real-engine test");

// ── STYLE_PRESET_MAP is the frozen-compatible spaceless map ────────────────
check("STYLE_PRESET_MAP maps spaceless key to camelCase", () => {
  assert.equal(STYLE_PRESET_MAP["linealcolor"], "linealColor");
  assert.equal(STYLE_PRESET_MAP["handdrawn"], "handDrawn");
  assert.equal(STYLE_PRESET_MAP["3dproductrender"], "threeDProduct");
  assert.equal(STYLE_PRESET_MAP["cutefood"], "cuteFoodObject");
  assert.equal(STYLE_PRESET_MAP["handdrawnorganic"], "handDrawn");
});

// ── findStylePreset: display names → camelCase DNA key ─────────────────────
check("Lineal Color -> linealColor with non-empty negativePrompt", () => {
  const p = findStylePreset("Lineal Color");
  assert.ok(p);
  assert.ok((p.negativePrompt || "").length > 0, "negativePrompt is non-empty");
});

check("Hand Drawn -> handDrawn", () => {
  const p = findStylePreset("Hand Drawn");
  assert.ok(p);
  assert.ok(p.promptTrigger.includes("hand-drawn organic illustration"), "promptTrigger is the handDrawn preset");
});

check("3D Product Render -> threeDProduct", () => {
  const p = findStylePreset("3D Product Render");
  assert.ok(p);
  assert.ok(p.promptTrigger.includes("3D"));
});

check("Cute Food -> cuteFoodObject", () => {
  const p = findStylePreset("Cute Food");
  assert.ok(p);
  assert.ok(p.promptTrigger.includes("food"));
});

check("Hand-Drawn Organic -> handDrawn (same as Hand Drawn)", () => {
  const a = findStylePreset("Hand-Drawn Organic");
  const b = findStylePreset("Hand Drawn");
  assert.ok(a);
  assert.ok(b);
  assert.equal(a.negativePrompt, b.negativePrompt);
});

// ── Display-name variants normalise via spaceless map ─────────────────────
check("Lineal Color, linealcolor, LINEAL COLOR all resolve", () => {
  const a = findStylePreset("Lineal Color");
  const b = findStylePreset("linealcolor");
  const c = findStylePreset("LINEAL COLOR");
  assert.ok(a && b && c);
  assert.equal(a.negativePrompt, b.negativePrompt);
  assert.equal(a.negativePrompt, c.negativePrompt);
});

// ── Unknown style returns null ─────────────────────────────────────────────
check("unknown style returns null", () => {
  assert.equal(findStylePreset("zzz no such style"), null);
  assert.equal(findStylePreset(""), null);
  assert.equal(findStylePreset(null), null);
  assert.equal(findStylePreset(undefined), null);
});

// ── StylePresetEntry shape ─────────────────────────────────────────────────
check("returned entry has promptTrigger, characteristics, negativePrompt", () => {
  const p = findStylePreset("Lineal Color");
  if (!p) { assert.fail(); return; }
  assert.equal(typeof p.promptTrigger, "string");
  assert.ok(p.promptTrigger.length > 0);
  assert.equal(typeof p.characteristics, "string");
  assert.ok(p.characteristics.length > 0);
  assert.equal(typeof p.negativePrompt, "string");
  assert.ok(p.negativePrompt.length > 0);
});

console.log(`\n[style-preset] all ${checks} checks passed`);
process.exit(0);