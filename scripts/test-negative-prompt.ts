// Focused real-engine test for buildNegativePrompt (engines/dna-engine.ts).
//   - photo vs vector global-negative selection
//   - style negative layer for Lineal Color
//   - category/CGA/archetype-excludesPeople ordering
//   - no trailing artifacts
// Run: npx tsx scripts/test-negative-prompt.ts

import assert from "node:assert/strict";
import { buildNegativePrompt } from "../src/modules/studio/engines/dna-engine";
import { GLOBAL_DNA, STYLE_PRESET_DNA, STYLE_PRESET_MAP } from "../src/modules/studio/registry/dna";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

console.log("negative-prompt real-engine test");

// ── photo vs vector global-negative selection ───────────────────────────────
check("photo uses photographic-defect global negative, not universalNegativePrompt", () => {
  const out = buildNegativePrompt("base", "People", "Lineal Color", null, "", "", "photo");
  assert.ok(out.includes("base"), "base included");
  assert.ok(out.includes("watermark, text, logo"), "photo defect token present");
  assert.ok(out.includes("jpeg artifacts"), "photo defect token present");
  assert.ok(!out.includes(GLOBAL_DNA.universalNegativePrompt), "universalNegativePrompt NOT used for photo");
  assert.ok(!out.includes("photographic bokeh"), "bokeh (a photo element) not forbidden for photo");
});

check("vector (non-photo) uses universalNegativePrompt global", () => {
  const out = buildNegativePrompt("base", "Abstract", "Lineal Color", null, "", "", "illustration");
  assert.ok(out.includes(GLOBAL_DNA.universalNegativePrompt), "universalNegativePrompt present for vector");
  assert.ok(!out.includes("jpeg artifacts"), "photo defect token absent for vector");
});

// ── style negative layer for Lineal Color ──────────────────────────────────
check("style negative layer for Lineal Color is appended", () => {
  const out = buildNegativePrompt("base", "Abstract", "Lineal Color", null, "", "", "vector");
  const p = linealColorNegative();
  assert.ok(p.length > 0, "Lineal Color has a non-empty negativePrompt in registry");
  assert.ok(out.includes(p), "style negativePrompt included verbatim");
});

// ── category / CGA / archetype ordering ────────────────────────────────────
check("category hints appear before CGA negatives and people exclusion", () => {
  const out = buildNegativePrompt("base", "Animals", "Lineal Color", { excludesPeople: true }, "cgA_neg", "", "");
  const idxBase = out.indexOf("base");
  const idxGlobal = out.indexOf(GLOBAL_DNA.universalNegativePrompt);
  const idxCat = out.indexOf("deformed animal anatomy"); // Animals category hint
  const idxCga = out.indexOf("cgA_neg");
  const idxPeople = out.indexOf("people, person, human figure");
  assert.ok(idxBase >= 0 && idxGlobal > idxBase, "base < global");
  assert.ok(idxCat > idxGlobal, "category after global");
  assert.ok(idxCga > idxCat, "CGA after category");
  assert.ok(idxPeople > idxCga, "people exclusion after CGA");
});

check("archetype.excludesPeople adds people negative only when true", () => {
  const withPeople = buildNegativePrompt("base", "People", "Lineal Color", { excludesPeople: true }, "", "", "");
  assert.ok(withPeople.includes("people, person, human figure"), "people neg present when excludesPeople");
  const without = buildNegativePrompt("base", "People", "Lineal Color", { excludesPeople: false }, "", "", "");
  assert.ok(!without.includes("human silhouette"), "people neg absent when not excludesPeople");
  const missing = buildNegativePrompt("base", "People", "Lineal Color", null, "", "", "");
  assert.ok(!missing.includes("human silhouette"), "people neg absent when archetype null");
});

// ── no trailing artifacts ──────────────────────────────────────────────────
check("output has no trailing comma/space/join artifacts", () => {
  const cases: Array<[string, string, string, any, string, string, string]> = [
    ["base", "Abstract", "Lineal Color", null, "", "", "vector"],
    ["", "Abstract", "Lineal Color", null, "cga", "", "photo"],
    ["base", "", "", null, "", "", ""],
    ["", "", "", null, "", "", ""],
  ];
  for (const args of cases) {
    const out = buildNegativePrompt(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    assert.ok(!out.endsWith(", "), `no trailing comma-space: ${JSON.stringify(out)}`);
    assert.ok(!out.endsWith(","), `no trailing comma: ${JSON.stringify(out)}`);
    assert.ok(!out.includes(", ,"), `no double comma: ${JSON.stringify(out)}`);
  }
});

// helper: read Lineal Color negativePrompt directly from registry
function linealColorNegative(): string {
  const key = "linealcolor".toLowerCase().replace(/[\s-]+/g, "");
  const preset = (STYLE_PRESET_DNA as any)[STYLE_PRESET_MAP[key]];
  return preset?.negativePrompt || "";
}

console.log(`\n[negative-prompt] all ${checks} checks passed`);
process.exit(0);
