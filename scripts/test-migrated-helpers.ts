// Focused real-engine test for helper extractions from App.tsx:
//   getBatchRules / pickWithBatchLimit / pickUnique   (engines/prompt-helpers.ts)
//   resolveDNAFromOfficial / resolveBackground        (resolvers.ts)
// Run: npx tsx scripts/test-migrated-helpers.ts

import assert from "node:assert/strict";
import {
  getBatchRules,
  pickWithBatchLimit,
  pickUnique,
} from "../src/modules/studio/engines/prompt-helpers";
import {
  resolveDNAFromOfficial,
  resolveBackground,
} from "../src/modules/studio/resolvers";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("migrated-helpers real-engine test");

// ── getBatchRules: defaults + category override ─────────────────────────────
check("getBatchRules returns defaults for unknown category", () => {
  assert.deepEqual(getBatchRules("__missing__"), { sameSubcategoryMax: 2, identicalPaletteMax: 2 });
});
check("getBatchRules merges category batchRules over defaults", () => {
  const rules = getBatchRules("Animals");
  assert.equal(rules.sameSubcategoryMax, 2);
  assert.equal(rules.identicalPaletteMax, 2);
  assert.equal(typeof rules.sameSubcategoryMax, "number");
});

// ── pickWithBatchLimit: pool selection with per-batch max ──────────────────
check("pickWithBatchLimit returns null on empty pool", () => {
  assert.equal(pickWithBatchLimit([], new Map(), 2, "s"), null);
  assert.equal(pickWithBatchLimit(null as never, new Map(), 2, "s"), null);
});
check("pickWithBatchLimit picks and increments counts", () => {
  const counts = new Map<string, number>();
  const pool = ["a", "b"];
  const picked = pickWithBatchLimit(pool, counts, 2, "s");
  assert.ok(pool.includes(picked as string));
  assert.equal(counts.get(picked as string), 1);
});
check("pickWithBatchLimit resets to least-used when all hit max", () => {
  const counts = new Map<string, number>([["a", 2], ["b", 2]]);
  const pool = ["a", "b"];
  const picked = pickWithBatchLimit(pool, counts, 2, "s");
  assert.ok(pool.includes(picked as string), "still picks from pool");
  assert.equal(counts.get(picked as string), 3);
});

// ── pickUnique: unique-until-exhausted, then reset ──────────────────────────
check("pickUnique returns unused items before repeating", () => {
  const used = new Set<string>();
  const first = pickUnique(["x", "y"], used);
  assert.ok(["x", "y"].includes(first));
  assert.ok(used.has(first));
  const second = pickUnique(["x", "y"], used);
  assert.notEqual(second, first);
});
check("pickUnique resets and repeats once exhausted", () => {
  const used = new Set(["x", "y"]);
  const picked = pickUnique(["x", "y"], used);
  assert.ok(["x", "y"].includes(picked));
  assert.equal(used.size, 1);
});

// ── resolveDNAFromOfficial: adapter delegation + fallback map ──────────────
check("resolveDNAFromOfficial resolves via fallback map", () => {
  assert.equal(resolveDNAFromOfficial("adobe_stock", 13, ""), "People");
  assert.equal(resolveDNAFromOfficial("adobe_stock", 3, ""), "Business");
});
check("resolveDNAFromOfficial returns empty for missing category", () => {
  assert.equal(resolveDNAFromOfficial("adobe_stock", null, ""), "");
  assert.equal(resolveDNAFromOfficial("adobe_stock", 9999, ""), "");
});

// ── resolveBackground: priority resolution ──────────────────────────────────
check("resolveBackground honors explicit user choice", () => {
  const r = resolveBackground("transparent", "photo", "People", "Business Person", true);
  assert.equal(r.mode, "transparent");
  assert.equal(r.wasOverridden, false);
});
check("resolveBackground unknown strategy falls back to white", () => {
  const r = resolveBackground("greenscreen", "photo", "People", "Business Person", true);
  assert.equal(r.mode, "white");
});
check("resolveBackground 3d always white", () => {
  const r = resolveBackground("auto", "3d", "Business", "Finance & Banking");
  assert.equal(r.mode, "white");
  assert.equal(r.wasOverridden, false);
});
check("resolveBackground photo always scene", () => {
  const r = resolveBackground("auto", "photo", "Animals", "Wildlife");
  assert.equal(r.mode, "scene");
});
check("resolveBackground subcategory override applies", () => {
  const r = resolveBackground("auto", "illustration", "Animals", "Wildlife");
  assert.equal(r.mode, "white"); // Animals.Wildlife -> gradient strategy, mode 'white'
});
check("resolveBackground falls back to white", () => {
  const r = resolveBackground("auto", "illustration", "__missing__", "");
  assert.equal(r.mode, "white");
});

console.log(`\n[migrated-helpers] all ${checks} checks passed`);
process.exit(0);
