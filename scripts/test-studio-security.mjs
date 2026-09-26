#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsx = path.resolve(__dirname, '../src/modules/studio/App.tsx');
const content = fs.readFileSync(appTsx, 'utf-8');

const failures = [];

// 1. No direct Google API URL
if (content.includes('generativelanguage.googleapis.com')) {
  failures.push('App.tsx contains direct generativelanguage.googleapis.com URL');
}

// 2. No `?key=` query parameter in fetch calls
if (content.includes('?key=')) {
  failures.push('App.tsx contains ?key= query parameter in API calls');
}

// 3. No keyless retry logic (401/403 handling that retries without key)
const keylessRetryPatterns = [
  /retry\s*keyless/i,
  /retrying\s*keyless/i,
  /retry\s*without\s*key/i,
  /retry\s*no\s*key/i,
];
for (const pattern of keylessRetryPatterns) {
  if (pattern.test(content)) {
    failures.push(`App.tsx contains keyless retry pattern: ${pattern}`);
  }
}

// 4. No external remove.bg / PhotoRoom URLs in App.tsx renderer
if (content.includes('api.remove.bg') || content.includes('sdk.photoroom.com')) {
  failures.push('App.tsx contains direct remove.bg / PhotoRoom external API URLs');
}

// 5. No X-Api-Key or x-api-key auth header literals in App.tsx renderer
if (/X-Api-Key|x-api-key/i.test(content)) {
  failures.push('App.tsx contains provider auth header literals (X-Api-Key / x-api-key)');
}

// 6. No remove-background secret state retained in systemSettings or state defaults
if (content.includes('removeBgApiKey:') || content.includes('photoroomApiKey:')) {
  failures.push('App.tsx contains removeBgApiKey or photoroomApiKey secret field defaults');
}

if (failures.length > 0) {
  console.error('❌ Security check failed:');
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log('✅ Security check passed: No Google URL, no ?key=, no keyless retry, no external removebg/photoroom URLs, no auth headers, no secret state.');
  process.exit(0);
}