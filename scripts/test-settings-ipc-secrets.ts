import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '../electron/ipc.ts'), 'utf8');
const start = source.indexOf('ipcMain.handle("settings:get-all"');
const end = source.indexOf('ipcMain.handle("settings:set-binary"', start);
const handler = source.slice(start, end);

assert.ok(start >= 0 && end > start, 'settings:get-all handler must exist');
assert.match(handler, /studio:\s*settingsService\.getStudioConfig\(\)/);
assert.doesNotMatch(handler, /settings:\s*s\s*}/);
console.log('✓ test-settings-ipc-secrets passed');
