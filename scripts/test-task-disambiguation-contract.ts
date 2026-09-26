// Pure contract check for Task panel disambiguation (post-redesign:
// AppHeader/TaskCenterModal were replaced by GlobalTopBar + TaskCenterBar).
// Run: npx tsx scripts/test-task-disambiguation-contract.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "..", rel), "utf-8");

const topBar = read("src/components/GlobalTopBar.tsx");
const centerBar = read("src/components/TaskCenterBar.tsx");

// Top-bar entry exposes the task center with an active-jobs counter
assert.match(topBar, /onTaskCenterToggle/);
assert.match(topBar, /active jobs · Open Task Center/);
assert.match(topBar, /aria-label="Toggle Task Center"/);

// Footer bar owns a dedicated TASK CENTER region (pipeline jobs, separate from Studio generation)
assert.match(centerBar, /<footer/);
assert.match(centerBar, /TASK CENTER/);

console.log("✓ test-task-disambiguation-contract passed");
