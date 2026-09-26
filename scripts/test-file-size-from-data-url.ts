#!/usr/bin/env node

import assert from 'node:assert/strict';
import { fileSizeKBFromDataUrl } from '../src/modules/studio/utils.ts';

assert.equal(fileSizeKBFromDataUrl('data:application/octet-stream;base64,'), 0);
assert.equal(fileSizeKBFromDataUrl('data:text/plain;base64,' + 'A'.repeat(1024)), 1);
assert.equal(fileSizeKBFromDataUrl('data:text/plain;base64,' + Buffer.from('hello world').toString('base64')), 0);

console.log('[file-size-from-data-url] assertions passed');
