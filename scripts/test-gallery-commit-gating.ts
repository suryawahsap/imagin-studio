import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isFinalSaveCommitted } from "../src/modules/studio/engines/library-sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Pure isFinalSaveCommitted contract ──
assert.equal(isFinalSaveCommitted({ success: true, synced: true }), true, "canonical commit accepted");
assert.equal(isFinalSaveCommitted({ success: true, synced: false }), true, "local-only renderer mode accepted (success:true)");
assert.equal(isFinalSaveCommitted({ success: false, synced: false }), false, "failed commit rejected");
assert.equal(isFinalSaveCommitted(null), false, "null rejected");
assert.equal(isFinalSaveCommitted(undefined), false, "undefined rejected");
console.log("✓ isFinalSaveCommitted contract passes");

// ── Helper: assert fragments appear in order in source text ──
function assertFragmentOrder(text: string, fragments: string[], message: string) {
  let idx = 0;
  for (const frag of fragments) {
    const pos = text.indexOf(frag, idx);
    if (pos === -1) {
      throw new assert.AssertionError({
        message: `${message}: missing fragment "${frag}" after position ${idx}`,
        expected: true,
        actual: false,
      });
    }
    idx = pos + frag.length;
  }
}

// ── Source contract: read files and verify ordering of guard and state update ──
const rootDir = path.join(__dirname, "..", "src", "modules", "studio");

function readFile(relative: string): string {
  const full = path.join(rootDir, relative);
  return fs.readFileSync(full, "utf8");
}

// importFlow.ts: handleImportImageSelected
const importFlow = readFile("flows/importFlow.ts");
const importFlowFrags = [
  "const saveResult = await saveAssetDB(importedAsset);",
  "if (!saveResult.success) {",
  "skipped++;",
  "continue;",
  "}",
  "importedAssets.push(importedAsset);",
];
assertFragmentOrder(importFlow, importFlowFrags, "importFlow: guard then push order");
console.log("✓ importFlow: guard present and push after guard");

// saveRevisedAsset
const assetActions = readFile("flows/assetActionsFlow.ts");
const revisedFrags = [
  "const saveResult = await saveAssetDB(newAsset);",
  "if (!saveResult.success) {",
  "showToast('Gagal menyimpan revisi: ' + (saveResult.detail || 'unknown error'), 'error');",
  "return;",
  "}",
  "await addHistory(`Saved revised asset: ${revisionState.instruction}`, { setHistoryLogs });",
  "setAssets(prev => [...prev, newAsset]);",
  "showToast(\"Revised asset saved to library!\", \"success\");",
  "setRevisionState({ isOpen: false, asset: null, instruction: '', editMode: 'repaint', isRevising: false, revisedImageUrl: null });",
];
assertFragmentOrder(assetActions, revisedFrags, "saveRevisedAsset: guard and success flow");
console.log("✓ saveRevisedAsset: guard present");

// saveObjectModVariant - overwrite and new branches
// Overwrite branch
const overwriteFrags = [
  "if (saveMode === 'overwrite') {",
  "const updatedAsset = { ...asset, url: finalized.dataUrl, svgUrls: undefined, svgStats: undefined, resolutionTarget: undefined, assembledPrompt: `[Object Modifier / ${editMode}] ${instruction}`, status: asset.status === 'ready' ? 'needs_review' : asset.status, resolution };",
  "const saveResult = await saveAssetDB(updatedAsset);",
  "if (!saveResult.success) {",
  "showToast('Gagal menimpa aset: ' + (saveResult.detail || 'unknown error'), 'error');",
  "return;",
  "}",
  "await addHistory(`Overwrite object-modifier asset: ${instruction}`, { setHistoryLogs });",
  "setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));",
  "showToast('Aset berhasil ditimpa dengan hasil edit! ✓', 'success');",
];
assertFragmentOrder(assetActions, overwriteFrags, "saveObjectModVariant overwrite: guard and success flow");

// New branch
const newFrags = [
  "else {",
  "const newAsset = {",
  "...asset, id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, title: '', url: finalized.dataUrl,",
  "svgUrls: undefined, svgStats: undefined, createdAt: Date.now(), assembledPrompt: `[Object Modifier / ${editMode}] ${instruction}`,",
  "status: 'draft', generationMode: 'object-modifier', resolutionTarget: undefined, resolution,",
  "stockMetadata: createDraftStockMetadata({ assetType: asset.assetType, background: asset.background, outputFormat: asset.outputFormat, stockCategory: asset.adobeCategory, subcategory: asset.subcategory }),",
  "};",
  "const saveResult = await saveAssetDB(newAsset);",
  "if (!saveResult.success) {",
  "showToast('Gagal menyimpan aset baru: ' + (saveResult.detail || 'unknown error'), 'error');",
  "return;",
  "}",
  "await addHistory(`Saved object-modifier asset: ${instruction}`, { setHistoryLogs });",
  "setAssets(prev => [...prev, newAsset]);",
  "showToast('Aset baru berhasil disimpan ke library! ✓', 'success');",
];
assertFragmentOrder(assetActions, newFrags, "saveObjectModVariant new: guard and success flow");
console.log("✓ saveObjectModVariant: guards present");

// revision.ts: autoRegenerateAsset
const revision = readFile("engines/revision.ts");
const revisionFrags = [
  "const saveResult = await saveAssetDB(regenerated);",
  "if (!saveResult.success) {",
  "console.warn(`[Imagin] Auto-regeneration save failed for asset ${asset.id}`);",
  "return { ok: false, reason: \"save_failed\" };",
  "}",
  "setAssets((prev: any[]) => prev.map(a => a.id === asset.id ? regenerated : a));",
  "console.warn(`[Imagin] Auto-regeneration attempt ${attempt} untuk asset ${asset.id} (${reinforcedPrompt.slice(0, 80)}…)`);",
  "return { ok: true, asset: regenerated };",
];
assertFragmentOrder(revision, revisionFrags, "autoRegenerateAsset: guard and ok true after success");
console.log("✓ autoRegenerateAsset: guard present");

// importFlow.ts: importAllData restoration with success counting and loadStudioAssets
const importFlowAfter = readFile("flows/importFlow.ts");
const importAllDataFrags = [
  "const result = await saveAssetDB(asset);",
  "if (result.success) restoredCount++;",
  "else skippedCount++;",
  "const { assets, status } = await loadStudioAssets();",
  "if (status !== 'unavailable') ctx.setAssets(assets);",
  "status === 'unavailable'",
  "Gallery belum dapat dimuat.",
  "Import selesai: ${restoredCount} asset dipulihkan",
];
assertFragmentOrder(importFlowAfter, importAllDataFrags, "importAllData: success counting and loadStudioAssets");
console.log("✓ importAllData: success counting and reload via loadStudioAssets");

// animation-v2.ts: saveAnimV2ToAsset throws on failure
const animV2 = readFile("engines/animation-v2.ts");
const saveAnimFrags = [
  "const saveResult = await saveAssetDB(updated);",
  "if (!saveResult.success) {",
  "throw new Error('Failed to save animation to gallery: ' + (saveResult.detail || 'unknown error'));",
  "}",
  "setAssets((prev: any[]) => prev.map((a: any) => a.id === updated.id ? updated : a));",
];
assertFragmentOrder(animV2, saveAnimFrags, "saveAnimV2ToAsset: guard and throw");
console.log("✓ saveAnimV2ToAsset: guard and throw");

console.log("✓ All gallery commit gating source contract tests passed");
