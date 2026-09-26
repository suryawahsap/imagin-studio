import assert from 'node:assert/strict';
import { hydrateAiConfigFromConfig } from '../src/modules/studio/state';

function testHydration() {
  // Case 1: 9router key true, gemini false
  const config1 = { provider: '9router', hasNineRouterKey: true, hasGeminiKey: false, textModel: 'ag/gemini-2.5-flash', imageModel: 'ag/gemini-3.1-flash-image' };
  const current1 = { provider: 'default', textModel: 'default-text', imageModel: 'default-image', hasGeminiKey: false, hasNineRouterKey: false };
  const result1 = hydrateAiConfigFromConfig(config1, current1);
  assert.strictEqual(result1.provider, '9router');
  assert.strictEqual(result1.hasNineRouterKey, true);
  assert.strictEqual(result1.hasGeminiKey, false);
  assert.strictEqual(result1.textModel, 'ag/gemini-2.5-flash');
  assert.strictEqual(result1.imageModel, 'ag/gemini-3.1-flash-image');

  // Case 2: gemini key true, 9router false
  const config2 = { provider: 'gemini', hasGeminiKey: true, hasNineRouterKey: false };
  const current2 = { provider: 'default', textModel: 'default-text', imageModel: 'default-image', hasGeminiKey: false, hasNineRouterKey: false };
  const result2 = hydrateAiConfigFromConfig(config2, current2);
  assert.strictEqual(result2.provider, 'gemini');
  assert.strictEqual(result2.hasGeminiKey, true);
  assert.strictEqual(result2.hasNineRouterKey, false);
  assert.strictEqual(result2.textModel, 'default-text');
  assert.strictEqual(result2.imageModel, 'default-image');

  // Case 3: missing fields - fallback to current
  const config3 = { provider: '' };
  const current3 = { provider: '9router', textModel: 'fallback-text', imageModel: 'fallback-image', hasGeminiKey: false, hasNineRouterKey: false };
  const result3 = hydrateAiConfigFromConfig(config3, current3);
  assert.strictEqual(result3.provider, '9router');
  assert.strictEqual(result3.hasGeminiKey, false);
  assert.strictEqual(result3.hasNineRouterKey, false);

  // Case 4: an untrusted provider cannot replace the known provider or leak keys.
  const result4 = hydrateAiConfigFromConfig(
    { provider: 'other', hasGeminiKey: true, hasNineRouterKey: true, geminiApiKey: 'secret', nineRouterApiKey: 'secret', encryptedGeminiKey: 'secret', encryptedNineRouterKey: 'secret' },
    current3,
  );
  assert.strictEqual(result4.provider, '9router');
  assert.strictEqual('geminiApiKey' in result4, false);
  assert.strictEqual('nineRouterApiKey' in result4, false);
  assert.strictEqual('encryptedGeminiKey' in result4, false);
  assert.strictEqual('encryptedNineRouterKey' in result4, false);

  // Case 5: an invalid current provider also falls back to the safe default.
  const result5 = hydrateAiConfigFromConfig({}, { ...current3, provider: 'invalid' });
  assert.strictEqual(result5.provider, '9router');

  console.log('✅ All hydration tests passed');
}

testHydration();
