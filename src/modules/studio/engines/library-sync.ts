// Phase 5C: Pure decision helpers for Library sync (no window/indexedDB).
// Imported by storage.ts; testable in node.

import type { Asset, StockMetadata } from "../types";
import type { LibraryAsset } from "../../../types";

// ── Supported-data-url detection ────────────────────────────────────────────
// Matches the 4 mime types accepted by the main-process decodeStudioDataUrl.
const SUPPORTED_DATA_URL = /^data:(image\/(?:png|jpeg|webp)|image\/svg\+xml);/;

/**
 * Does the data URL carry a supported Studio mime (png/jpeg/webp/svg+xml)?
 */
export function isSupportedStudioDataUrl(url: unknown): url is string {
  return typeof url === "string" && SUPPORTED_DATA_URL.test(url);
}

/**
 * Extract the mime type from a data URL for the upsert payload.
 * Returns undefined for unsupported or non-data URLs.
 */
export function mimeFromUrl(url: string | null | undefined): "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml" | undefined {
  const t = /^data:([^;,]+)/.exec(url || "")?.[1];
  return (t === "image/png" || t === "image/jpeg" || t === "image/webp" || t === "image/svg+xml") ? t as any : undefined;
}

/**
 * Does the asset carry reciprocal linkage to a main-process Library record?
 * Drives delete ordering: linked-first delete only when this is true.
 */
export function hasLibraryLinkage(asset: { libraryAssetId?: string | null; librarySyncState?: string | null }): boolean {
  return !!(asset.libraryAssetId || asset.librarySyncState);
}

/**
 * Is the asset eligible for mirroring to the main-process Library?
 * Eligible when it carries a supported data URL (png/jpeg/webp/svg+xml)
 * regardless of status — generation/import drafts with completed data URLs must
 * go to Gallery (Gallery-canonical cutover), so `status === "ready"` is NOT
 * required.  Also eligible when it already has reciprocal linkage: a metadata-
 * only re-save of a known-linked unchanged canonical asset must still reach
 * Gallery (without resending binary).
 */
export function isEligibleForMirror(asset: Asset): boolean {
  if (isSupportedStudioDataUrl(asset.url)) return true;
  return hasLibraryLinkage(asset);
}

/**
 * Should the upsert call omit the binary payload?
 * True when the prior record already has reciprocal linkage
 * (libraryAssetId + synced state) and the content URL hasn't changed.
 */
export function shouldOmitBinary(prior: Asset | null, next: Asset): boolean {
  if (!prior) return false;
  if (!prior.libraryAssetId) return false;
  if (prior.librarySyncState !== "synced") return false;
  if (next.url !== prior.url) return false;
  return true;
}

/**
 * Merge link fields from the prior record when the caller passes a stale object.
 * Preserves prior libraryAssetId/libraryUrl/librarySyncState/librarySyncVersion
 * if the caller didn't explicitly set them.
 */
export function mergeLinkFields(next: Asset, prior: Asset | null): Asset {
  if (!prior) return next;
  return {
    ...next,
    libraryAssetId: next.libraryAssetId || prior.libraryAssetId,
    libraryUrl: next.libraryUrl || prior.libraryUrl,
    librarySyncState: next.librarySyncState || prior.librarySyncState,
    librarySyncVersion: next.librarySyncVersion ?? prior.librarySyncVersion,
  };
}

/**
 * Build the partial asset patch after a mirror upsert result.
 * Returns synced linkage on success (with monotonically increasing version),
 * error state on failure.
 */
export function linkPatchForSyncResult(
  asset: Asset,
  result: { success: boolean; asset?: { id: string; url?: string } } | null,
): Partial<Asset> {
  if (result?.success && result?.asset) {
    return {
      libraryAssetId: result.asset.id,
      libraryUrl: result.asset.url || asset.libraryUrl,
      librarySyncState: "synced" as const,
      librarySyncVersion: (asset.librarySyncVersion ?? 0) + 1,
    };
  }
  return { librarySyncState: "error" as const };
}

/**
 * Pure decision logic for deleteAssetDBLinked.
 * `id` is the renderer asset id.  When `alwaysMain` is true the main-process
 * linked delete is ALWAYS attempted by renderer asset id (safe because main's
 * deleteStudioLibraryAsset is idempotent — returns success for non-matching
 * ids), which also covers Library-only canonical assets that have no IDB cache.
 * Otherwise the decision is based on the existing record's linkage.
 * The main-process matches on `studioAssetId` (the renderer's asset id), never
 * on the Library's internal `libraryAssetId` (which is `studio-<sha256>`).
 */
export function buildDeleteAssetLinkedOp(
  id: string,
  asset: { id: string; libraryAssetId?: string | null; librarySyncState?: string | null } | null,
  alwaysMain?: boolean,
): { shouldCallMain: boolean; mainId: string } {
  if (alwaysMain && id.length > 0) return { shouldCallMain: true, mainId: id };
  if (!asset) return { shouldCallMain: false, mainId: "" };
  if (!hasLibraryLinkage(asset)) return { shouldCallMain: false, mainId: "" };
  return { shouldCallMain: true, mainId: asset.id };
}

/**
 * Injectable-IO version of the linked delete so the ordering + keep-local
 * logic is node-testable (no window/indexedDB needed). deleteAssetDBLinked
 * supplies the real IO; tests inject fakes.
 * `deleteLinked` may return null when the main-process API is unavailable —
 * for a canonical delete (alwaysMain or existing linkage) that is treated as a
 * REJECTION: the IDB/UI cache is preserved because the Gallery item still
 * exists.  Local-only delete is permitted only for noncanonical assets in
 * renderer-only mode (no linkage).
 */
export type DeleteAssetLinkedIO = {
  getExisting: () => Promise<{ id: string; libraryAssetId?: string | null; librarySyncState?: string | null } | null>;
  deleteLinked: (mainId: string) => Promise<{ success: boolean; detail?: string } | null>;
  deleteLocal: () => Promise<void>;
};

export async function runDeleteAssetLinked(id: string, io: DeleteAssetLinkedIO, alwaysMain?: boolean): Promise<void> {
  const existing = await io.getExisting();
  const op = buildDeleteAssetLinkedOp(id, existing, alwaysMain);
  if (op.shouldCallMain) {
    const result = await io.deleteLinked(op.mainId);
    if (result === null) {
      // Main delete API unavailable.  Canonical assets (alwaysMain, or existing
      // linkage) must NOT be dropped locally while the Gallery record remains —
      // reject and preserve IDB/UI cache.  Only noncanonical renderer-only
      // assets (no linkage) fall through to a local-only delete.
      if (alwaysMain || hasLibraryLinkage(existing)) {
        throw new Error("Library delete API unavailable; canonical asset preserved");
      }
    } else if (!result.success) {
      throw new Error(result.detail || "Linked Library delete failed");
    }
  }
  await io.deleteLocal();
}

// ── Canonical-merge helper (Gap 1) ─────────────────────────────────────────

/**
 * An asset is "transient generation UI" that has not yet reached durable
 * completion (still being generated or has no content yet).  Such assets may
 * be retained across a canonical refresh even when absent from the Library.
 * Completed assets with a content URL must be in the canonical Library list
 * to be shown; otherwise they are dropped so deleted/noncanonical assets
 * cannot resurrect from stale React state.
 */
export function isTransientInProgress(a: { isLoading?: boolean; url?: string | null }): boolean {
  return a.isLoading === true || !a.url;
}

/**
 * Preserve the Library url/id as authority while keeping the rich metadata of
 * the current React asset (race remediation D): when a Library update arrives
 * before the IDB sidecar write, the canonical merge must enrich the Library
 * record with the matching current React Asset by exact Studio id instead of
 * substituting a metadata-thin minimal asset.
 */
export function enrichCanonicalFromCurrent(canonical: Asset, current: Asset): Asset {
  return {
    ...current,
    url: canonical.url, // canonical Gallery URL is authority
    libraryAssetId: canonical.libraryAssetId,
    libraryUrl: canonical.libraryUrl,
    librarySyncState: canonical.librarySyncState,
    librarySyncVersion: canonical.librarySyncVersion,
  };
}

/**
 * Merge a canonical loaded list with the current React `prev` state.
 *
 * When `canonicalAvailable` is true (Library API is available and returned
 * a canonical asset list):
 *   - loaded canonical assets are enriched from any matching current React
 *     asset (by exact studio id) so a Library record that arrived before the
 *     IDB sidecar write keeps rich metadata (Library url/id stay authority);
 *   - every `prev` asset NOT in the loaded list is dropped UNLESS it is still
 *     transient in-progress (isLoading or no content URL).  Completed assets
 *     with a URL are never retained merely to preserve UI — they must be
 *     backed by the canonical Gallery (so a failed canonical upsert that was
 *     pre-added to React state is dropped on the next canonical merge).
 *
 * When `canonicalAvailable` is false (renderer-only IDB fallback), every
 * `prev` asset is preserved as before.
 */
export function mergeCanonicalAssets(
  loaded: Asset[],
  prev: Asset[],
  canonicalAvailable: boolean,
): Asset[] {
  const prevById = new Map(prev.map(x => [x.id, x]));
  const enriched = canonicalAvailable
    ? loaded.map(a => {
        const cur = prevById.get(a.id);
        return cur ? enrichCanonicalFromCurrent(a, cur) : a;
      })
    : loaded;
  const byId = new Map(enriched.map(x => [x.id, x]));
  const merged = [...enriched];
  for (const p of prev) {
    if (byId.has(p.id)) continue;
    if (canonicalAvailable && !isTransientInProgress(p)) continue; // drop
    merged.push(p);
  }
  return merged.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
}

/**
 * Outcome of a Studio asset load attempt.  `unavailable` means the Library API
 * EXISTS but failed — the authoritative Gallery source could not be read, so the
 * caller must retain the last canonical React state and never merge IDB-only
 * completed assets into the Gallery view.
 */
export type LoadStudioStatus = "canonical" | "idb-fallback" | "unavailable";

/**
 * Classify a load attempt.  IDB fallback is permitted ONLY when the Library API
 * does not exist (renderer-only test/dev).  A present-but-failed API is
 * authoritative-unavailable — the IDB cache must NOT be treated as canonical.
 */
export function studioLoadStatus(hasLibraryApi: boolean, libraryFetchSucceeded: boolean): LoadStudioStatus {
  if (!hasLibraryApi) return "idb-fallback";
  return libraryFetchSucceeded ? "canonical" : "unavailable";
}

/**
 * Merge a load result with current React state according to load status.
 * - "canonical": drop everything not in the canonical Library list (except
 *   transient in-progress UI).
 * - "idb-fallback": Library API does not exist (renderer-only dev/test) —
 *   keep all current assets merged with the IDB cache.
 * - "unavailable": Library API exists but failed — retain current state
 *   unchanged (never merge IDB-only completed assets into the Gallery view).
 */
export function mergeLoadedStudioAssets(
  loaded: Asset[],
  prev: Asset[],
  status: LoadStudioStatus,
): Asset[] {
  if (status === "unavailable") return prev;
  return mergeCanonicalAssets(loaded, prev, status === "canonical");
}

// ── Injectable-IO save (Gallery-canonical upsert-first) ────────────────────

/**
 * Upsert body shape for the main-process studioAssetUpsert call.
 * dataUrl is omitted for metadata-only re-saves of known-linked unchanged assets.
 */
export type StudioUpsertBody = {
  studioAssetId: string;
  dataUrl?: string;
  name: string;
  prompt?: string;
  tags?: string[];
  width?: number;
  height?: number;
  mimeType?: string;
  outputFormat?: string;
  /** Fase 1: metadata fields synced to the library record. */
  stockMetadata?: Asset["stockMetadata"];
  adobeCategory?: string;
  subcategory?: string;
};

/** Fase 1: extract metadata fields for StudioUpsertBody from an Asset. Pure, node-testable. */
export function studioUpsertMetadataFields(asset: Asset): Pick<StudioUpsertBody, "stockMetadata" | "adobeCategory" | "subcategory"> {
  return {
    ...(asset.stockMetadata && asset.stockMetadata.title ? { stockMetadata: asset.stockMetadata } : {}),
    ...(asset.adobeCategory ? { adobeCategory: asset.adobeCategory } : {}),
    ...(asset.subcategory ? { subcategory: asset.subcategory } : {}),
  };
}

/**
 * Injectable-IO seam for saveAssetDB.  `readPrior` reads the existing IDB record
 * (may be null for new assets), `write` persists the final record, `upsert`
 * calls the main-process upsert.  Returns null when the sync API is unavailable
 * (renderer-only test/dev) — the caller should write a local-only record without
 * marking it as synced or error.
 */
export type SaveAssetDBIO = {
  readPrior: () => Promise<Asset | null>;
  write: (asset: Asset) => Promise<void>;
  upsert: (body: StudioUpsertBody) => Promise<{ success: boolean; asset?: { id: string; url?: string }; detail?: string } | null>;
};

/**
 * Result of a save.  `synced` is true ONLY when the main-process upsert
 * returned a canonical Gallery record — a failure is never claimed as synced.
 */
export type SaveAssetDBResult = {
  success: boolean;
  synced: boolean;
  detail?: string;
};

/**
 * Is a save result a committed final Gallery asset?
 *
 * Gallery-canonical callers that add/replace a finalized asset in React state or
 * complete a job must gate on this: an asset may only be treated as a visible
 * final Gallery asset when the save is committed.  `success === true` covers
 * both a canonical commit (synced) and the renderer-only API-absent local
 * persist (success:true, synced:false — dev mode, must NOT be blocked).  A
 * `success:false` result means the Library API existed but the upsert failed:
 * the recovery IDB record (marked error) is retained by saveAssetDB, but the
 * asset must NOT appear as a final Gallery item nor complete its job.
 */
export function isFinalSaveCommitted(result: SaveAssetDBResult | null | undefined): boolean {
  return !!result && result.success === true;
}

/**
 * Gallery-canonical save: upsert BEFORE writing the IndexedDB cache.
 *
 * Read prior, merge link fields.
 * If eligible (supported data URL), upsert to the main-process Library FIRST.
 * On success: persist returned canonical Library id/url + synced state.
 *    On failure: preserve a recoverable IDB record marked error (never "synced")
 *    and propagate a failure result so callers do not claim a completed
 *    canonical Gallery item.
 *    API unavailable: local-only write, no error state.
 * If not eligible: plain local write.
 */
export async function runSaveAssetDB(asset: Asset, io: SaveAssetDBIO): Promise<SaveAssetDBResult> {
  const prior = await io.readPrior();
  const merged = mergeLinkFields(asset, prior);
  if (!isEligibleForMirror(merged)) {
    await io.write(merged);
    return { success: true, synced: false };
  }
  const body: StudioUpsertBody = {
    studioAssetId: merged.id,
    // Metadata-only when prior linkage + synced state + unchanged URL: omit the
    // multi-MB binary. Never send a canonical (non-data) URL as the binary payload.
    dataUrl: shouldOmitBinary(prior, merged) ? undefined : isSupportedStudioDataUrl(merged.url) ? merged.url : undefined,
    name: merged.title || merged.id,
    prompt: merged.prompt || undefined,
    width: merged.resolution?.width,
    height: merged.resolution?.height,
    mimeType: mimeFromUrl(merged.url),
    outputFormat: ((merged.outputFormat || "png") as string).toLowerCase(),
    // Fase 1: pass through metadata fields for library record.
    ...studioUpsertMetadataFields(merged),
  };
  let result;
  try {
    result = await io.upsert(body);
  } catch (err) {
    console.error("[LibrarySync] upsert threw for", merged.id, err);
    await io.write({ ...merged, librarySyncState: "error" });
    return { success: false, synced: false, detail: err instanceof Error ? err.message : String(err) };
  }
  if (result === null) {
    // Main-process API unavailable (renderer-only dev/test): local-only persist.
    await io.write(merged);
    return { success: true, synced: false };
  }
  if (!result.success) {
    await io.write({ ...merged, ...linkPatchForSyncResult(merged, result) });
    return { success: false, synced: false, detail: result.detail };
  }
  await io.write({ ...merged, ...linkPatchForSyncResult(merged, result) });
  return { success: true, synced: true };
}

// ── Canonical-view helpers (Gallery-canonical asset cutover) ────────────────

/** Build a minimal StockMetadata for a Gallery-originated Studio asset. */
function minimalStockMetadata(lib: LibraryAsset, outputFormat: string): StockMetadata {
  return {
    title: lib.name,
    description: "",
    keywords: [],
    metadataVersion: "v2",
    stockCategory: lib.adobeCategory || "",
    subcategory: lib.subcategory || "",
    contentType: "illustration",
    outputFormat,
    backgroundMode: "white",
    generativeAIDeclaration: true,
    aiDeclared: true,
    aiTool: "Google Gemini Image Generation",
    peopleRelease: "not-applicable",
    propertyRelease: "not-applicable",
    preflightChecks: {},
    preflightPassedAt: null,
    submittedAt: null,
    backgroundVerified: false,
    resolutionVerified: false,
    preflightDecision: null,
    preflightScore: null,
    preflightIssues: [],
    qualityScore: null,
    acceptancePrediction: null,
    suggestions: [],
    metadataSource: null,
    analysisAvailable: null,
  };
}

/**
 * Form a safe minimal Studio Asset from a Gallery LibraryAsset when no IDB
 * cache exists.  The asset carries the canonical Gallery URL and is marked
 * synced so future metadata-only saves propagate correctly.
 */
export function minimalStudioAssetFromLibrary(lib: LibraryAsset): Asset {
  const isSvg = lib.mimeType === "image/svg+xml" || lib.url.endsWith(".svg");
  const outputFormat = isSvg ? "SVG" : "PNG";
  const assetType: "vector" | "illustration" | "3d" | "photo" =
    lib.assetType === "illustration" || lib.assetType === "3d" || lib.assetType === "vector"
      ? lib.assetType : "vector";
  return {
    id: lib.studioAssetId || lib.id,
    type: lib.type,
    assetType,
    generationMode: lib.generationMode || "single",
    adobeCategory: lib.adobeCategory || "",
    subcategory: lib.subcategory || "",
    title: lib.name,
    baseTheme: lib.baseTheme || "",
    archetypeRole: null,
    prompt: lib.prompt || "",
    assembledPrompt: lib.assembledPrompt || "",
    negativePrompt: "",
    aspectRatio: "4:3",
    style: "",
    highDpiSharpness: false,
    outputFormat,
    background: lib.background || "white",
    createdAt: Date.parse(lib.createdAt) || Date.now(),
    status: "ready",
    favorite: !!lib.favorite,
    batchId: "",
    isLoading: false,
    isMetaLoading: false,
    url: lib.url,
    stockMetadata: minimalStockMetadata(lib, outputFormat),
    libraryAssetId: lib.id,
    libraryUrl: lib.url,
    librarySyncState: "synced",
    librarySyncVersion: lib.studioSyncVersion || 1,
    lineage: { exportHistory: lib.exportHistory ?? [] } as Asset['lineage'],
  };
}

/**
 * Enrich a cached IDB record with the canonical Library metadata.
 * Overwrites the local url with the canonical Gallery URL so the live view
 * sources existence from the Gallery (Gallery-canonical).
 */
export function enrichFromLibrary(cached: Asset, lib: LibraryAsset): Asset {
  return {
    ...cached,
    url: lib.url,
    libraryAssetId: lib.id,
    libraryUrl: lib.url,
    librarySyncState: "synced",
    librarySyncVersion: lib.studioSyncVersion || Math.max(cached.librarySyncVersion ?? 0, 1),
    lineage: { ...(cached.lineage ?? ({} as NonNullable<Asset['lineage']>)), exportHistory: lib.exportHistory ?? cached.lineage?.exportHistory ?? [] },
  };
}

// ── Phase 5D: bounded migration of legacy unlinked assets ──────────────────

/**
 * Select the first `limit` assets that are eligible for mirroring AND have no
 * existing Library linkage.  Since eligibility is now status-independent, this
 * includes drafts with completed data URLs (irrespective draft/review status).
 * Already-linked/pending/error assets are excluded, as are content-less assets.
 */
export function getUnlinkedEligibleAssets(assets: Asset[], limit: number): Asset[] {
  const out: Asset[] = [];
  for (const a of assets) {
    if (out.length >= limit) break;
    if (isEligibleForMirror(a) && !hasLibraryLinkage(a)) out.push(a);
  }
  return out;
}

/** @deprecated Use getUnlinkedEligibleAssets — kept for migration smoothness. */
export const getUnlinkedCompletedAssets = getUnlinkedEligibleAssets;

/**
 * Mirror the CURRENT record through the seam, rechecking eligibility and lack
 * of linkage against the freshly-read record (must be invoked inside the per-id
 * queue). A stale snapshot selected outside the queue is never written. Returns
 * true when mirrored; false when the record is gone, ineligible, or already
 * linked (skipped).
 */
export type MigrateCurrentIO = {
  readCurrent: () => Promise<Asset | null>;
  mirror: (asset: Asset) => Promise<void>;
};

export async function migrateCurrentAsset(io: MigrateCurrentIO): Promise<boolean> {
  const current = await io.readCurrent();
  if (!current) return false;
  if (!isEligibleForMirror(current) || hasLibraryLinkage(current)) return false;
  await io.mirror(current);
  return true;
}

/**
 * Migrate a batch of unlinked asset ids through the mirror seam. Each id is
 * handled by an id-based mirror op (production: migrateAssetToLibrary in
 * storage.ts) which must enter the per-id queue first, read the CURRENT record,
 * recheck eligibility + lack of linkage, then mirror that current record — a
 * stale selection made outside the queue can never be written. Never throws —
 * counts migrated/failed.
 */
export async function migrateUnlinked(
  ids: string[],
  mirror: (id: string) => Promise<void>,
): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await mirror(id);
      migrated++;
    } catch {
      failed++;
    }
  }
  return { migrated, failed };
}