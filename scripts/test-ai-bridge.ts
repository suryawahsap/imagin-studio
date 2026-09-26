import assert from "assert/strict";
import { setStudioApi } from "../src/modules/studio/engines/generation";
import { generateImage, generateJSON, generateText, hasAiBridgeApi } from "../src/modules/studio/engines/ai-bridge";

let response: any;
setStudioApi({ studioGenerate: async () => response });
assert.equal(hasAiBridgeApi(), true);

response = { success: true, response: { candidates: [{ content: { parts: [{ text: "  hello  " }] } }] } };
assert.equal(await generateText("model", {}), "hello");

response = { success: false, status: 403, detail: "denied" };
await assert.rejects(generateText("model", {}), (err: any) => {
  assert.match(err.message, /403/); // status first — parity with original callGeminiText
  assert.equal(err.status, 403);
  assert.equal(err.detail, "denied");
  return true;
});

response = { success: true, response: { candidates: [{ content: { parts: [{ text: "```json\n{\"ok\":true}\n```" }] } }] } };
assert.deepEqual(await generateJSON("model", {}), { ok: true });

response = { success: true, response: { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/webp", data: "abc" } }] } }] } };
assert.equal(await generateImage("model", {}), "data:image/webp;base64,abc");

response = { success: false, status: 500, detail: "image failed" };
await assert.rejects(generateImage("model", {}), (err: any) => {
  assert.match(err.message, /500/);
  assert.equal(err.status, 500);
  assert.equal(err.detail, "image failed");
  return true;
});

console.log("[ai-bridge] all 5 checks passed");
