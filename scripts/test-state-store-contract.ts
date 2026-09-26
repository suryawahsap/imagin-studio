// Fase 5 check: every binding App.tsx destructures from useImaginStateStore()
// must actually be returned by state.ts's implementation. Catches drift like
// the sidebarMenuOpen regression found during the state.ts extraction.
// Run: npx tsx scripts/test-state-store-contract.ts

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "modules", "studio");
const stateSrc = fs.readFileSync(path.join(root, "state.ts"), "utf-8");
const appSrc = fs.readFileSync(path.join(root, "App.tsx"), "utf-8");

const hookStart = stateSrc.indexOf("export function useImaginStateStore()");
assert.ok(hookStart !== -1, "state.ts: could not find useImaginStateStore definition");
const returnStart = stateSrc.indexOf("return {", hookStart);
assert.ok(returnStart !== -1, "state.ts: could not find useImaginStateStore return statement");
const returnEnd = stateSrc.indexOf("};", returnStart);
assert.ok(returnEnd !== -1, "state.ts: could not find end of return statement");
const returned = new Set(
  stateSrc
    .slice(returnStart + "return {".length, returnEnd)
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter(Boolean)
    .map((s) => s.replace(/,$/, "").split(":")[0].trim())
);

const callEnd = appSrc.indexOf("= useImaginStateStore();");
assert.ok(callEnd !== -1, "App.tsx: could not find useImaginStateStore() call site");
const blockStart = appSrc.lastIndexOf("const {", callEnd);
const blockEnd = appSrc.lastIndexOf("}", callEnd);
assert.ok(blockStart !== -1 && blockStart < blockEnd, "App.tsx: could not locate destructure block bounds");
const destructured = appSrc
  .slice(blockStart + "const {".length, blockEnd)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const missing = destructured.filter((name) => !returned.has(name));
assert.deepEqual(missing, [], `App.tsx destructures bindings state.ts doesn't return: ${missing.join(", ")}`);

console.log(`[state-store-contract] ${destructured.length} bindings match state.ts return shape`);
