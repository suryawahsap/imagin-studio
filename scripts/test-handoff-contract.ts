// Contract check for Studio → Tools handoff (Phase 2): stage IPC bridges.
// Run: npx tsx scripts/test-handoff-contract.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "..", rel), "utf-8");

const ipc = read("electron/ipc.ts");
const preload = read("electron/preload.ts");
const api = read("src/api/electron.ts");
const vectorModule = read("src/components/vectorize/VectorizeModule.tsx");
const upscaleModule = read("src/components/upscale/UpscaleModule.tsx");
const app = read("src/App.tsx");
const studioApp = read("src/modules/studio/App.tsx");

// Main-process handlers: stage (pre-enqueue) from library asset IDs
assert.match(ipc, /"vector:stage-library"/);
assert.match(ipc, /"upscale:stage-library"/);

// preload + typed renderer api expose the bridge
assert.match(preload, /vectorStageLibrary/);
assert.match(preload, /"vector:stage-library"/);
assert.match(preload, /upscaleStageLibrary/);
assert.match(preload, /"upscale:stage-library"/);
assert.match(api, /vectorStageLibrary/);
assert.match(api, /upscaleStageLibrary/);

// Modules consume the handoff prop and call the stage api
assert.match(vectorModule, /vectorStageLibrary/);
assert.match(upscaleModule, /upscaleStageLibrary/);
assert.match(vectorModule, /pendingHandoff/);
assert.match(upscaleModule, /pendingHandoff/);
const vectorUsage = app.match(/<VectorizeModule[\s\S]*?\/>/);
const upscaleUsage = app.match(/<UpscaleModuleNew[\s\S]*?\/>/);
assert.ok(vectorUsage && /pendingHandoff/.test(vectorUsage[0]), "App must pass pendingHandoff to VectorizeModule");
assert.ok(upscaleUsage && /pendingHandoff/.test(upscaleUsage[0]), "App must pass pendingHandoff to UpscaleModule");

// Studio App routes handoff via onNavigate with library asset IDs
assert.match(studioApp, /onNavigate/);
assert.match(studioApp, /libraryAssetId/);
assert.match(app, /pendingHandoff/);

// Fake renderer-side upscale/trace card actions are gone
const actionsFlow = read("src/modules/studio/flows/assetActionsFlow.ts");
assert.doesNotMatch(actionsFlow, /export const handleUpscaleSingle/);
assert.doesNotMatch(actionsFlow, /export const handleBulkUpscale/);
assert.doesNotMatch(actionsFlow, /export const handleTraceSVG/);
assert.doesNotMatch(actionsFlow, /export const handleBulkTraceSVG/);
assert.doesNotMatch(actionsFlow, /export const handleBulkTraceByIconStyle/);
assert.doesNotMatch(actionsFlow, /export const openTraceModal/);

console.log("✓ test-handoff-contract passed");
