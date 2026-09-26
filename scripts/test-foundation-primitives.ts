import assert from "node:assert/strict";
import { MODULE_ACCENT, MODULE_LABEL, MODULE_WORKSPACE_TITLE, ModuleKey } from "../src/utils/moduleAccent";

console.log("[test] Running foundation token & module metadata tests...");

const expectedModules: ModuleKey[] = ["studio", "upscale", "vectorize", "remotion", "metadata", "gallery"];

// Verify module accent tokens & labels
for (const m of expectedModules) {
  assert.ok(MODULE_ACCENT[m], `Missing MODULE_ACCENT for ${m}`);
  assert.ok(MODULE_LABEL[m], `Missing MODULE_LABEL for ${m}`);
  assert.ok(MODULE_WORKSPACE_TITLE[m], `Missing MODULE_WORKSPACE_TITLE for ${m}`);
}

assert.equal(MODULE_WORKSPACE_TITLE.studio, "AI Generation");
assert.equal(MODULE_WORKSPACE_TITLE.upscale, "Upscale Workspace");
assert.equal(MODULE_WORKSPACE_TITLE.vectorize, "Vectorize Workspace");
assert.equal(MODULE_WORKSPACE_TITLE.remotion, "Remotion Animation");
assert.equal(MODULE_WORKSPACE_TITLE.metadata, "Metadata Workspace");
assert.equal(MODULE_WORKSPACE_TITLE.gallery, "Gallery - Assets");

console.log("[test] FOUNDATION METADATA & ACCENTS OK");
