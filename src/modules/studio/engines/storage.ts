// Studio storage engine — diekstrak dari imagin_studio.tsx baris 1499–1942.
// IndexedDB helpers, project/job/QA/compliance/feedback storage.
// Uses the established Studio DB so existing assets/jobs and migration sources remain visible.

import type { Asset, QAResult, ComplianceResult, Feedback } from "../types";
import type { ImaginProject } from "./project-engine";
import { DEFAULT_PLATFORM } from "../registry/presets";
import { enrichFromLibrary, getUnlinkedEligibleAssets, isEligibleForMirror, linkPatchForSyncResult, mergeLinkFields, migrateCurrentAsset, minimalStudioAssetFromLibrary, mimeFromUrl, runDeleteAssetLinked, runSaveAssetDB, shouldOmitBinary, type LoadStudioStatus, type MigrateCurrentIO, type SaveAssetDBIO, type SaveAssetDBResult, type StudioUpsertBody } from "./library-sync";
import type { LibraryAsset } from "../../../types";

type StorageApi = {
  studioGetConfig?: () => Promise<{ success: boolean; config: { idbMigrated?: boolean } }>;
  studioStoreGet: (collection: string) => Promise<{ success: boolean; items?: unknown[]; detail?: string }>;
  studioStoreCommit: (body: {
    collection: string;
    ops: Array<{ type: "upsert"; id: string; record: unknown } | { type: "update"; id: string; patch: Record<string, unknown> } | { type: "delete"; id: string } | { type: "replaceAll"; records: unknown[] }>;
  }) => Promise<{ success: boolean; items?: unknown[]; detail?: string }>;
};

let _api: StorageApi | null = null;

export function setStorageApi(api: StorageApi | null): void {
  _api = api;
}

function getApi(): StorageApi {
  const api = _api || (typeof window !== "undefined" ? (window as any).api : null);
  if (!api?.studioStoreGet || !api?.studioStoreCommit) throw new Error("Studio storage API not available");
  return api;
}

async function getAll<T>(collection: string): Promise<T[]> {
  const result = await getApi().studioStoreGet(collection);
  if (!result.success) throw new Error(result.detail || `Failed to read ${collection}`);
  return (result.items ?? []) as T[];
}

async function putAll(collection: string, items: unknown[]): Promise<void> {
  const result = await getApi().studioStoreCommit({ collection, ops: [{ type: "replaceAll", records: items }] });
  if (!result.success) throw new Error(result.detail || `Failed to write ${collection}`);
}

async function upsertItem(collection: string, keyField: string, record: any): Promise<unknown> {
  const id = String(record?.[keyField]);
  const result = await getApi().studioStoreCommit({ collection, ops: [{ type: "upsert", id, record: { ...record, id } }] });
  if (!result.success) throw new Error(result.detail || `Failed to write ${collection}`);
  return record?.[keyField];
}

async function removeItem(collection: string, keyField: string, id: string): Promise<void> {
  const result = await getApi().studioStoreCommit({ collection, ops: [{ type: "delete", id }] });
  if (!result.success) throw new Error(result.detail || `Failed to write ${collection}`);
}

// ── IndexedDB bootstrap (line 1502) ────────────────────────────────────────
// ponytail: assets stay on IDB until Fase 6 App decomp; upgrade path = assets via libraryService.
const DB_NAME = "ImaginDB_VectorMicrostock_v34";
const DB_VERSION = 35; // FIX #14 (audit): bump untuk menghapus zombie stores di DB lama

const initDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // FIX #14 (audit): 'generations' & 'batches' tidak pernah diakses sejak
      // dibuat — hapus dari DB lama, jangan buat lagi untuk DB baru.
      if (db.objectStoreNames.contains("generations")) db.deleteObjectStore("generations");
      if (db.objectStoreNames.contains("batches")) db.deleteObjectStore("batches");
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
      if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id" });
      if (!db.objectStoreNames.contains("diversity_tracker")) db.createObjectStore("diversity_tracker", { keyPath: "key" });
      // FASE 6 / 14: production stores
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "projectId" });
      if (!db.objectStoreNames.contains("jobs")) db.createObjectStore("jobs", { keyPath: "jobId" });
      if (!db.objectStoreNames.contains("qa_results")) db.createObjectStore("qa_results", { keyPath: "assetId" });
      if (!db.objectStoreNames.contains("compliance_results")) db.createObjectStore("compliance_results", { keyPath: "assetId" });
      if (!db.objectStoreNames.contains("feedback")) db.createObjectStore("feedback", { keyPath: "feedbackId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

let _dbInstance: IDBDatabase | null = null;
export async function getDB(): Promise<IDBDatabase> {
  if (_dbInstance) return _dbInstance;
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
  _dbInstance = await initDB();
  return _dbInstance;
}

export async function dbOp<T = unknown>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  const db = await getDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = fn(tx.objectStore(store));
    let requestResult: T | undefined;
    if (request && typeof (request as IDBRequest).onsuccess !== "undefined") {
      const r = request as IDBRequest;
      r.onsuccess = () => {
        requestResult = r.result as T;
      };
      r.onerror = () => reject(r.error);
    }
    tx.oncomplete = () => resolve(requestResult as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export const IDB_MIGRATION_COLLECTIONS = [
  "history", "projects", "feedback", "diversity_tracker", "qa_results", "compliance_results",
] as const;

export async function migrateStudioCollections(
  read: (collection: string) => Promise<unknown[]>,
  write: (collection: string, items: unknown[]) => Promise<void>
): Promise<{ migrated: Record<string, number> } | null> {
  const migrated: Record<string, number> = {};
  for (const collection of IDB_MIGRATION_COLLECTIONS) {
    const items = await read(collection);
    if (!items?.length) continue;
    await write(collection, items);
    migrated[collection] = items.length;
  }
  return Object.keys(migrated).length ? { migrated } : null;
}

let migrationInFlight: Promise<{ migrated: Record<string, number> } | null> | null = null;

export function migrateIdbToStudioStore(): Promise<{ migrated: Record<string, number> } | null> {
  if (migrationInFlight) return migrationInFlight;
  migrationInFlight = (async () => {
    const db = await getDB();
    const entries = await Promise.all(IDB_MIGRATION_COLLECTIONS.map(async (collection) => [
      collection,
      db.objectStoreNames.contains(collection)
        ? await dbOp<unknown[]>(collection, "readonly", (store) => store.getAll())
        : [],
    ] as const));
    const api = getApi();
    if (!api.studioGetConfig) throw new Error("Studio config API not available");
    const config = await api.studioGetConfig();
    if (!config.success) throw new Error("Failed to read Studio migration flag");
    if (config.config.idbMigrated) return null;
    // ponytail: two-window race can re-put the same IDB data in this single-user desktop app; upgrade to a main-process CAS/migration lock if multi-window lands.
    const source = new Map<string, unknown[]>(entries);
    return migrateStudioCollections(async (collection) => source.get(collection) ?? [], putAll);
  })().finally(() => { migrationInFlight = null; });
  return migrationInFlight;
}

// ── Assets store (line 1555) ──────────────────────────────────────────────
// Raw primitives — no mirroring. Used by sync logic and tombstone consumption.
export const putAssetDBRaw = (a: Asset) => dbOp("assets", "readwrite", (s) => s.put(a));
export const getAssetDBRaw = (id: string): Promise<Asset | null> =>
  dbOp<Asset | null>("assets", "readonly", (s) => s.get(id));
export const deleteAssetDBRaw = (id: string) => dbOp("assets", "readwrite", (s) => s.delete(id));

// Per-ID promise chains serialize renderer save/delete ops (no unbounded IPC spam).
export type AssetQueueEnqueue = <T = void>(id: string, fn: () => Promise<T>) => Promise<T>;
export function createAssetQueue(): AssetQueueEnqueue {
  const assetChains = new Map<string, Promise<void>>();
  return <T = void>(id: string, fn: () => Promise<T>) => {
    const prev = assetChains.get(id) ?? Promise.resolve();
    const next = prev.then(fn, fn) as Promise<T>;
    const tail = next.then(() => {}, () => {}); // never-rejecting so the chain survives failures
    assetChains.set(id, tail);
    tail.then(() => { if (assetChains.get(id) === tail) assetChains.delete(id); });
    return next;
  };
}
const enqueue = createAssetQueue();

// Phase 5D migration seam: serialize per-id, then read the CURRENT record INSIDE
// the queue, recheck eligibility + lack of linkage, then mirror. A stale
// selection made outside the queue can never be written over a newer record.
export function runQueuedMigration(
  enqueue: AssetQueueEnqueue,
  id: string,
  io: MigrateCurrentIO,
): Promise<void> {
  return enqueue(id, async () => {
    await migrateCurrentAsset(io);
  });
}

/**
 * Queued canonical sidecar reconciliation — injectable helper.
 * Serializes via per-id queue, re-reads current record inside queue,
 * merges only canonical fields (url, libraryAssetId, libraryUrl, sync state),
 * and preserves all other current fields exactly.
 * Does nothing if no current record exists.
 */
export const runQueuedCanonicalReconciliation = (
  enqueue: AssetQueueEnqueue,
  id: string,
  libraryAsset: LibraryAsset,
  io: { readCurrent: () => Promise<Asset | null>; write: (asset: Asset) => Promise<void> }
): Promise<void> => {
  return enqueue(id, async () => {
    const current = await io.readCurrent();
    if (!current) return;
    const merged: Asset = {
      ...current,
      url: libraryAsset.url,
      libraryAssetId: libraryAsset.id,
      libraryUrl: libraryAsset.url,
      librarySyncState: 'synced' as const,
      librarySyncVersion: libraryAsset.studioSyncVersion ?? current.librarySyncVersion,
    };
    await io.write(merged);
  });
};

/**
 * Production wrapper using the module-level queue.
 */
export const reconcileCanonicalSidecar = (
  id: string,
  libraryAsset: LibraryAsset,
  io: { readCurrent: () => Promise<Asset | null>; write: (asset: Asset) => Promise<void> }
): Promise<void> => runQueuedCanonicalReconciliation(enqueue, id, libraryAsset, io);

type LibrarySyncApi = {
  studioAssetUpsert: (body: StudioUpsertBody) => Promise<{ success: boolean; asset?: { id: string; url?: string }; detail?: string }>;
  studioAssetDeleteLinked: (studioAssetId: string) => Promise<{ success: boolean; detail?: string }>;
};

function getLibrarySyncApi(): LibrarySyncApi | null {
  const api = _api || (typeof window !== "undefined" ? (window as any).api : null);
  return api?.studioAssetUpsert && api?.studioAssetDeleteLinked ? api as LibrarySyncApi : null;
}

// Non-enqueuing save body — shared by saveAssetDB (ordinary saves) and the
// migration op. Gallery-canonical: upsert to the main-process Library FIRST,
// then persist the returned canonical id/url + sync state into the IDB cache.
// On failure a recoverable record marked error is preserved (never claimed
// "synced") and a failure result is propagated to the caller.
async function saveAssetDBBody(a: Asset): Promise<SaveAssetDBResult> {
  return runSaveAssetDB(a, {
    readPrior: () => getAssetDBRaw(a.id),
    write: (asset) => putAssetDBRaw(asset).then(() => {}),
    upsert: (body) => {
      const api = getLibrarySyncApi();
      if (!api) return Promise.resolve(null); // renderer-only: no main-process API
      return api.studioAssetUpsert(body);
    },
  });
}

// Public seam: canonical upsert + IDB cache write.  Returns the save result so
// callers know whether the asset reached the canonical Gallery (synced).
export const saveAssetDB = (a: Asset): Promise<SaveAssetDBResult> => enqueue(a.id, () => saveAssetDBBody(a));

// Phase 5D migration: enters the per-ID queue FIRST, reads the CURRENT record
// inside the queue, rechecks eligibility + lack of linkage there, then mirrors
// that current record. A stale snapshot selected outside the queue can never be
// written over a newer local record. Idempotent: upsert is keyed by studioAssetId.
export const saveAssetDBMigrate = (id: string): Promise<void> =>
  runQueuedMigration(enqueue, id, {
    readCurrent: () => getAssetDBRaw(id),
    mirror: async (asset) => { await saveAssetDBBody(asset); },
  });

// ── Gallery-canonical Studio asset view (cutover) ──────────────────────────
// The Studio assets view sources existence from the main-process Library
// (sourceModule STUDIO), enriched with canonical URLs.  Falls back to the IDB
// cache ONLY when the Library API does not exist (renderer-only test/dev).
// If the Library API exists but fails, an authoritative-unavailable result is
// returned so the caller retains last canonical React state (never merges
// IDB-only completed assets into the Gallery view).
export async function loadStudioAssets(): Promise<{ status: LoadStudioStatus; assets: Asset[] }> {
  const idbAssets = await getAssetsDB();
  const api = _api || (typeof window !== "undefined" ? (window as any).api : null);
  const hasLibraryApi = !!api?.libraryList;
  if (!hasLibraryApi) return { status: "idb-fallback", assets: idbAssets }; // renderer-only test/dev
  let lib: LibraryAsset[];
  try {
    lib = await api.libraryList();
  } catch (err) {
    console.warn("[LibrarySync] fetchLibrary failed; authoritative source unavailable", err);
    return { status: "unavailable", assets: [] };
  }
  const studioLib = (lib || []).filter((l) => l.sourceModule === "STUDIO" && l.studioAssetId);
  const idbById = new Map(idbAssets.map((a) => [a.id, a]));
  const canonical: Asset[] = [];
  for (const l of studioLib) {
    const sid = l.studioAssetId!;
    const cached = idbById.get(sid);
    const asset = cached ? enrichFromLibrary(cached, l) : minimalStudioAssetFromLibrary(l);
    canonical.push(asset);
    // Enrich the IDB cache by exact studioAssetId so the cache stays canonical.
    // Use the per-id queue to avoid racing with concurrent saves.
    if (cached && (cached.url !== l.url || cached.libraryAssetId !== l.id || cached.librarySyncState !== "synced")) {
      await reconcileCanonicalSidecar(sid, l, {
        readCurrent: () => getAssetDBRaw(sid),
        write: (a) => putAssetDBRaw(a).then(() => {}),
      }).catch(() => {});
    }
  }
  // Fase 1: idempotent backfill — fill empty library stockMetadata from IDB.
  // Only fills when the library record has no stockMetadata; never overwrites.
  // Fire-and-forget, non-blocking, capped at 200 patches per run.
  const backfillApi = api;
  const libById = new Map(studioLib.map((l) => [l.studioAssetId!, l]));
  let backfilled = 0;
  for (const asset of canonical) {
    if (backfilled >= 200) break;
    if (!asset.libraryAssetId) continue;
    const libRecord = libById.get(asset.id);
    if (!libRecord || libRecord.stockMetadata) continue; // never overwrite
    const sm = asset.stockMetadata;
    const hasMetadata = sm && (sm.title || (sm.keywords && sm.keywords.length > 0) || asset.adobeCategory);
    if (!hasMetadata) continue;
    backfilled++;
    backfillApi.libraryUpdate(asset.libraryAssetId, { stockMetadata: sm as unknown as Record<string, unknown> }).catch(() => {});
  }
  if (backfilled > 0) console.log(`[LibrarySync] backfilled metadata for ${backfilled} assets`);
  return { status: "canonical", assets: canonical.sort((a, b) => b.createdAt - a.createdAt) };
}

export async function getAssetsDB(): Promise<Asset[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readonly");
    const req = tx.objectStore("assets").getAll();
    req.onsuccess = () => resolve((req.result as Asset[]).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export const deleteAssetDB = (id: string) => deleteAssetDBRaw(id);

// Public Studio delete: dedicated linked Library delete first, then raw IDB delete.
// Passes the RENDERER asset id to the main process — main's deleteStudioLibraryAsset
// matches on asset.studioAssetId === studioAssetId (the renderer id), never the
// Library's internal libraryAssetId (studio-<sha256>).
// Canonical mode (Library delete API available): always attempt main delete by
// renderer asset id (safe because main is idempotent for non-matching ids —
// returns { success: true, no-op }), ensuring Library-only canonical assets (no
// IDB cache) are deleted from Gallery.  If the Library delete API is unavailable
// for a canonical asset, the delete is rejected and IDB/UI cache preserved.
// Local-only delete is permitted only when the API is absent (renderer-only
// noncanonical mode).
export const deleteAssetDBLinked = (id: string): Promise<void> =>
  enqueue(id, () => {
    const api = getLibrarySyncApi();
    return runDeleteAssetLinked(id, {
      getExisting: () => getAssetDBRaw(id),
      deleteLinked: (mainId) => api ? api.studioAssetDeleteLinked(mainId) : Promise.resolve(null),
      deleteLocal: async () => { await deleteAssetDBRaw(id); },
    }, !!api); // alwaysMain = canonical mode iff Library API exists
  });

// Serialized local-only delete (no main call). Used by event/tombstone paths in
// App.tsx — runs through the same per-ID chain as saves so it never races an
// in-flight save, and never loops back to main.
export const deleteAssetDBQueued = (id: string): Promise<void> =>
  enqueue(id, async () => {
    await deleteAssetDBRaw(id);
  });

// ── History store (line 1567) ──────────────────────────────────────────────
export const saveHistoryLog = (h: any) => upsertItem("history", "id", h);

export async function getHistoryDB(): Promise<any[]> {
  return (await getAll<any>("history")).sort((a, b) => b.timestamp - a.timestamp);
}

// ── QA / Compliance / Feedback stores (line 1611+) ────────────────────────
export const saveQAResultDB = (qa: QAResult) => upsertItem("qa_results", "assetId", qa);
export const saveComplianceResultDB = (c: ComplianceResult & { assetId?: string }) =>
  upsertItem("compliance_results", "assetId", c);
export const getQaResultsForAssetDB = async (assetId: string): Promise<QAResult | null> =>
  (await getAll<QAResult>("qa_results")).find((result) => result.assetId === assetId) ?? null;
export const getComplianceResultsForAssetDB = async (assetId: string): Promise<ComplianceResult | null> =>
  (await getAll<ComplianceResult & { assetId?: string }>("compliance_results")).find((result) => result.assetId === assetId) ?? null;
export const saveFeedbackDB = (f: Feedback) => upsertItem("feedback", "feedbackId", f);

export async function getFeedbackDB(): Promise<Feedback[]> {
  return (await getAll<Feedback>("feedback")).sort((a, b) => b.appliedAt - a.appliedAt);
}

export const getFeedbackForAssetDB = async (assetId: string): Promise<Feedback[]> => {
  const all = await getFeedbackDB();
  return all.filter((f) => f.assetId === assetId);
};

export const deleteFeedbackDB = (feedbackId: string) =>
  removeItem("feedback", "feedbackId", feedbackId);

export const feedbackEngine = {
  async record({
    assetId,
    qaDecision,
    reasonCode = "",
    action,
    note = "",
    qaSnapshot = null,
    platform = DEFAULT_PLATFORM,
  }: {
    assetId: string;
    qaDecision: Feedback["qaDecision"];
    reasonCode?: string;
    action: Feedback["action"];
    note?: string;
    qaSnapshot?: Feedback["qaSnapshot"];
    platform?: string;
  }): Promise<Feedback> {
    const f: Feedback = {
      feedbackId: `${assetId}_${Date.now()}`,
      assetId,
      qaDecision,
      reasonCode,
      action,
      note,
      appliedAt: Date.now(),
      qaSnapshot,
      platform,
    };
    await saveFeedbackDB(f);
    return f;
  },
  async list(assetId: string | null = null): Promise<Feedback[]> {
    return assetId ? getFeedbackForAssetDB(assetId) : getFeedbackDB();
  },
  async remove(feedbackId: string): Promise<void> {
    await deleteFeedbackDB(feedbackId);
  },
};

// ── Diversity tracker (line 1668) ─────────────────────────────────────────
export const getDiversityTrackerDB = async (categoryKey: string): Promise<string[]> => {
  return (await getAll<any>("diversity_tracker"))
    .filter((entry) => entry.category === categoryKey)
    .flatMap((entry) => entry.signatures || []);
};

export const markDiversityUsedDB = async (categoryKey: string, signatures: string[]): Promise<void> => {
  const key = `diversity_${categoryKey}`;
  const existing = (await getAll<any>("diversity_tracker")).find((entry) => entry.key === key);
  const merged = new Set([...(existing?.signatures || []), ...signatures]);
  await getApi().studioStoreCommit({ collection: "diversity_tracker", ops: [{ type: "upsert", id: key, record: { key, id: key, category: categoryKey, signatures: [...merged], updatedAt: Date.now() } }] });
};

// ── Project store (line 1686+) ────────────────────────────────────────────
export const saveProjectDB = (p: ImaginProject) => upsertItem("projects", "projectId", p);

export async function getProjectsDB(includeArchived: boolean = false): Promise<ImaginProject[]> {
  return (await getAll<ImaginProject>("projects"))
    .filter((p) => includeArchived || p.archivedAt == null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getProjectDB = async (projectId: string) =>
  (await getAll<ImaginProject>("projects")).find((project) => project.projectId === projectId);

export const deleteProjectDB = (projectId: string) =>
  removeItem("projects", "projectId", projectId);

export const saveLearningEvaluation = async (projectId: string, evaluation: unknown): Promise<void> => {
  const ts = Date.now();
  const id = `${projectId}_${ts}_${Math.random()}`;
  const api = getApi();
  const saved = await api.studioStoreCommit({ collection: "learning_evaluations", ops: [{ type: "upsert", id, record: { id, projectId, ts, evaluation } }] });
  if (!saved.success) throw new Error(saved.detail || "Failed to write learning_evaluations");
  const items = (await getAll<any>("learning_evaluations")).sort((a, b) => b.ts - a.ts);
  const ids = items.slice(50).map((item) => item.id).filter((item) => typeof item === "string");
  if (ids.length) {
    const trimmed = await api.studioStoreCommit({ collection: "learning_evaluations", ops: ids.map((id) => ({ type: "delete" as const, id })) });
    if (!trimmed.success) throw new Error(trimmed.detail || "Failed to trim learning_evaluations");
  }
};

export const getLatestLearningEvaluation = async (projectId: string): Promise<unknown | null> => {
  const latest = (await getAll<any>("learning_evaluations")).filter((x) => x.projectId === projectId).sort((a, b) => b.ts - a.ts)[0];
  return latest?.evaluation ?? null;
};
