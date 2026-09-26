import assert from "node:assert/strict";
import { validateImportedJSON, resolvePromptDefaults } from "../src/modules/studio/engines/batch";
import { CUSTOM_TEMPLATE_JSON } from "../src/modules/studio/engines/import-engine";

// ── Helper: valid base batch (illustration + icon-free) ────────────────────
const validBatch = {
  batch_name: "test_batch",
  prompts: [
    {
      prompt: "A red apple on a white background",
      assetType: "vector",
      style: "Flat Commercial",
      adobeCategory: "Business",
    },
  ],
};

// validateImportedJSON: valid batch passes (no errors, no blocking warnings).
{
  const r = validateImportedJSON(validBatch);
  assert.equal(r.valid, true, "valid batch passes");
  assert.deepEqual(r.errors, []);
}

// Missing batch_name → error.
{
  const r = validateImportedJSON({ prompts: validBatch.prompts });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("batch_name")), "missing batch_name errors");
}

// >200 prompts → error.
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: Array.from({ length: 201 }, (_, i) => ({ prompt: `p ${i}` })),
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("200")), ">200 prompts errors");
}

// Empty prompt → error.
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "   " }],
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("prompt")), "empty prompt errors");
}

// Invalid adobeCategory → error.
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", adobeCategory: "Not A Real Category" }],
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("adobeCategory")), "invalid adobeCategory errors");
}

// iconMode without iconStyle → error.
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", iconMode: true }],
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("iconStyle")), "iconMode w/o iconStyle errors");
}

// iconStyle without iconMode → warning (still valid).
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", iconStyle: "flat" }],
  });
  assert.equal(r.valid, true, "iconStyle w/o iconMode is not an error");
  assert.ok(r.warnings.some(w => w.includes("iconStyle") && w.includes("iconMode")), "iconStyle w/o iconMode warns");
}

// Invalid iconGenerationMode (e.g. "grid") when iconMode active → error.
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "grid" }],
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("iconGenerationMode") && e.includes("grid")), "invalid iconGenerationMode errors");
}

// iconGenerationMode set without iconMode → warning (ignored).
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", iconGenerationMode: "sheet" }],
  });
  assert.equal(r.valid, true);
  assert.ok(r.warnings.some(w => w.includes("iconGenerationMode")), "iconGenerationMode w/o iconMode warns");
}

// Invalid sheet iconQuantity (3 or 10) → error.
{
  const base = { batch_name: "x", prompts: [{ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "sheet" }] };
  for (const qty of [3, 10]) {
    const r = validateImportedJSON({ ...base, prompts: [{ ...base.prompts[0], iconQuantity: qty }] });
    assert.equal(r.valid, false, `sheet qty ${qty} should error`);
    assert.ok(r.errors.some(e => e.includes("iconQuantity")), `sheet qty ${qty} error message`);
  }
}

// Valid sheet quantities pass (4, 9, 25).
{
  for (const qty of [4, 9, 25]) {
    const r = validateImportedJSON({
      batch_name: "x",
      prompts: [{ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "sheet", iconQuantity: qty }],
    });
    assert.equal(r.valid, true, `sheet qty ${qty} should pass`);
  }
}

// Valid per_canvas quantity passes (any >=1, e.g. 3).
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "per_canvas", iconQuantity: 3 }],
  });
  assert.equal(r.valid, true, "per_canvas qty 3 passes");
}

// photo + iconMode → error.
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", assetType: "photo", iconMode: true, iconStyle: "flat" }],
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("photo")), "photo + iconMode errors");
}

// Custom style → warning (still valid).
{
  const r = validateImportedJSON({
    batch_name: "x",
    prompts: [{ prompt: "p", style: "Totally Custom Style XYZ" }],
  });
  assert.equal(r.valid, true);
  assert.ok(r.warnings.some(w => w.includes("custom style")), "custom style warns");
}

// ── resolvePromptDefaults ──────────────────────────────────────────────────
// Invalid iconGenerationMode with iconMode active → defaults to per_canvas.
{
  const d = resolvePromptDefaults({ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "grid" });
  assert.equal(d.iconGenerationMode, "per_canvas", "invalid mode → per_canvas");
}

// sheet with invalid qty → clamped to 6.
{
  const d = resolvePromptDefaults({ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "sheet", iconQuantity: 3 });
  assert.equal(d.iconGenerationMode, "sheet");
  assert.equal(d.iconQuantity, 6, "invalid sheet qty clamps to 6");
}

// sheet with valid qty (9) preserved.
{
  const d = resolvePromptDefaults({ prompt: "p", iconMode: true, iconStyle: "flat", iconGenerationMode: "sheet", iconQuantity: 9 });
  assert.equal(d.iconQuantity, 9, "valid sheet qty preserved");
}

// Defaults inheritance works.
{
  const d = resolvePromptDefaults(
    { prompt: "p" },
    { assetType: "3d", iconMode: true, iconStyle: "flat", iconGenerationMode: "sheet", iconQuantity: 16 },
  );
  assert.equal(d.assetType, "3d", "assetType from defaults");
  assert.equal(d.iconMode, true, "iconMode from defaults");
  assert.equal(d.iconGenerationMode, "sheet", "iconGenerationMode from defaults");
  assert.equal(d.iconQuantity, 16, "iconQuantity from defaults preserved");
}

// photo + white/transparent BG → warning (still valid, forced to scene).
{
  for (const bg of ["white", "transparent"]) {
    const r = validateImportedJSON({
      batch_name: "x",
      prompts: [{ prompt: "p", assetType: "photo", background: bg }],
    });
    assert.equal(r.valid, true, `photo + ${bg} is not an error`);
    assert.ok(r.warnings.some(w => w.includes("photo") && w.includes(bg)), `photo + ${bg} warns`);
  }
}

// Invalid platformCategoryId → no error; category falls back to Business.
{
  const d = resolvePromptDefaults({ prompt: "p", platformCategoryId: 9999 });
  assert.equal(d.adobeCategory, "Business", "invalid platformCategoryId falls back to Business");
}

// ── Template fix ───────────────────────────────────────────────────────────
// Christmas icon item uses platformCategoryId 9 (Christmas & Winter).
{
  const icon = CUSTOM_TEMPLATE_JSON.prompts.find((p: any) => p.prompt.includes("Christmas"));
  assert.ok(icon, "template has Christmas icon prompt");
  assert.equal(icon.platformCategoryId, 9, "Christmas icon platformCategoryId is 9, not 15");
  assert.equal(icon.subcategory, "Christmas & Winter");
}

console.log("JSON import tests passed");
