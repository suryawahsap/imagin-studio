// Standalone test for calcSteps + pickModel (ups-run.ts).
// Run: npx tsx scripts/test-ups-plan.ts
import assert from "node:assert/strict";
import { calcSteps, pickModel } from "../electron/services/ups/ups-run";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  \u2713 ${name}`);
}

console.log("ups-plan test");

// ── calcSteps assertions ───────────────────────────────────────────────────

check("2x → {steps:[2], finalRatio:1}", () => {
  const plan = calcSteps(2);
  assert.deepEqual(plan.steps, [2]);
  assert.equal(plan.finalRatio, 1);
});

check("3x → {steps:[3], finalRatio:1}", () => {
  const plan = calcSteps(3);
  assert.deepEqual(plan.steps, [3]);
  assert.equal(plan.finalRatio, 1);
});

check("4x → {steps:[4], finalRatio:1}", () => {
  const plan = calcSteps(4);
  assert.deepEqual(plan.steps, [4]);
  assert.equal(plan.finalRatio, 1);
});

check("5x → {steps:[2,3], finalRatio:5/6}", () => {
  const plan = calcSteps(5);
  assert.deepEqual(plan.steps, [2, 3]);
  assert.ok(Math.abs(plan.finalRatio - 5 / 6) < 1e-9);
});

check("6x → {steps:[2,3], finalRatio:1}", () => {
  const plan = calcSteps(6);
  assert.deepEqual(plan.steps, [2, 3]);
  assert.equal(plan.finalRatio, 1);
});

check("7x → {steps:[2,4], finalRatio:7/8}", () => {
  const plan = calcSteps(7);
  assert.deepEqual(plan.steps, [2, 4]);
  assert.ok(Math.abs(plan.finalRatio - 7 / 8) < 1e-9);
});

check("8x → {steps:[2,4], finalRatio:1}", () => {
  const plan = calcSteps(8);
  assert.deepEqual(plan.steps, [2, 4]);
  assert.equal(plan.finalRatio, 1);
});

check("15x → {steps:[4,4], finalRatio:15/16}", () => {
  const plan = calcSteps(15);
  assert.deepEqual(plan.steps, [4, 4]);
  assert.ok(Math.abs(plan.finalRatio - 15 / 16) < 1e-9);
});

check("1.5x → {steps:[2], finalRatio:0.75}", () => {
  const plan = calcSteps(1.5);
  assert.deepEqual(plan.steps, [2]);
  assert.ok(Math.abs(plan.finalRatio - 0.75) < 1e-9);
});

// ── Fractional boundary ────────────────────────────────────────────────────

check("5.5x → product 6, finalRatio 5.5/6", () => {
  const plan = calcSteps(5.5);
  const product = plan.steps.reduce((a, b) => a * b, 1);
  assert.ok(product >= 5.5);
  assert.ok(Math.abs(plan.finalRatio - 5.5 / product) < 1e-9);
});

check("2.5x → {steps:[3], finalRatio:5/6}", () => {
  const plan = calcSteps(2.5);
  assert.deepEqual(plan.steps, [3]);
  assert.ok(Math.abs(plan.finalRatio - 2.5 / 3) < 1e-9);
});

// ── Edge: already at or above target ───────────────────────────────────────

check("1x → {steps:[], finalRatio:1} (no passes needed, product already ≥ target)", () => {
  const plan = calcSteps(1);
  assert.deepEqual(plan.steps, []);
  assert.equal(plan.finalRatio, 1);
});

// ── pickModel assertions ──────────────────────────────────────────────────

check("photo → realesrgan-x4plus", () => {
  assert.equal(pickModel("photo"), "realesrgan-x4plus");
});

check("illustration → realesrgan-x4plus-anime", () => {
  assert.equal(pickModel("illustration"), "realesrgan-x4plus-anime");
});

check("anime → realesrgan-x4plus-anime", () => {
  assert.equal(pickModel("anime"), "realesrgan-x4plus-anime");
});

check("icon → realesrgan-x4plus-anime", () => {
  assert.equal(pickModel("icon"), "realesrgan-x4plus-anime");
});

console.log(`[ups-plan] ${checks} assertions passed`);