import assert from 'node:assert/strict';
import { sanitizeIconThemeInput } from '../src/modules/studio/utils.ts';

// Fallback if utils is TS: use dynamic import via tsx? We'll use direct logic copy if import fails
// Simple direct tests using the function as exported
assert.equal(sanitizeIconThemeInput(''), '');
assert.equal(sanitizeIconThemeInput('  123  '), '');
assert.equal(sanitizeIconThemeInput('create exactly 5 icon set'), '');
assert.equal(sanitizeIconThemeInput('Beautiful mountain landscape'), 'Beautiful mountain landscape');
assert.equal(sanitizeIconThemeInput('  generate exactly icon pack  '), '');
assert.equal(sanitizeIconThemeInput('icon set: forest theme, 3 icons'), 'forest theme, icons');
assert.equal(sanitizeIconThemeInput(',, -- | forest | --'), 'forest');
console.log('[sanitizeIconThemeInput] assertions passed');
