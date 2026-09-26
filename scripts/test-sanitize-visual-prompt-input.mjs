import assert from 'node:assert/strict';
import { sanitizeVisualPromptInput } from '../src/modules/studio/utils.ts';

assert.equal(sanitizeVisualPromptInput(''), '');
assert.equal(sanitizeVisualPromptInput('  123  '), '');
assert.equal(sanitizeVisualPromptInput('create exactly 5 icon set'), '');
assert.equal(sanitizeVisualPromptInput('Beautiful mountain landscape'), 'Beautiful mountain landscape');
assert.equal(sanitizeVisualPromptInput('  generate exactly icon pack  '), '');
assert.equal(sanitizeVisualPromptInput('icon set: forest theme, 3 icons'), 'forest theme, icons');
assert.equal(sanitizeVisualPromptInput(',, -- | forest | --'), 'forest');
// visual does NOT strip "show me" unlike icon theme sanitizer
assert.equal(sanitizeVisualPromptInput('show me beautiful landscape'), 'show me beautiful landscape');
assert.equal(sanitizeVisualPromptInput('please create sheet mountain view'), 'mountain view');
console.log('[sanitizeVisualPromptInput] assertions passed');
