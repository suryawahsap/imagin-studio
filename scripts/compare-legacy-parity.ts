// Legacy parity check: imagin_studio.tsx (frozen reference) vs modular studio.
// Ekstraksi per-simbol dari legacy (string-aware brace matching), evaluasi
// berurutan sesuai urutan baris legacy, lalu:
//   - data    → deepStrictEqual
//   - fungsi  → behavioral (input battery sama, Math.random seeded)
//   - pipeline→ structural (urutan onStage)
// Run: npx tsx scripts/compare-legacy-parity.ts

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const legacyLines = fs.readFileSync(path.join(ROOT, 'imagin_studio.tsx'), 'utf8').split('\n');

// ── extractor: dari baris anchor (1-based), kembalikan ekspresi bernilai ──
function extractExpr(name: string, anchorLine: number): string {
  // cari baris deklarasi persis (anchor 1-based)
  const start = anchorLine - 1;
  const decl = legacyLines[start];
  if (!new RegExp(`^(?:export )?(?:async )?(?:function |const )${name}\\b`).test(decl)) {
    throw new Error(`anchor mismatch for ${name} @${anchorLine}: ${decl.slice(0, 60)}`);
  }
  // titik mulai ekspresi: setelah '=' (const) atau awal 'function'
  let exprStart: number;
  if (decl.trimStart().startsWith('function') || decl.trimStart().startsWith('async function')) {
    exprStart = 0;
  } else {
    const eq = decl.indexOf('=');
    if (eq === -1) throw new Error(`no '=' on anchor line for ${name}`);
    exprStart = eq + 1;
  }
  // scan string-aware (stack konteks: paren/brace/bracket/interp) sampai
  // konteks terluar tertutup kembali — escape sequence DIPERTAHANKAN apa adanya
  let out = '';
  let hadBrace = false, closed = false;
  const stack: string[] = []; // 'paren' | 'brace' | 'bracket' | 'interp' | 'tpl'
  let state: 'code' | 'sq' | 'dq' | 'tpl' = 'code';
  for (let i = start; i < legacyLines.length && !closed; i++) {
    const line = legacyLines[i];
    const from = i === start ? exprStart : 0;
    for (let j = from; j < line.length; j++) {
      const c = line[j], n = line[j + 1];
      if (state === 'sq') {
        out += c;
        if (c === '\\') { out += n ?? ''; j++; } else if (c === "'") state = 'code';
        continue;
      }
      if (state === 'dq') {
        out += c;
        if (c === '\\') { out += n ?? ''; j++; } else if (c === '"') state = 'code';
        continue;
      }
      if (state === 'tpl') {
        out += c;
        if (c === '\\') { out += n ?? ''; j++; continue; }
        if (c === '`') { stack.pop(); state = 'code'; continue; }
        if (c === '$' && n === '{') { stack.push('interp'); state = 'code'; out += '{'; j++; continue; }
        continue;
      }
      // code state
      if (c === "'") { out += c; state = 'sq'; continue; }
      if (c === '"') { out += c; state = 'dq'; continue; }
      if (c === '`') { out += c; stack.push('tpl'); state = 'tpl'; continue; }
      if (c === '/' && n === '/') break; // line comment — skip sisa baris
      if (c === '/' && n === '*') { const end = line.indexOf('*/', j + 2); j = end === -1 ? line.length : end + 1; continue; }
      if ('([{'.includes(c)) {
        stack.push(c === '(' ? 'paren' : c === '{' ? 'brace' : 'bracket');
        if (c === '{') hadBrace = true;
        out += c;
        continue;
      }
      if (')}]'.includes(c)) {
        out += c;
        const t = stack.pop();
        if (t === 'interp') { state = 'tpl'; continue; } // kembali ke template
        if (stack.length === 0 && hadBrace) {
          // lookahead: `)` param diikuti `=>` (arrow) atau `(` (IIFE invocation) — jangan close
          let next = '';
          lookahead: for (let li = i, lj = j + 1; li < Math.min(legacyLines.length, i + 4); li++, lj = 0) {
            const l = legacyLines[li];
            while (lj < l.length) {
              const ch = l[lj], ch2 = l[lj + 1];
              if (ch === ' ' || ch === '\t') { lj++; continue; }
              if (ch === '/' && ch2 === '/') break; // comment → baris berikut
              if (ch === '/' && ch2 === '*') { const e2 = l.indexOf('*/', lj + 2); lj = e2 === -1 ? l.length : e2 + 2; continue; }
              next = ch + (ch2 ?? '');
              break lookahead;
            }
          }
          if (next !== '=>' && next[0] !== '(') { closed = true; break; }
        }
        continue;
      }
      out += c;
    }
    if (closed) break;
    out += '\n';
    // ekspresi tanpa kurung/kurawal (skalar, string-concat): berhenti di ';' akhir statement
    if (stack.length === 0 && state === 'code' && !hadBrace && out.trimEnd().endsWith(';')) { closed = true; break; }
  }
  let expr = out.trim();
  if (expr.endsWith(';')) expr = expr.slice(0, -1).trimEnd();
  return expr;
}

// ── simbol legacy yang diekstrak (anchor 1-based dari grep) ──
const ANCHORS: Record<string, number> = {
  ASSET_TYPE_PRESETS: 113, ICON_MASTER_NEGATIVE_PROMPT: 166, ICON_STYLE_PRESETS: 175,
  ICON_SHEET_EXTRA_NEGATIVE: 452, ANIMATION_PRESETS: 464, ANIMATION_PRESET_MAP: 473,
  ANIMATION_DEFAULT_PRESET: 474, COMMERCIAL_ILLUSTRATION_STYLES: 511,
  STYLES_BY_ASSET_TYPE: 518, ADOBE_CATEGORY_TAXONOMY: 536, MICROSTOCK_PLATFORMS: 567,
  DEFAULT_PLATFORM: 608, OFFICIAL_TO_DNA_MAP: 621, resolveDNAFromOfficial: 651,
  DNA_TO_OFFICIAL_MAP: 661, ADOBE_ADAPTER: 704, FREEPIK_ADAPTER: 751, PLATFORM_ADAPTERS: 777, SYSTEM_DEFAULT_SETTINGS: 1998, INITIAL_VECTOR_STATE: 2589,
  GLOBAL_DNA: 2644, STYLE_PRESET_DNA: 2697, CATEGORY_DNA: 3173,   pickRandom: 4959, createDNATracker: 4961, genDNASignature: 4986, loadDiversityTracker: 4981,
  buildDNAContext: 4992, buildCommercialRules: 5140, STYLE_PRESET_MAP: 5193,
  findStylePreset: 5245, buildStyleGuidance: 5250, GENERIC_OBJECT_DNA: 5267,
  CATEGORY_NEGATIVE_HINTS: 5281, buildCategoryNegativeHints: 5306, MARKET_PALETTES: 5442, getPaletteForCategory: 5468,
  GLOBAL_CGA_DATABASE: 5806, pickWithBatchLimit: 6105, pickUnique: 6118,
  PRODUCTION_POLICY: 6144, planConceptClusters: 6243, DEFAULT_BATCH_RULES: 6090, getBatchRules: 6092, createBatchDiversitySession: 6097, BACKGROUND_STRATEGY: 6412, CATEGORY_BACKGROUND_STRATEGY: 6437,
  SUBCATEGORY_BACKGROUND_OVERRIDE: 6462, ASSET_TYPE_DEFAULT_BACKGROUND: 6489,
  resolveBackground: 6502, createInitialVectorState: 6576, resolveExportFormat: 6788, ASSET_PROFILE_SUBKEYWORD_MAP: 6808, resolveAssetProfile: 6818,
  buildResolvedConfig: 6834, resolvePlatform: 6853, resolveCategory: 6864,
  resolveStyle: 6880, resolveCompatibility: 6887, resolveAll: 6898,
  runProductionPipeline: 8263,
};

// bangun modul legacy: urutan baris menaik = urutan evaluasi legacy
const entries = Object.entries(ANCHORS).map(([name, line]) => ({ name, line, expr: extractExpr(name, line) }));
entries.sort((a, b) => a.line - b.line);
const legacyModulePath = path.join(ROOT, 'scripts', '.legacy-parity-module.ts');
fs.writeFileSync(legacyModulePath, entries.map(e => `export const ${e.name} = (${e.expr});`).join('\n\n'));

// ── evaluasi + import kedua sisi ──
const L: any = await import(legacyModulePath);
const dna = await import('../src/modules/studio/registry/dna');
const presets = await import('../src/modules/studio/registry/presets');
const iconDna = await import('../src/modules/studio/registry/icon-dna');
const defaults = await import('../src/modules/studio/registry/defaults');
const constants = await import('../src/modules/studio/registry/constants');
const dnaData = await import('../src/modules/studio/flows/dnaData');
const promptHelpers = await import('../src/modules/studio/engines/prompt-helpers');
const promptEngine = await import('../src/modules/studio/engines/prompt');
const resolvers = await import('../src/modules/studio/resolvers');

const norm = (v: any): any => {
  if (typeof v === 'function') return v.toString().replace(/\s+/g, ' ');
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)]));
  // timestamp runtime (Date.now ±5s) → dinormalisasi; dipanggil berurutan beda ms
  if (typeof v === 'number' && Math.abs(v - Date.now()) < 5000) return '<ts>';
  return v;
};

const firstDiff = (a: any, b: any, path = ''): string | null => {
  const na = norm(a), nb = norm(b);
  if (na === nb) return null;
  if (typeof na !== 'object' || !na || typeof nb !== 'object' || !nb) return `${path || '<root>'}: ${JSON.stringify(na)?.slice(0, 60)} vs ${JSON.stringify(nb)?.slice(0, 60)}`;
  if (Array.isArray(na) !== Array.isArray(nb)) return `${path || '<root>'}: array vs non-array`;
  const ka = Object.keys(na), kb = Object.keys(nb);
  if (ka.length !== kb.length) return `${path || '<root>'}: key count ${ka.length} vs ${kb.length}`;
  for (const k of ka) {
    if (!(k in nb)) return `${path ? `${path}.${k}` : k}: hanya di legacy`;
    const d = firstDiff(na[k], nb[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null; // deep equal
};

let pass = 0, fail = 0, missingNew = 0, known = 0;
const fails: string[] = [];
const checkData = (name: string, legacyVal: any, newVal: any) => {
  if (newVal === undefined) { console.log(`MISSING-NEW  ${name}`); missingNew++; fails.push(`${name}: tidak ada di modul baru`); return; }
  try { assert.deepStrictEqual(norm(legacyVal), norm(newVal)); console.log(`IDENTICAL    ${name}`); pass++; }
  catch (e: any) {
    if (KNOWN_DRIFTS.has(name)) { console.log(`KNOWN-DRIFT  ${name} (keputusan migrasi terdokumentasi)`); known++; return; }
    console.log(`DIFFERENT    ${name}`);
    fail++; fails.push(`${name}: ${firstDiff(legacyVal, newVal) ?? String(e.message).split('\n')[0].slice(0, 140)}`);
  }
};

// ── data parity ──
// KNOWN-DRIFT terdokumentasi (keputusan migrasi, BUKAN regresi):
//   SYSTEM_DEFAULT_SETTINGS — legacy: {commercialRules, aiConfig.provider:"google"+apiKey:"",
//     imaginVideoUrl, removeBgApiKey, photoroomApiKey} → new: {commercialRules,
//     aiConfig.provider:"gemini" + hasGeminiKey/hasNineRouterKey (boolean), imaginVideoUrl}.
//     API key tak pernah disimpan di renderer defaults (safeStorage di main; settings:get
//     hanya flag boolean) — lihat CLAUDE.md §Studio + MIGRATION_PLAN Fase security.
const KNOWN_DRIFTS = new Set([
  'SYSTEM_DEFAULT_SETTINGS',
  // Phase 3: native dimensions intentionally removed the persisted target.
  // `scripts/test-pipeline-contract.ts` verifies generated assets never upscale.
  'INITIAL_VECTOR_STATE',
]);
checkData('ASSET_TYPE_PRESETS', L.ASSET_TYPE_PRESETS, presets.ASSET_TYPE_PRESETS);
checkData('ICON_MASTER_NEGATIVE_PROMPT', L.ICON_MASTER_NEGATIVE_PROMPT, iconDna.ICON_MASTER_NEGATIVE_PROMPT);
checkData('ICON_SHEET_EXTRA_NEGATIVE', L.ICON_SHEET_EXTRA_NEGATIVE, iconDna.ICON_SHEET_EXTRA_NEGATIVE);
checkData('ICON_STYLE_PRESETS', L.ICON_STYLE_PRESETS, iconDna.ICON_STYLE_PRESETS);
checkData('ANIMATION_PRESETS', L.ANIMATION_PRESETS, presets.ANIMATION_PRESETS);
checkData('ANIMATION_PRESET_MAP', L.ANIMATION_PRESET_MAP, (dnaData as any).ANIMATION_PRESET_MAP);
checkData('ANIMATION_DEFAULT_PRESET', L.ANIMATION_DEFAULT_PRESET, (dnaData as any).ANIMATION_DEFAULT_PRESET);
checkData('COMMERCIAL_ILLUSTRATION_STYLES', L.COMMERCIAL_ILLUSTRATION_STYLES, (presets as any).COMMERCIAL_ILLUSTRATION_STYLES ?? (constants as any).COMMERCIAL_ILLUSTRATION_STYLES);
checkData('STYLES_BY_ASSET_TYPE', L.STYLES_BY_ASSET_TYPE, presets.STYLES_BY_ASSET_TYPE);
checkData('ADOBE_CATEGORY_TAXONOMY', L.ADOBE_CATEGORY_TAXONOMY, presets.ADOBE_CATEGORY_TAXONOMY);
checkData('MICROSTOCK_PLATFORMS', L.MICROSTOCK_PLATFORMS, presets.MICROSTOCK_PLATFORMS);
checkData('DEFAULT_PLATFORM', L.DEFAULT_PLATFORM, presets.DEFAULT_PLATFORM);
checkData('OFFICIAL_TO_DNA_MAP', L.OFFICIAL_TO_DNA_MAP, presets.OFFICIAL_TO_DNA_MAP);
checkData('DNA_TO_OFFICIAL_MAP', L.DNA_TO_OFFICIAL_MAP, presets.DNA_TO_OFFICIAL_MAP);
checkData('SYSTEM_DEFAULT_SETTINGS', L.SYSTEM_DEFAULT_SETTINGS, (defaults as any).SYSTEM_DEFAULT_SETTINGS);
checkData('INITIAL_VECTOR_STATE', L.INITIAL_VECTOR_STATE, (dnaData as any).INITIAL_VECTOR_STATE);
checkData('GLOBAL_DNA', L.GLOBAL_DNA, dna.GLOBAL_DNA);
checkData('STYLE_PRESET_DNA', L.STYLE_PRESET_DNA, dna.STYLE_PRESET_DNA);
checkData('STYLE_PRESET_MAP', L.STYLE_PRESET_MAP, dna.STYLE_PRESET_MAP);
checkData('CATEGORY_NEGATIVE_HINTS', L.CATEGORY_NEGATIVE_HINTS, dna.CATEGORY_NEGATIVE_HINTS);
checkData('MARKET_PALETTES', L.MARKET_PALETTES, dna.MARKET_PALETTES);
checkData('GLOBAL_CGA_DATABASE', L.GLOBAL_CGA_DATABASE, dna.GLOBAL_CGA_DATABASE);
checkData('CATEGORY_DNA', L.CATEGORY_DNA, dna.CATEGORY_DNA);
checkData('PRODUCTION_POLICY', L.PRODUCTION_POLICY, (dnaData as any).PRODUCTION_POLICY ?? (promptEngine as any).PRODUCTION_POLICY);
checkData('BACKGROUND_STRATEGY', L.BACKGROUND_STRATEGY, (dnaData as any).BACKGROUND_STRATEGY ?? (presets as any).BACKGROUND_STRATEGY);
checkData('CATEGORY_BACKGROUND_STRATEGY', L.CATEGORY_BACKGROUND_STRATEGY, (dnaData as any).CATEGORY_BACKGROUND_STRATEGY ?? (presets as any).CATEGORY_BACKGROUND_STRATEGY);
checkData('SUBCATEGORY_BACKGROUND_OVERRIDE', L.SUBCATEGORY_BACKGROUND_OVERRIDE, (dnaData as any).SUBCATEGORY_BACKGROUND_OVERRIDE ?? (presets as any).SUBCATEGORY_BACKGROUND_OVERRIDE);
checkData('ASSET_TYPE_DEFAULT_BACKGROUND', L.ASSET_TYPE_DEFAULT_BACKGROUND, (dnaData as any).ASSET_TYPE_DEFAULT_BACKGROUND ?? (presets as any).ASSET_TYPE_DEFAULT_BACKGROUND);
checkData('GENERIC_OBJECT_DNA', L.GENERIC_OBJECT_DNA, (dnaData as any).GENERIC_OBJECT_DNA);

// ── fungsi: behavioral, Math.random seeded ──
const realRandom = Math.random;
const DEFAULT_SEED = [0.42, 0.17, 0.88, 0.05, 0.61, 0.29, 0.73, 0.51, 0.09, 0.96];
const seedCalls = (fn: (r: () => number) => any, seedSeq: number[] = DEFAULT_SEED) => {
  let i = 0;
  Math.random = () => seedSeq[i++ % seedSeq.length];
  try { return fn(Math.random); } finally { Math.random = realRandom; }
};
const behavior = (name: string, cases: Array<() => [any, any]>) => {
  let localFail = 0;
  for (let ci = 0; ci < cases.length; ci++) {
    // Math.random KONSTAN per kasus: kedua sisi harus melihat stream identik.
    // (evaluasi eager cases[] membuat legacy selalu konsumsi seed lebih dulu —
    // sequence berbagi menggeser pick → artifact, bukan drift)
    Math.random = () => DEFAULT_SEED[ci % DEFAULT_SEED.length];
    let a: any, b: any;
    try { [a, b] = cases[ci](); } finally { Math.random = realRandom; }
    let note = '';
    try { assert.deepStrictEqual(norm(a), norm(b)); }
    catch {
      if (a == null && b == null) note = ' (null≡undefined: fallback missing-style, deliberate)';
      else { localFail++; fails.push(`${name}: behavioral mismatch @kasus#${ci} — ${firstDiff(a, b) ?? 'deep'}`); continue; }
    }
    if (note) { console.log(`IDENTICAL*   ${name} @${ci}${note}`); }
  }
  if (localFail === 0) { console.log(`IDENTICAL    ${name} (behavioral, ${cases.length} kasus)`); pass++; }
  else { console.log(`DIFFERENT    ${name} (behavioral)`); fail++; }
};

const D = L; // singkat
behavior('findStylePreset', [
  () => [D.findStylePreset('Watercolor'), promptHelpers.findStylePreset('Watercolor')],
  () => [D.findStylePreset('Flat Commercial'), promptHelpers.findStylePreset('Flat Commercial')],
  () => [D.findStylePreset('3D Icon'), promptHelpers.findStylePreset('3D Icon')],
  () => [D.findStylePreset('tidak-ada'), promptHelpers.findStylePreset('tidak-ada')],
  () => [D.findStylePreset(''), promptHelpers.findStylePreset('')],
  () => [D.findStylePreset(null as any), promptHelpers.findStylePreset(null as any)],
]);
behavior('buildStyleGuidance', [
  () => [D.buildStyleGuidance('Watercolor'), (dnaData as any).buildStyleGuidance('Watercolor')],
  () => [D.buildStyleGuidance(''), (dnaData as any).buildStyleGuidance('')],
]);
behavior('buildCommercialRules', [
  () => [D.buildCommercialRules('Business', 'Technology & Digital', 'vector'), (dnaData as any).buildCommercialRules('Business', 'Technology & Digital', 'vector')],
  () => [D.buildCommercialRules('Animals', '', 'illustration'), (dnaData as any).buildCommercialRules('Animals', '', 'illustration')],
  () => [D.buildCommercialRules('__x__', '', 'photo'), (dnaData as any).buildCommercialRules('__x__', '', 'photo')],
]);
behavior('getPaletteForCategory', [
  () => [D.getPaletteForCategory('Business'), dna.getPaletteForCategory('Business')],
  () => [D.getPaletteForCategory('Animals'), dna.getPaletteForCategory('Animals')],
  () => [D.getPaletteForCategory('__missing__'), dna.getPaletteForCategory('__missing__')],
]);
behavior('buildCategoryNegativeHints', [
  () => [D.buildCategoryNegativeHints('Business'), (dnaData as any).buildCategoryNegativeHints('Business')],
  () => [D.buildCategoryNegativeHints('__x__'), (dnaData as any).buildCategoryNegativeHints('__x__')],
]);
behavior('resolveBackground', [
  // signature: (userBackground, assetType, categoryKey, subcategoryKey, isExplicitUserChoice=false)
  () => [D.resolveBackground('auto', 'vector', 'Business', ''), (resolvers as any).resolveBackground('auto', 'vector', 'Business', '')],
  () => [D.resolveBackground('white', 'illustration', 'Business', 'Charts & Infographics'), (resolvers as any).resolveBackground('white', 'illustration', 'Business', 'Charts & Infographics')],
  () => [D.resolveBackground('auto', 'photo', 'Landscapes', ''), (resolvers as any).resolveBackground('auto', 'photo', 'Landscapes', '')],
  () => [D.resolveBackground('transparent', 'photo', 'People', 'Business Person', true), (resolvers as any).resolveBackground('transparent', 'photo', 'People', 'Business Person', true)],
]);
behavior('resolveDNAFromOfficial', [
  () => [D.resolveDNAFromOfficial('adobe_stock', 5, 'mountain landscape'), (resolvers as any).resolveDNAFromOfficial('adobe_stock', 5, 'mountain landscape')],
  () => [D.resolveDNAFromOfficial('adobe_stock', 14, ''), (resolvers as any).resolveDNAFromOfficial('adobe_stock', 14, '')],
  () => [D.resolveDNAFromOfficial('adobe_stock', 3, ''), (resolvers as any).resolveDNAFromOfficial('adobe_stock', 3, '')],
  () => [D.resolveDNAFromOfficial('adobe_stock', 99, ''), (resolvers as any).resolveDNAFromOfficial('adobe_stock', 99, '')],
]);
behavior('planConceptClusters', [
  () => [D.planConceptClusters(3, 'Business', 'Technology & Digital', null), promptEngine.planConceptClusters(3, 'Business', 'Technology & Digital', null)],
  () => [D.planConceptClusters(1, 'Business', '', null), promptEngine.planConceptClusters(1, 'Business', '', null)],
  () => [D.planConceptClusters(2, '__x__', '', null), promptEngine.planConceptClusters(2, '__x__', '', null)],
]);

// buildDNAContext: battery komprehensif dengan tracker/cluster plan
const mkTracker = (preload: string[] = []) => (D.createDNATracker as any)(preload);
const trackerA = mkTracker();
const clusterPlan = [{ subject: 'laptop', macro: 'workspace', motif: 'isometric' }, { subject: 'coffee', macro: 'cafe', motif: 'flat' }];
behavior('buildDNAContext', [
  () => [D.buildDNAContext('Business', 'Technology & Digital', mkTracker(), false, 'Watercolor', 'robot', 'office', null, null, false, 'illustration'), (dnaData as any).buildDNAContext('Business', 'Technology & Digital', mkTracker(), false, 'Watercolor', 'robot', 'office', null, null, false, 'illustration')],
  () => [D.buildDNAContext('Animals', 'Pets & Domestic', mkTracker(['robot|workspace|office']), true, '', null, null, D.createBatchDiversitySession(), clusterPlan, true, 'vector'), (dnaData as any).buildDNAContext('Animals', 'Pets & Domestic', mkTracker(['robot|workspace|office']), true, '', null, null, promptEngine.createBatchDiversitySession(), clusterPlan, true, 'vector')],
  () => [D.buildDNAContext('__x__', '', mkTracker(), false, '', null, null, null, null, false, 'photo'), (dnaData as any).buildDNAContext('__x__', '', mkTracker(), false, '', null, null, null, null, false, 'photo')],
]);
behavior('resolveAll', [
  () => {
    const vs = D.createInitialVectorState();
    const rb = D.resolveBackground('auto', vs.assetType, vs.adobeCategory || 'Business', '');
    return [D.resolveAll({ vectorState: vs, resolvedBg: rb }), (resolvers as any).resolveAll({ vectorState: (dnaData as any).createInitialVectorState(), resolvedBg: rb })];
  },
]);

// ── pipeline: structural (urutan onProgress; onStage hanya ada di sisi baru) ──
const stageSeq = (src: string) => (src.match(/onStage\(\s*["']([\w-]+)["']/g) || []).map(s => s.replace(/onStage\(|["']/g, ''));
const progSeq = (src: string) => (src.match(/onProgress\(\s*["']([^"']+)["']/g) || []).map(s => s.replace(/onProgress\(|["']/g, ''));
const legacyPipeline = entries.find(e => e.name === 'runProductionPipeline')!.expr;
const newPipeline = fs.readFileSync(path.join(ROOT, 'src/modules/studio/pipeline.ts'), 'utf8');
const lgP = progSeq(legacyPipeline), nwP = progSeq(newPipeline);
console.log(`PIPELINE-PROGRESS legacy=[${lgP.join(',')}] new=[${nwP.join(',')}]`);
console.log(`PIPELINE-STAGES new=[${stageSeq(newPipeline).join(',')}] (onStage = superset terdokumentasi; legacy hanya onProgress)`);
if (JSON.stringify(lgP) === JSON.stringify(nwP)) { console.log('IDENTICAL    runProductionPipeline (structural, urutan onProgress)'); pass++; }
else { console.log('DIFFERENT    runProductionPipeline (structural, urutan onProgress)'); fail++; fails.push(`runProductionPipeline: onProgress legacy=[${lgP}] vs new=[${nwP}]`); }

console.log(`\n=== RINGKASAN: ${pass} pass, ${fail} fail, ${known} known-drift, ${missingNew} missing-new ===`);
if (fails.length) { console.log('DETAIL FAIL:'); fails.forEach(f => console.log('  - ' + f)); }
if (!process.env.KEEP_MODULE) { try { fs.rmSync(legacyModulePath); } catch {} }
