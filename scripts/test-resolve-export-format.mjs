import assert from 'node:assert/strict';
import { resolveExportFormat } from '../src/modules/studio/utils.ts';

assert.equal(resolveExportFormat({ iconMode: true, background: 'white', assetType: 'vector', outputFormat: 'JPEG', explicit: false }), 'PNG');
assert.equal(resolveExportFormat({ background: 'transparent', iconMode: false, assetType: 'vector' }), 'PNG');
assert.equal(resolveExportFormat({ background: 'greenscreen', iconMode: false }), 'PNG');
assert.equal(resolveExportFormat({ background: 'Greenscreen', iconMode: false }), 'PNG'); // case-insensitive via toLowerCase
assert.equal(resolveExportFormat({ background: 'scene', assetType: 'vector' }), 'JPEG');
assert.equal(resolveExportFormat({ background: 'white', assetType: 'vector', outputFormat: 'JPEG', explicit: true }), 'JPEG');
assert.equal(resolveExportFormat({ background: 'white', assetType: 'vector', outputFormat: 'PNG', explicit: true }), 'PNG');
assert.equal(resolveExportFormat({ background: 'white', assetType: 'vector', outputFormat: 'JPEG', explicit: false }), 'PNG'); // explicit false ignored
assert.equal(resolveExportFormat({ background: 'white', assetType: 'illustration' }), 'JPEG');
assert.equal(resolveExportFormat({ background: 'white', assetType: '3d' }), 'JPEG');
assert.equal(resolveExportFormat({ background: 'white', assetType: 'photo' }), 'JPEG');
assert.equal(resolveExportFormat({ background: 'white', assetType: 'vector' }), 'PNG');
assert.equal(resolveExportFormat({ background: undefined, assetType: 'vector' }), 'PNG'); // defaults to white
console.log('[resolveExportFormat] assertions passed');
