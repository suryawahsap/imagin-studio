import assert from "assert/strict";
import { IDB_MIGRATION_COLLECTIONS, migrateIdbToStudioStore, migrateStudioCollections, setStorageApi } from "../src/modules/studio/engines/storage";

assert.deepEqual(IDB_MIGRATION_COLLECTIONS, [
  "history", "projects", "feedback", "diversity_tracker", "qa_results", "compliance_results",
]);
assert.equal(new Set(IDB_MIGRATION_COLLECTIONS).size, 6);
const seeded: Record<string, unknown[]> = {
  history: [{ id: "h1" }], projects: [{ projectId: "p1" }, { projectId: "p2" }],
  feedback: [], diversity_tracker: [{ key: "d1" }], qa_results: [], compliance_results: [{ assetId: "a1" }],
};
const writes: Array<{ collection: string; items: unknown[] }> = [];
const result = await migrateStudioCollections(
  async (collection) => seeded[collection],
  async (collection, items) => { writes.push({ collection, items }); }
);
assert.deepEqual(result, { migrated: { history: 1, projects: 2, diversity_tracker: 1, compliance_results: 1 } });
assert.deepEqual(writes.map(({ collection }) => collection), ["history", "projects", "diversity_tracker", "compliance_results"]);
assert.equal(await migrateStudioCollections(async () => [], async () => assert.fail("empty stores must be skipped")), null);
await assert.rejects(
  migrateStudioCollections(async () => [{ id: "x" }], async () => { throw new Error("IPC failed"); }),
  /IPC failed/
);

const keyPaths: Record<string, string> = {
  assets: "id", history: "id", diversity_tracker: "key", projects: "projectId", jobs: "jobId",
  qa_results: "assetId", compliance_results: "assetId", feedback: "feedbackId",
};
const idbSeed: Record<string, unknown[]> = {
  assets: [], history: [{ id: "h-idb" }], diversity_tracker: [{ key: "d-idb", category: "icons", signatures: ["x"] }],
  projects: [{ projectId: "p-idb" }], jobs: [], qa_results: [],
  compliance_results: [{ assetId: "a-idb" }], feedback: [{ feedbackId: "f-idb" }],
};
const names = Object.assign(Object.keys(keyPaths), { contains: (name: string) => name in keyPaths });
const fakeDb = {
  objectStoreNames: names,
  transaction(store: string) {
    const tx: any = { error: null };
    tx.objectStore = () => ({
      keyPath: keyPaths[store],
      getAll() {
        const request: any = { result: idbSeed[store], error: null, onsuccess: null, onerror: null };
        queueMicrotask(() => { request.onsuccess?.(); queueMicrotask(() => tx.oncomplete?.()); });
        return request;
      },
    });
    return tx;
  },
};
(globalThis as any).indexedDB = {
  open(name: string, version: number) {
    assert.equal(name, "ImaginDB_VectorMicrostock_v34");
    assert.equal(version, 35);
    const request: any = { result: fakeDb, error: null };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  },
};

let flag = false;
let releaseConfig!: () => void;
const configGate = new Promise<void>((resolve) => { releaseConfig = resolve; });
const ipcWrites: Array<{ collection: string; items: unknown[] }> = [];
setStorageApi({
  async studioGetConfig() { await configGate; return { success: true, config: { idbMigrated: flag } }; },
  async studioStoreGet() { return { success: true, items: [] }; },
  async studioStoreCommit({ collection, ops }: any) { ipcWrites.push({ collection, items: (ops ?? []).flatMap((o: any) => o.type === "replaceAll" ? o.records ?? [] : []) }); return { success: true }; },
});
const first = migrateIdbToStudioStore();
const duplicate = migrateIdbToStudioStore();
assert.equal(first, duplicate, "concurrent calls share one in-flight promise");
releaseConfig();
assert.deepEqual(await first, { migrated: { history: 1, projects: 1, feedback: 1, diversity_tracker: 1, compliance_results: 1 } });
assert.deepEqual(ipcWrites.map(({ collection }) => collection), ["history", "projects", "feedback", "diversity_tracker", "compliance_results"]);
assert.deepEqual(ipcWrites.find(({ collection }) => collection === "feedback")?.items, [{ feedbackId: "f-idb" }]);

flag = true;
ipcWrites.length = 0;
assert.equal(await migrateIdbToStudioStore(), null, "fresh config flag aborts writes");
assert.deepEqual(ipcWrites, []);

flag = false;
let flagWrites = 0;
setStorageApi({
  async studioGetConfig() { return { success: true, config: { idbMigrated: flag } }; },
  async studioStoreGet() { return { success: true, items: [] }; },
  async studioStoreCommit() { throw new Error("IPC failed"); },
});
await assert.rejects(migrateIdbToStudioStore(), /IPC failed/);
assert.equal(flag, false);
assert.equal(flagWrites, 0, "migration service never marks the flag after failed writes");
console.log("[idb-migration] all checks passed");
