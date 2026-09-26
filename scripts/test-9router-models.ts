import assert from "node:assert/strict";
import { classify9RouterModels, isValid9RouterModelCatalog, normalize9RouterBaseUrl, normalize9RouterImageEndpoint, parse9RouterImageResponse, sanitize9RouterModelCatalog } from "../electron/services/9router-models";

assert.equal(normalize9RouterBaseUrl("https://router.example"), "https://router.example");
assert.equal(normalize9RouterBaseUrl("https://router.example/"), "https://router.example");
assert.equal(normalize9RouterBaseUrl("https://router.example/v1"), "https://router.example");
assert.equal(normalize9RouterBaseUrl("https://router.example/v1/models"), "https://router.example");
assert.equal(normalize9RouterBaseUrl("ftp://router.example"), null);
assert.equal(normalize9RouterBaseUrl("https://user:secret@router.example"), null);
assert.equal(normalize9RouterImageEndpoint("https://images.example/v1/images/generations/"), "https://images.example/v1/images/generations");
assert.equal(normalize9RouterImageEndpoint("https://images.example/v1/images/generations?x=1#test"), "https://images.example/v1/images/generations");
assert.equal(normalize9RouterImageEndpoint("https://images.example/v1/models"), null);
assert.equal(normalize9RouterImageEndpoint("ftp://images.example/v1/images/generations"), null);
assert.equal(normalize9RouterImageEndpoint("https://user:secret@images.example/v1/images/generations"), null);
assert.deepEqual(sanitize9RouterModelCatalog(["z-model", "a-model", "z-model", " bad", "", 1]), ["a-model", "z-model"]);
assert.equal(isValid9RouterModelCatalog(Array.from({ length: 200 }, (_, i) => `model-${i}`)), true);
assert.equal(isValid9RouterModelCatalog(Array.from({ length: 201 }, (_, i) => `model-${i}`)), false);
assert.equal(isValid9RouterModelCatalog(["valid", " bad"]), false);

assert.deepEqual(classify9RouterModels([
  { id: "z-unknown" },
  { id: "chat-model", type: "chat" },
  { id: "vision-model", modalities: ["text", "image"] },
  { id: "flux-pro" },
  { id: "metadata-generator", capabilities: { image_generation: true } },
  { id: "output-image", output_modalities: ["image"] },
  { id: "ly/c5s" },
  { id: "dall-e-3" },
  { id: "chat-model" },
  { id: "" },
  { id: `x${"y".repeat(256)}` },
  null,
]), {
  textModels: ["chat-model", "ly/c5s", "z-unknown"],
  imageModels: ["dall-e-3", "flux-pro", "metadata-generator", "output-image", "vision-model"],
  models: [
    { id: "z-unknown", classified: "text" }, { id: "chat-model", classified: "text" },
    { id: "vision-model", classified: "image" }, { id: "flux-pro", classified: "image" },
    { id: "metadata-generator", classified: "image" }, { id: "output-image", classified: "image" },
    { id: "ly/c5s", classified: "text" }, { id: "dall-e-3", classified: "image" },
    { id: "chat-model", classified: "text" },
  ],
});

assert.equal(classify9RouterModels([{ id: "vendor/creative-x", output_modalities: ["text", "image"] }]).imageModels[0], "vendor/creative-x");

const finalImage = { created: 123, data: [{ b64_json: "abc" }] };
assert.deepEqual(parse9RouterImageResponse("text/event-stream", [
  "event: progress", "data: {\"stage\":\"prepare\",\"bytesReceived\":1}",
  "data: {\"stage\":\"render\",\"bytesReceived\":2}", "data: {\"stage\":\"encode\",\"bytesReceived\":3}",
  "data: {\"stage\":\"upload\",\"bytesReceived\":4}", "data: {\"stage\":\"done\",\"bytesReceived\":5}",
  `data: ${JSON.stringify(finalImage)}`, "",
].join("\n")), finalImage);
assert.deepEqual(parse9RouterImageResponse("text/event-stream", 'data: {"stage":"prepare"}\ndata: {"error":{"message":"quota"}}'), { error: { message: "quota" } });
assert.deepEqual(parse9RouterImageResponse("application/json", JSON.stringify(finalImage)), finalImage);

const merged = classify9RouterModels([
  { id: "ag/gemini-2.5-flash" },
  { id: "ag/gemini-3.1-flash-image", capabilities: { imageOutput: true } },
], [
  { id: "cx/gpt-image-2.5" },
  { id: "cx/gpt-image-2.5-flare" },
  { id: "openai/gpt-image-1" },
]);
assert.deepEqual(merged.imageModels, ["ag/gemini-3.1-flash-image", "cx/gpt-image-2.5", "cx/gpt-image-2.5-flare", "openai/gpt-image-1"]);
assert.deepEqual(merged.textModels, ["ag/gemini-2.5-flash"]);

const discovered = classify9RouterModels([
  ...Array.from({ length: 250 }, (_, i) => ({ id: `text-${String(i).padStart(3, "0")}` })),
  ...Array.from({ length: 250 }, (_, i) => ({ id: `flux-${String(i).padStart(3, "0")}` })),
]);
assert.equal(discovered.textModels.length, 200);
assert.equal(discovered.imageModels.length, 200);
assert.deepEqual(discovered.textModels, Array.from({ length: 200 }, (_, i) => `text-${String(i).padStart(3, "0")}`));
assert.deepEqual(discovered.imageModels, Array.from({ length: 200 }, (_, i) => `flux-${String(i).padStart(3, "0")}`));

console.log("9Router model helper tests passed");
