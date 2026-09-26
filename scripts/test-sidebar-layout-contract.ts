// Narrow contract check for Sidebar layout / footer structure.
// Run: npx tsx scripts/test-sidebar-layout-contract.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sidebarPath = path.resolve(__dirname, "../src/modules/studio/ui/components/Sidebar.tsx");
const source = fs.readFileSync(sidebarPath, "utf-8");

// Check root container flex setup
assert.match(source, /flex flex-col h-full max-h-screen/);

// Check scrollable area min-h-0 container
assert.match(source, /flex-1 min-h-0 overflow-y-auto custom-scrollbar/);

// Footer task UI moved to src/components/TaskCenterBar.tsx (redesign final);
// Sidebar keeps the bounded idle stage instead of the old 45vh sticky footer.
assert.match(source, /footer-stage flex flex-col h-full min-h-0/);

// Check internal ancillary scroller container exists
assert.match(source, /min-h-0 overflow-y-auto custom-scrollbar/);

// Check structural ordering: ancillary scroller precedes flex-shrink-0 button container
const idleStageStart = source.indexOf("currentStage === 'idle'");
const idleStageEnd = source.indexOf("currentStage === 'idle_json'");
assert.ok(idleStageStart !== -1 && idleStageEnd !== -1, "idle stage block bounds must exist");
const idleBlock = source.slice(idleStageStart, idleStageEnd);

const scrollerPos = idleBlock.indexOf("min-h-0 space-y-2");
const buttonContainerPos = idleBlock.indexOf("flex-shrink-0 space-y-2");
const buttonPos = idleBlock.indexOf("batchEngine.run(genCtx)");

assert.ok(scrollerPos !== -1, "Ancillary scroller must exist in idle stage");
assert.ok(buttonContainerPos !== -1, "Button container must exist in idle stage");
assert.ok(buttonPos !== -1, "Generate button must exist in idle stage");

assert.ok(scrollerPos < buttonContainerPos, "Ancillary scroller must precede button container");
assert.ok(buttonContainerPos <= buttonPos, "Generate button must be inside/after the flex-shrink-0 button container");

// Ensure single primary action call per stage is preserved
const generateMatches = source.match(/batchEngine\.run\(genCtx\)/g);
assert.equal(generateMatches?.length, 2, "Expected exactly 2 batchEngine.run occurrences (idle & idle_json)");

console.log("✓ test-sidebar-layout-contract passed");
