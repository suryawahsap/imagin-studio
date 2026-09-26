import assert from 'node:assert/strict';
import { checkBrandSafety, resolveExportFormat } from '../src/modules/studio/utils.ts';

// checkBrandSafety
assert.deepEqual(checkBrandSafety(''), [], 'empty input → no hits');
assert.deepEqual(checkBrandSafety('clean illustration of a cat'), [], 'clean text → no hits');
const disney = checkBrandSafety('mickey mouse style illustration');
assert.ok(disney.some(h => h.toLowerCase().includes('mickey')), 'mickey mouse should be flagged');
assert.equal(checkBrandSafety('cia operation scene').length >= 1, true, 'cia flagged');
const styleRef = checkBrandSafety('painting in the manner of Picasso');
assert.ok(styleRef.some(h => h.includes('artist-style reference')), 'Picasso style-of flagged');

// resolveExportFormat
assert.equal(resolveExportFormat({ assetType: 'vector', background: 'transparent' }), 'PNG', 'transparent → PNG');
assert.equal(resolveExportFormat({ assetType: 'vector', background: 'greenscreen' }), 'PNG', 'greenscreen → PNG');
assert.equal(resolveExportFormat({ assetType: 'vector', iconMode: true }), 'PNG', 'iconMode → PNG');
assert.equal(resolveExportFormat({ assetType: 'illustration', background: 'scene' }), 'JPEG', 'scene → JPEG');
assert.equal(resolveExportFormat({ assetType: 'illustration', background: 'white' }), 'JPEG', 'illustration white → JPEG');
assert.equal(resolveExportFormat({ assetType: 'vector', background: 'white' }), 'PNG', 'vector white → PNG');
assert.equal(resolveExportFormat({ assetType: 'photo', background: 'white' }), 'JPEG', 'photo white → JPEG');
assert.equal(resolveExportFormat({ assetType: 'vector', background: 'white', explicit: true, outputFormat: 'JPEG' }), 'JPEG', 'explicit JPEG honored');
assert.equal(resolveExportFormat({ assetType: 'vector', background: 'white', explicit: true, outputFormat: 'WEBP' }), 'PNG', 'explicit invalid falls through → PNG');

console.log('[checkBrandSafety+resolveExportFormat] assertions passed');
