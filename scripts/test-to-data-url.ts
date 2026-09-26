import assert from "node:assert/strict";
import { toDataURL } from "../src/modules/studio/utils";

const originalFetch = globalThis.fetch;
const originalFileReader = globalThis.FileReader;
const calls: string[] = [];

class TestFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(blob: Blob): void {
    blob.arrayBuffer().then(buffer => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    }, () => this.onerror?.());
  }
}

try {
  globalThis.FileReader = TestFileReader as unknown as typeof FileReader;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("failure")) throw new Error("network failure");
    if (url.includes("missing")) return new Response("", { status: 404 });
    return new Response(new Blob([url], { type: "image/png" }));
  }) as typeof fetch;

  assert.equal(await toDataURL("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
  assert.equal(await toDataURL("/storage/assets/image.png"), `data:image/png;base64,${Buffer.from("imagin://storage/assets/image.png").toString("base64")}`);
  assert.equal(await toDataURL("imagin://storage/assets/image.png"), `data:image/png;base64,${Buffer.from("imagin://storage/assets/image.png").toString("base64")}`);
  assert.equal(await toDataURL("https://example.test/missing.png"), null);
  assert.equal(await toDataURL("https://example.test/failure.png"), null);
  assert.equal(await toDataURL("javascript:alert(1)"), null);
  assert.equal(await toDataURL("file:///tmp/image.png"), null);
  assert.equal(await toDataURL("/api/private"), null);
  assert.deepEqual(calls, [
    "imagin://storage/assets/image.png",
    "imagin://storage/assets/image.png",
    "https://example.test/missing.png",
    "https://example.test/failure.png",
  ]);
  console.log("toDataURL tests passed");
} finally {
  globalThis.fetch = originalFetch;
  globalThis.FileReader = originalFileReader;
}
