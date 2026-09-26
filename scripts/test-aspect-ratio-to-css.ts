import assert from 'node:assert/strict';
import { aspectRatioToCss } from '../src/modules/studio/utils.ts';

assert.equal(aspectRatioToCss('16:9'), '16 / 9');
assert.equal(aspectRatioToCss('1:1'), '1 / 1');
assert.equal(aspectRatioToCss('4:3'), '4 / 3');
for (const malformed of [undefined, null, '', '16', ':9', '16:', '0:9', '16:0']) {
  assert.equal(aspectRatioToCss(malformed), '4 / 3');
}

console.log('aspectRatioToCss assertions passed');
