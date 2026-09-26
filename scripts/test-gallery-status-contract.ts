// Contract check: stockMetadata roundtrip through library service + CanvasView header slimming.
// (Legacy GaleryWorkspace/GaleryMetadataModal/AnimationModule assertions removed — those
// components were replaced by src/components/gallery/** and src/components/remotion/**.)
// Run: npx tsx scripts/test-gallery-status-contract.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initLibrary, addLibraryAsset, updateLibraryAsset, getLibrary } from "../electron/services/library";
import { dirs } from "../electron/binaries/paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "..", rel), "utf-8");

// stockMetadata survives normalizeAsset (real test via addLibraryAsset + reload)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-status-"));
const dbPath = path.join(tmpDir, "library.json");
const testFile = path.join(dirs.images, `gallery-status-test-${process.pid}.webp`);
fs.writeFileSync(testFile, "test");
const testUrl = `/storage/assets/images/${path.basename(testFile)}`;
initLibrary(dbPath);
const added = addLibraryAsset({ id: "gallery-status-1", type: "IMAGE", name: "test.webp", url: testUrl, folder: "test", sourceModule: "SYSTEM", mimeType: "image/webp", fileSize: "0.1 MB", tags: [] });
const meta = { title: "Test Title", description: "Test desc", keywords: ["test"], stockCategory: "Abstract" };
const updated = updateLibraryAsset("gallery-status-1", { stockMetadata: meta, status: "Ready" });
assert.equal(updated.success, true, "updateLibraryAsset must succeed");
assert.equal(updated.asset?.status, "Ready", "status must be Ready");
assert.deepEqual(updated.asset?.stockMetadata, meta, "stockMetadata must survive normalizeAsset roundtrip");
// Reload from DB to verify persistence
initLibrary(dbPath);
const reloaded = getLibrary().find(a => a.id === "gallery-status-1");
assert.ok(reloaded, "asset must exist after reload");
assert.deepEqual(reloaded.stockMetadata, meta, "stockMetadata must survive DB reload");
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.unlinkSync(testFile);
console.log("✓ stockMetadata survives normalizeAsset");

// Gallery bulk actions now live in the more-actions menu.
const canvasView = read("src/modules/studio/ui/components/CanvasView.tsx");
assert.doesNotMatch(canvasView, /Pilih yang siap upload/);
assert.match(canvasView, /Export CSV/);
// Keep bulk-delete wiring (labels redesigned away, handlers must survive)
assert.match(canvasView, /handleBulkDelete/);
assert.match(canvasView, /deleteOldDrafts/);

console.log("✓ test-gallery-status-contract passed");
