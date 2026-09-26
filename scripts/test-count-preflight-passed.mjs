import assert from 'node:assert/strict';
import { countPreflightPassed } from '../src/modules/studio/utils.ts';

// Frozen behavior: PREFLIGHT_ITEMS entries all have autoRule.
// When autoRule is present, it short-circuits; manual `checks` are only consulted
// for items without autoRule. All current items have autoRule → checks param is ignored.
const smFull = { noText: true, noLogo: true, noArtifacts: true, commercial: true, aiDeclared: true, peopleRelease: true, propRelease: true, backgroundVerified: true, resolutionVerified: true, title: 'x'.repeat(50), description: 'long enough description here yes', keywords: Array.from({length: 49}, (_,i)=>'k'+i) };

const passedFull = countPreflightPassed({}, smFull);
assert.equal(passedFull >= 9, true, 'expected at least 9 autoRule passes with full sm, got ' + passedFull);

// empty sm + empty checks → 0 passes
assert.equal(countPreflightPassed({}, {}), 0);

// autoRule-failing sm → 0 passes (manual checks ignored when autoRule present)
assert.equal(countPreflightPassed({ noText: true }, { noText: false }), 0);

// even with manual checks set, autoRule truthy sm wins
assert.equal(countPreflightPassed({}, { noText: true }) >= 1, true);
console.log('[countPreflightPassed] assertions passed; full=', passedFull);
