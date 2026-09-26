import assert from 'node:assert/strict';
import { matchesBlockedTerm } from '../src/modules/studio/utils.ts';

// single-word: word-boundary
assert.equal(matchesBlockedTerm('a cia operation', 'cia'), true);
assert.equal(matchesBlockedTerm('commercial stock', 'cia'), false);            // substring prevention
assert.equal(matchesBlockedTerm('financial report', 'cia'), false);
assert.equal(matchesBlockedTerm('social impact', 'cia'), false);
assert.equal(matchesBlockedTerm('NASA-launch', 'nasa'), false);                // hyphen binds → "NASA-launch" treated as adjacent word → no match
assert.equal(matchesBlockedTerm('nasa launch', 'nasa'), true);
assert.equal(matchesBlockedTerm('space', 'nasa'), false);
// single-word: case-insensitive
assert.equal(matchesBlockedTerm('CIA operation', 'cia'), true);
assert.equal(matchesBlockedTerm('cia OPERATION', 'cia'), true);
// multi-word phrase: stricter word-boundary (letters+digits only)
assert.equal(matchesBlockedTerm('star wars galaxy', 'star wars'), true);
assert.equal(matchesBlockedTerm('white house garden', 'white house'), true);
assert.equal(matchesBlockedTerm('stardust wars', 'star wars'), false);          // adjacent letters break
assert.equal(matchesBlockedTerm('house white', 'white house'), false);          // order matters
// regex meta escaping
assert.equal(matchesBlockedTerm('C++ programming', 'c++'), true);
assert.equal(matchesBlockedTerm('a.b.c file', 'a.b'), true);
assert.equal(matchesBlockedTerm('hello world', 'o.w'), false);                  // '.' escaped → literal
// empty
assert.equal(matchesBlockedTerm('', 'cia'), false);
assert.equal(matchesBlockedTerm('anything', ''), false);                         // empty term: zero-width pattern blocked by lookarounds

console.log('[matchesBlockedTerm] assertions passed');
