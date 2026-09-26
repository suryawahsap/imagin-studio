import fs from "fs";
import path from "path";
import { metadataRoot } from "../binaries/paths";

/**
 * Studio metadata store (Phase 1A, gate-approved architecture).
 *
 * - ONE service module with a whitelisted collection set.
 * - Each collection persists independently at
 *   `storage/metadata/studio/<collection>.json` shaped
 *   `{ schemaVersion: 1, items: [...] }`.
 * - Writes are atomic: temp file + rename in the same directory.
 * - Collection names are validated against the whitelist internally;
 *   a filesystem path is NEVER derived from renderer input.
 * - Ops: get, commit, putAll, append, del. Items must be JSON-safe records/arrays
 *   under conservative payload size caps.
 * - Corrupt/invalid collection files are quarantined (renamed to
 *   `<collection>.json.corrupt-<timestamp>`) and a useful error is thrown;
 *   only ENOENT (file never created) is treated as empty.
 *
 * IndexedDB is intentionally untouched: this phase does not migrate, import,
 * delete, open, or write any browser storage (assets/jobs/batches/generations
 * and localStorage are excluded).
 */

const VALID_COLLECTIONS = [
  "history",
  "projects",
  "feedback",
  "diversity_tracker",
  "qa_results",
  "compliance_results",
  "learning_evaluations",
] as const;

export type StudioCollection = (typeof VALID_COLLECTIONS)[number];

const SCHEMA_VERSION = 1;

// Conservative payload caps.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MiB per collection file
const MAX_ITEM_BYTES = 2 * 1024 * 1024;  // 2 MiB per item
const MAX_ITEMS = 200_000;

// Base directory. Defaults to the app-owned metadata dir; tests may override
// via setStoreRoot() to stay away from user storage.
let storeRoot = path.join(metadataRoot, "studio");
const collectionChains = new Map<StudioCollection, Promise<void>>();

/** Test-only hook: point the store at an isolated directory. */
export function setStoreRoot(dir: string): void {
  storeRoot = dir;
}

/** Current store root (also useful for diagnostics/tests). */
export function getStoreRoot(): string {
  return storeRoot;
}

function assertCollection(name: string): asserts name is StudioCollection {
  if (typeof name !== "string" || !(VALID_COLLECTIONS as readonly string[]).includes(name)) {
    throw new Error(
      `Unknown studio collection "${name}". Allowed: ${VALID_COLLECTIONS.join(", ")}`
    );
  }
}

// Path is built ONLY from a validated whitelist name — never from renderer input.
function collectionPath(collection: StudioCollection): string {
  return path.join(storeRoot, `${collection}.json`);
}

/**
 * Quarantine a corrupt/invalid collection file by renaming it to
 * `<collection>.json.corrupt-<timestamp>`.  Always throws; never returns.
 */
function quarantineCorrupt(collection: StudioCollection, file: string, reason: string): never {
  const quarantinePath = `${file}.corrupt-${Date.now()}`;
  try {
    fs.renameSync(file, quarantinePath);
  } catch (renameErr: unknown) {
    throw new Error(
      `Collection "${collection}" is corrupt (${reason}) and quarantine failed: ${
        (renameErr as Error).message || "rename error"
      }`
    );
  }
  throw new Error(
    `Collection "${collection}" is corrupt (${reason}); quarantined to ${path.basename(quarantinePath)}`
  );
}

function readStore(collection: StudioCollection): { items: unknown[] } {
  const file = collectionPath(collection);
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf-8");
  } catch (err: unknown) {
    // ENOENT is legitimate — file has never been created.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { items: [] };
    }
    // Any other read error (permissions, locked file, …) is a hard failure.
    throw new Error(
      `Failed to read collection "${collection}": ${(err as Error).message || "unknown error"}`
    );
  }
  // Attempt JSON parse.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    quarantineCorrupt(collection, file, `invalid JSON (${(err as Error).message || "parse error"})`);
  }
  // Validate envelope { schemaVersion: 1, items: [...] }.
  const rec = parsed as Record<string, unknown> | null;
  if (
    !rec ||
    Array.isArray(rec) ||
    rec.schemaVersion !== SCHEMA_VERSION ||
    !Array.isArray(rec.items)
  ) {
    quarantineCorrupt(collection, file, "invalid envelope (expected {schemaVersion:1, items:[...]})");
  }
  return { items: rec.items as unknown[] };
}

function atomicWrite(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  try {
    fs.writeFileSync(tmp, data, "utf-8");
    fs.renameSync(tmp, file);
  } finally {
    // Best-effort cleanup if write/rename failed before completing.
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function writeStore(collection: StudioCollection, items: unknown[]): void {
  const data = JSON.stringify({ schemaVersion: SCHEMA_VERSION, items });
  const bytes = Buffer.byteLength(data, "utf-8");
  if (bytes > MAX_FILE_BYTES) {
    throw new Error(`Collection "${collection}" exceeds ${MAX_FILE_BYTES} bytes`);
  }
  atomicWrite(collectionPath(collection), data);
}

/** True when `value` is a JSON-safe object or array (no circular refs, no primitives). */
function isJsonSafeValue(value: unknown): value is object {
  if (value === null || typeof value !== "object") return false;
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function assertItemSize(item: object, index: number): void {
  const bytes = Buffer.byteLength(JSON.stringify(item), "utf-8");
  if (bytes > MAX_ITEM_BYTES) {
    throw new Error(`Item at index ${index} exceeds ${MAX_ITEM_BYTES} bytes`);
  }
}

function validateItems(items: unknown[]): void {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }
  if (items.length > MAX_ITEMS) {
    throw new Error(`Too many items (${items.length} > ${MAX_ITEMS})`);
  }
  for (let i = 0; i < items.length; i++) {
    if (!isJsonSafeValue(items[i])) {
      throw new Error(`Item at index ${i} must be a JSON-safe record or array`);
    }
    assertItemSize(items[i] as object, i);
  }
}

/**
 * Read all items of a collection.
 *
 * - Missing file (ENOENT) → returns empty (legitimate).
 * - Corrupt/invalid JSON file → quarantined, throws an error.
 * - Unknown collection names throw (whitelist enforcement).
 */
export function get(collection: string): { items: unknown[] } {
  assertCollection(collection);
  return readStore(collection);
}

/** Replace all items of a collection (atomic write). */
export function putAll(collection: string, items: unknown[]): { items: unknown[] } {
  assertCollection(collection);
  validateItems(items);
  writeStore(collection, items);
  return { items };
}

/** Append one JSON-safe record/array to a collection (atomic write). */
export function append(collection: string, item: unknown): { items: unknown[] } {
  assertCollection(collection);
  validateItems([item]);
  const { items } = readStore(collection); // may throw on corruption
  items.push(item);
  validateItems(items);
  writeStore(collection, items);
  return { items };
}

/** Remove items whose `id` field is in `ids` (atomic write). */
export function del(collection: string, ids: string[]): { items: unknown[] } {
  assertCollection(collection);
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new Error("ids must be an array of strings");
  }
  const idSet = new Set(ids);
  const { items } = readStore(collection); // may throw on corruption
  const remaining = items.filter(
    (item) =>
      !(
        isJsonSafeValue(item) &&
        typeof (item as Record<string, unknown>).id === "string" &&
        idSet.has((item as Record<string, unknown>).id as string)
      )
  );
  writeStore(collection, remaining);
  return { items: remaining };
}

export type StudioStoreOp =
  | { type: "upsert"; id: string; record: unknown }
  | { type: "update"; id: string; patch: Record<string, unknown> }
  | { type: "delete"; id: string }
  | { type: "replaceAll"; records: unknown[] };

/** Apply an ordered operation list as one serialized read/mutate/write transaction. */
export function commit(collection: string, ops: StudioStoreOp[]): Promise<{ items: unknown[] }> {
  assertCollection(collection);
  if (!Array.isArray(ops)) return Promise.reject(new Error("ops must be an array"));
  const previous = collectionChains.get(collection) ?? Promise.resolve();
  const run = previous.then(() => {
    const items = readStore(collection).items;
    for (const op of ops) {
      if (!op || typeof op !== "object" || typeof op.type !== "string") throw new Error("invalid studio store operation");
      if (op.type === "replaceAll") { validateItems(op.records); items.splice(0, items.length, ...op.records); continue; }
      if (typeof op.id !== "string") throw new Error("operation id must be a string");
      const index = items.findIndex((item) => isJsonSafeValue(item) && (item as Record<string, unknown>).id === op.id);
      if (op.type === "delete") { if (index >= 0) items.splice(index, 1); }
      else if (op.type === "upsert") { if (!isJsonSafeValue(op.record)) throw new Error("record must be a JSON-safe record or array"); const record = { ...(op.record as Record<string, unknown>), id: op.id }; if (index >= 0) items[index] = record; else items.push(record); }
      else if (op.type === "update") { if (!isJsonSafeValue(op.patch)) throw new Error("patch must be a JSON-safe record or array"); const record = { ...(index >= 0 ? items[index] as Record<string, unknown> : {}), ...op.patch, id: op.id }; if (index >= 0) items[index] = record; else items.push(record); }
      else throw new Error("Unknown operation");
    }
    validateItems(items); writeStore(collection, items); return { items };
  });
  collectionChains.set(collection, run.then(() => {}, () => {}));
  return run;
}
