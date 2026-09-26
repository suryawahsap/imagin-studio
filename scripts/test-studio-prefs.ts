import assert from "assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { getStudioConfig, setSettingsPathForTest, setStudioConfig } from "../electron/services/settings";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-prefs-test-"));

try {
  setSettingsPathForTest(path.join(root, "settings.json"));
  setStudioConfig({ provider: "9router", textModel: "text-test", imageModel: "image-test", availableTextModels: ["z-text", "a-text", "z-text"], availableImageModels: ["image-test"], nineRouterImageEndpoint: "https://images.example/v1/images/generations" });
  setStudioConfig({
    theme: "light",
    negativePrompt: "no logos",
    diffCheck: true,
    videoUrl: "https://example.test/video",
    activeProjectId: "project-1",
    apiCallsDate: "2026-08-30",
    apiCallsCount: 17,
    idbMigrated: true,
  });

  assert.deepEqual(getStudioConfig(), {
    provider: "9router",
    textModel: "text-test",
    imageModel: "image-test",
    availableTextModels: ["a-text", "z-text"],
    availableImageModels: ["image-test"],
    nineRouterBaseUrl: "https://9router.rahmatur.dev",
    nineRouterImageEndpoint: "https://images.example/v1/images/generations",
    hasGeminiKey: false,
    hasNineRouterKey: false,
    theme: "light",
    negativePrompt: "no logos",
    diffCheck: true,
    videoUrl: "https://example.test/video",
    activeProjectId: "project-1",
    apiCallsDate: "2026-08-30",
    apiCallsCount: 17,
    idbMigrated: true,
  });

  setStudioConfig({ theme: "dark" });
  const partial = getStudioConfig();
  assert.equal(partial.provider, "9router");
  assert.equal(partial.textModel, "text-test");
  assert.equal(partial.imageModel, "image-test");
  assert.equal(partial.negativePrompt, "no logos");
  assert.equal(partial.apiCallsDate, "2026-08-30");
  assert.equal(partial.apiCallsCount, 17);
  assert.equal(typeof partial.hasGeminiKey, "boolean");
  assert.equal(typeof partial.hasNineRouterKey, "boolean");
  assert.equal("geminiApiKey" in partial, false);
  assert.equal("nineRouterApiKey" in partial, false);
  assert.equal(JSON.stringify(partial).includes("encrypted"), false);

  setStudioConfig({ apiCallsDate: "2026-08-31", apiCallsCount: 2 });
  setSettingsPathForTest(path.join(root, "settings.json"));
  const reloaded = getStudioConfig();
  assert.equal(reloaded.apiCallsDate, "2026-08-31");
  assert.equal(reloaded.apiCallsCount, 2);
  assert.equal(reloaded.theme, "dark");
  assert.equal(reloaded.negativePrompt, "no logos");
  assert.equal(reloaded.provider, "9router");
  assert.equal(reloaded.nineRouterImageEndpoint, "https://images.example/v1/images/generations");
  assert.deepEqual(reloaded.availableTextModels, ["a-text", "z-text"]);
  assert.deepEqual(reloaded.availableImageModels, ["image-test"]);
  assert.equal(reloaded.idbMigrated, true);

  const beforeEncryptionFailure = getStudioConfig();
  await assert.rejects(async () => setStudioConfig({ geminiApiKey: "X", textModel: "changed", availableTextModels: ["changed"], nineRouterImageEndpoint: "https://changed.test/v1/images/generations" }), /safeStorage/);
  assert.deepEqual(getStudioConfig(), beforeEncryptionFailure);
  assert.equal(fs.readFileSync(path.join(root, "settings.json"), "utf-8").includes("X"), false);
  assert.equal(getStudioConfig().hasGeminiKey, false);

  const writeFailurePath = path.join(root, "write-failure.json");
  setSettingsPathForTest(writeFailurePath);
  setStudioConfig({ textModel: "before-write-failure", availableTextModels: ["before-write-failure"] });
  const beforeWriteFailure = getStudioConfig();
  fs.rmSync(writeFailurePath);
  fs.mkdirSync(writeFailurePath);
  assert.throws(() => setStudioConfig({ textModel: "after-write-failure", availableTextModels: ["after-write-failure"] }), /EISDIR|directory/i);
  assert.deepEqual(getStudioConfig(), beforeWriteFailure);

  const malformedPath = path.join(root, "malformed.json");
  fs.writeFileSync(malformedPath, JSON.stringify({ studio: { availableTextModels: ["ok", " bad", "ok", 1], availableImageModels: "bad" } }));
  setSettingsPathForTest(malformedPath);
  assert.deepEqual(getStudioConfig().availableTextModels, ["ok"]);
  assert.deepEqual(getStudioConfig().availableImageModels, []);
  assert.equal(JSON.stringify(getStudioConfig()).includes("encrypted"), false);

  console.log("[studio-prefs] all checks passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
