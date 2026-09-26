// Delete-all contract: deleting every asset (incl. studio-linked, missing-file,
// weird-fileSize) must not throw and must leave a consistent DB.
// Redesign adds an integrity scan: assets whose files are missing on disk are
// dropped at add time — pinned here too.
// Run: npx tsx scripts/test-library-delete-all.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initLibrary, addLibraryAsset, deleteLibraryAsset, getLibrary, getStorage } from "../electron/services/library";
import { dirs } from "../electron/binaries/paths";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "delete-all-"));
const dbPath = path.join(tmpDir, "library-db.json");
initLibrary(dbPath);
// initLibrary intentionally scans shared storage — assert relative to that baseline.
const baseCount = getLibrary().length;
const usedBase = getStorage().used;

const img1 = path.join(dirs.images, `delete-all-${process.pid}-1.png`);
const img2 = path.join(dirs.images, `delete-all-${process.pid}-2.png`);
fs.writeFileSync(img1, "x");
fs.writeFileSync(img2, "x");

const da1 = addLibraryAsset({ id: "da-1", type: "IMAGE", name: "a.png", url: `/storage/assets/images/${path.basename(img1)}`, folder: "t", sourceModule: "IMPORT", mimeType: "image/png", fileSize: "0.3 MB", tags: [], studioAssetId: "studio-x" }).id;
const da2 = addLibraryAsset({ id: "da-2", type: "IMAGE", name: "b.png", url: `/storage/assets/images/${path.basename(img2)}`, folder: "t", sourceModule: "IMPORT", mimeType: "image/png", fileSize: "not-a-number", tags: [] }).id;
addLibraryAsset({ id: "da-3", type: "VECTOR", name: "c.svg", url: "/storage/assets/vectors/none.svg", folder: "t", sourceModule: "VECTOR", mimeType: "image/svg+xml", fileSize: "1 KB", tags: [], thumbnailUrl: "/storage/assets/images/none2.png" });

// da-3 has no file on disk -> integrity scan drops it at add time.
const present = getLibrary().filter((a) => a.id.startsWith("da-")).map((a) => a.id).sort();
assert.deepEqual(present, ["da-1", "da-2"], "missing-file assets must not enter the library");

assert.equal(deleteLibraryAsset(da1).success, true, "delete da-1 must succeed");
assert.equal(deleteLibraryAsset(da2).success, true, "delete da-2 must succeed");
assert.equal(deleteLibraryAsset("da-3").success, false, "delete of dropped asset reports not-found without throwing");

assert.equal(getLibrary().length, baseCount, "library must return to pre-seed size after delete-all");
const info = getStorage();
assert.ok(info && info.used >= 0, "storage info must remain valid");
assert.equal(fs.existsSync(img1), false, "asset file must be unlinked");
assert.equal(fs.existsSync(img2), false, "asset file must be unlinked");

initLibrary(dbPath);
assert.equal(getLibrary().length, baseCount, "reloaded library must stay consistent");
assert.ok(Math.abs(getStorage().used - usedBase) < 0.001, `storageUsed must return to baseline after deleting all, got ${getStorage().used} vs ${usedBase}`);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log("✓ delete-all leaves a consistent library (missing-file assets dropped at add)");
