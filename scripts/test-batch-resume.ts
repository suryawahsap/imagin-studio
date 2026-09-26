// Real-service test for batch-resume persistence (Fase 5 lanjutan).
// Run: npx tsx scripts/test-batch-resume.ts

import fs from "fs";
import os from "os";
import path from "path";
import assert from "assert/strict";
import { setBatchResumeRoot, getBatchResumeRoot, getBatchResume, setBatchResume } from "../electron/services/batch-resume";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "batch-resume-test-"));
let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  fn();
  console.log(`  ✓ ${name}`);
}

try {
  setBatchResumeRoot(root);
  assert.equal(getBatchResumeRoot(), root);
  console.log("batch-resume real-service test (temp dir:", root, ")");

  check("missing file returns null", () => {
    assert.equal(getBatchResume(), null);
  });

  check("set/get round-trips", () => {
    setBatchResume({ sessionId: "s1", promptIndex: 3, batchId: "b1", batch: { prompts: ["a", "b"] } });
    const data = getBatchResume();
    assert.equal(data?.sessionId, "s1");
    assert.equal(data?.promptIndex, 3);
    assert.equal(data?.batchId, "b1");
    assert.ok(typeof data?.savedAt === "number");
  });

  check("null clears the file", () => {
    setBatchResume(null);
    assert.equal(getBatchResume(), null);
    assert.equal(fs.existsSync(path.join(root, "batch-resume.json")), false);
  });

  check("expired record (>24h) returns null and deletes file", () => {
    const file = path.join(root, "batch-resume.json");
    fs.writeFileSync(file, JSON.stringify({ sessionId: "old", savedAt: Date.now() - 25 * 60 * 60 * 1000 }));
    assert.equal(getBatchResume(), null);
    assert.equal(fs.existsSync(file), false);
  });

  check("atomic write failure preserves prior file", () => {
    setBatchResume({ sessionId: "keep" });
    const file = path.join(root, "batch-resume.json");
    const prior = fs.readFileSync(file, "utf-8");

    const origWrite = fs.writeFileSync;
    (fs as any).writeFileSync = (p: unknown, ...args: unknown[]) => {
      if (typeof p === "string" && p.includes(".tmp")) throw new Error("simulated EACCES");
      return origWrite(p as string, ...args);
    };
    try {
      assert.throws(() => setBatchResume({ sessionId: "new" }), /simulated EACCES/);
    } finally {
      (fs as any).writeFileSync = origWrite;
    }
    assert.equal(fs.readFileSync(file, "utf-8"), prior);
    assert.equal(fs.readdirSync(root).filter((f) => f.includes(".tmp")).length, 0);
    assert.equal(getBatchResume()?.sessionId, "keep");
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(`\n[batch-resume] all ${checks} checks passed`);
process.exit(0);
