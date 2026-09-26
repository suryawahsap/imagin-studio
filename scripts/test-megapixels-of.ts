#!/usr/bin/env node

import assert from 'node:assert/strict';
import { dimensionsForMegapixels, megapixelsOf, minShortSideForMegapixels } from '../src/modules/studio/utils.ts';

const cases = [
  [1000, 1000, 1],
  [3840, 2160, 8.2944],
  [0, 1000, 0],
  [1, 1, 0.000001],
];

for (const [width, height, expected] of cases) {
  const actual = megapixelsOf(width, height);
  assert(Object.is(actual, expected), `${width}×${height}: expected ${expected}, got ${actual}`);
}

const shortSideCases = [
  ['4:3', 4, 1732],
  ['1:1', 4, 2000],
  ['16:9', 4, 1500],
  [undefined, 1, 866],
];

for (const [aspectRatio, megapixels, expected] of shortSideCases) {
  const actual = minShortSideForMegapixels(aspectRatio, megapixels);
  assert(Object.is(actual, expected), `${aspectRatio ?? 'default'} @ ${megapixels}MP: expected ${expected}, got ${actual}`);
}

const dimensionCases = [
  ['target megapixels', 1000, 1000, 1, { width: 1000, height: 1000 }],
  ['4:3 source', 4000, 3000, 4, { width: 2309, height: 1732 }],
  ['default dimensions', 0, 1000, 1, { width: 32, height: 31623 }],
];

for (const [label, width, height, megapixels, expected] of dimensionCases) {
  const actual = dimensionsForMegapixels(width, height, megapixels);
  assert.deepEqual({ width: actual.width, height: actual.height }, expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log('[megapixels-of] assertions passed');
