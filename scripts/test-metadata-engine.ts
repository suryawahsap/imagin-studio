import assert from "assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { createMetadataEngine, extractMetadataJson, normalizeMetadataKeywords, METADATA_ENGINE_ERRORS } from "../electron/services/metadata_engine";
import { LibraryAsset } from "../electron/types";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "imagin-metadata-"));
const imagePath = path.join(root, "fixture.png");
fs.writeFileSync(imagePath, Buffer.from("png"));
const asset: LibraryAsset = { id: "asset-1", type: "IMAGE", name: "fixture.png", url: "/storage/fixture.png", folder: "storage", sourceModule: "STUDIO", mimeType: "image/png", fileSize: "1 B", tags: [], createdAt: "2026-01-01", stockMetadata: { manualNote: "keep" } };
let saved: Partial<LibraryAsset> | undefined;
const run = createMetadataEngine({
  findAsset: (id) => id === asset.id ? asset : undefined,
  storageUrlToPath: () => imagePath,
  updateAsset: (_id, patch) => { saved = patch; return { success: true }; },
  provider: async ({ prompt }) => prompt.startsWith("Describe") ? "A blue abstract icon." : "```json\n{\"title\":\" Blue Icon \",\"description\":\"A blue abstract icon.\",\"keywords\":[\"Blue\",\"blue \",\" icon \"]}\n```",
  now: () => "2026-01-02T00:00:00.000Z",
});

async function main() {
  assert.deepEqual(extractMetadataJson("before {\"a\":1} after"), { a: 1 });
  assert.deepEqual(normalizeMetadataKeywords([" Blue ", "blue", "flat   icon", 3]), ["blue", "flat icon"]);
  await run("job-1", asset.id, new AbortController().signal);
  assert.deepEqual(saved?.stockMetadata, { manualNote: "keep", title: "Blue Icon", description: "A blue abstract icon.", keywords: ["blue", "icon"], metadataSource: "ai", preflightDecision: "needs_review", generatedAt: "2026-01-02T00:00:00.000Z" });
  const invalid = createMetadataEngine({ findAsset: () => asset, storageUrlToPath: () => imagePath, updateAsset: () => ({ success: true }), provider: async () => "not json" });
  await assert.rejects(() => invalid("job", asset.id, new AbortController().signal), new RegExp(METADATA_ENGINE_ERRORS.INVALID_RESPONSE));
  const missingFile = createMetadataEngine({ findAsset: () => asset, storageUrlToPath: () => path.join(root, "missing.png"), updateAsset: () => ({ success: true }), provider: async () => "{}" });
  await assert.rejects(() => missingFile("job", asset.id, new AbortController().signal), new RegExp(METADATA_ENGINE_ERRORS.FILE_NOT_FOUND));
  const providerFailure = createMetadataEngine({ findAsset: () => asset, storageUrlToPath: () => imagePath, updateAsset: () => ({ success: true }), provider: async () => { throw new Error("metadata_provider_failed_429"); } });
  await assert.rejects(() => providerFailure("job", asset.id, new AbortController().signal), /metadata_provider_failed_429/);
  await assert.rejects(() => run("job", "missing", new AbortController().signal), new RegExp(METADATA_ENGINE_ERRORS.ASSET_NOT_FOUND));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => run("job", asset.id, controller.signal), new RegExp(METADATA_ENGINE_ERRORS.ABORTED));
  console.log("metadata engine tests passed");
}
main().finally(() => fs.rmSync(root, { recursive: true, force: true }));
