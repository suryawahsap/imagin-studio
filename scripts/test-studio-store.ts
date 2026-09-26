// Real-service test for the Phase 1A studio metadata store.
// Imports the actual service, isolates it via setStoreRoot().
// Run: npx tsx scripts/test-studio-store.ts  (or npm run test:studio-store)

import fs from "fs";
import os from "os";
import path from "path";
import assert from "assert/strict";
import { setStoreRoot, getStoreRoot, get, putAll, append, del, commit } from "../electron/services/studio-store";

const SCHEMA_VERSION = 1;
const MAX_ITEM_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 200_000;

function quarantineFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.includes(".corrupt-"));
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-store-test-"));
let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

try {
  setStoreRoot(root);
  assert.equal(getStoreRoot(), root);
  console.log("studio-store real-service test (temp dir:", root, ")");

  // ── 1. Whitelist / path traversal ──────────────────────────────────────────
  check("unknown collection rejected (all ops)", () => {
    assert.throws(() => get("assets"), /Unknown studio collection/);
    assert.throws(() => get(""), /Unknown studio collection/);
    assert.throws(() => get("history/../settings.json"), /Unknown studio collection/);
    assert.throws(() => putAll("jobs", []), /Unknown studio collection/);
    assert.throws(() => append("batches", { id: "b" }), /Unknown studio collection/);
    assert.throws(() => del("generations", ["x"]), /Unknown studio collection/);
  });

  // ── 2. ENOENT is legitimate empty (not an error) ──────────────────────────
  check("missing collection reads empty (ENOENT)", () => {
    // No file exists yet
    assert.deepEqual(get("history").items, []);
    assert.deepEqual(get("projects").items, []);
    assert.deepEqual(get("feedback").items, []);
  });

  // ── 3. Invalid / oversized input rejected without write ────────────────────
  check("invalid input rejected without write", () => {
    const before = fs.readdirSync(root).sort();
    assert.throws(() => putAll("history", "nope"), /items must be an array/);
    assert.throws(() => putAll("history", { id: "x" }), /items must be an array/);
    assert.throws(() => putAll("history", [null]), /JSON-safe record or array/);
    assert.throws(() => putAll("history", [42]), /JSON-safe record or array/);
    assert.throws(() => putAll("history", ["text"]), /JSON-safe record or array/);
    assert.throws(() => append("history", null), /JSON-safe record or array/);
    assert.throws(() => putAll("history", new Array(MAX_ITEMS + 1).fill({})), /Too many items/);
    assert.throws(() => putAll("history", [{ id: "x", blob: "y".repeat(MAX_ITEM_BYTES + 10) }]), /exceeds/);
    assert.deepEqual(fs.readdirSync(root).sort(), before, "no file written");
  });

  // ── 4. append / putAll / delete semantics ──────────────────────────────────
  check("append accumulates records + envelope", () => {
    append("history", { id: "h1", prompt: "one" });
    append("history", { id: "h2", prompt: "two" });
    assert.deepEqual(get("history").items, [
      { id: "h1", prompt: "one" },
      { id: "h2", prompt: "two" },
    ]);
    const raw = JSON.parse(fs.readFileSync(path.join(root, "history.json"), "utf-8"));
    assert.equal(raw.schemaVersion, SCHEMA_VERSION);
    assert.equal(raw.items.length, 2);
  });

  check("putAll replaces all items", () => {
    putAll("history", [{ id: "z", n: 1 }]);
    assert.deepEqual(get("history").items, [{ id: "z", n: 1 }]);
    putAll("history", []);
    assert.deepEqual(get("history").items, []);
  });

  check("delete removes by id (unknown id no-op)", () => {
    putAll("projects", [{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
    const res = del("projects", ["p2"]);
    assert.deepEqual(
      res.items.map((i) => (i as Record<string, unknown>).id),
      ["p1", "p3"]
    );
    assert.deepEqual(
      del("projects", ["nope"]).items.map((i) => (i as Record<string, unknown>).id),
      ["p1", "p3"]
    );
  });

  // ── 5. Atomic write failure preserves prior file ──────────────────────────
  check("atomic write failure preserves prior file", () => {
    putAll("compliance_results", [{ id: "c1", rule: "brand" }]);
    const filePath = path.join(root, "compliance_results.json");
    const prior = fs.readFileSync(filePath, "utf-8");

    // Monkey-patch fs.writeFileSync to fail on temp files.
    const origWrite = fs.writeFileSync;
    (fs as any).writeFileSync = (p: unknown, ...args: unknown[]) => {
      if (typeof p === "string" && p.includes(".tmp")) throw new Error("simulated EACCES");
      return origWrite(p as string, ...args);
    };
    try {
      assert.throws(() => putAll("compliance_results", [{ id: "c2" }]), /simulated EACCES/);
    } finally {
      (fs as any).writeFileSync = origWrite;
    }
    // Prior file byte-identical.
    assert.equal(fs.readFileSync(filePath, "utf-8"), prior);
    // No leftover temp files.
    assert.equal(fs.readdirSync(root).filter((f) => f.includes(".tmp")).length, 0);
    // Read-after-failed-write returns committed data.
    assert.deepEqual(get("compliance_results").items, [{ id: "c1", rule: "brand" }]);
  });

  // ── 6. Corrupt collection quarantined on get (no silent empty) ────────────
  check("corrupt JSON quarantined on get", () => {
    const filePath = path.join(root, "feedback.json");
    fs.writeFileSync(filePath, "{ not valid json", "utf-8");
    assert.throws(() => get("feedback"), /corrupt/);
    // Original file moved away.
    assert.equal(fs.existsSync(filePath), false, "corrupt file removed");
    const q = quarantineFiles(root);
    assert.equal(q.length, 1, "one quarantine file");
    assert.match(q[0], /^feedback\.json\.corrupt-\d+$/);
    // Corrupt content preserved in quarantine.
    assert.equal(
      fs.readFileSync(path.join(root, q[0]), "utf-8"),
      "{ not valid json",
      "corrupt content preserved"
    );
  });

  check("invalid envelope quarantined on get", () => {
    const filePath = path.join(root, "qa_results.json");
    // schemaVersion is wrong AND items is not an array.
    fs.writeFileSync(filePath, '{"schemaVersion":9,"items":{}}', "utf-8");
    assert.throws(() => get("qa_results"), /corrupt/);
    assert.equal(fs.existsSync(filePath), false, "invalid envelope file removed");
    const q = quarantineFiles(root);
    assert.equal(q.length, 2);
    assert.ok(q.some((f) => f.startsWith("qa_results.json.corrupt-")));
  });

  check("get on already-quarantined collection returns empty (ENOENT)", () => {
    // After quarantine, the original file is gone → ENOENT → empty.
    assert.deepEqual(get("feedback").items, []);
    assert.deepEqual(get("qa_results").items, []);
  });

  // ── 7. append after corruption → fails, no replacement file written ──────
  check("append after corruption fails without write", () => {
    const filePath = path.join(root, "diversity_tracker.json");
    fs.writeFileSync(filePath, "broken", "utf-8");
    const qBefore = quarantineFiles(root).length;
    assert.throws(() => append("diversity_tracker", { id: "d1" }), /corrupt/);
    // Original file removed (quarantined).
    assert.equal(fs.existsSync(filePath), false, "no replacement file from append");
    // Exactly one more quarantine.
    assert.equal(quarantineFiles(root).length, qBefore + 1);
  });

  // ── 8. del after corruption → fails ──────────────────────────────────────
  check("delete after corruption fails", () => {
    const filePath = path.join(root, "projects.json"); // has data from check 4
    // Overwrite with garbage.
    fs.writeFileSync(filePath, "!!invalid", "utf-8");
    assert.throws(() => del("projects", ["p1"]), /corrupt/);
    // File quarantined; no replacement written.
    assert.equal(fs.existsSync(filePath), false);
  });

  // ── 9. putAll on corrupt file overwrites (explicit replacement op) ────────
  check("putAll overwrites corrupt file (explicit replacement)", () => {
    const filePath = path.join(root, "feedback.json"); // was quarantined in check 6
    // Write a fresh corrupt file.
    fs.writeFileSync(filePath, "garbage", "utf-8");
    // putAll does NOT read the existing file — it validates and writes.
    putAll("feedback", [{ id: "fresh", ok: true }]);
    assert.deepEqual(get("feedback").items, [{ id: "fresh", ok: true }]);
  });

  // ── 10. Independent files per collection ──────────────────────────────────
  check("files are independent per collection", () => {
    append("feedback", { id: "f2", note: "another" });
    assert.equal(get("feedback").items.length, 2); // previous + this
    assert.equal(
      get("history").items.length,
      0,
      "history collection untouched (was cleared by putAll([]))"
    );
  });

  await Promise.all(Array.from({ length: 25 }, (_, i) => commit("history", [{ type: "upsert", id: `concurrent-${i}`, record: { value: i } }])));
  assert.equal(get("history").items.filter((x: any) => x.id.startsWith("concurrent-")).length, 25);
  checks++;
  console.log("  ✓ concurrent commits preserve different ids");

  await Promise.all(Array.from({ length: 60 }, (_, i) => commit("learning_evaluations", [{ type: "upsert", id: `evaluation-${i}`, record: { projectId: "p", ts: i, evaluation: i } }])));
  assert.equal(get("learning_evaluations").items.length, 60);
  checks++;
  console.log("  ✓ learning evaluation commit records are retained for renderer trim");

} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(`\n[studio-store] all ${checks} checks passed`);
process.exit(0);
