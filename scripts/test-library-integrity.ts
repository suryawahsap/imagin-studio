import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dirs } from "../electron/binaries/paths";
import { addLibraryAsset, copyLibraryAsset, deleteLibraryAsset, getLibrary, initLibrary, rescanLibrary, setOutputFolder, updateLibraryAsset } from "../electron/services/library";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "library-integrity-"));
const db = path.join(root, "library.json");
const legacyFile = path.join(dirs.images, `integrity-${process.pid}.webp`);
const badFile = path.join(dirs.images, `integrity-bad-${process.pid}.png`);

try {
  fs.writeFileSync(legacyFile, "legacy");
  fs.writeFileSync(badFile, "bad");
  const legacyUrl = `/storage/assets/images/${path.basename(legacyFile)}`;
  const badUrl = `/storage/assets/images/${path.basename(badFile)}`;
  fs.writeFileSync(db, JSON.stringify({ assets: [
    { id: "legacy", url: legacyUrl, type: "IMAGE", sourceModule: "SYSTEM", fileSize: "0.1 MB" },
    { id: "bad", url: badUrl, type: "STRANGE", sourceModule: "UNKNOWN", huge: "x".repeat(20000) },
  ] }));

  initLibrary(db);
  const legacy = getLibrary().find(asset => asset.id === "legacy");
  assert.ok(legacy);
  assert.equal(legacy.name, path.basename(legacyFile));
  assert.equal(legacy.mimeType, "image/webp");
  assert.deepEqual(legacy.tags, []);
  assert.ok(Number.isFinite(Date.parse(legacy.createdAt)));
  assert.equal(fs.existsSync(badFile), true, "quarantine must not delete files");

  rescanLibrary();
  const persisted = JSON.parse(fs.readFileSync(db, "utf8"));
  assert.equal(persisted.assets.filter((asset: any) => asset.url === badUrl).length, 0, "scanner must not recreate quarantined URL");
  assert.equal(persisted.quarantinedAssets.length, 1);
  assert.equal(JSON.stringify(persisted.quarantinedAssets[0]).length < 17000, true);
  assert.deepEqual(persisted.deletedStudioAssetIds, []);

  const forged = addLibraryAsset({ id: "forged", type: "IMAGE", name: path.basename(legacyFile), url: legacyUrl, folder: "test", sourceModule: "SYSTEM", mimeType: "image/webp", fileSize: "0.1 MB", tags: [], studioAssetId: "fake", studioSyncVersion: 1, studioContentHash: "a".repeat(64) });
  assert.equal(forged.studioAssetId, undefined);
  assert.equal(updateLibraryAsset(forged.id, { studioAssetId: "fake", studioSyncVersion: 1, studioContentHash: "b".repeat(64) }).asset?.studioAssetId, undefined);
  assert.throws(() => addLibraryAsset({ id: "invalid", type: "IMAGE", name: "bad", url: "javascript:bad", folder: "test", sourceModule: "SYSTEM", mimeType: "image/png", fileSize: "0 MB", tags: [] }), /Invalid library asset/);
  assert.equal(updateLibraryAsset(forged.id, { url: "file:///bad" }).success, false);
  assert.throws(() => addLibraryAsset({ id: "image-mp4", type: "IMAGE", name: "bad.mp4", url: "/storage/assets/videos/bad.mp4", folder: "test", sourceModule: "SYSTEM", mimeType: "image/png", fileSize: "0 MB", tags: [] }), /Invalid library asset/);
  const canonical = addLibraryAsset({ id: "canonical-mime", type: "IMAGE", name: "wrong.png", url: "/storage/assets/images/wrong.png", folder: "test", sourceModule: "SYSTEM", mimeType: "video/mp4", fileSize: "0 MB", tags: [] });
  assert.equal(canonical.mimeType, "image/png");
  assert.equal(addLibraryAsset({ id: "animated-gif", type: "ANIMATION", name: "a.gif", url: "/storage/assets/images/a.gif", folder: "test", sourceModule: "ANIMATION", mimeType: "image/gif", fileSize: "0 MB", tags: [] }).type, "ANIMATION");
  assert.equal(addLibraryAsset({ id: "animated-video", type: "ANIMATION", name: "a.mp4", url: "/storage/assets/videos/a.mp4", folder: "test", sourceModule: "ANIMATION", mimeType: "video/mp4", fileSize: "0 MB", tags: [] }).type, "ANIMATION");
  assert.equal(addLibraryAsset({ id: "vector-svg", type: "VECTOR", name: "a.svg", url: "/storage/assets/vectors/a.svg", folder: "test", sourceModule: "VECTOR", mimeType: "text/plain", fileSize: "0 MB", tags: [] }).mimeType, "image/svg+xml");
  assert.equal(updateLibraryAsset(canonical.id, { type: "VIDEO" }).success, false, "update cannot make PNG a VIDEO");

  fs.writeFileSync(db, JSON.stringify({ assets: [{ ...forged, studioAssetId: "studio-1", studioSyncVersion: 1, studioContentHash: "c".repeat(64) }] }));
  initLibrary(db);
  const linked = getLibrary().find(asset => asset.id === forged.id)!;
  assert.equal(linked.studioAssetId, "studio-1");
  const linkedUpdated = updateLibraryAsset(linked.id, { name: "updated", studioAssetId: "forged-change" });
  assert.equal(linkedUpdated.asset?.studioAssetId, "studio-1", "ordinary updates preserve valid internal linkage");
  const copied = copyLibraryAsset(linked.id);
  assert.equal(copied.success, true);
  assert.equal(copied.asset?.studioAssetId, undefined);
  initLibrary(db);
  assert.ok(getLibrary().some(asset => asset.id === copied.asset?.id), "successful persistence must reload");

  fs.writeFileSync(db, JSON.stringify({ assets: [
    { id: "legacy-image-mp4", type: "IMAGE", url: "/storage/assets/videos/bad.mp4", sourceModule: "SYSTEM" },
    { ...forged, id: "valid-after-incompatible", mimeType: "application/bogus" },
  ] }));
  initLibrary(db);
  assert.ok(getLibrary().some(asset => asset.id === "valid-after-incompatible"));
  assert.equal(getLibrary().some(asset => asset.id === "legacy-image-mp4"), false);

  const malformedRecords = Array.from({ length: 250 }, (_, i) => ({ id: `bad-${i}`, url: `/storage/assets/images/quarantined-${String(i).padStart(3, "0")}.png`, type: "STRANGE" }));
  fs.writeFileSync(db, JSON.stringify({ assets: [{ id: "bad-percent", url: "/storage/assets/images/%ZZ.png", type: "IMAGE" }, { ...forged, id: "valid-after-bad" }, ...malformedRecords] }));
  initLibrary(db);
  assert.ok(getLibrary().some(asset => asset.id === "valid-after-bad"), "malformed percent URL must not abort later records");
  rescanLibrary();
  initLibrary(db);
  const quarantineDb = JSON.parse(fs.readFileSync(db, "utf8"));
  assert.equal(quarantineDb.quarantinedAssets.length, 200);
  assert.equal(quarantineDb.quarantinedAssetUrls.length, 250);

  const beforeFailure = getLibrary().map(asset => asset.id);
  fs.rmSync(db);
  fs.mkdirSync(db);
  assert.throws(() => addLibraryAsset({ id: "must-not-commit", type: "IMAGE", name: "x.webp", url: legacyUrl, folder: "test", sourceModule: "SYSTEM", mimeType: "image/webp", fileSize: "0.1 MB", tags: [] }), /EISDIR|directory/i);
  assert.deepEqual(getLibrary().map(asset => asset.id), beforeFailure, "write failure must leave memory unchanged");

  const deleteDb = path.join(root, "delete.json");
  const deleteFile = path.join(dirs.images, `integrity-delete-${process.pid}.png`);
  fs.writeFileSync(deleteFile, "delete");
  const deleteUrl = `/storage/assets/images/${path.basename(deleteFile)}`;
  fs.writeFileSync(deleteDb, JSON.stringify({ assets: [{ id: "delete-me", type: "IMAGE", name: path.basename(deleteFile), url: deleteUrl, folder: "test", sourceModule: "SYSTEM", mimeType: "image/png", fileSize: "0.1 MB", tags: [], createdAt: new Date().toISOString() }] }));
  initLibrary(deleteDb);
  fs.rmSync(deleteDb);
  fs.mkdirSync(deleteDb);
  assert.throws(() => deleteLibraryAsset("delete-me"), /EISDIR|directory/i);
  assert.equal(fs.existsSync(deleteFile), true);
  assert.ok(getLibrary().some(asset => asset.id === "delete-me"));
  fs.rmSync(deleteDb, { recursive: true });
  fs.writeFileSync(deleteDb, JSON.stringify({ assets: getLibrary() }));
  assert.equal(deleteLibraryAsset("delete-me").success, true);
  assert.equal(fs.existsSync(deleteFile), false, "successful delete unlinks only after DB commit");

  fs.rmSync(deleteDb);
  fs.mkdirSync(deleteDb);
  const beforeOutputFailure = getLibrary().map(asset => asset.id);
  assert.throws(() => setOutputFolder("must-not-commit"), /EISDIR|directory/i);
  assert.deepEqual(getLibrary().map(asset => asset.id), beforeOutputFailure);

  console.log("library integrity tests passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(legacyFile, { force: true });
  fs.rmSync(badFile, { force: true });
  for (const file of fs.readdirSync(dirs.images).filter(file => file.startsWith(`integrity-${process.pid}_copy_`))) fs.rmSync(path.join(dirs.images, file), { force: true });
}
