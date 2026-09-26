// Studio asset lifecycle: Gallery-canonical upsert-first saves, migration
// idempotency, and delete ordering.  Pure/node-testable via the injectable-IO
// seams in library-sync.ts (runSaveAssetDB / migrateCurrentAsset / migrateUnlinked
// / runDeleteAssetLinked) — no window/indexedDB needed.
import assert from "node:assert/strict";
import {
  getUnlinkedEligibleAssets,
  isEligibleForMirror,
  mergeCanonicalAssets,
  migrateCurrentAsset,
  migrateUnlinked,
  runDeleteAssetLinked,
  runSaveAssetDB,
  type DeleteAssetLinkedIO,
  type SaveAssetDBIO,
} from "../src/modules/studio/engines/library-sync";
import type { Asset } from "../src/modules/studio/types";

const base = (over: Partial<Asset> = {}): Asset => ({
  id: "asset_1",
  type: "IMAGE",
  assetType: "vector",
  generationMode: "single",
  adobeCategory: "",
  subcategory: "",
  title: "Test",
  baseTheme: "",
  archetypeRole: null,
  prompt: "",
  assembledPrompt: "",
  negativePrompt: "",
  aspectRatio: "4:3",
  style: "",
  highDpiSharpness: false,
  outputFormat: "PNG",
  background: "white",
  createdAt: 1,
  status: "ready",
  favorite: false,
  batchId: "",
  isLoading: false,
  isMetaLoading: false,
  url: "data:image/png;base64,iVBORw0KGgo=",
  stockMetadata: {
    title: "Test", description: "", keywords: [], stockCategory: "", subcategory: "",
    contentType: "", outputFormat: "PNG", backgroundMode: "white", generativeAIDeclaration: true,
    aiTool: "", peopleRelease: "", propertyRelease: "", preflightChecks: {},
    preflightPassedAt: null, submittedAt: null, backgroundVerified: false,
    resolutionVerified: false, preflightDecision: null, preflightScore: null,
    preflightIssues: [], qualityScore: null, acceptancePrediction: null,
    suggestions: [], metadataSource: null, analysisAvailable: null,
  },
  ...over,
});

// ── 1. Save lifecycle: new asset → upsert-first → canonical persisted ──────
{
  const writes: Asset[] = [];
  const upsertBodies: any[] = [];
  const io: SaveAssetDBIO = {
    readPrior: async () => null,
    write: async (a) => { writes.push(a); },
    upsert: async (b) => { upsertBodies.push(b); return { success: true, asset: { id: "lib-canon-1", url: "/storage/assets/studio/canon.png" } }; },
  };
  await runSaveAssetDB(base({ id: "gen_1", title: "Generated" }), io);
  assert.equal(upsertBodies.length, 1, "upsert called once");
  assert.equal(upsertBodies[0].studioAssetId, "gen_1", "renderer id passed as studioAssetId");
  assert.equal(upsertBodies[0].dataUrl, base().url, "binary sent for new asset");
  assert.equal(upsertBodies[0].name, "Generated");
  assert.equal(writes.length, 1, "IDB cache written AFTER upsert");
  assert.equal(writes[0].libraryAssetId, "lib-canon-1", "canonical id persisted");
  assert.equal(writes[0].libraryUrl, "/storage/assets/studio/canon.png", "canonical url persisted");
  assert.equal(writes[0].librarySyncState, "synced");
  assert.equal(writes[0].librarySyncVersion, 1);
}

// ── 2. Draft with completed data URL must go to Gallery ────────────────────
{
  const writes: Asset[] = [];
  let upsertCalled = 0;
  const io: SaveAssetDBIO = {
    readPrior: async () => null,
    write: async (a) => { writes.push(a); },
    upsert: async (b) => { upsertCalled++; return { success: true, asset: { id: "lib-draft-1", url: "/storage/assets/studio/draft.png" } }; },
  };
  await runSaveAssetDB(base({ id: "draft_1", status: "draft", title: "Draft" }), io);
  assert.equal(upsertCalled, 1, "draft with data URL upserted");
  assert.equal(writes[0].librarySyncState, "synced");
  assert.ok(isEligibleForMirror(base({ id: "draft_1", status: "draft" })), "draft eligible");
}

// ── 3. Re-save metadata-only (linked + synced + unchanged URL) omits binary ─
{
  const upsertBodies: any[] = [];
  const io: SaveAssetDBIO = {
    readPrior: async () => base({ id: "linked_1", libraryAssetId: "lib-canon-1", librarySyncState: "synced" }),
    write: async () => {},
    upsert: async (b) => { upsertBodies.push(b); return { success: true, asset: { id: "lib-canon-1", url: "/storage/assets/studio/canon.png" } }; },
  };
  await runSaveAssetDB(base({ id: "linked_1", title: "Renamed" }), io);
  assert.equal(upsertBodies.length, 1);
  assert.equal(upsertBodies[0].dataUrl, undefined, "binary NOT resent for metadata-only save");
  assert.equal(upsertBodies[0].name, "Renamed", "metadata still propagated");
}

// ── 4. Failed upsert → recoverable error record, never "synced", result propagated ──
{
  const writes: Asset[] = [];
  const io: SaveAssetDBIO = {
    readPrior: async () => null,
    write: async (a) => { writes.push(a); },
    upsert: async () => { throw new Error("network down"); },
  };
  const res = await runSaveAssetDB(base({ id: "fail_1" }), io);
  assert.equal(writes.length, 1, "recoverable record preserved");
  assert.equal(writes[0].librarySyncState, "error", "marked error");
  assert.notEqual(writes[0].librarySyncState, "synced", "never claimed synced");
  assert.equal(writes[0].url, base().url, "data URL preserved for retry");
  assert.equal(res.success, false, "failure result propagated");
  assert.equal(res.synced, false, "failure never claimed synced");
  assert.equal(res.detail, "network down", "detail propagated");
}

// ── 5. Migration: bounded batches, idempotent, failure keeps source ────────
{
  const ids = ["mig_a", "mig_b", "mig_fail", "mig_c"];
  const mirrored: string[] = [];
  const fakeMirror = async (id: string) => {
    if (id === "mig_fail") throw new Error("boom");
    mirrored.push(id);
  };
  const result = await migrateUnlinked(ids, fakeMirror);
  assert.deepEqual(result, { migrated: 3, failed: 1 });
  assert.deepEqual(mirrored, ["mig_a", "mig_b", "mig_c"]);

  // Duplicate rerun is idempotent at the selection level: already-linked assets
  // are never re-picked by getUnlinkedEligibleAssets.
  const linked = base({ id: "mig_a", libraryAssetId: "lib-mig-a", librarySyncState: "synced" });
  assert.deepEqual(getUnlinkedEligibleAssets([linked, base({ id: "mig_b" })], 10).map(a => a.id), ["mig_b"], "already-migrated excluded");

  // migrateCurrentAsset re-reads current record inside the queue — a stale
  // selection can never be written over a newer (now linked) record.
  const stale = base({ id: "mig_x" });
  let current = base({ id: "mig_x" }); // still unlinked at read time
  let mirrorCalls: Asset[] = [];
  const migrated = await migrateCurrentAsset({
    readCurrent: async () => current,
    mirror: async (a) => { mirrorCalls.push(a); },
  });
  assert.equal(migrated, true);
  assert.equal(mirrorCalls.length, 1);
  assert.notEqual(mirrorCalls[0], stale, "mirror receives freshly-read current");

  // If the current record became linked, migration is skipped (idempotent).
  current = base({ id: "mig_x", libraryAssetId: "lib-mig-x", librarySyncState: "synced" });
  mirrorCalls = [];
  const second = await migrateCurrentAsset({
    readCurrent: async () => current,
    mirror: async (a) => { mirrorCalls.push(a); },
  });
  assert.equal(second, false, "already-linked → skipped on rerun");
  assert.deepEqual(mirrorCalls, [], "no duplicate upsert");
}

// ── 6. Migration includes drafts with data URLs (irrespective review status) ─
{
  const batch = getUnlinkedEligibleAssets([
    base({ id: "draft_a", status: "draft" }),
    base({ id: "review_a", status: "needs_review" }),
    base({ id: "linked", libraryAssetId: "lib-x", librarySyncState: "synced" }),
    base({ id: "no_url", url: null }),
  ], 10);
  assert.deepEqual(batch.map(a => a.id), ["draft_a", "review_a"], "drafts/review assets migrated, linked+content-less excluded");
}

// ── 7. Delete lifecycle: Library first, then IDB ───────────────────────────
{
  // Cache-present linked asset: main delete by renderer id, then local.
  const log: string[] = [];
  const io: DeleteAssetLinkedIO = {
    getExisting: async () => base({ id: "del_1", libraryAssetId: "lib-canon-1", librarySyncState: "synced" }),
    deleteLinked: async (mainId) => { log.push(`library:${mainId}`); return { success: true }; },
    deleteLocal: async () => { log.push("local"); },
  };
  await runDeleteAssetLinked("del_1", io);
  assert.deepEqual(log, ["library:del_1", "local"], "Library deleted FIRST, then local IDB");

  // Library-only canonical asset (no IDB cache → getExisting null) must
  // still delete from Gallery by renderer asset id, then run local delete.
  const libLog: string[] = [];
  const libOnlyIO: DeleteAssetLinkedIO = {
    getExisting: async () => null,
    deleteLinked: async (mainId) => { libLog.push(`library:${mainId}`); return { success: true }; },
    deleteLocal: async () => { libLog.push("local"); },
  };
  await runDeleteAssetLinked("canon_only_1", libOnlyIO, true);
  assert.deepEqual(libLog, ["library:canon_only_1", "local"], "Library-only canonical deleted from Gallery first, then local");

  // Library-only canonical asset + main API unavailable (deleteLinked → null):
  // REJECT and preserve IDB/UI cache (main attempted but fails).
  const noApiLog: string[] = [];
  try {
    await runDeleteAssetLinked("canon_only_2", {
      getExisting: async () => null,
      deleteLinked: async () => { noApiLog.push("library:attempted"); return null; },
      deleteLocal: async () => { noApiLog.push("local"); },
    }, true);
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof Error && err.message.includes("Library delete API unavailable"),
      "alwaysMain + null API → reject, preserve");
  }
  assert.deepEqual(noApiLog, ["library:attempted"], "main delete attempted, local NOT called");

  // No-linkage local asset, alwaysMain=false → local delete only.
  const noLinkLog: string[] = [];
  const noLinkIO: DeleteAssetLinkedIO = {
    getExisting: async () => base({ id: "local_1" }),
    deleteLinked: async () => { noLinkLog.push("library(unexpected)"); return { success: true }; },
    deleteLocal: async () => { noLinkLog.push("local"); },
  };
  await runDeleteAssetLinked("local_1", noLinkIO, false);
  assert.deepEqual(noLinkLog, ["local"], "no linkage → local delete only, no main call");
}

// ── 7b. Gallery-canonical merge drops noncanonical/deleted assets ──────────
{
  const loaded = [base({ id: "c1", title: "Canonical A" })];
  // prev has a completed deleted asset, a transient in-progress gen, and canonical.
  const prev = [
    base({ id: "c1", title: "Canonical A" }),
    base({ id: "deleted_gone", title: "Deleted" }),
    base({ id: "gen_live", isLoading: true, url: null }),
  ];
  const merged = mergeCanonicalAssets(loaded, prev, true);
  assert.ok(merged.some(a => a.id === "c1"), "canonical asset kept");
  assert.ok(!merged.some(a => a.id === "deleted_gone"), "completed deleted asset dropped");
  assert.ok(merged.some(a => a.id === "gen_live"), "transient in-progress gen kept");

  // A completed draft data-url asset (has url) missing from Library must NOT
  // be retained merely to preserve UI.
  const draftDone = base({ id: "draft_done", status: "draft", url: "data:image/png;base64,x", isLoading: false });
  const mergedDraft = mergeCanonicalAssets(loaded, [draftDone], true);
  assert.ok(!mergedDraft.some(a => a.id === "draft_done"), "completed draft data-url asset not retained");

  // IDB fallback (Library API unavailable) preserves everything.
  const mergedFallback = mergeCanonicalAssets(loaded, prev, false);
  assert.equal(mergedFallback.length, 3, "fallback keeps all prev assets");
}

// ── 8. Re-save after error: error record retried → synced ──────────────────
{
  let upsertCount = 0;
  const io: SaveAssetDBIO = {
    readPrior: async () => base({ id: "retry_1", librarySyncState: "error" }),
    write: async () => {},
    upsert: async () => { upsertCount++; return { success: true, asset: { id: "lib-retry-1", url: "/storage/assets/studio/retry.png" } }; },
  };
  await runSaveAssetDB(base({ id: "retry_1" }), io);
  assert.equal(upsertCount, 1, "error record re-saved");
}

console.log("studio asset lifecycle tests passed");