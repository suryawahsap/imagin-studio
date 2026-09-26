// Pure unit test for the reducers merged into state.ts (Fase 5 lanjutan).
// Run: npx tsx scripts/test-state-reducers.ts

import assert from "assert/strict";
import { selectionReducer, assetsReducer, batchQueueReducer, createIdleBatchQueue } from "../src/modules/studio/state";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

check("selectionReducer: toggle adds then removes", () => {
  let s = selectionReducer(new Set(), { type: "toggle", id: "a" });
  assert.deepEqual([...s], ["a"]);
  s = selectionReducer(s, { type: "toggle", id: "a" });
  assert.deepEqual([...s], []);
});

check("selectionReducer: add/remove/clear/set", () => {
  let s = selectionReducer(new Set(), { type: "add", id: "a" });
  s = selectionReducer(s, { type: "add", id: "b" });
  assert.deepEqual([...s].sort(), ["a", "b"]);
  s = selectionReducer(s, { type: "remove", id: "a" });
  assert.deepEqual([...s], ["b"]);
  s = selectionReducer(s, { type: "set", ids: ["x", "y"] });
  assert.deepEqual([...s].sort(), ["x", "y"]);
  s = selectionReducer(s, { type: "clear" });
  assert.deepEqual([...s], []);
});

check("assetsReducer: upsert inserts new, updates existing", () => {
  let a = assetsReducer([], { type: "upsert", asset: { id: "1", v: 1 } });
  assert.deepEqual(a, [{ id: "1", v: 1 }]);
  a = assetsReducer(a, { type: "upsert", asset: { id: "1", v: 2 } });
  assert.deepEqual(a, [{ id: "1", v: 2 }]);
  a = assetsReducer(a, { type: "upsert", asset: { id: "2", v: 1 } });
  assert.deepEqual(a, [{ id: "2", v: 1 }, { id: "1", v: 2 }]);
});

check("assetsReducer: patch/patchMany/remove", () => {
  let a = [{ id: "1", v: 1 }, { id: "2", v: 1 }, { id: "3", v: 1 }];
  a = assetsReducer(a, { type: "patch", id: "1", patch: { v: 9 } });
  assert.equal(a.find((x) => x.id === "1")?.v, 9);
  a = assetsReducer(a, { type: "patchMany", ids: ["2", "3"], patch: { v: 5 } });
  assert.equal(a.find((x) => x.id === "2")?.v, 5);
  assert.equal(a.find((x) => x.id === "3")?.v, 5);
  a = assetsReducer(a, { type: "remove", id: "1" });
  assert.equal(a.length, 2);
  a = assetsReducer(a, { type: "remove", ids: ["2"] });
  assert.deepEqual(a.map((x) => x.id), ["3"]);
});

check("batchQueueReducer: completed/failed/patch/reset", () => {
  let q: any = createIdleBatchQueue();
  q = batchQueueReducer(q, { type: "completed" });
  assert.equal(q.completed, 1);
  q = batchQueueReducer(q, { type: "completed", count: 2 });
  assert.equal(q.completed, 3);
  q = batchQueueReducer(q, { type: "failed" });
  assert.equal(q.failed, 1);
  q = batchQueueReducer(q, { type: "patch", patch: { isRunning: true } });
  assert.equal(q.isRunning, true);
  q = batchQueueReducer(q, { type: "reset" });
  assert.deepEqual(q, createIdleBatchQueue());
});

console.log(`\n[state-reducers] all ${checks} checks passed`);
process.exit(0);
