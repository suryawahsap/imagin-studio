import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dirs } from "../electron/binaries/paths";
import { addLibraryAsset, getLibrary, initLibrary, updateLibraryAsset, upsertStudioLibraryAsset } from "../electron/services/library";

// Asset status foundation: default "Raw", set at creation by pipelines,
// patchable via updateLibraryAsset, invalid/missing values normalize to "Raw".
const root = fs.mkdtempSync(path.join(os.tmpdir(), "asset-status-"));
const db = path.join(root, "library.json");

try {
  const file = path.join(dirs.images, `status-${process.pid}.webp`);
  fs.writeFileSync(file, "status");
  const url = `/storage/assets/images/${path.basename(file)}`;
  const base = { id: "status-a", type: "IMAGE" as const, name: path.basename(file), url, folder: "test", sourceModule: "SYSTEM" as const, mimeType: "image/webp", fileSize: "0.1 MB", tags: [] };

  // No status at creation -> "Raw"
  initLibrary(db);
  const raw = addLibraryAsset({ ...base, id: "status-raw" });
  assert.equal(raw.status, "Raw");

  // Pipeline-style creation passes valid status through
  assert.equal(addLibraryAsset({ ...base, id: "status-vec", status: "Vectorized" }).status, "Vectorized");
  assert.equal(addLibraryAsset({ ...base, id: "status-ups", status: "Upscaled" }).status, "Upscaled");

  // updateLibraryAsset patches status via the existing update path
  const patched = updateLibraryAsset("status-raw", { status: "Ready" });
  assert.equal(patched.success, true);
  assert.equal(patched.asset?.status, "Ready");
  assert.equal(getLibrary().find(a => a.id === "status-raw")?.status, "Ready");

  // A status-only patch on an existing asset must not regress it
  const nameOnly = updateLibraryAsset("status-raw", { name: "renamed.webp" });
  assert.equal(nameOnly.success, true);
  assert.equal(nameOnly.asset?.status, "Ready", "status-only merge must preserve existing status");

  // Invalid status value normalizes to "Raw"
  const bogus = updateLibraryAsset("status-raw", { status: "Bogus" });
  assert.equal(bogus.asset?.status, "Raw");

  // Migration: legacy record without status loads as "Raw"; one with status is preserved
  const db2 = path.join(root, "migrate.json");
  fs.writeFileSync(db2, JSON.stringify({ assets: [
    { id: "legacy", url, type: "IMAGE", sourceModule: "SYSTEM", fileSize: "0.1 MB" },
    { ...base, id: "ready", status: "Ready", createdAt: new Date().toISOString() },
  ] }));
  initLibrary(db2);
  assert.equal(getLibrary().find(a => a.id === "legacy")?.status, "Raw");
  assert.equal(getLibrary().find(a => a.id === "ready")?.status, "Ready");

  // Studio re-upsert of an existing linked asset must not regress status -> "Raw"
  const db3 = path.join(root, "studio.json");
  const studioRecord = {
    ...base,
    id: "studio-linked",
    createdAt: new Date().toISOString(),
    studioAssetId: "studio-preserve",
    studioSyncVersion: 1,
    studioContentHash: "c".repeat(64),
    mimeType: "image/png",
    url: "/storage/assets/images/status-studio.png",
    fileSize: "0.100 MB",
    status: "Ready",
  };
  fs.writeFileSync(db3, JSON.stringify({ assets: [studioRecord] }));
  initLibrary(db3);
  const relinked = upsertStudioLibraryAsset({ studioAssetId: "studio-preserve", name: "relinked.png" });
  assert.equal(relinked.status, "Ready", "re-upsert must carry prior status forward");
  assert.equal(relinked.studioAssetId, "studio-preserve");

  console.log("asset status tests passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  for (const file of fs.readdirSync(dirs.images).filter(f => f.startsWith(`status-${process.pid}`))) fs.rmSync(path.join(dirs.images, file), { force: true });
}
