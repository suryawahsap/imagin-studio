import assert from 'node:assert/strict';
import { RESOLUTION_TARGETS, DEFAULT_RESOLUTION_TARGET, getResolutionTarget, getFormatResolutionPolicy, RESOLUTION_POLICY } from '../src/modules/studio/utils.ts';

assert.deepEqual(RESOLUTION_TARGETS['4k'], { megapixels: 8, shortSide: 2828, label: '4K (8MP · Stock Standard)' });
assert.deepEqual(RESOLUTION_TARGETS['6k'], { megapixels: 36, shortSide: 6000, label: '6K (36MP · Premium)' });
assert.equal(DEFAULT_RESOLUTION_TARGET, '4k');
assert.equal(getResolutionTarget('4k').megapixels, 8);
assert.equal(getResolutionTarget('6k').megapixels, 36);
assert.equal(getResolutionTarget('unknown').megapixels, 8);
assert.equal(getResolutionTarget(undefined).megapixels, 8);

// getFormatResolutionPolicy
let p = getFormatResolutionPolicy('PNG', '4k');
assert.equal(p.minimumMegapixels, 4);
assert.equal(p.recommendedMegapixels, 8);
assert.equal(p.maximumMegapixels, 100);

p = getFormatResolutionPolicy('PNG', '6k');
assert.equal(p.recommendedMegapixels, 36);

p = getFormatResolutionPolicy('png', '4k'); // case insensitive
assert.equal(p.recommendedMegapixels, 8);

p = getFormatResolutionPolicy('SVG', '6k');
assert.equal(p.minimumMegapixels, 15);
assert.equal(p.recommendedMegapixels, 15);
assert.equal(p.maximumMegapixels, 65);

p = getFormatResolutionPolicy('SVG', '4k');
assert.equal(p.recommendedMegapixels, 15);

p = getFormatResolutionPolicy('JPEG', 'invalid');
assert.equal(p.recommendedMegapixels, 8); // fallback to 4k

console.log('[resolution-targets] assertions passed');
