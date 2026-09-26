import assert from "node:assert/strict";
import { resolvePreviewUrl } from "../src/modules/studio/ui/components/AssetPreviewImage";

console.log("Testing resolvePreviewUrl logic...");

// Data URLs are direct
const dataRes = resolvePreviewUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
assert.equal(dataRes.isDirect, true);
assert.ok(dataRes.resolvedUrl.startsWith("data:"));

// Blob URLs are direct
const blobRes = resolvePreviewUrl("blob:http://localhost/1234-5678");
assert.equal(blobRes.isDirect, true);
assert.equal(blobRes.resolvedUrl, "blob:http://localhost/1234-5678");

// HTTP / HTTPS URLs are direct
const httpRes = resolvePreviewUrl("https://example.com/test.png");
assert.equal(httpRes.isDirect, true);
assert.equal(httpRes.resolvedUrl, "https://example.com/test.png");

// Storage paths map through assetUrl to imagin://storage/...
const storageRes = resolvePreviewUrl("/storage/assets/images/test.png");
assert.equal(storageRes.isDirect, false);
assert.equal(storageRes.resolvedUrl, "imagin://storage/assets/images/test.png");

// Empty or undefined URLs
const emptyRes = resolvePreviewUrl("");
assert.equal(emptyRes.isDirect, true);
assert.equal(emptyRes.resolvedUrl, "");

// Unsupported schemes and arbitrary paths are rejected
assert.deepEqual(resolvePreviewUrl("javascript:alert(1)"), { isDirect: true, resolvedUrl: "" });
assert.deepEqual(resolvePreviewUrl("file:///tmp/image.png"), { isDirect: true, resolvedUrl: "" });
assert.deepEqual(resolvePreviewUrl("/api/private"), { isDirect: true, resolvedUrl: "" });

console.log("resolvePreviewUrl tests passed successfully! ✓");
