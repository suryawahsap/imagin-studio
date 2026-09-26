import assert from "assert/strict";
import { generateImageWithFallback, setStudioApi } from "../src/modules/studio/engines/generation";
import { buildRegeneratedPrompt, generateRevisionVariant } from "../src/modules/studio/engines/revision";

const imageResponse = { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "abc" } }] } }] };
let calls: any[] = [];
let responses: any[] = [];
setStudioApi({ studioGenerate: async body => { calls.push(body); return responses.shift(); } });

assert.equal(buildRegeneratedPrompt("cat", { reinforce: ["blue", "centered"], remove: ["text"] }), "cat | REINFORCED CONSTRAINT: blue; centered | EXPLICITLY FORBIDDEN: text");

responses = [{ success: true, response: imageResponse }];
assert.deepEqual(await generateImageWithFallback("primary", "fallback", [{ label: "basic", body: {} }], () => {}), { imageUrl: "data:image/png;base64,abc", model: "primary" });

calls = [];
responses = [{ success: false, status: 429 }, { success: true, response: imageResponse }];
assert.equal((await generateImageWithFallback("primary", "fallback", [{ label: "basic", body: {} }], () => {})).model, "fallback");
assert.deepEqual(calls.map(call => call.model), ["primary", "fallback"]);

responses = [{ success: false, status: 429 }, { success: false, status: 403 }];
await assert.rejects(generateImageWithFallback("primary", "fallback", [{ label: "basic", body: {} }], () => {}), (error: any) => error.status === 403);

calls = [];
responses = [{ success: true, response: { candidates: [{ content: { parts: [] } }] } }, { success: true, response: imageResponse }];
assert.deepEqual(await generateImageWithFallback("primary", "fallback", [{ label: "basic", body: {} }], () => {}), { imageUrl: "data:image/png;base64,abc", model: "fallback" });
assert.deepEqual(calls.map(call => call.model), ["primary", "fallback"]);

responses = [{ success: false, status: 500 }, { success: false, status: 503 }];
await assert.rejects(generateImageWithFallback("primary", "fallback", [{ label: "basic", body: {} }], () => {}), (error: any) => error.status === 503);

calls = [];
responses = [{ success: false, status: 429 }];
await assert.rejects(generateImageWithFallback("same", "same", [{ label: "basic", body: {} }], () => {}));
assert.equal(calls.length, 1);

responses = [{ success: true, response: imageResponse }];
assert.equal(await generateRevisionVariant(["revision"], [{ label: "edit", body: { edit: true } }], () => {}), "data:image/png;base64,abc");
responses = [{ success: false, status: 500 }];
assert.equal(await generateRevisionVariant(["revision"], [{ label: "edit", body: {} }], () => {}), null);

console.log("[fase4-wave3] all checks passed");
