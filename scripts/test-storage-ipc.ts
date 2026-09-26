import assert from "assert/strict";
import {
  deleteFeedbackDB,
  deleteProjectDB,
  getDiversityTrackerDB,
  getFeedbackDB,
  getHistoryDB,
  getProjectDB,
  getProjectsDB,
  markDiversityUsedDB,
  saveFeedbackDB,
  saveHistoryLog,
  saveProjectDB,
  setStorageApi,
  type ImaginProject,
} from "../src/modules/studio/engines/storage";
import type { Feedback } from "../src/modules/studio/types";
import fs from "fs";
import os from "os";
import path from "path";
import { del, get, putAll, setStoreRoot } from "../electron/services/studio-store";

const data = new Map<string, unknown[]>();
let failure = "";
function applyOps(list: any[], ops: any[]): any[] {
  for (const op of ops ?? []) {
    if (op.type === "replaceAll") list = [...(op.records ?? [])];
    else if (op.type === "upsert") {
      const i = list.findIndex((r) => String(r.id) === String(op.id));
      if (i >= 0) list[i] = op.record; else list.push(op.record);
    } else if (op.type === "delete") list = list.filter((r) => String(r.id) !== String(op.id));
  }
  return list;
}
setStorageApi({
  async studioStoreGet(collection) {
    if (failure) return { success: false, detail: failure };
    return { success: true, items: [...(data.get(collection) ?? [])] };
  },
  async studioStoreCommit({ collection, ops }: any) {
    if (failure) return { success: false, detail: failure };
    data.set(collection, applyOps([...(data.get(collection) ?? [])], ops));
    return { success: true };
  },
});

const feedback = (feedbackId: string, appliedAt: number, note = ""): Feedback => ({
  feedbackId,
  assetId: "asset-1",
  qaDecision: "pass",
  reasonCode: "",
  action: "accept",
  note,
  appliedAt,
  qaSnapshot: null,
  platform: "adobe_stock",
});

await saveFeedbackDB(feedback("same", 1));
await saveFeedbackDB(feedback("newer", 3));
await saveFeedbackDB(feedback("same", 2, "replaced"));
assert.deepEqual((await getFeedbackDB()).map((item) => [item.feedbackId, item.note]), [["newer", ""], ["same", "replaced"]]);
await deleteFeedbackDB("same");
assert.deepEqual((await getFeedbackDB()).map((item) => item.feedbackId), ["newer"]);

await markDiversityUsedDB("icons", ["a", "b"]);
await markDiversityUsedDB("icons", ["b", "c"]);
assert.deepEqual(await getDiversityTrackerDB("icons"), ["a", "b", "c"]);

const project = (projectId: string, updatedAt: number, archivedAt: number | null): ImaginProject => ({
  projectId,
  name: projectId,
  description: "",
  createdAt: 1,
  updatedAt,
  archivedAt,
  jobIds: [],
  assetCount: 0,
  settings: {},
});
await saveProjectDB(project("active", 2, null));
await saveProjectDB(project("archived", 3, 4));
assert.deepEqual((await getProjectsDB()).map((item) => item.projectId), ["active"]);
assert.deepEqual((await getProjectsDB(true)).map((item) => item.projectId), ["archived", "active"]);
assert.equal((await getProjectDB("archived"))?.name, "archived");
await deleteProjectDB("active");
assert.equal(await getProjectDB("active"), undefined);

await saveHistoryLog({ id: "old", timestamp: 1 });
await saveHistoryLog({ id: "new", timestamp: 2 });
assert.deepEqual((await getHistoryDB()).map((item) => item.id), ["new", "old"]);

failure = "disk unavailable";
await assert.rejects(getHistoryDB(), /disk unavailable/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "storage-ipc-real-"));
try {
  setStoreRoot(root);
  setStorageApi({
    async studioStoreGet(collection) { try { return { success: true, items: get(collection).items }; } catch (e) { return { success: false, detail: (e as Error).message }; } },
    async studioStoreCommit({ collection, ops }: any) { try { return { success: true, items: putAll(collection, applyOps([...get(collection).items], ops)).items }; } catch (e) { return { success: false, detail: (e as Error).message }; } },
  });
  await saveFeedbackDB(feedback("real", 4));
  assert.equal((await getFeedbackDB())[0].feedbackId, "real");
  await deleteFeedbackDB("real");
  assert.deepEqual(await getFeedbackDB(), []);
  await markDiversityUsedDB("real-icons", ["a"]);
  await markDiversityUsedDB("real-icons", ["b"]);
  assert.deepEqual(await getDiversityTrackerDB("real-icons"), ["a", "b"]);
  await assert.rejects(async () => {
    setStorageApi({ studioStoreGet: async () => ({ success: false, detail: "malformed response" }), studioStoreCommit: async () => ({ success: true }) });
    await getHistoryDB();
  }, /malformed response/);
  assert.throws(() => get("not_allowed"), /Unknown studio collection/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("[storage-ipc] all checks passed");
