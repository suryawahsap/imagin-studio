import assert from "node:assert/strict";
import {
  buildDeleteAssetLinkedOp,
  enrichCanonicalFromCurrent,
  enrichFromLibrary,
  getUnlinkedEligibleAssets,
  hasLibraryLinkage,
  isEligibleForMirror,
  isSupportedStudioDataUrl,
  isTransientInProgress,
  linkPatchForSyncResult,
  mergeCanonicalAssets,
  mergeLinkFields,
  mergeLoadedStudioAssets,
  migrateCurrentAsset,
  migrateUnlinked,
  mimeFromUrl,
  minimalStudioAssetFromLibrary,
  runDeleteAssetLinked,
  runSaveAssetDB,
  shouldOmitBinary,
  studioLoadStatus,
  type DeleteAssetLinkedIO,
  type LoadStudioStatus,
  type SaveAssetDBIO,
} from "../src/modules/studio/engines/library-sync";
import type { Asset } from "../src/modules/studio/types";
import type { LibraryAsset } from "../src/types";
import { runQueuedCanonicalReconciliation, createAssetQueue } from "../src/modules/studio/engines/storage";

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

// ── 1. Eligibility (status-independent) ─────────────────────────────────────
// Any supported data URL is eligible regardless of status.
assert.equal(isEligibleForMirror(base()), true);
assert.equal(isEligibleForMirror(base({ status: "draft" })), true, "draft with data URL → eligible");
assert.equal(isEligibleForMirror(base({ status: "processing" })), true, "processing with data URL → eligible");
assert.equal(isEligibleForMirror(base({ status: "FAILED" })), true, "FAILED with data URL → eligible");
assert.equal(isEligibleForMirror(base({ status: "rejected" })), true, "rejected with data URL → eligible");
assert.equal(isEligibleForMirror(base({ url: null })), false);
assert.equal(isEligibleForMirror(base({ url: "https://example.test/a.png" })), false);
assert.equal(isEligibleForMirror(base({ url: "data:image/svg+xml;base64,PHN2Zz4=" })), true);
assert.equal(isEligibleForMirror(base({ url: "data:text/html;base64,PGg+PC9oPg==" })), false, "unsupported mime not eligible");
// Linked assets are also eligible for metadata-only re-save.
assert.equal(isEligibleForMirror(base({ libraryAssetId: "lib-1", librarySyncState: "synced", url: "/storage/assets/studio/x.png" })), true, "linked canonical → eligible");

// ── 2. mergeLinkFields preserves prior link fields ──────────────────────────
const prior = base({ libraryAssetId: "lib-1", libraryUrl: "/storage/assets/studio/a.png", librarySyncState: "synced", librarySyncVersion: 1 });
const stale = base({ title: "Renamed" });
const merged = mergeLinkFields(stale, prior);
assert.equal(merged.libraryAssetId, "lib-1");
assert.equal(merged.librarySyncState, "synced");
assert.equal(merged.libraryUrl, "/storage/assets/studio/a.png");
assert.equal(merged.librarySyncVersion, 1);
assert.equal(merged.title, "Renamed", "caller fields still win");

const callerCarried = base({ libraryAssetId: "lib-2", librarySyncState: "synced", librarySyncVersion: 2 });
assert.equal(mergeLinkFields(callerCarried, null).libraryAssetId, "lib-2");
assert.equal(mergeLinkFields(callerCarried, prior).libraryAssetId, "lib-2", "caller wins over prior");
assert.equal(mergeLinkFields(base(), null).libraryAssetId, undefined);

// ── 3. shouldOmitBinary: metadata-only when prior linked + synced + url unchanged ──
assert.equal(shouldOmitBinary(prior, base({ title: "Meta only" })), true);
assert.equal(shouldOmitBinary(prior, base({ url: "data:image/png;base64,CHANGED" })), false, "url changed → full dataUrl");
assert.equal(shouldOmitBinary(null, base()), false, "no prior → full dataUrl");
assert.equal(shouldOmitBinary(base({ title: "no linkage" }), base()), false, "prior without linkage → full dataUrl");
assert.equal(shouldOmitBinary(base({ libraryAssetId: "lib-1", librarySyncState: "error" }), base()), false, "prior not synced → full dataUrl");
assert.equal(shouldOmitBinary(base({ libraryAssetId: "lib-1", librarySyncState: "pending" }), base()), false, "prior pending → full dataUrl");

// ── 4. linkPatchForSyncResult ───────────────────────────────────────────────
const success = linkPatchForSyncResult(base(), { success: true, asset: { id: "lib-9", url: "/storage/assets/studio/b.png" } });
assert.deepEqual(success, { libraryAssetId: "lib-9", libraryUrl: "/storage/assets/studio/b.png", librarySyncState: "synced", librarySyncVersion: 1 });
const keepUrl = linkPatchForSyncResult(base({ libraryUrl: "/storage/assets/studio/old.png" }), { success: true, asset: { id: "lib-9" } });
assert.equal(keepUrl.libraryUrl, "/storage/assets/studio/old.png", "keeps existing libraryUrl when result omits it");
assert.deepEqual(linkPatchForSyncResult(base(), { success: false, detail: "boom" }), { librarySyncState: "error" });
assert.deepEqual(linkPatchForSyncResult(base(), null), { librarySyncState: "error" });

// ── 5. hasLibraryLinkage ────────────────────────────────────────────────────
assert.equal(hasLibraryLinkage(base({ libraryAssetId: "lib-1" })), true);
assert.equal(hasLibraryLinkage(base({ librarySyncState: "error" })), true);
assert.equal(hasLibraryLinkage(base({ libraryAssetId: "lib-1", librarySyncState: "synced" })), true);
assert.equal(hasLibraryLinkage(base()), false);
assert.equal(hasLibraryLinkage({ id: "x" }), false);

// ── 6. buildDeleteAssetLinkedOp ─────────────────────────────────────────────
const linkedAsset = base({ id: "asset_abc", libraryAssetId: "studio-<sha256>", librarySyncState: "synced" });
const op = buildDeleteAssetLinkedOp(linkedAsset.id, linkedAsset);
assert.equal(op.shouldCallMain, true, "linkage exists → should call main");
assert.equal(op.mainId, "asset_abc", "mainId is the renderer asset id, NOT libraryAssetId");
assert.equal(op.mainId, linkedAsset.id, "mainId === asset.id, not libraryAssetId");

const studioIdAsset = base({ id: "renderer_42", libraryAssetId: "studio-<sha256>", librarySyncState: "synced" });
assert.equal(buildDeleteAssetLinkedOp(studioIdAsset.id, studioIdAsset).mainId, "renderer_42", "mainId is renderer id, NOT studio-<sha256>");
assert.equal(buildDeleteAssetLinkedOp("local_1", base()).shouldCallMain, false, "no linkage → skip main");
assert.equal(buildDeleteAssetLinkedOp("null_1", null).shouldCallMain, false, "null asset → skip main");
assert.equal(buildDeleteAssetLinkedOp("err_1", base({ librarySyncState: "error" })).shouldCallMain, true, "error state still has linkage");

// Gap 2: alwaysMain — a Library-only canonical asset (no IDB cache → null
// existing) must still call main by renderer asset id (main is idempotent).
assert.equal(buildDeleteAssetLinkedOp("lib_only_1", null, true).shouldCallMain, true, "alwaysMain + null cache → main called");
assert.equal(buildDeleteAssetLinkedOp("lib_only_1", null, true).mainId, "lib_only_1", "mainId is the renderer id");

// ── 7. runDeleteAssetLinked ordering ────────────────────────────────────────
let callLog: string[] = [];
function resetLog() { callLog = []; }
function makeIO(linkSuccess: boolean): DeleteAssetLinkedIO {
  return {
    getExisting: async () => base({ id: "asset_abc", libraryAssetId: "studio-<sha256>", librarySyncState: "synced" }),
    deleteLinked: async (mainId) => { callLog.push(`deleteLinked(${mainId})`); return { success: linkSuccess, detail: linkSuccess ? undefined : "main error" }; },
    deleteLocal: async () => { callLog.push("deleteLocal"); },
  };
}

resetLog();
await runDeleteAssetLinked("asset_abc", makeIO(true));
assert.deepEqual(callLog, ["deleteLinked(asset_abc)", "deleteLocal"], "main success → linked first, then local");

resetLog();
try {
  await runDeleteAssetLinked("asset_abc", makeIO(false));
  assert.fail("should have thrown");
} catch (err) {
  assert.ok(err instanceof Error && err.message === "main error", "main failure → throws, keeps local");
}
assert.deepEqual(callLog, ["deleteLinked(asset_abc)"], "main failure → deleteLinked called, deleteLocal NOT called");

resetLog();
const noLinkIO: DeleteAssetLinkedIO = {
  getExisting: async () => base({ id: "asset_no_link" }),
  deleteLinked: async () => { callLog.push("deleteLinked(unexpected)"); return { success: true }; },
  deleteLocal: async () => { callLog.push("deleteLocal"); },
};
await runDeleteAssetLinked("asset_no_link", noLinkIO, false);
assert.deepEqual(callLog, ["deleteLocal"], "no linkage (alwaysMain=false) → no main call, only local delete");

// Gap 2: alwaysMain=true + null existing (Library-only canonical) → main delete
// called by renderer id, then local delete.
resetLog();
const libOnlyIO: DeleteAssetLinkedIO = {
  getExisting: async () => null,
  deleteLinked: async (mainId) => { callLog.push(`deleteLinked(${mainId})`); return { success: true }; },
  deleteLocal: async () => { callLog.push("deleteLocal"); },
};
await runDeleteAssetLinked("lib_only_1", libOnlyIO, true);
assert.deepEqual(callLog, ["deleteLinked(lib_only_1)", "deleteLocal"], "alwaysMain + null cache → main delete by renderer id, then local");

// Remediation B: alwaysMain=true + main returns null (API unavailable) for a
// canonical asset → REJECT and preserve IDB/UI cache (main attempted but fails).
resetLog();
try {
  await runDeleteAssetLinked("lib_only_2", {
    getExisting: async () => null,
    deleteLinked: async () => { callLog.push("deleteLinked(unexpected)"); return null; },
    deleteLocal: async () => { callLog.push("deleteLocal"); },
  }, true);
  assert.fail("should have thrown");
} catch (err) {
  assert.ok(err instanceof Error && err.message.includes("Library delete API unavailable"), "alwaysMain + null API → reject, preserve");
}
assert.deepEqual(callLog, ["deleteLinked(unexpected)"], "main delete attempted but unavailable, local NOT called");

// ── 7b. mergeCanonicalAssets / isTransientInProgress / D race enrichment ────
{
const canonicalLoaded = [
  base({ id: "canon_1", title: "A" }),
  base({ id: "canon_2", title: "B" }),
];
// Prev contains: a canonical asset, a completed noncanonical (deleted) asset,
// and a transient in-progress generation placeholder.
const prev = [
  base({ id: "canon_1", title: "A" }),
  base({ id: "deleted_1", title: "Was deleted" }),
  base({ id: "gen_1", isLoading: true, url: null }),
];
const merged = mergeCanonicalAssets(canonicalLoaded, prev, true);
assert.deepEqual(merged.map(a => a.id).sort(), ["canon_1", "canon_2", "gen_1"].sort(), "canonical keeps loaded + transient only");
assert.ok(!merged.some(a => a.id === "deleted_1"), "deleted/noncanonical dropped when canonical");

// IDB fallback (canonicalAvailable=false) keeps all prev assets.
const mergedFallback = mergeCanonicalAssets(canonicalLoaded, prev, false);
assert.deepEqual(mergedFallback.map(a => a.id).sort(), ["canon_1", "canon_2", "deleted_1", "gen_1"], "fallback keeps all prev");

// isTransientInProgress
assert.equal(isTransientInProgress(base({ id: "x", isLoading: true })), true, "isLoading → transient");
assert.equal(isTransientInProgress(base({ id: "x", url: null })), true, "no url → transient");
assert.equal(isTransientInProgress(base({ id: "x", url: "data:image/png;base64,x", isLoading: false })), false, "completed with url → not transient");
assert.equal(isTransientInProgress(base({ id: "x", url: "/storage/assets/studio/a.png" })), false, "canonical url → not transient");

// ── 7c. Remediation A: studioLoadStatus + mergeLoadedStudioAssets ───────────
assert.equal(studioLoadStatus(false, false), "idb-fallback", "no API → idb fallback regardless of fetch");
assert.equal(studioLoadStatus(false, true), "idb-fallback", "no API → idb fallback");
assert.equal(studioLoadStatus(true, true), "canonical", "API + success → canonical");
assert.equal(studioLoadStatus(true, false), "unavailable", "API exists but failed → authoritative-unavailable");

// Merge semantics per status.
const statusCanon = mergeLoadedStudioAssets([base({ id: "c1" })], [base({ id: "c1" }), base({ id: "stale" })], "canonical" as LoadStudioStatus);
assert.ok(statusCanon.some(a => a.id === "c1"), "canonical keeps loaded");
assert.ok(!statusCanon.some(a => a.id === "stale"), "canonical drops noncanonical completed");
const statusUnavail = mergeLoadedStudioAssets([], [base({ id: "kept" })], "unavailable" as LoadStudioStatus);
assert.deepEqual(statusUnavail.map(a => a.id), ["kept"], "unavailable retains last canonical state (no IDB merge)");
const statusFallback = mergeLoadedStudioAssets([base({ id: "f1" })], [base({ id: "p1" })], "idb-fallback" as LoadStudioStatus);
assert.deepEqual(statusFallback.map(a => a.id).sort(), ["f1", "p1"], "idb-fallback merges IDB + prev");

// ── 7d. Remediation D: race — Library update before IDB sidecar write ───────
// A minimal Library asset (no IDB cache yet) must be enriched from the matching
// current React Asset by exact Studio id, preserving Library url/id as authority.
const raceCurrent = base({ id: "race_1", title: "Rich Title", prompt: "rich prompt", resolution: { width: 1024, height: 768, wasUpscaled: false, scaleFactor: 1 }, librarySyncState: "synced" as const });
const raceCanonical = base({ id: "race_1", title: "Minimal", url: "/storage/assets/studio/race.png", libraryAssetId: "lib-race", libraryUrl: "/storage/assets/studio/race.png", librarySyncState: "synced" as const });
const raceEnriched = enrichCanonicalFromCurrent(raceCanonical, raceCurrent);
assert.equal(raceEnriched.title, "Rich Title", "rich current metadata preserved");
assert.equal(raceEnriched.prompt, "rich prompt", "prompt preserved");
assert.deepEqual(raceEnriched.resolution, { width: 1024, height: 768, wasUpscaled: false, scaleFactor: 1 }, "resolution preserved");
assert.equal(raceEnriched.url, raceCanonical.url, "Library canonical url is authority");
assert.equal(raceEnriched.libraryAssetId, "lib-race", "Library id is authority");
// mergeCanonicalAssets applies the enrichment for canonical loads.
const raceMerged = mergeCanonicalAssets([raceCanonical], [raceCurrent], true);
assert.equal(raceMerged[0].title, "Rich Title", "merge enriches minimal from current React asset");
assert.equal(raceMerged[0].url, raceCanonical.url, "merge keeps canonical url as authority");
// No matching current asset → minimal asset used as-is (no enrichment).
const raceNoMatch = mergeCanonicalAssets([raceCanonical], [base({ id: "other" })], true);
assert.equal(raceNoMatch[0].title, "Minimal", "no current match → minimal asset used");
}

// ── 8. runSaveAssetDB lifecycle ─────────────────────────────────────────────

// New eligible asset, upsert succeeds → synced with canonical id/url.
let writeCalls: Asset[] = [];
let upsertBody: any = null;
const successIO: SaveAssetDBIO = {
  readPrior: async () => null,
  write: async (a) => { writeCalls.push(a); },
  upsert: async (body) => { upsertBody = body; return { success: true, asset: { id: "lib-99", url: "/storage/assets/studio/x.png" } }; },
};
const res8a = await runSaveAssetDB(base({ id: "new-asset" }), successIO);
assert.equal(writeCalls.length, 1, "must write after upsert");
assert.deepEqual(writeCalls[0].libraryAssetId, "lib-99", "canonical id persisted");
assert.deepEqual(writeCalls[0].libraryUrl, "/storage/assets/studio/x.png", "canonical url persisted");
assert.deepEqual(writeCalls[0].librarySyncState, "synced", "synced state");
assert.equal(upsertBody.dataUrl, base().url, "binary sent for new asset");
assert.deepEqual(res8a, { success: true, synced: true }, "success result propagates synced=true");

// Metadata-only: prior linked + synced + url unchanged → binary omitted.
writeCalls = [];
upsertBody = null;
const metaIO: SaveAssetDBIO = {
  readPrior: async () => base({ id: "meta", libraryAssetId: "lib-1", librarySyncState: "synced" }),
  write: async (a) => { writeCalls.push(a); },
  upsert: async (body) => { upsertBody = body; return { success: true, asset: { id: "lib-1", url: "/storage/assets/studio/x.png" } }; },
};
const res8b = await runSaveAssetDB(base({ id: "meta", title: "Renamed" }), metaIO);
assert.equal(upsertBody.dataUrl, undefined, "metadata-only: binary omitted");
assert.equal(writeCalls.length, 1);
assert.equal(writeCalls[0].title, "Renamed", "metadata save persisted");
assert.equal(res8b.synced, true, "metadata-only re-save still reports synced");

// Upsert throws → error state, not synced, failure result propagated.
writeCalls = [];
upsertBody = null;
const failIO: SaveAssetDBIO = {
  readPrior: async () => null,
  write: async (a) => { writeCalls.push(a); },
  upsert: async () => { throw new Error("network"); },
};
const res8c = await runSaveAssetDB(base({ id: "fail-asset" }), failIO);
assert.equal(writeCalls.length, 1, "must write even on upsert failure");
assert.equal(writeCalls[0].librarySyncState, "error", "error state, never synced");
assert.equal(writeCalls[0].libraryAssetId, undefined, "no canonical id on failure");
assert.deepEqual(res8c, { success: false, synced: false, detail: "network" }, "failure result propagated (recoverable error stored)");

// Upsert returns success:false → error state, non-success result.
writeCalls = [];
upsertBody = null;
const failResultIO: SaveAssetDBIO = {
  readPrior: async () => null,
  write: async (a) => { writeCalls.push(a); },
  upsert: async (body) => { upsertBody = body; return { success: false, detail: "main rejected" }; },
};
const res8d = await runSaveAssetDB(base({ id: "fail-result" }), failResultIO);
assert.equal(writeCalls.length, 1);
assert.equal(writeCalls[0].librarySyncState, "error", "error state on success:false");
assert.equal(res8d.success, false, "non-success result propagated");
assert.equal(res8d.synced, false, "non-success never claimed synced");
assert.equal(res8d.detail, "main rejected", "detail carried");

// API unavailable (upsert returns null) → local-only write, no error.
writeCalls = [];
upsertBody = null;
const noApiIO: SaveAssetDBIO = {
  readPrior: async () => null,
  write: async (a) => { writeCalls.push(a); },
  upsert: async () => null,
};
const res8e = await runSaveAssetDB(base({ id: "no-api" }), noApiIO);
assert.equal(writeCalls.length, 1);
assert.equal(writeCalls[0].librarySyncState, undefined, "no sync state when API unavailable");
assert.equal(writeCalls[0].url, base().url, "data URL preserved");
assert.equal(res8e.synced, false, "API unavailable → not claimed synced");

// Not eligible (no data URL) → local write, no upsert called.
let upsertCalled = false;
const noEligIO: SaveAssetDBIO = {
  readPrior: async () => null,
  write: async (a) => { writeCalls.push(a); },
  upsert: async () => { upsertCalled = true; return null; },
};
writeCalls = [];
const res8f = await runSaveAssetDB(base({ id: "no-url", url: null }), noEligIO);
assert.equal(upsertCalled, false, "not eligible → no upsert called");
assert.equal(writeCalls.length, 1);
assert.equal(writeCalls[0].librarySyncState, undefined);
assert.equal(res8f.synced, false, "not eligible → not claimed synced");

// ── 9. getUnlinkedEligibleAssets ────────────────────────────────────────────
const migratable = base({ id: "mig-1" });
const synced = base({ id: "synced-1", libraryAssetId: "lib-1", librarySyncState: "synced" });
const pending = base({ id: "pending-1", librarySyncState: "pending" });
const errState = base({ id: "err-1", librarySyncState: "error" });
const draft = base({ id: "draft-1", status: "draft" }); // now eligible!
const noUrl = base({ id: "nourl-1", url: null });
assert.deepEqual(getUnlinkedEligibleAssets([migratable], 10).map(a => a.id), ["mig-1"]);
assert.deepEqual(getUnlinkedEligibleAssets([synced, pending, errState, noUrl], 10), [], "no eligible unlinked assets");
assert.deepEqual(getUnlinkedEligibleAssets([migratable, synced, draft, noUrl], 10).map(a => a.id), ["mig-1", "draft-1"], "draft with data URL is now eligible");
assert.deepEqual(getUnlinkedEligibleAssets([migratable, base({ id: "mig-2" })], 1).map(a => a.id), ["mig-1"], "limit caps at 1");
assert.deepEqual(getUnlinkedEligibleAssets([], 10), []);

// ── 10. migrateUnlinked ────────────────────────────────────────────────────
const mirroredIds: string[] = [];
const fakeMirror = async (id: string) => {
  if (id === "fail") throw new Error("boom");
  mirroredIds.push(id);
};
const mres = await migrateUnlinked(["a", "fail", "b"], fakeMirror);
assert.deepEqual(mres, { migrated: 2, failed: 1 });
assert.deepEqual(mirroredIds, ["a", "b"]);
const allFail = await migrateUnlinked(["fail"], fakeMirror);
assert.deepEqual(allFail, { migrated: 0, failed: 1 });
assert.deepEqual(await migrateUnlinked([], fakeMirror), { migrated: 0, failed: 0 });

// ── 11. migrateCurrentAsset ─────────────────────────────────────────────────
const staleSelection = base({ id: "s", title: "STALE TITLE" });
const newerCurrent = base({ id: "s", title: "NEWER TITLE" });
const mirrorCalls: Asset[] = [];
const migratedNewer = await migrateCurrentAsset({
  readCurrent: async () => newerCurrent,
  mirror: async (a) => { mirrorCalls.push(a); },
});
assert.equal(migratedNewer, true, "eligible unlinked current → mirrored");
assert.equal(mirrorCalls.length, 1);
assert.equal(mirrorCalls[0].title, "NEWER TITLE", "mirror receives current, never the stale selection");

// Linked current → skipped, mirror not called.
const linkedCalls: Asset[] = [];
assert.equal(await migrateCurrentAsset({
  readCurrent: async () => base({ id: "s", libraryAssetId: "lib-1", librarySyncState: "synced" }),
  mirror: async (a) => { linkedCalls.push(a); },
}), false, "already-linked current → skipped");
assert.deepEqual(linkedCalls, [], "linked current must not be mirrored");

// Non-eligible current (no data URL) → skipped.
const noDataCalls: Asset[] = [];
assert.equal(await migrateCurrentAsset({
  readCurrent: async () => base({ id: "s", url: null }),
  mirror: async (a) => { noDataCalls.push(a); },
}), false, "non-eligible current → skipped");
assert.deepEqual(noDataCalls, []);

// Draft with data URL → now eligible.
const draftCalls: Asset[] = [];
assert.equal(await migrateCurrentAsset({
  readCurrent: async () => base({ id: "s", status: "draft" }),
  mirror: async (a) => { draftCalls.push(a); },
}), true, "draft with data URL → eligible and mirrored");
assert.equal(draftCalls.length, 1, "draft must be mirrored");

// Missing current → skipped.
const missingCalls: Asset[] = [];
assert.equal(await migrateCurrentAsset({
  readCurrent: async () => null,
  mirror: async (a) => { missingCalls.push(a); },
}), false, "missing current → skipped");
assert.deepEqual(missingCalls, []);

// ── 12. minimalStudioAssetFromLibrary ───────────────────────────────────────
const libRecord: LibraryAsset = {
  id: "studio-abc123", type: "IMAGE", name: "My Asset", url: "/storage/assets/studio/my-asset.png",
  folder: "storage/assets/studio", sourceModule: "STUDIO", mimeType: "image/png", fileSize: "0.5 MB",
  tags: ["Studio", "test"], createdAt: "2026-01-15T10:00:00.000Z", prompt: "test prompt",
  studioAssetId: "renderer_42", studioSyncVersion: 1, studioContentHash: "a".repeat(64),
  favorite: true,
};
const minimal = minimalStudioAssetFromLibrary(libRecord);
assert.equal(minimal.id, "renderer_42", "uses studioAssetId as id");
assert.equal(minimal.title, "My Asset", "name mapped to title");
assert.equal(minimal.url, "/storage/assets/studio/my-asset.png", "canonical URL");
assert.equal(minimal.status, "ready", "Gallery assets are ready");
assert.equal(minimal.createdAt, Date.parse("2026-01-15T10:00:00.000Z"), "createdAt parsed");
assert.equal(minimal.libraryAssetId, "studio-abc123");
assert.equal(minimal.librarySyncState, "synced");
assert.equal(minimal.favorite, true);

// lib without studioAssetId → falls back to lib.id
const noSid: LibraryAsset = { ...libRecord, studioAssetId: undefined };
assert.equal(minimalStudioAssetFromLibrary(noSid).id, "studio-abc123", "fallback to lib.id");

// SVG library asset → outputFormat SVG
const svgLib: LibraryAsset = { ...libRecord, mimeType: "image/svg+xml", url: "/storage/assets/studio/a.svg" };
assert.equal(minimalStudioAssetFromLibrary(svgLib).outputFormat, "SVG");

// ── 13. enrichFromLibrary ───────────────────────────────────────────────────
const cached = base({ id: "renderer_42", title: "Old Title", url: "data:image/png;base64,OLD", libraryAssetId: "studio-old", librarySyncVersion: 1 });
const enriched = enrichFromLibrary(cached, libRecord);
assert.equal(enriched.url, libRecord.url, "canonical url overwrites local");
assert.equal(enriched.libraryAssetId, libRecord.id, "library id updated");
assert.equal(enriched.librarySyncState, "synced");
assert.equal(enriched.title, "Old Title", "cached metadata preserved");
assert.equal(enriched.librarySyncVersion, 1, "keeps lib studioSyncVersion when present");

// ── 14. mimeFromUrl ─────────────────────────────────────────────────────────
assert.equal(mimeFromUrl("data:image/png;base64,x"), "image/png");
assert.equal(mimeFromUrl("data:image/jpeg;base64,x"), "image/jpeg");
assert.equal(mimeFromUrl("data:image/webp;base64,x"), "image/webp");
assert.equal(mimeFromUrl("data:image/svg+xml;base64,PHN2Zz4="), "image/svg+xml");
assert.equal(mimeFromUrl("data:image/gif;base64,x"), undefined);
assert.equal(mimeFromUrl("/storage/assets/studio/x.png"), undefined);
assert.equal(mimeFromUrl(null), undefined);

// ── 15. isSupportedStudioDataUrl ────────────────────────────────────────────
assert.equal(isSupportedStudioDataUrl("data:image/png;base64,x"), true);
assert.equal(isSupportedStudioDataUrl("data:image/jpeg;base64,x"), true);
assert.equal(isSupportedStudioDataUrl("data:image/webp;base64,x"), true);
assert.equal(isSupportedStudioDataUrl("data:image/svg+xml;base64,PHN2Zz4="), true);
assert.equal(isSupportedStudioDataUrl("data:image/gif;base64,x"), false);
assert.equal(isSupportedStudioDataUrl("https://example.test/a.png"), false);
assert.equal(isSupportedStudioDataUrl(null), false);

// ── 16. Stale-sidecar race repair ─────────────────────────────────────────
const libraryFor = (id: string): LibraryAsset => ({
  id: `lib-${id}`, type: "IMAGE", name: "Library Name",
  url: `/storage/assets/studio/${id}.png`, folder: "storage/assets/studio",
  sourceModule: "STUDIO", mimeType: "image/png", fileSize: "1 MB", tags: ["test"],
  createdAt: new Date().toISOString(), prompt: "some prompt", studioAssetId: id,
  studioSyncVersion: 1, favorite: false,
});

// A Library refresh captured stale v1, then metadata v2 saves before the same
// per-ID queue reaches reconciliation. Reconciliation must read v2, not v1.
{
  const queue = createAssetQueue();
  const store = new Map<string, Asset>();
  const id = "race_asset";
  const staleV1 = base({ id, title: "Stale Title", url: "data:image/png;base64,OLD" });
  const v2Rich: any = {
    ...staleV1,
    title: "Rich Title",
    stockMetadata: { ...staleV1.stockMetadata, title: "Rich Title", description: "Rich description", keywords: ["key1", "key2"] },
    qaSnapshot: { decision: "pass" },
    lineage: { ...(staleV1.lineage || {}), metadataVersion: "v2" },
  };
  store.set(id, staleV1); // the already-captured load snapshot is intentionally stale
  const libraryAsset = libraryFor(id);
  await Promise.all([
    queue(id, async () => { store.set(id, v2Rich); }),
    runQueuedCanonicalReconciliation(queue, id, libraryAsset, {
      readCurrent: async () => store.get(id) || null,
      write: async (asset) => { store.set(id, asset); },
    }),
  ]);
  const final: any = store.get(id);
  assert.equal(final.title, "Rich Title", "new title survives stale reconciliation");
  assert.equal(final.stockMetadata.description, "Rich description", "new description survives");
  assert.deepEqual(final.stockMetadata.keywords, ["key1", "key2"], "new keywords survive");
  assert.deepEqual(final.qaSnapshot, { decision: "pass" }, "QA data survives");
  assert.equal(final.lineage.metadataVersion, "v2", "lineage survives");
  assert.equal(final.url, libraryAsset.url, "canonical URL wins");
  assert.equal(final.libraryAssetId, libraryAsset.id, "canonical library id wins");
  assert.equal(final.librarySyncVersion, 1, "valid library sync version applied");
}

// Reconciliation cannot resurrect an asset after queued deletion in either order.
for (const order of ["save-reconcile-delete", "delete-reconcile"] as const) {
  const queue = createAssetQueue();
  const store = new Map<string, Asset>();
  const id = `deleted-${order}`;
  const libraryAsset = libraryFor(id);
  let writes = 0;
  if (order === "save-reconcile-delete") {
    await queue(id, async () => { store.set(id, base({ id })); });
    await runQueuedCanonicalReconciliation(queue, id, libraryAsset, {
      readCurrent: async () => store.get(id) || null,
      write: async (asset) => { writes++; store.set(id, asset); },
    });
    await queue(id, async () => { store.delete(id); });
  } else {
    await queue(id, async () => { store.delete(id); });
    await runQueuedCanonicalReconciliation(queue, id, libraryAsset, {
      readCurrent: async () => store.get(id) || null,
      write: async (asset) => { writes++; store.set(id, asset); },
    });
  }
  assert.equal(store.has(id), false, `${order}: reconciliation must not resurrect deletion`);
  if (order === "delete-reconcile") assert.equal(writes, 0, "missing sidecar must not be written");
}

console.log("renderer library sync helper tests passed");
