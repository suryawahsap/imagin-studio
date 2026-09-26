import assert from 'node:assert/strict';
import { analyzePromptDifferentiation } from '../src/modules/studio/flows/dnaData';

const saturated = analyzePromptDifferentiation('apple on white background');
assert.equal(saturated.subjectTier, 'red');
assert.equal(saturated.riskLevel, 'high');
assert.ok(saturated.suggestions.length > 0);

const niche = analyzePromptDifferentiation('durian cutaway cross section technical diagram, overhead macro, traditional indonesian market, golden hour, weathered wooden stall with condensation');
assert.ok(niche.subjectTier === 'green' && niche.riskLevel === 'low');
assert.ok(niche.styleScore + niche.compositionScore + niche.contextScore > 0);

console.log('content research checks passed');
