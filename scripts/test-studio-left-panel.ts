import assert from "node:assert/strict";
import { deriveGenerationEligibility, nextFocusIndex } from "../src/modules/studio/ui/screen/StudioLeftPanel";
import { selectGenerationDispatch } from "../src/modules/studio/flows/generationFlow";

// ── Finding 3: imported valid batch generates WITHOUT an unrelated single prompt ──
// An imported valid batch (status ready, prompts present) must satisfy the
// prompt/category gates from its own data. The single-prompt safety requirements
// must remain untouched for the manual path.

const readyBatch = {
  id: "b1",
  status: "ready",
  prompts: [{ prompt: "A red apple on a white background" }],
  totalPrompts: 1,
};

const emptySingleState = {
  singlePromptInput: "",
  platformCategoryId: null,
};

// Valid imported batch in Batch mode + no single prompt + no category + safe safety.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "json",
    importedBatch: readyBatch,
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.batchGeneratable, true, "valid ready batch is generatable");
  assert.equal(r.canGenerate, true, "batch can generate without a single prompt");
}

// Paused batch is still resumable and does not require a single prompt.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "json",
    importedBatch: { ...readyBatch, status: "paused" },
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, true, "paused batch is generatable");
}

// Empty batch is not generatable, and does not relax the single-prompt gates.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "json",
    importedBatch: { id: "b2", status: "ready", prompts: [], totalPrompts: 0 },
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.batchGeneratable, false, "empty batch is not generatable");
  assert.equal(r.canGenerate, false, "empty batch + no single prompt cannot generate");
}

// Missing API key still blocks even a valid batch.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "json",
    importedBatch: readyBatch,
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: false,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, false, "batch requires provider key");
}

// In-flight render still blocks even a valid batch.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "json",
    importedBatch: readyBatch,
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: true,
  });
  assert.equal(r.canGenerate, false, "batch blocked while rendering");
}

// ── Regression: retained ready batch while Single mode is active ──
// A valid "ready" batch may still be retained in state after the user switches
// back to Single Prompt (the switch dialog is dismissible). Single mode must
// IGNORE that batch entirely and fall back to its own prompt/safety/category
// gates — otherwise the generate button silently runs the old batch.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: readyBatch,
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.batchActive, false, "single mode deactivates batch eligibility");
  assert.equal(r.batchGeneratable, false, "retained ready batch is ignored in single mode");
  assert.equal(r.promptReady, false, "single mode requires its own prompt");
  assert.equal(r.categoryReady, false, "single mode requires its own category");
  assert.equal(r.canGenerate, false, "retained ready batch cannot satisfy single mode");
}

// Same retained batch is ignored even when it is paused while Single is active.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: { ...readyBatch, status: "paused" },
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.batchGeneratable, false, "paused retained batch is ignored in single mode");
  assert.equal(r.canGenerate, false, "paused retained batch cannot satisfy single mode");
}

// Single mode with its own valid prompt/category still generates alongside a
// retained batch (batch must not corrupt nor block the manual path).
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: readyBatch,
    vectorState: { singlePromptInput: "surf van", platformCategoryId: 20 },
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.batchGeneratable, false, "retained batch still ignored in single mode");
  assert.equal(r.canGenerate, true, "single prompt generates despite retained batch");
}

// Batch mode ignores the single prompt: only batch data gates eligibility.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "json",
    importedBatch: readyBatch,
    vectorState: { singlePromptInput: "   ", platformCategoryId: null },
    promptSafety: { safe: false, warnings: ["blocked term"] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, true, "batch mode uses batch eligibility, not single fields");
}

// ── Single-prompt path: existing safety requirements preserved ──
// Prompt + category + safe + key → eligible.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: null,
    vectorState: { singlePromptInput: "surf van", platformCategoryId: 20 },
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, true, "safe single prompt with category generates");
}

// Unsafe prompt blocks.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: null,
    vectorState: { singlePromptInput: "surf van", platformCategoryId: 20 },
    promptSafety: { safe: false, warnings: ["blocked term"] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, false, "unsafe single prompt is blocked");
}

// Missing category blocks.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: null,
    vectorState: { singlePromptInput: "surf van", platformCategoryId: null },
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, false, "missing category blocks single prompt");
}

// Empty/whitespace prompt blocks.
{
  const r = deriveGenerationEligibility({
    masterPromptMode: "single",
    importedBatch: null,
    vectorState: { singlePromptInput: "   ", platformCategoryId: 20 },
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  });
  assert.equal(r.canGenerate, false, "whitespace-only prompt is blocked");
}

// ── Dispatch selection (execution path, not just eligibility) ──
// Eligibility alone is insufficient: the old — and still reachable — bug was
// that executeGenerateAssets dispatched on importedBatch.status even while
// Single mode was active. selectGenerationDispatch is the single dispatch
// decision the executor consumes, so regress it directly.
{
  // Single mode with a retained usable batch MUST take the single path.
  assert.equal(
    selectGenerationDispatch({ masterPromptMode: "single", importedBatch: readyBatch }),
    "single",
    "single mode ignores retained ready batch → single path",
  );
  assert.equal(
    selectGenerationDispatch({ masterPromptMode: "single", importedBatch: { ...readyBatch, status: "paused" } }),
    "single",
    "single mode ignores retained paused batch → single path",
  );

  // JSON mode with a usable batch takes the batch path.
  assert.equal(
    selectGenerationDispatch({ masterPromptMode: "json", importedBatch: readyBatch }),
    "json",
    "json mode with valid batch → batch path",
  );
  assert.equal(
    selectGenerationDispatch({ masterPromptMode: "json", importedBatch: { ...readyBatch, status: "paused" } }),
    "json",
    "json mode with paused batch → batch path (resume)",
  );

  // JSON mode must not run an unusable batch; it falls to single path.
  assert.equal(
    selectGenerationDispatch({ masterPromptMode: "json", importedBatch: { id: "b", status: "ready", prompts: [] } }),
    "single",
    "json mode with empty batch → single path",
  );
  assert.equal(
    selectGenerationDispatch({ masterPromptMode: "json", importedBatch: null }),
    "single",
    "json mode without batch → single path",
  );

  // Legacy no-mode callers preserve historical dispatch (batch save/restore,
  // resume call sites) so none of them change behavior.
  assert.equal(
    selectGenerationDispatch({ importedBatch: readyBatch }),
    "json",
    "no explicit mode + usable batch preserves legacy batch dispatch",
  );
  assert.equal(
    selectGenerationDispatch({ importedBatch: null }),
    "single",
    "no explicit mode + no batch → single path",
  );
}

// Both derivations agree on the same single-mode scenario: eligibility blocks
// the retained batch AND dispatch refuses it — no silent batch execution.
{
  const params = {
    masterPromptMode: "single",
    importedBatch: readyBatch,
    vectorState: emptySingleState,
    promptSafety: { safe: true, warnings: [] },
    hasProviderKey: true,
    isRenderingAssets: false,
  };
  assert.equal(deriveGenerationEligibility(params).canGenerate, false, "single mode blocks retained batch");
  assert.equal(selectGenerationDispatch(params), "single", "single mode execution dispatch refuses retained batch");
}

// ── Batch-to-Single modal focus cycle (pure helper) ──
// Tab moves forward and wraps; Shift+Tab moves backward and wraps; an empty
// dialog or out-of-range index resolves safely and never divides by zero.
{
  assert.equal(nextFocusIndex(0, 3, false), 1, "Tab moves forward");
  assert.equal(nextFocusIndex(1, 3, false), 2, "Tab continues forward");
  assert.equal(nextFocusIndex(2, 3, false), 0, "Tab wraps from last to first");
  assert.equal(nextFocusIndex(0, 3, true), 2, "Shift+Tab wraps from first to last");
  assert.equal(nextFocusIndex(2, 3, true), 1, "Shift+Tab moves backward");
  assert.equal(nextFocusIndex(-1, 3, false), 0, "unknown index + Tab focuses first");
  assert.equal(nextFocusIndex(-1, 3, true), 2, "unknown index + Shift+Tab focuses last");
  assert.equal(nextFocusIndex(5, 3, false), 0, "out-of-range index + Tab focuses first");
  assert.equal(nextFocusIndex(5, 3, true), 2, "out-of-range index + Shift+Tab focuses last");
  assert.equal(nextFocusIndex(0, 0, false), -1, "no focusable elements yields -1");
  assert.equal(nextFocusIndex(0, 1, false), 0, "single element cycles to itself");
  assert.equal(nextFocusIndex(0, 1, true), 0, "single element cycles to itself (shift)");
}

console.log("StudioLeftPanel eligibility + dispatch + focus-trap tests passed");
