#!/usr/bin/env node
// Static guard (diperbarui pasca Fase 4/6d ekstraksi):
// 1. engines/storage.ts tetap modul murni — tanpa window listener, tanpa
//    singleton claim, tanpa error-logging module-scope.
// 2. Hook error global (singleton + unhandledrejection + error) kini
//    otoritatif di flows/uiFlow.ts (installGlobalErrorLogging); App.tsx
//    mendelegasikan ke sana, tidak lagi meng-host hook inline.
// 3. Eksport storage tetap utuh; eksport job tinggal di engines/job-engine.ts;
//    createProject/projectEngine tinggal di engines/project-engine.ts.
// Run: node scripts/test-storage-hook-scope.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const storagePath = path.resolve(ROOT, 'src/modules/studio/engines/storage.ts');
const jobEnginePath = path.resolve(ROOT, 'src/modules/studio/engines/job-engine.ts');
const projectEnginePath = path.resolve(ROOT, 'src/modules/studio/engines/project-engine.ts');
const uiFlowPath = path.resolve(ROOT, 'src/modules/studio/flows/uiFlow.ts');
const appPath = path.resolve(ROOT, 'src/modules/studio/App.tsx');

const storage = fs.readFileSync(storagePath, 'utf-8');
const jobEngine = fs.readFileSync(jobEnginePath, 'utf-8');
const projectEngine = fs.readFileSync(projectEnginePath, 'utf-8');
const uiFlow = fs.readFileSync(uiFlowPath, 'utf-8');
const app = fs.readFileSync(appPath, 'utf-8');
const failures = [];

// 1. storage.ts must not register any window error/unhandledrejection listener
for (const pattern of [/unhandledrejection/i, /addEventListener\(\s*["']error["']/]) {
  if (pattern.test(storage)) {
    failures.push(`engines/storage.ts still contains module-level listener pattern: ${pattern}`);
  }
}

// 2. storage.ts must not claim the singleton flag
if (storage.includes('__imaginErrorHookInstalled')) {
  failures.push('engines/storage.ts still claims the __imaginErrorHookInstalled singleton');
}

// 3. storage.ts module scope must not call saveHistoryLog for error logging
if (/saveHistoryLog\(\{\s*[\s\S]{0,120}type:\s*["']error["']/i.test(storage)) {
  failures.push('engines/storage.ts still logs error events at module scope');
}

// 4. storage.ts must keep its exported storage functions intact
const storageExports = [
  'getDB', 'dbOp', 'migrateIdbToStudioStore', 'saveAssetDB', 'getAssetsDB',
  'deleteAssetDB', 'saveHistoryLog', 'getHistoryDB', 'saveQAResultDB',
  'saveComplianceResultDB', 'saveFeedbackDB', 'getFeedbackDB',
  'getFeedbackForAssetDB', 'deleteFeedbackDB', 'feedbackEngine',
  'getDiversityTrackerDB', 'markDiversityUsedDB', 'saveProjectDB',
  'getProjectsDB', 'getProjectDB', 'deleteProjectDB',
];
for (const exp of storageExports) {
  if (!new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${exp}\\b`).test(storage)) {
    failures.push(`engines/storage.ts lost required export: ${exp}`);
  }
}

// 5. Job engine exports (moved from storage.ts in Fase 4)
const jobExports = [
  'saveJobDB', 'getJobsDB', 'getJobDB', 'deleteJobDB', 'jobEngine',
  'updateJobItemInTransaction', 'logItemStage', 'updateJobItemStatus',
  'updateJobItemWithStage', 'createProductionJob',
];
for (const exp of jobExports) {
  if (!new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${exp}\\b`).test(jobEngine)) {
    failures.push(`engines/job-engine.ts lost required export: ${exp}`);
  }
}

// 6. Project engine exports (moved from storage.ts in Fase 4)
for (const exp of ['createProject', 'projectEngine']) {
  if (!new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${exp}\\b`).test(projectEngine)) {
    failures.push(`engines/project-engine.ts lost required export: ${exp}`);
  }
}

// 7. The authoritative error hook lives in flows/uiFlow.ts (moved from App.tsx in 6d slimming)
if (!uiFlow.includes('installGlobalErrorLogging')) {
  failures.push('flows/uiFlow.ts no longer exports installGlobalErrorLogging');
}
if (!uiFlow.includes('__imaginErrorHookInstalled')) {
  failures.push('flows/uiFlow.ts no longer contains the __imaginErrorHookInstalled singleton claim');
}
if (!uiFlow.includes("window.addEventListener('unhandledrejection'")) {
  failures.push('flows/uiFlow.ts no longer registers the unhandledrejection listener');
}
if (!uiFlow.includes("window.addEventListener('error'")) {
  failures.push('flows/uiFlow.ts no longer registers the window error listener');
}

// 8. App.tsx delegates to the hook (must not re-host it inline)
if (!app.includes('uiFlow.installGlobalErrorLogging')) {
  failures.push('App.tsx no longer delegates to uiFlow.installGlobalErrorLogging');
}
for (const pattern of [/__imaginErrorHookInstalled/, /window\.addEventListener\(\s*["']unhandledrejection["']/]) {
  if (pattern.test(app)) {
    failures.push(`App.tsx still hosts the error hook inline (should delegate via uiFlow): ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error('❌ Storage hook scope check failed:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
} else {
  console.log('✅ Storage hook scope passed: storage.ts is a pure module; job/project exports intact in their engines; the authoritative error hook lives in flows/uiFlow.ts and App.tsx delegates to it.');
  process.exit(0);
}
