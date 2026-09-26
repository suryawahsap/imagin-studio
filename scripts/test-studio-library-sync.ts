import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dirs } from "../electron/binaries/paths";
import { ackDeletedStudioAssetIds, addLibraryAsset, copyLibraryAsset, deleteLibraryAsset, deleteStudioLibraryAsset, getDeletedStudioAssetIds, getLibrary, initLibrary, upsertStudioLibraryAsset } from "../electron/services/library";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-library-sync-"));
const db = path.join(root, "library.json");
const png1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const png2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nS8AAAAASUVORK5CYII=";
const created = new Set<string>();

try {
  fs.writeFileSync(db, JSON.stringify({ assets: [] }));
  initLibrary(db);
  const first = upsertStudioLibraryAsset({ studioAssetId: "studio.exact:1", dataUrl: png1, name: "One", mimeType: "image/png", outputFormat: "png" });
  const firstPath = path.join(dirs.studio, decodeURIComponent(first.url.split("/").pop()!));
  created.add(firstPath);
  const firstMtime = fs.statSync(firstPath).mtimeMs;
  const same = upsertStudioLibraryAsset({ studioAssetId: "studio.exact:1", dataUrl: png1, name: "Renamed", mimeType: "image/png" });
  assert.equal(same.id, first.id);
  assert.equal(getLibrary().filter(asset => asset.studioAssetId === "studio.exact:1").length, 1);
  assert.equal(fs.statSync(firstPath).mtimeMs, firstMtime, "same hash must not rewrite binary");

  const changed = upsertStudioLibraryAsset({ studioAssetId: "studio.exact:1", dataUrl: png2, name: "Changed" });
  const changedPath = path.join(dirs.studio, decodeURIComponent(changed.url.split("/").pop()!));
  created.add(changedPath);
  assert.equal(changed.id, first.id);
  assert.notEqual(changed.studioContentHash, first.studioContentHash);
  assert.equal(fs.existsSync(firstPath), false, "old binary removed after replacement commit");

  const beforeFailure = { ...changed };
  fs.rmSync(db);
  fs.mkdirSync(db);
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "studio.exact:1", dataUrl: png1, name: "Must fail" }), /EISDIR|directory/i);
  assert.deepEqual(getLibrary().find(asset => asset.studioAssetId === "studio.exact:1"), beforeFailure);
  assert.equal(fs.existsSync(changedPath), true);
  fs.rmSync(db, { recursive: true });
  fs.writeFileSync(db, JSON.stringify({ assets: getLibrary(), deletedStudioAssetIds: [] }));

  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "../bad", dataUrl: png1, name: "bad" }), /Invalid/);
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "valid", dataUrl: "data:image/png;base64,SGVsbG8=", name: "bad" }), /signature/);
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "valid", dataUrl: "https://example.test/a.png", name: "bad" }), /data URL/);
  const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const beforeUnsafeSvgFiles = new Set(fs.readdirSync(dirs.studio));
  const beforeUnsafeSvgRecords = getLibrary().length;
  for (const [id, svg] of [
    ["svg-file", '<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///tmp/a.png"/></svg>'],
    ["svg-remote", '<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="//remote.test/a.svg#x"/></svg>'],
    ["svg-css-url", '<svg xmlns="http://www.w3.org/2000/svg"><style>.x{fill:url(#paint)}</style></svg>'],
    ["svg-import", '<svg xmlns="http://www.w3.org/2000/svg"><style>@IMPORT "theme.css";</style></svg>'],
    ["svg-css-escaped-url", '<svg xmlns="http://www.w3.org/2000/svg"><style>.x{fill:u\\72l(#paint)}</style></svg>'],
    ["svg-inline-style", '<svg xmlns="http://www.w3.org/2000/svg"><path STYLE = "fill:red"/></svg>'],
    ["svg-doctype", '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"></svg>'],
    ["svg-entity", '<svg xmlns="http://www.w3.org/2000/svg"><!ENTITY x "value"></svg>'],
  ] as const) assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: id, dataUrl: svgUrl(svg), name: `${id}.svg` }), /unsafe SVG/);
  assert.equal(getLibrary().length, beforeUnsafeSvgRecords, "unsafe SVG must not create records");
  assert.deepEqual(new Set(fs.readdirSync(dirs.studio)), beforeUnsafeSvgFiles, "unsafe SVG must not create files");
  const validSvg = upsertStudioLibraryAsset({ studioAssetId: "svg-local", dataUrl: svgUrl('<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="p" d="M0 0h1" fill="#fff" stroke="black"/></defs><use href="#p" fill="#fff" stroke="black"/></svg>'), name: "local.svg" });
  created.add(path.join(dirs.studio, decodeURIComponent(validSvg.url.split("/").pop()!)));
  assert.equal(validSvg.mimeType, "image/svg+xml");
  const forged = addLibraryAsset({ id: "forged", name: "forged.png", url: changed.url, type: "IMAGE", sourceModule: "STUDIO", mimeType: "image/png", fileSize: "0 MB", tags: [], studioAssetId: "forged-link" });
  assert.equal(forged.studioAssetId, undefined);
  const copied = copyLibraryAsset(changed.id).asset!;
  created.add(path.join(dirs.studio, decodeURIComponent(copied.url.split("/").pop()!)));
  assert.equal(copied.studioAssetId, undefined);

  assert.equal(deleteStudioLibraryAsset("studio.exact:1").success, true);
  assert.equal(deleteStudioLibraryAsset("studio.exact:1").success, true);
  assert.deepEqual(getDeletedStudioAssetIds(), []);

  const duplicateFiles = ["duplicate-a.png", "duplicate-b.png"].map(name => path.join(dirs.studio, `${process.pid}-${name}`));
  for (const file of duplicateFiles) { fs.writeFileSync(file, Buffer.from(png1.split(",")[1], "base64")); created.add(file); }
  const duplicateAssets = duplicateFiles.map((file, index) => ({
    id: `duplicate-${index}`, type: "IMAGE", name: path.basename(file), url: `/storage/assets/studio/${encodeURIComponent(path.basename(file))}`,
    folder: "storage/assets", sourceModule: "STUDIO", mimeType: "image/png", fileSize: "0.001 MB", tags: [], createdAt: new Date().toISOString(),
    studioAssetId: "duplicate-link", studioSyncVersion: 1, studioContentHash: `${index + 1}`.repeat(64),
  }));
  fs.writeFileSync(db, JSON.stringify({ assets: [...getLibrary(), ...duplicateAssets], deletedStudioAssetIds: [] }));
  initLibrary(db);
  assert.equal(getLibrary().filter(asset => asset.studioAssetId === "duplicate-link").length, 2);
  assert.equal(deleteStudioLibraryAsset("duplicate-link").success, true);
  assert.equal(getLibrary().some(asset => asset.studioAssetId === "duplicate-link"), false);
  assert.ok(duplicateFiles.every(file => !fs.existsSync(file)), "all duplicate linked files must be removed");
  assert.deepEqual(getDeletedStudioAssetIds(), [], "dedicated duplicate delete must not tombstone");

  const linked = upsertStudioLibraryAsset({ studioAssetId: "durable-delete", dataUrl: png1, name: "Delete" });
  created.add(path.join(dirs.studio, decodeURIComponent(linked.url.split("/").pop()!)));
  assert.equal(deleteLibraryAsset(linked.id).studioAssetId, "durable-delete");
  assert.deepEqual(getDeletedStudioAssetIds(), ["durable-delete"]);
  initLibrary(db);
  assert.deepEqual(getDeletedStudioAssetIds(), ["durable-delete"]);
  ackDeletedStudioAssetIds(["not-present"]);
  assert.deepEqual(getDeletedStudioAssetIds(), ["durable-delete"]);
  ackDeletedStudioAssetIds(["durable-delete"]);
  initLibrary(db);
  assert.deepEqual(getDeletedStudioAssetIds(), []);

  const tomb = upsertStudioLibraryAsset({ studioAssetId: "tombstone-race", dataUrl: png1, name: "Race" });
  const tombPath = path.join(dirs.studio, decodeURIComponent(tomb.url.split("/").pop()!));
  created.add(tombPath);
  assert.equal(deleteLibraryAsset(tomb.id).studioAssetId, "tombstone-race");
  assert.deepEqual(getDeletedStudioAssetIds(), ["tombstone-race"]);
  const afterDelete = new Set(fs.readdirSync(dirs.studio));
  const beforeUpsert = getLibrary();
  initLibrary(db);
  assert.deepEqual(getDeletedStudioAssetIds(), ["tombstone-race"], "tombstone survives reload");
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "tombstone-race", dataUrl: png1, name: "Must not resurrect" }), /deleted/);
  assert.deepEqual(getDeletedStudioAssetIds(), ["tombstone-race"], "tombstone not acked by rejected upsert");
  assert.deepEqual(getLibrary(), beforeUpsert, "rejected upsert must not create a record");
  assert.deepEqual(new Set(fs.readdirSync(dirs.studio)), afterDelete, "rejected upsert must not create a file");
  assert.ok(!fs.existsSync(tombPath), "deleted binary stays gone");
  initLibrary(db);
  assert.deepEqual(getDeletedStudioAssetIds(), ["tombstone-race"], "tombstone remains after reload");
  ackDeletedStudioAssetIds(["tombstone-race"]);
  initLibrary(db);
  assert.deepEqual(getDeletedStudioAssetIds(), []);

  assert.equal(deleteLibraryAsset(forged.id).studioAssetId, undefined);
  assert.deepEqual(getDeletedStudioAssetIds(), []);

  // ── Durable denylist: dedicated Studio delete then stale upsert rejects ────
  const dedicated = upsertStudioLibraryAsset({ studioAssetId: "deny-dedicated", dataUrl: png1, name: "Dedicated" });
  created.add(path.join(dirs.studio, decodeURIComponent(dedicated.url.split("/").pop()!)));
  assert.equal(deleteStudioLibraryAsset("deny-dedicated").success, true);
  assert.deepEqual(getDeletedStudioAssetIds(), [], "dedicated delete is NOT queued for renderer notification");
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "deny-dedicated", dataUrl: png1, name: "Must not resurrect" }), /deleted/);
  initLibrary(db);
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "deny-dedicated", dataUrl: png1, name: "Must not resurrect after reload" }), /deleted/, "durable denylist survives reload");

  // ── Durable denylist: generic Gallery delete then ack then stale upsert rejects ──
  const galleryDenied = upsertStudioLibraryAsset({ studioAssetId: "deny-gallery", dataUrl: png1, name: "Gallery" });
  created.add(path.join(dirs.studio, decodeURIComponent(galleryDenied.url.split("/").pop()!)));
  assert.equal(deleteLibraryAsset(galleryDenied.id).studioAssetId, "deny-gallery");
  assert.deepEqual(getDeletedStudioAssetIds(), ["deny-gallery"], "gallery delete queues notification");
  ackDeletedStudioAssetIds(["deny-gallery"]);
  assert.deepEqual(getDeletedStudioAssetIds(), [], "notification acked & cleared from queue");
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "deny-gallery", dataUrl: png1, name: "Must not resurrect after ack" }), /deleted/, "ack must NOT weaken durable denylist");
  initLibrary(db);
  assert.throws(() => upsertStudioLibraryAsset({ studioAssetId: "deny-gallery", dataUrl: png1, name: "Must not resurrect after ack + reload" }), /deleted/, "denylist guard survives ack + reload");

  // ── Valid idempotent metadata update works while record exists ────────────
  const live = upsertStudioLibraryAsset({ studioAssetId: "deny-live", dataUrl: png1, name: "Live" });
  const liveId = live.id;
  created.add(path.join(dirs.studio, decodeURIComponent(live.url.split("/").pop()!)));
  const renamed = upsertStudioLibraryAsset({ studioAssetId: "deny-live", dataUrl: png1, name: "Renamed" });
  assert.equal(renamed.id, liveId, "idempotent metadata update while record exists works");
  assert.equal(getLibrary().filter(a => a.studioAssetId === "deny-live").length, 1, "no duplicate record");

  console.log("studio library sync tests passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  for (const file of created) fs.rmSync(file, { force: true });
}
