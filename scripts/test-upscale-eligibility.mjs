import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const code = `
  import assert from 'node:assert/strict';
  import { isUpscaleEligible } from './src/modules/studio/utils';
  const asset = (overrides = {}) => ({ url: 'data:image/png;base64,AA==', ...overrides });
  assert.equal(isUpscaleEligible(null), false);
  assert.equal(isUpscaleEligible(asset({ isLoading: true })), false);
  assert.equal(isUpscaleEligible(asset({ isUpscaling: true })), false);
  assert.equal(isUpscaleEligible(asset({ status: 'FAILED' })), false);
  assert.equal(isUpscaleEligible(asset({ outputFormat: 'SVG' })), false);
  assert.equal(isUpscaleEligible(asset({ url: 'data:image/svg+xml;base64,AA==' })), false);
assert.equal(isUpscaleEligible(asset({ resolution: { width: 500, height: 500, upscaleAttempts: 2 } })), true);
assert.equal(isUpscaleEligible(asset({ resolution: { width: 500, height: 500, upscaleAttempts: 3 } })), false);
  assert.equal(isUpscaleEligible(asset()), true);
assert.equal(isUpscaleEligible(asset({ resolution: { width: 500, height: 500 }, fileSizeKB: 999999 })), true);
assert.equal(isUpscaleEligible(asset({ resolution: { width: 3840, height: 2160 }, resolutionTarget: '4k' })), false);
assert.equal(isUpscaleEligible(asset({ resolution: { width: 3000, height: 3000 }, resolutionTarget: '2k' })), false);
`;
const result = spawnSync("npx", ["tsx", "-e", code], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log("[upscale-eligibility] assertions passed");
