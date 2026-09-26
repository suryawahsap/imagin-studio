import assert from "node:assert/strict";
//Kontrak validasi item antrean upscale (renderer main).
// Regresi yang diguard: tileSize: 0 (auto, default UI) dulu DITOLAK validator
//semua Start Upscale gagal "Invalid upscale queue item".

import { isValidUpscaleQueueItem, isValidUpscaleTileSize } from "../electron/services/ups/ups-validate";

const MAX_SCALE = 8;

// Payload persis seperti UpscaleModule.handleStartUpscale kirim (default UI)
const defaultUiItem = {
  tempId: "temp-123",
  engine: "auto",
  scale: "2x",
  customScale: 2,
  tileSize: 0,
  whiteBackground: false,
  outputFormat: "png",
};

assert.equal(isValidUpscaleQueueItem(defaultUiItem, MAX_SCALE), true, "payload default UI harus valid");

// Mode resolusi baru + semua mode scale
for (const scale of ["2x", "3x", "4x", "4k", "6k", "8k"]) {
  assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, scale }, MAX_SCALE), true, `scale ${scale} valid`);
}

// Custom pecahan (UI step 0.5) + batas
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, scale: "custom", customScale: 5.5 }, MAX_SCALE), true, "custom 5.5 valid");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, scale: "custom", customScale: 8 }, MAX_SCALE), true, "custom 8 valid");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, scale: "custom", customScale: undefined }, MAX_SCALE), false, "custom tanpa customScale invalid");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, customScale: 1.5 }, MAX_SCALE), false, "customScale < 2 invalid (job menuntut 2..8)");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, customScale: 9 }, MAX_SCALE), false, "customScale > 8 invalid");

// tileSize: 0 = auto (REGRESI UTAMA), undefined ok, rentan 64–4096
assert.equal(isValidUpscaleTileSize(0), true, "tileSize 0 (auto) valid");
assert.equal(isValidUpscaleTileSize(undefined), true, "tileSize undefined valid");
assert.equal(isValidUpscaleTileSize(256), true, "tileSize 256 valid");
assert.equal(isValidUpscaleTileSize(32), false, "tileSize 32 invalid (< 64)");
assert.equal(isValidUpscaleTileSize(100.5), false, "tileSize fraksional invalid");

// Skala / engine / format yang tidak dikenal
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, scale: "5x" }, MAX_SCALE), false, "scale tak dikenal invalid");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, engine: "foo" }, MAX_SCALE), false, "engine tak dikenal invalid");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, engine: undefined }, MAX_SCALE), true, "engine undefined valid");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, outputFormat: "jpg" }, MAX_SCALE), false, "format 'jpg' invalid (harus jpeg)");
assert.equal(isValidUpscaleQueueItem({ ...defaultUiItem, outputFormat: undefined }, MAX_SCALE), true, "format undefined valid");

// Item rusak
assert.equal(isValidUpscaleQueueItem(null, MAX_SCALE), false, "null invalid");
assert.equal(isValidUpscaleQueueItem("x", MAX_SCALE), false, "string invalid");
assert.equal(isValidUpscaleQueueItem({}, MAX_SCALE), false, "tanpa tempId invalid");

console.log("✓ ups-validate: kontrak antrean upscale 21 assertion lulus");
