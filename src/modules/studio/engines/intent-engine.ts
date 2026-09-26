// Studio intent engine — Semantic Intent P1–P3. Domain tables, leaf logic, validator/vision functions.
// P1: DOMAIN_BY_CATEGORY, DOMAIN_FORBIDDEN, DOMAIN_FORBIDDEN_MATRIX, extractDomainKeywordsFromDNA,
//     buildForbiddenDomains, containsConcept, detectDomainsFromVision
// P2: buildSemanticLocks, buildCanonicalIntent, validateCanonicalIntent, resolveConstraints, extractSemanticIntent
// P3: validatePromptIntegrity, assessStyleCompatibility, assessSemanticMatch
// diekstrak dari imagin_studio.tsx baris 13124–13241, 13488–13495, 13500–13523, 13767–13783, 14483–14608.
// Pure data + functions; hanya import CATEGORY_DNA dari registry/dna.

import { CATEGORY_DNA } from '../registry/dna';
import { DEFAULT_PLATFORM } from '../registry/presets';
import { resolveAssetProfile } from '../resolvers';
import { isSpecificUserInput } from '../utils';

// ── DOMAIN_BY_CATEGORY (line 13124) ────────────────────────────────
const DOMAIN_BY_CATEGORY = {
  'Abstract': 'abstract art',
  'Animals': 'animal wildlife',
  'Buildings and Architecture': 'architecture and buildings',
  'Business': 'business and corporate',
  'Education': 'education and learning',
  'Food and Drink': 'food and beverages',
  'Health and Medicine': 'health and medicine',
  'Holidays and Celebrations': 'holidays and celebrations',
  'Illustrations and Clipart': 'illustration and clipart',
  'Industrial': 'industrial and manufacturing',
  'Landscapes': 'landscape scenery',
  'Lifestyle': 'lifestyle and people',
  'Nature': 'botanical and nature',
  'Objects': 'physical objects and products',
  'People': 'people and portraits',
  'Religion and Culture': 'religion and culture',
  'Science': 'science and technology',
  'Signs and Symbols': 'signs and symbols',
  'Sports': 'sports and athletics',
  'Technology': 'technology and digital',
  'Transportation': 'vehicles and transportation',
  'Travel': 'travel and tourism',
};

// ── DOMAIN_FORBIDDEN (line 13154) ──────────────────────────────────
const DOMAIN_FORBIDDEN = {
  'botanical and nature': ['vehicle', 'car', 'automobile', 'building', 'skyscraper', 'electronics', 'gadget', 'technology device', 'food', 'person', 'portrait', 'animal'],
  'animal wildlife': ['car', 'building', 'technology device', 'food', 'portrait'],
  'architecture and buildings': ['car', 'person', 'animal', 'plant', 'food'],
  'food and beverages': ['car', 'building', 'technology device', 'person'],
  'technology and digital': ['nature', 'forest', 'garden', 'plant', 'organic', 'animal'],
  'business and corporate': ['vehicle', 'plant', 'food', 'portrait'],
  'landscape scenery': ['vehicle', 'car', 'technology device', 'person'],
  'abstract art': ['vehicle', 'car', 'person', 'food', 'portrait'],
  'people and portraits': ['car', 'plant', 'food', 'technology device'],
};

// ── DOMAIN_FORBIDDEN_MATRIX (line 13182) ───────────────────────────
const DOMAIN_FORBIDDEN_MATRIX = {
  'abstract art': ['vehicle', 'car', 'building', 'person', 'food', 'animal', 'portrait', 'recognizable object', 'representational form'],
  'animal wildlife': ['vehicle', 'car', 'building', 'technology device', 'food', 'portrait', 'plant pot', 'human figure'],
  'architecture and buildings': ['car', 'person', 'animal', 'plant', 'food', 'technology device', 'portrait'],
  'business and corporate': ['vehicle', 'plant', 'food', 'portrait', 'animal', 'nature scene'],
  'education and learning': ['vehicle', 'car', 'animal', 'food', 'technology device', 'portrait'],
  'food and beverages': ['vehicle', 'car', 'building', 'technology device', 'person', 'portrait', 'animal'],
  'health and medicine': ['vehicle', 'car', 'food', 'person', 'animal', 'portrait', 'nature scene'],
  'holidays and celebrations': ['vehicle', 'car', 'technology device', 'food', 'animal', 'portrait'],
  'illustration and clipart': ['vehicle', 'car', 'building', 'technology device', 'food', 'person', 'animal', 'portrait'],
  'industrial and manufacturing': ['vehicle', 'car', 'person', 'animal', 'food', 'portrait', 'nature scene'],
  'landscape scenery': ['vehicle', 'car', 'technology device', 'person', 'portrait', 'building facade'],
  'lifestyle and people': ['vehicle', 'car', 'food', 'animal', 'technology device', 'nature scene'],
  'botanical and nature': ['vehicle', 'car', 'automobile', 'building', 'skyscraper', 'electronics', 'gadget', 'technology device', 'food', 'person', 'portrait', 'animal'],
  'physical objects and products': ['vehicle', 'car', 'person', 'portrait', 'animal', 'nature scene'],
  'people and portraits': ['car', 'plant', 'food', 'technology device', 'animal', 'nature scene'],
  'religion and culture': ['vehicle', 'car', 'technology device', 'food', 'animal', 'portrait'],
  'science and technology': ['nature', 'forest', 'garden', 'plant', 'organic', 'animal', 'food', 'portrait'],
  'signs and symbols': ['vehicle', 'car', 'food', 'animal', 'portrait', 'nature scene'],
  'sports and athletics': ['vehicle', 'car', 'technology device', 'food', 'animal', 'portrait'],
  'technology and digital': ['nature', 'forest', 'garden', 'plant', 'organic', 'animal', 'food', 'person', 'portrait'],
  'vehicles and transportation': ['plant', 'nature scene', 'food', 'person', 'portrait', 'animal', 'abstract shape'],
  'travel and tourism': ['vehicle', 'car', 'technology device', 'food', 'animal', 'portrait'],
  'general content': ['vehicle', 'car', 'building', 'person', 'portrait', 'food', 'animal', 'technology device'],
};

// ── extractDomainKeywordsFromDNA (line 13210) ──────────────────────
function extractDomainKeywordsFromDNA(categoryKey, subjectDomain) {
  const cat = CATEGORY_DNA[categoryKey];
  const visual = cat?.visualDNA ? String(cat.visualDNA).toLowerCase() : '';
  const ownWords = subjectDomain.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  // Kategori-kategori yang MUNGKIN overlap visual dengan domain lain (mis.
  // Nature visualDNA menyebut "landscape") — di sini kita hanya melarang
  // kata yang jelas BUKAN domain user, bukan sinonim domain user.
  const candidate = ['vehicle', 'car', 'building', 'architecture', 'technology', 'device', 'food', 'dish', 'person', 'portrait', 'animal', 'wildlife', 'industrial', 'factory', 'electronics', 'gadget', 'robot', 'machine'];
  // Kalau visualDNA menyebut domain lain (mis. Nature + "landscape"), jangan
  // melarang landscape — itu bisa jadi sub-domain sah. Hanya larang yang TIDAK
  // disebut sebagai bagian dari domain user.
  return candidate.filter(k => !ownWords.some(w => w.includes(k) || k.includes(w)));
}

// ── buildForbiddenDomains (line 13225) ─────────────────────────────
function buildForbiddenDomains(categoryKey, subcategoryKey = '', subjectDomain = '') {
  const domain = subjectDomain || DOMAIN_BY_CATEGORY[categoryKey] || 'general content';
  const base = DOMAIN_FORBIDDEN_MATRIX[domain] || DOMAIN_FORBIDDEN[domain] || DOMAIN_FORBIDDEN_MATRIX['general content'];

  // Tambahan dari Category DNA — melarang objek yang muncul di visualDNA
  // kategori LAIN (bukan domain user), supaya semantic boundary lebih tajam.
  const dnaExtras = extractDomainKeywordsFromDNA(categoryKey, domain);

  // Subcategory-aware: kalau subcategory menyebut objek spesifik (mis.
  // "Cars & Vehicles" untuk Transportation), jangan melarang objek itu.
  const subLower = (subcategoryKey || '').toLowerCase();
  const filtered = [...base, ...dnaExtras].filter((k, i, arr) =>
    k && arr.indexOf(k) === i && !subLower.includes(k)
  );

  return filtered;
}

// ── containsConcept (line 13488) ───────────────────────────────────
function containsConcept(text, concept) {
  const escaped = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isSingleWord = !/\s/.test(concept.trim());
  const pattern = isSingleWord
    ? `(?<![a-zA-Z0-9-])${escaped}(?![a-zA-Z0-9-])`
    : `(?<![a-z0-9])${escaped}(?![a-z0-9])`;
  return new RegExp(pattern, 'i').test(text);
}

// ── detectDomainsFromVision (line 14483) ───────────────────────────
function detectDomainsFromVision(text) {
  const raw = String(text || '').toLowerCase();
  const domains = [];
  const rules = [
    { domain: 'vehicle', keywords: ['car', 'vehicle', 'truck', 'automobile', 'sedan', 'pickup', 'suv', 'van', 'bus', 'motorcycle', 'motorbike', 'bicycle'] },
    { domain: 'botanical', keywords: ['flower', 'floral', 'botanical', 'plant', 'leaf', 'leaves', 'garden', 'blossom', 'petal', 'botany', 'sunflower', 'rose', 'tulip'] },
    { domain: 'technology', keywords: ['smartphone', 'phone', 'laptop', 'computer', 'tablet', 'screen', 'gadget', 'device', 'circuit', 'chip', 'robot', 'server', 'camera lens', 'drone'] },
    { domain: 'architecture', keywords: ['building', 'house', 'architecture', 'skyscraper', 'tower', 'facade', 'bridge', 'cityscape', 'urban', 'landmark'] },
    { domain: 'food', keywords: ['food', 'dish', 'meal', 'beverage', 'drink', 'coffee', 'cupcake', 'cake', 'fruit', 'vegetable', 'burger', 'pizza', 'restaurant'] },
    { domain: 'animal', keywords: ['animal', 'wildlife', 'bird', 'cat', 'dog', 'fish', 'horse', 'lion', 'tiger', 'bear', 'insect', 'butterfly'] },
    { domain: 'people', keywords: ['person', 'people', 'man', 'woman', 'portrait', 'human', 'child', 'family', 'couple', 'businessperson'] },
    { domain: 'abstract', keywords: ['abstract', 'geometric', 'fluid', 'gradient', 'texture', 'fractal'] },
    { domain: 'landscape', keywords: ['landscape', 'mountain', 'beach', 'ocean', 'forest', 'desert', 'scenery', 'horizon'] },
  ];
  for (const rule of rules) {
    if (rule.keywords.some(k => containsConcept(raw, k))) {
      if (!domains.includes(rule.domain)) domains.push(rule.domain);
    }
  }
  return domains;
}

// ── P3 · validatePromptIntegrity (frozen 13500) ──────────────────────────
function validatePromptIntegrity(finalPrompt, semanticIntent) {
  if (!semanticIntent || !semanticIntent.primarySubject) return { pass: true };
  const prompt = String(finalPrompt || '');
  const subject = semanticIntent.primarySubject;

  if (!containsConcept(prompt, subject)) {
    return {
      pass: false,
      severity: 'error',
      reason: `Primary subject "${subject}" missing from final prompt`,
    };
  }

  const foundForbidden = semanticIntent.forbiddenConcepts.filter(c => containsConcept(prompt, c));
  if (foundForbidden.length > 0) {
    return {
      pass: false,
      severity: 'warning',
      reason: `Forbidden concepts detected: ${foundForbidden.join(', ')}`,
    };
  }

  return { pass: true };
}

// ── P3 · assessStyleCompatibility (frozen 13767) ─────────────────────────
function assessStyleCompatibility(interpretation, semanticIntent) {
    if (!interpretation) return { verdict: 'unknown', reason: 'no interpretation', confidence: 0 };
    if (interpretation.status === 'preset') {
        return { verdict: 'compatible', reason: 'known preset style', confidence: 1 };
    }
    const subjectDomain = (semanticIntent?.subjectDomain || semanticIntent?.domain || '').toLowerCase();
    const preferred = Array.isArray(interpretation.preferredDomains) ? interpretation.preferredDomains : [];
    const overlap = preferred.filter(d => subjectDomain.includes(d) || d.includes(subjectDomain));
    if (overlap.length > 0) {
        return { verdict: 'compatible', reason: `style domain overlap: ${overlap.join(', ')}`, confidence: interpretation.confidence };
    }
    // Tidak menolak — hanya menandai plausible/unknown (plan: bukan otomatis ditolak).
    if (interpretation.confidence >= 0.6) {
        return { verdict: 'plausible', reason: 'stylistic combination may still work — no overlap but plausible', confidence: interpretation.confidence };
    }
    return { verdict: 'unknown', reason: 'low-confidence style interpretation', confidence: interpretation.confidence };
}

// ── P3 · assessSemanticMatch (frozen 14509) — vision dominance verifier ──
function assessSemanticMatch(semanticIntent, visionAnalysis) {
  if (!semanticIntent) return { verdict: 'unknown', confidence: 0, reason: 'no semantic intent' };

  const expectedDomain = (semanticIntent.subjectDomain || '').toLowerCase();
  const primary = String(visionAnalysis?.primarySubject || '').trim();
  const objects = Array.isArray(visionAnalysis?.objects) ? visionAnalysis.objects.map(String) : [];
  const combined = [primary, ...objects].join(' ');

  const detectedDomains = detectDomainsFromVision(combined);
  const forbiddenDomains = (semanticIntent.forbiddenDomains || []).map(d => d.toLowerCase());

  // FASE 3 (dominance check): kalau PRIMARY OBJECT yang terdeteksi vision masuk
  // forbidden domains → HARD FAIL, MESKIPUN ada elemen forbidden lain yang muncul
  // bersamaan. Ini membunuh kasus "mobil bermotif botanical": primarySubject =
  // 'car' (vehicle) sedangkan botanical hanya atribut di objects. Botanical
  // menjadi atribut mobil, bukan subject utama — wajib dianggap subject mismatch.
  const primaryDomain = detectDomainsFromVision(primary);
  const primaryForbiddenHit = primaryDomain.filter(d => forbiddenDomains.some(f => d.includes(f) || f.includes(d)));

  if (primaryForbiddenHit.length > 0) {
    return {
      expectedDomain,
      detectedDomains,
      primarySubjectMatch: false,
      verdict: 'wrong_subject',
      confidence: primaryForbiddenHit.length >= 2 ? 0.95 : 0.85,
      reason: `primary subject is in forbidden domain: ${primaryForbiddenHit.join(', ')} (detected primary: "${primary}")`,
      promptFidelity: 0,
    };
  }

  // Primary subject match — apakah vision menyebut primary subject user.
  const subjectTerm = (semanticIntent.primarySubject || '').toLowerCase();
  // [FIX W1-3] word-boundary via containsConcept — includes() membuat "car" match "scar"/"carpet".
  const primarySubjectMatch = subjectTerm.length > 0 && (containsConcept(combined, subjectTerm) || subjectTerm.split(/\s+/).filter(w => w.length > 3).some(w => containsConcept(combined, w)));

  // Deteksi domain terlarang (mis. vehicle padahal botanical).
  const forbiddenHit = detectedDomains.filter(d => forbiddenDomains.some(f => d.includes(f) || f.includes(d)));

  // Deteksi overlap domain yang sesuai.
  const domainOverlap = detectedDomains.filter(d => expectedDomain.includes(d) || d.includes(expectedDomain));

  // FASE 7 (F17 level 3 — integrity): forbidden domain DAN domain sesuai muncul
  // bersamaan (mis. "flower car wrap" — botanical + vehicle). Ini bukan
  // dominance failure (subject masih ada), tapi integrity issue: objek terlarang
  // hadir sebagai elemen, kemungkinan "dicetak/ditempel" bukan subject utama.
  // Statusnya warning (bukan reject) — user/knowledge bisa upgrade nanti.
  const integrityWarning = forbiddenHit.length > 0 && domainOverlap.length > 0;

  // FASE 8 (Prompt Fidelity QA): skor 0-100 seberapa sesuai gambar dengan
  // intent. Dasar: primarySubjectMatch (+50), domain overlap (+30), integrity
  // warning → cap 60 (subject ada tapi objek terlarang ikut muncul).
  const computePromptFidelity = () => {
    let score = 0;
    if (primarySubjectMatch) score += 50;
    if (domainOverlap.length > 0) score += 30;
    if (integrityWarning) score = Math.min(score, 60);
    if (forbiddenHit.length > 0 && !domainOverlap.length) score = 0;
    return score;
  };

  if (forbiddenHit.length > 0 && !domainOverlap.length) {
    return {
      expectedDomain,
      detectedDomains,
      primarySubjectMatch,
      verdict: 'wrong_subject',
      confidence: forbiddenHit.length >= 2 ? 0.9 : 0.75,
      reason: `detected forbidden domain: ${forbiddenHit.join(', ')}`,
      promptFidelity: 0,
    };
  }

  if (domainOverlap.length > 0 || primarySubjectMatch) {
    return {
      expectedDomain,
      detectedDomains,
      primarySubjectMatch,
      verdict: 'match',
      confidence: primarySubjectMatch ? 0.9 : 0.7,
      reason: primarySubjectMatch ? 'primary subject match' : `domain overlap: ${domainOverlap.join(', ')}`,
      // F17 level 3: flag integrity (bukan reject).
      integrityWarning,
      integrityReason: integrityWarning
        ? `forbidden objects (${forbiddenHit.join(', ')}) present alongside subject — likely applied/printed, not primary`
        : null,
      promptFidelity: computePromptFidelity(),
    };
  }

  // Tidak ada sinyal jelas — jangan agresif menolak.
  return {
    expectedDomain,
    detectedDomains,
    primarySubjectMatch,
    verdict: 'unknown',
    confidence: 0.4,
    reason: 'no clear domain signal from vision',
    promptFidelity: computePromptFidelity(),
  };
}

function buildSemanticLocks(si) {
  return [
    `PRIMARY_SUBJECT:${si.primarySubject || ''}`,
    `ASSET_PROFILE:${si.assetProfile || 'none'}`,
    `DOMAIN:${si.subjectDomain || 'general'}`,
  ].filter(Boolean);
}


function buildCanonicalIntent({ semanticIntent, request = {} as any, styleInterpretation = null, resolvedBg = null }) {
  const si = semanticIntent || {};
  const primary = si.primarySubject || si.rawPrompt || '';
  const domain = si.subjectDomain || si.domain || null;
  const assetType = request.assetType || 'vector';

  return {
    userPrompt: si.rawPrompt || '',
    subject: {
      primary,
      secondary: si.secondarySubjects || [],
      domain,
      requirements: [{ value: primary, lock: 'required', source: request.source || 'sidebar' }],
    },
    asset: {
      assetType,
      profile: si.assetProfile || null,
      composition: null,
      requirements: [{ value: assetType, lock: 'required', source: request.source || 'sidebar' }],
    },
    style: {
      requested: request.style || null,
      resolvedName: styleInterpretation?.styleName || null,
      directive: styleInterpretation?.visualDirective || null,
      status: styleInterpretation?.status || 'unresolved',
      confidence: styleInterpretation?.confidence || 0,
    },
    background: {
      mode: request.background || resolvedBg?.mode || 'white',
      directive: resolvedBg?.promptHint || '',
    },
    color: { requested: request.color || null, palette: [], directive: null },
    platformId: request.platform || DEFAULT_PLATFORM,
    platformCategoryId: request.platformCategoryId ?? null,
    platformCategoryName: request.category || null,
    aspectRatio: request.aspectRatio || '4:3',
    constraints: {
      required: si.lockedTerms || (primary ? [primary] : []),
      forbidden: si.forbiddenDomains || [],
    },
    semanticLocks: buildSemanticLocks(si),
    source: request.source || 'sidebar',
  };
}


function validateCanonicalIntent(intent) {
  const missing = [];
  if (!intent?.subject?.primary) missing.push('subject.primary');
  if (!intent?.asset?.assetType) missing.push('asset.assetType');
  if (!intent?.userPrompt) missing.push('userPrompt');
  return { valid: missing.length === 0, missing };
}


function resolveConstraints(intent, dnaContext = '') {
  const conflicts = [];
  const required = [...(intent?.constraints?.required || [])];
  const forbidden = [...(intent?.constraints?.forbidden || [])];

  // subject_style: style directive menyebut domain beda dari subject.
  // Warning — style bisa plausible (Cyberpunk botanical), bukan hard block.
  if (intent?.style?.directive && intent?.subject?.domain) {
    const styleDomains = detectDomainsFromVision(intent.style.directive);
    const subjectDomain = intent.subject.domain.toLowerCase();
    const foreign = styleDomains.filter(d => !subjectDomain.includes(d) && !d.includes(subjectDomain));
    if (foreign.length > 0) {
      conflicts.push({
        type: 'subject_style',
        severity: 'warning',
        message: `Style interpretation mentions ${foreign.join(', ')} — different domain from subject "${intent.subject.primary}"`,
      });
    }
  }

  // subject_asset: profile pattern + subject eksplisit singular → ERROR.
  // Pola ini PASTI menghasilkan hero object, bukan repeat — hard block.
  if (intent?.asset?.profile === 'pattern' && /\b(single|one|isolated|a|an)\b/.test((intent.subject?.primary || '').toLowerCase())) {
    conflicts.push({
      type: 'subject_asset',
      severity: 'error',
      message: `Pattern profile but subject is singular ("${intent.subject.primary}") — akan menghasilkan objek terisolasi, bukan seamless repeat`,
    });
  }

  // asset_background: profile icon + background scene/lifestyle → ERROR.
  // Icon harus isolated (solid/transparent); scene/lifestyle merusak profile.
  const bgMode = (intent?.background?.mode || '').toLowerCase();
  if (intent?.asset?.profile === 'icon' && ['scene', 'lifestyle', 'gradient'].includes(bgMode)) {
    conflicts.push({
      type: 'asset_background',
      severity: 'error',
      message: `Icon profile but background "${bgMode}" — icon harus isolated (solid/transparent), bukan scene`,
    });
  }

  return {
    valid: !conflicts.some(c => c.severity === 'error'),
    conflicts,
    required,
    forbidden,
  };
}


function extractSemanticIntent(promptOrSubject, category, subcategory = '', assetType = '') {
  const raw = (promptOrSubject || '').trim();
  // Ambil bagian sebelum separator prompt (koma/garis) — primary subject
  // biasanya frase pertama. Fallback: seluruh string.
  const primary = raw.split(/[,|]|\s+\(/)[0]?.trim() || raw;
  const domain = DOMAIN_BY_CATEGORY[category] || 'general content';
  // F6 (Sprint 6b): forbidden domains di-generate untuk SEMUA kategori —
  // bukan hanya lookup DOMAIN_FORBIDDEN (yang cuma cover 9 domain).
  const forbiddenDomains = buildForbiddenDomains(category, subcategory, domain);
  // Heuristik: frasa setelah koma/garis = scene/konteks sekunder.
  const afterSep = raw.split(/[,|]/).slice(1).map(s => s.trim()).filter(Boolean);
  const scene = afterSep.length > 0 ? afterSep.join(', ') : null;
  // lockedTerms = primary subject + kata kunci utama (≥3 huruf, bukan stopword).
  const stop = new Set(['a', 'an', 'the', 'with', 'of', 'in', 'on', 'and', 'for', 'featuring']);
  const lockedTerms = [
    primary,
    ...raw.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stop.has(w)),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i).slice(0, 6);

  return {
    // Contract formal Phase 4
    rawPrompt: raw,
    primarySubject: primary,
    subjectDomain: domain,
    secondarySubjects: afterSep,
    scene,
    action: null,
    assetConcept: raw || primary,
    assetProfile: resolveAssetProfile({ assetType, category, subcategory, iconMode: false }) || null,
    categoryHint: category || null,
    lockedTerms,
    forbiddenDomains,
    explicitUserIntent: isSpecificUserInput(raw),
    confidence: raw ? 1 : 0,
    // Backward-compat (callsite lama)
    domain,
    requiredConcepts: [],
    forbiddenConcepts: forbiddenDomains,
    source: 'user',
  };
}

export { DOMAIN_BY_CATEGORY, DOMAIN_FORBIDDEN, DOMAIN_FORBIDDEN_MATRIX, extractDomainKeywordsFromDNA, buildForbiddenDomains, containsConcept, detectDomainsFromVision, validatePromptIntegrity, assessStyleCompatibility, assessSemanticMatch, buildSemanticLocks, buildCanonicalIntent, validateCanonicalIntent, resolveConstraints, extractSemanticIntent };

