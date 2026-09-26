import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

import * as flow from '../src/modules/studio/flows/dnaData';
import * as dna from '../src/modules/studio/registry/dna';
import * as constants from '../src/modules/studio/registry/constants';
import * as presets from '../src/modules/studio/registry/presets';

const normalize = (value: unknown): unknown => {
  if (typeof value === 'function') return value.toString().replace(/\s+/g, ' ');
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
};

const differingKeys = (left: unknown, right: unknown) => {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return [];
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => !isDeepStrictEqual(normalize(a[key]), normalize(b[key])));
};

const compare = (name: string, left: unknown, right: unknown, assertIdentical = true) => {
  const identical = isDeepStrictEqual(normalize(left), normalize(right));
  const keys = differingKeys(left, right);
  const countHint = left && right && typeof left === 'object' && typeof right === 'object'
    ? ` counts=${Object.keys(left).length}/${Object.keys(right).length}`
    : '';
  console.log(`${name}: ${identical ? 'IDENTICAL' : 'DIFFERENT'}${identical ? '' : ` keys=${keys.join(',') || '(value)'}${countHint}`}`);
  if (assertIdentical) assert.deepStrictEqual(normalize(left), normalize(right), `${name} parity drifted`);
};

compare('CATEGORY_DNA', flow.CATEGORY_DNA, dna.CATEGORY_DNA);
compare('STYLE_PRESET_DNA', flow.STYLE_PRESET_DNA, dna.STYLE_PRESET_DNA);
compare('STYLE_PRESET_MAP', flow.STYLE_PRESET_MAP, dna.STYLE_PRESET_MAP);
compare('CATEGORY_NEGATIVE_HINTS', flow.CATEGORY_NEGATIVE_HINTS, dna.CATEGORY_NEGATIVE_HINTS);
compare('MARKET_PALETTES', flow.MARKET_PALETTES, dna.MARKET_PALETTES);
compare('GLOBAL_DNA', flow.GLOBAL_DNA, dna.GLOBAL_DNA);
compare('GLOBAL_CGA_DATABASE', flow.GLOBAL_CGA_DATABASE, dna.GLOBAL_CGA_DATABASE);
compare('OFFICIAL_TO_DNA_MAP', flow.OFFICIAL_TO_DNA_MAP, presets.OFFICIAL_TO_DNA_MAP);
compare('DNA_TO_OFFICIAL_MAP', flow.DNA_TO_OFFICIAL_MAP, presets.DNA_TO_OFFICIAL_MAP);
compare('SPAM_TERMS', flow.SPAM_TERMS, constants.SPAM_TERMS);
compare('GENERATION_MODES', flow.GENERATION_MODES, constants.GENERATION_MODES);
compare('BATCH_TIERS', flow.BATCH_TIERS, constants.BATCH_TIERS);
compare('MAX_BATCH_COUNT', flow.MAX_BATCH_COUNT, constants.MAX_BATCH_COUNT);
compare('ICON_GENERATION_MODES', flow.ICON_GENERATION_MODES, constants.ICON_GENERATION_MODES);
compare('STATUS_CONFIG', flow.STATUS_CONFIG, constants.STATUS_CONFIG);
compare('FILTER_STATUS_ORDER', flow.FILTER_STATUS_ORDER, constants.FILTER_STATUS_ORDER);
compare('SUBJECT_TYPES', flow.SUBJECT_TYPES, presets.SUBJECT_TYPES);
compare('CAMERA_ANGLES', flow.CAMERA_ANGLES, presets.CAMERA_ANGLES);
compare('ACTIVITY_CONTEXTS', flow.ACTIVITY_CONTEXTS, presets.ACTIVITY_CONTEXTS);
compare('FRAMING_STYLES', flow.FRAMING_STYLES, presets.FRAMING_STYLES);

const random = Math.random;
try {
  for (const value of [0, 0.49, 0.99]) {
    Math.random = () => value;
    compare(`getPaletteForCategory@${value}`, flow.getPaletteForCategory('Business'), dna.getPaletteForCategory('Business'));
  }
  compare('getPaletteForCategory@missing', flow.getPaletteForCategory('__missing__'), dna.getPaletteForCategory('__missing__'));
} finally {
  Math.random = random;
}
