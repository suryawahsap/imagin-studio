#!/usr/bin/env node
import assert from 'node:assert/strict';
import { isSpecificUserInput } from '../src/modules/studio/utils.ts';

for (const value of [null, undefined, '', 'x']) assert.equal(isSpecificUserInput(value), false, value);
for (const value of [' ART ', 'cUlTuRe   MUSIC', '  festival  ']) assert.equal(isSpecificUserInput(value), false, value);
assert.equal(isSpecificUserInput('2026'), true);
assert.equal(isSpecificUserInput('traditional Balinese temple ceremony'), true);

console.log('isSpecificUserInput assertions passed');
