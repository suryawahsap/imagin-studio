import assert from "node:assert/strict";
import { getImageDimensions } from "../src/modules/studio/engines/quality";

// Stub browser Image API for the Node runtime.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  set src(_v: string) {
    const dataUrl: string = String(_v);
    if (dataUrl.startsWith("data:image/") && dataUrl.includes("base64,")) {
      // Simulate a valid image: 1x1 dimensions.
      this.width = 1;
      this.height = 1;
      queueMicrotask(() => this.onload?.());
    } else {
      // Invalid payload → error path.
      queueMicrotask(() => this.onerror?.());
    }
  }
}
(globalThis as any).Image = FakeImage;

// 1x1 red PNG data URL.
const png1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Non-image data URL → img.onerror → resolves {width:0,height:0}.
const bad = "data:text/plain;base64,aGVsbG8=";

const ok = await getImageDimensions(png1x1);
console.log("1x1 png dims:", JSON.stringify(ok));
assert.deepEqual(ok, { width: 1, height: 1 });

const err = await getImageDimensions(bad);
console.log("bad dims:", JSON.stringify(err));
assert.deepEqual(err, { width: 0, height: 0 });

console.log("[getImageDimensions] assertions passed");
