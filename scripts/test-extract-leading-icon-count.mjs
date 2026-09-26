import assert from 'node:assert/strict';
import { extractLeadingIconCount } from '../src/modules/studio/utils.ts';

assert.equal(extractLeadingIconCount(''), null);
assert.equal(extractLeadingIconCount('abc'), null);
assert.equal(extractLeadingIconCount('0'), null);
assert.equal(extractLeadingIconCount('51'), null);
assert.equal(extractLeadingIconCount('  '), null);
assert.equal(extractLeadingIconCount('5 icons'), 5);
assert.equal(extractLeadingIconCount('create 12 icon set'), 12);
assert.equal(extractLeadingIconCount('Icon 25'), 25);
assert.equal(extractLeadingIconCount('025'), 25);
assert.equal(extractLeadingIconCount('1'), 1);
assert.equal(extractLeadingIconCount('50'), 50);
assert.equal(extractLeadingIconCount('100'), null); // >50 but regex \d{1,3} matches 100 → parse 100 → >50 → null
assert.equal(extractLeadingIconCount(null), null);
assert.equal(extractLeadingIconCount(undefined), null);
console.log('[extractLeadingIconCount] assertions passed');
