import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '../src/modules/studio/flows/metadataFlow.ts'), 'utf8');

assert.match(source, /import\s*\{[^}]*\bMETADATA_NEWS_MARKERS\b[^}]*\}\s*from\s*'\.\.\/engines\/compliance'/);
assert.doesNotMatch(source, /metadataNewsMarkers\s*:\s*METADATA_NEWS_MARKERS/);
console.log('✓ test-metadata-news-markers passed');
