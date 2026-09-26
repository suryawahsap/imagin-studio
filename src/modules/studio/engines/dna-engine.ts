// Studio DNA engine — diekstrak dari imagin_studio.tsx baris 2317–2805.
// Berisi: pickRandom, createDNATracker, loadDiversityTracker, genDNASignature,
//          buildDNAContext, buildCGAContext.
// buildStrongExclusionInstruction di-import dari prompt-helpers.ts (bukan lokal).
// DNA registry data (CATEGORY_DNA, STYLE_PRESET_DNA) ada di registry/dna.ts.

import { getBatchRules, pickWithBatchLimit, findStylePreset, createBatchSession, pickUnique, MUTATION_FOCUS_BANK, COLOR_ACCENT_PALETTES, buildStrongExclusionInstruction } from "./prompt-helpers";
import { CATEGORY_DNA, GLOBAL_DNA, STYLE_PRESET_DNA, MARKET_PALETTES } from "../registry/dna";
import { markDiversityUsedDB, getDiversityTrackerDB } from "./storage";
import { GLOBAL_CGA_DATABASE } from "../registry/dna";

// pickRandom local (helper for DNA engine)
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function createDNATracker(preloadKeys: any[] = []) {
  const used = new Set(preloadKeys);
  const sessionKeys = [];
  return {
    tryClaim(key) {
      if (used.has(key)) return false;
      used.add(key);
      sessionKeys.push(key);
      return true;
    },
    getSessionKeys() { return [...sessionKeys]; },
    getUsedCount() { return used.size; },
    async flush(categoryKey) {
      if (sessionKeys.length > 0) {
        await markDiversityUsedDB(categoryKey, sessionKeys);
      }
    },
  };
}

async function loadDiversityTracker(categoryKey: string) {
  const stored = await getDiversityTrackerDB(categoryKey);
  return createDNATracker(stored);
}

function genDNASignature(subject, macro, scene, microKey, micro, motif = null) {
  return motif
    ? `${subject}|${macro}|${scene}|${microKey}:${micro}|${motif}`
    : `${subject}|${macro}|${scene}|${microKey}:${micro}`;
}

export function buildDNAContext(categoryKey, subcategoryKey, tracker, skipSubject = false, styleName = '', selectedSubject = null, selectedScene = null, batchDiversity = null, clusterPlan = null, userSubjectLocked = false, assetType = '') {
  const cat = CATEGORY_DNA[categoryKey];
  if (!cat) return '';

  const sub = subcategoryKey ? cat.subcategories[subcategoryKey] : null;
  const subjects = sub?.subjects;
  const de = cat.diversityEngine;
  const varKeys = Object.keys(de.microVariations);

  // EU-7: Batch diversity rules — membatasi subject/palette yang sama berulang
  // dalam SATU batch. No-op kalau batchDiversity tidak diberikan (null).
  const batchRules = batchDiversity ? getBatchRules(categoryKey) : null;

  // EU-12: Concept cluster plan — kalau diberikan (dari planConceptClusters),
  // subject/macro/motif item ini DIKUNCI ke nilai cluster-nya supaya setiap
  // item dalam batch punya konsep berbeda (bukan variasi visual). No-op kalau
  // null → perilaku lama (random per dimensi).
  const clusterSubject = clusterPlan?.subject ?? null;
  const clusterMacro = clusterPlan?.macro ?? null;
  const clusterMotif = clusterPlan?.motif ?? null;

  // EU-11: Concept DNA — field tambahan opsional per-subkategori (schema v5).
  // Kalau subkategori tidak punya conceptDNA, semua di bawah ini no-op dan
  // perilaku engine identik dengan sebelum EU-11 (backward compatible).
  const conceptDNA = sub?.conceptDNA || null;
  const hasMotifPool = Array.isArray(conceptDNA?.motif) && conceptDNA.motif.length > 0;

  let tries = 0;
  let subject, macro, scene, microKey, micro, motif, sig;

  do {
    // Fix #2 (audit DNA): user subject LOCK — kalau userSubjectLocked dan
    // selectedSubject diberikan, subject TIDAK boleh diganti DNA/random.
    // clusterSubject (EU-12) tetap prioritas tertinggi karena konsep cluster
    // memang sengaja mengunci subject per-item dalam batch.
    subject = (clusterSubject || (userSubjectLocked && selectedSubject))
      ? (clusterSubject || selectedSubject)
      : selectedSubject || ((!skipSubject && subjects)
        ? (batchDiversity ? pickWithBatchLimit(subjects, batchDiversity.subjectCounts, batchRules.sameSubcategoryMax, 'subject') : pickRandom(subjects))
        : null);
    macro = clusterMacro || (!skipSubject ? pickRandom(de.macroConcepts) : null);
    scene = selectedScene || (!skipSubject ? pickRandom(de.commercialScenes) : null);
    microKey = pickRandom(varKeys);
    micro = pickRandom(de.microVariations[microKey]);
    motif = clusterMotif || (hasMotifPool
      ? (batchDiversity ? pickWithBatchLimit(conceptDNA.motif, batchDiversity.motifCounts, batchRules.sameSubcategoryMax, 'motif') : pickRandom(conceptDNA.motif))
      : null);
    sig = genDNASignature(subject, macro, scene, microKey, micro, motif);
    tries++;
  } while (tracker && !tracker.tryClaim(sig) && tries < 20);

  const stylePreset = findStylePreset(styleName);
  const isPhoto = assetType === 'photo';
  // FIX: photo styles (lifestyleScene, corporateEditorial, cinematicWideShot, dll.) JUGA punya
  // promptTrigger yang wajib di-inject — sebelumnya kosong untuk semua foto.
  // Untuk photo: tidak pakai bracket [STYLE DNA:] agar tidak bentrok dengan photoAuthority layer;
  // inject sebagai plain text supaya model membacanya sebagai instruksi fotografi langsung.
  const styleDNA = stylePreset
    ? (isPhoto ? stylePreset.promptTrigger : `[STYLE DNA: ${stylePreset.promptTrigger}]`)
    : '';

  // conceptDNA.palette, kalau ada, dipilih random per-generate (micro-level
  // diversity) — sisanya (structure/repetition/background/visualLanguage)
  // sifatnya deskriptif tetap per-subkategori, jadi tidak perlu di-randomize.
  // EU-7: kalau batchDiversity aktif, palette yang sama dibatasi max
  // identicalPaletteMax kali per batch.
  const conceptPalette = Array.isArray(conceptDNA?.palette) && conceptDNA.palette.length > 0
    ? (batchDiversity ? pickWithBatchLimit(conceptDNA.palette, batchDiversity.paletteCounts, batchRules.identicalPaletteMax, 'palette') : pickRandom(conceptDNA.palette))
    : null;

  // EU-1..4 paket B: promptRules.mustInclude — elemen wajib hadir di visual,
  // spesifik per-subkategori (mis. "clean isolated background" untuk Geometric Shapes).
  // Array di-join sebagai instruksi koma-separated agar mudah dibaca model.
  const mustInclude = Array.isArray(conceptDNA?.promptRules?.mustInclude) && conceptDNA.promptRules.mustInclude.length > 0
    ? conceptDNA.promptRules.mustInclude.join(', ')
    : null;

  // EU-1..4 paket B: promptRules.mustAvoid — elemen yang WAJIB DIHINDARI di
  // visual (kebalikan dari mustInclude). Ini berpasangan dengan mustInclude:
  // mustInclude = apa yang harus ada, mustAvoid = apa yang tidak boleh muncul.
  // Data ini sekarang di-wire ke prompt sebagai instruksi eksplisit.
  const mustAvoid = Array.isArray(conceptDNA?.promptRules?.mustAvoid) && conceptDNA.promptRules.mustAvoid.length > 0
    ? conceptDNA.promptRules.mustAvoid.join(', ')
    : null;

  // Flatten style DNA ke natural language (hapus bracket wrapper)
  const styleDNAFlat = stylePreset ? stylePreset.promptTrigger : '';

  // Bangun natural language DNA context — NO bracket tags
  const subjectLine = subject ? subject : null;
  const styleLine = styleDNAFlat || null;
  const sceneLine = scene ? `depicted as ${scene}` : null;
  const macroLine = macro ? `evoking ${macro}` : null;
  const microLine = micro ? `${microKey}: ${micro}` : null;
  const motifLine = motif ? `motif: ${motif}` : null;
  const structureLine = conceptDNA?.structure ? conceptDNA.structure : null;
  const repetitionLine = conceptDNA?.repetition ? `variation instruction: ${conceptDNA.repetition}` : null;
  const paletteLine = conceptPalette ? `color palette: ${conceptPalette}` : null;
  // FIX: visualLanguage di photo CATEGORY_DNA (mis. Lifestyle, People) berisi instruksi
  // representasi diversity & authenticity yang penting. Sebelumnya selalu null untuk photo.
  // FIX v2: beberapa visualLanguage masih menyebut "illustration" / "flat vector" — untuk
  // photo, strip kata-kata rendering medium itu agar tidak kontradiktif dengan photoAuthority.
  const visualLangRaw = conceptDNA?.visualLanguage || null;
  const visualLangLine = visualLangRaw
    ? (isPhoto
        ? visualLangRaw
            .replace(/\b(flat vector|flat illustration|vector illustration|illustration|flat vector illustration|editorial illustration|lifestyle illustration|flat vector,?\s*)/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim() || null
        : visualLangRaw)
    : null;
  const bgTreatLine = conceptDNA?.background ? conceptDNA.background : null;
  const mustIncludeLine = mustInclude ? `include: ${mustInclude}` : null;
  const mustAvoidLine = mustAvoid ? `avoid: ${mustAvoid}` : null;

  // FIX: photo sebelumnya kehilangan visualDNA DAN subcategoryKey keduanya.
  // Photo visualDNA mengandung frasa "Flat vector illustration" yang tidak relevan —
  // kita strip itu dan pakai commercialDNA sebagai fallback yang lebih neutral,
  // ditambah subcategoryKey (selalu diperlukan untuk context spesifik kategori).
  const categoryHint = isPhoto
    ? (subcategoryKey ? subcategoryKey : (cat.commercialDNA || ''))
    : `${cat.visualDNA}${subcategoryKey ? ', ' + subcategoryKey : ''}`;

  return [
    subjectLine,
    styleLine,
    sceneLine,
    macroLine,
    microLine,
    motifLine,
    structureLine,
    repetitionLine,
    paletteLine,
    visualLangLine,
    bgTreatLine,
    categoryHint,
    mustIncludeLine,
    mustAvoidLine,
  ].filter(Boolean).join(', ');
}

// 10 · RULE ENGINE — Commercial Rules
//  DNA ENGINE V5 — COMMERCIAL RULES

export function buildCommercialRules(categoryKey, subcategoryKey = '', assetType = '') {
  const cat = CATEGORY_DNA[categoryKey];
  if (!cat && !categoryKey) return '';
  // FIX #22 (audit): kategori tak dikenal (categoryKey ada, DNA tidak) —
  // jangan lolos diam-diam; warning + lanjut dengan token compliance saja.
  if (!cat) console.warn(`[DNA] buildCommercialRules: unknown category "${categoryKey}" — output partial (compliance tokens only)`);
  const adobe = GLOBAL_DNA.adobeCompliance;
  const photo = GLOBAL_DNA.photoCompliance;
  const isPhoto = assetType === 'photo';
  const sub = subcategoryKey && cat ? cat.subcategories[subcategoryKey] : null;
  const subjects = sub?.subjects;
  const subjectList = subjects ? subjects.slice(0, 4).join(', ') : '';

  // EU-8: Generic Object DNA — hanya aktif kalau subkategori ini ditandai
  // genericObjectTags (Technology/Business/Transportation/dst yang rawan
  // menghasilkan visual mirip produk/UI/kendaraan nyata).
  const objectTags = sub?.genericObjectTags;
  const genericObjectRules = Array.isArray(objectTags) && objectTags.length > 0
    ? objectTags.map(tag => GENERIC_OBJECT_DNA[tag]).filter(Boolean).join('; ')
    : '';

  // EU-11: Concept DNA — commercialUse per-subkategori, lebih spesifik
  // daripada cat.commercialDNA yang cakupannya se-kategori. No-op kalau
  // subkategori belum punya conceptDNA.
  const conceptCommercialUse = Array.isArray(sub?.conceptDNA?.commercialUse) && sub.conceptDNA.commercialUse.length > 0
    ? sub.conceptDNA.commercialUse.join(', ')
    : '';

  // Token compliance harus sesuai assetType. Photo memakai photoCompliance
  // (tanpa noLensSimulation, tanpa "isolated white", tanpa kata "Vector")
  // — kalau tidak, model foto disuruh memproduksi gambar flat/vektor.
  const complianceToken = isPhoto
    ? `PHOTO STANDARD: ${photo.commercialQuality} ${photo.negativeSpace} ${photo.subjectClarity} ${photo.edgeQuality} ${photo.backgroundPreference} ${photo.lensDepth}`
    : `ADOBE STANDARD: ${adobe.commercialQuality} ${adobe.negativeSpace} ${adobe.subjectClarity} ${adobe.edgeQuality} ${adobe.backgroundPreference} ${adobe.noLensSimulation}`;

  return [
    complianceToken,
    cat ? `CATEGORY COMMERCIAL: ${cat.commercialDNA}` : '',
    // qualityDNA dan compositionDNA menjadi quality standard dan composition
    // guide per kategori.
    cat?.qualityDNA ? `QUALITY STANDARD: ${cat.qualityDNA}` : '',
    cat?.compositionDNA ? `COMPOSITION GUIDE: ${cat.compositionDNA}` : '',
    subcategoryKey ? `SUBCATEGORY: ${subcategoryKey}${subjectList ? ` — Suggested subjects: ${subjectList}` : ''}` : '',
    conceptCommercialUse ? `SUBCATEGORY COMMERCIAL USE: ${conceptCommercialUse}` : '',
    genericObjectRules ? `IP-SAFE OBJECT RULES: ${genericObjectRules}` : '',
  ].filter(Boolean).join(' | ');
}


// 09 · ENGINES — DNA Engine (style guidance resolver)
//  DNA ENGINE V5 — STYLE DNA

// STYLE_PRESET_MAP re-exported from prompt-helpers.ts.

// findStylePreset imported from prompt-helpers.ts.

export function buildStyleGuidance(styleName: string, customDirective = "", customAvoid = ""): string {
  if (customDirective || customAvoid) return `CUSTOM STYLE: ${customDirective || ""}${customAvoid ? ` Avoid: ${customAvoid}` : ""}`.trim();
  const preset = findStylePreset(styleName);
  return preset ? `STYLE DNA: ${preset.promptTrigger}. ${preset.characteristics}` : "";
}


// 12 · COMPLIANCE ENGINE — Generic Object DNA (EU-8)
// -
// Sumber: analisa penolakan Adobe Stock "Intellectual Property Refusal" untuk
// "Handshake over digital tablet with financial growth chart" — prompt yang
// terlihat generik ternyata bisa menghasilkan visual yang menyerupai produk/
// UI nyata. Registry ini berisi aturan anti-IP per jenis objek generik,
// ditempel ke prompt commercial rules HANYA untuk subkategori yang ditandai
// `genericObjectTags` di bawah (Technology, Business, Transportation, dst)
// — tidak mengubah subkategori lain sama sekali.
const GENERIC_OBJECT_DNA = {
  device: 'generic unbranded consumer device, no identifiable manufacturer, no distinctive product geometry, no brand-specific button layout, no logos or model markings',
  softwareUI: 'fictional generic dashboard interface, abstract simplified data visualization, no recognizable real application layout, no branded UI patterns, no company-specific interface colors, not a screenshot of any real software',
  packaging: 'generic unbranded packaging or container, no recognizable packaging silhouette of an existing product, no brand identity, no trademark-like marks or wordmarks',
  vehicle: 'generic vehicle design, no manufacturer-specific styling or badges, no distinctive trademark elements, no visible brand logos',
};

// 10 · RULE ENGINE — Category Negative Hints
//  DNA ENGINE V5 — NEGATIVE PROMPT ENGINE

export const CATEGORY_NEGATIVE_HINTS = {
  'Abstract': 'recognizable objects, accidental faces, representational forms',
  'Animals': 'deformed animal anatomy, unrealistic proportions, missing limbs, unnatural colors',
  'Buildings and Architecture': 'people blocking facade, lens flare, heavy chromatic aberration, overly HDR tonemapping, distracting foreground clutter, visible power lines unless intentional',
  'Business': 'cheesy forced smile, overly staged handshake, generic diverse-team-high-fiving pose, cluttered messy desk, excessive lens flare on office glass',
  'Education': 'outdated textbook aesthetic, cheap plastic toys, condescending imagery, overly posed classroom stock cliche, blurry chalkboard text',
  'Food and Drink': 'unappetizing appearance, mold, spoiled, artificial neon colors, unappealing texture',
  'Health and Medicine': 'unsanitary conditions, unprofessional appearance, intimidating medical tools, blood',
  'Holidays and Celebrations': 'generic stock cliche, overly commercial look, low-effort decoration',
  'Illustrations and Clipart': 'photorealistic rendering, heavy drop shadow, bevel and emboss effect, outdated clip-art style, low-resolution pixel artifact',
  'Industrial': 'unsafe conditions, broken equipment, unprofessional workspace',
  'Landscapes': 'heavy oversaturated HDR, blown-out sky, excessive vignette, tourist-trap angle, visible trash or litter, distracting power lines',
  'Lifestyle': 'overly staged posed look, forced unnatural smile, generic stock couple gazing at laptop, cluttered background, unflattering harsh lighting',
  'Nature': 'heavy oversaturation, plastic artificial look, unrealistic neon color grading, visible human interference unless intentional, blurry out-of-focus subject',
  'Objects': 'distracting background clutter, inconsistent lighting direction, visible dust or scratches unless intentional, cheap plastic toy appearance, distorted perspective',
  'People': 'stereotypical depictions, offensive caricatures, unrealistic body proportions',
  'Religion and Culture': 'disrespectful portrayals, cultural appropriation, stereotypical imagery',
  'Science': 'inaccurate diagrams, pseudoscience imagery, nonsensical formulas',
  'Signs and Symbols': 'real trademarked logo, copyrighted brand symbol, illegible text, pixelated edge, inconsistent stroke weight, random decorative noise',
  'Sports': 'unrealistic anatomy, missing equipment detail, generic silhouette with no sport-specific context, blurry motion without intent, branded jersey or logo visible',
  'Technology': 'outdated hardware, messy cables, unrealistic interfaces, 90s aesthetic',
  'Transportation': 'visible brand logo or license plate, unrealistic scale, floating vehicle with no ground shadow, heavy lens flare on chrome, toy-like plastic appearance',
  'Travel': 'heavy tourist-trap cliche angle, extreme HDR tonemapping, visible crowds unless intentional, generic airport lounge shot, oversaturated sky',
};

export function buildCategoryNegativeHints(categoryKey) {
  return CATEGORY_NEGATIVE_HINTS[categoryKey] || '';
}


// 17 · MARKET DEMAND REGISTRY (Fase A) — konsep laris & buyer vocabulary
// -
// Tujuan: menjadikan tool menghasilkan aset yang DICARI pembeli microstock,
// bukan sekadar lolos review. Dua jenis data:
//   - topConcepts: konsep dengan volume pencarian tinggi (curated manual dulu,
//     dikalibrasi dari data penjualan nyata via feedback action 'sold').
//   - buyerTerms: istilah yang pembeli microstock ketik saat mencari — dipakai
//     metadata engine (buildMetadataExpansionCandidates) sebagai sumber keyword.
// Data awal ini adalah seed yang DIVERIFIKASI MANUAL dari praktik microstock
// umum; angka penjualan nyata (Fase F) akan menggeser prioritasnya.
const MARKET_DEMAND = {
  'Abstract': {
    topConcepts: [
      'Geometric abstract shapes seamless pattern',
      'Fluid gradient abstract background',
      'Minimalist line art abstract',
      'Liquid marble texture abstract',
      'Pastel abstract shapes on white',
    ],
    buyerTerms: ['abstract background', 'geometric pattern', 'fluid gradient', 'minimal art', 'texture background', 'digital art', 'wall art', 'poster background'],
  },
  'Animals': {
    topConcepts: [
      'Cute animal cartoon character',
      'Wildlife silhouette set',
      'Pet illustration portrait',
      'Animal paw print pattern',
      'Jungle animals seamless pattern',
    ],
    buyerTerms: ['animal illustration', 'cute animal', 'wildlife art', 'pet portrait', 'animal silhouette', 'jungle pattern', 'nursery decor'],
  },
  'Business': {
    topConcepts: [
      'Team collaboration flat illustration',
      'Business growth chart concept',
      'Remote work office scene',
      'Startup pitch presentation',
      'Corporate handshake concept',
    ],
    buyerTerms: ['business illustration', 'corporate design', 'teamwork concept', 'startup', 'presentation graphic', 'office scene', 'marketing visual'],
  },
  'Food and Drink': {
    topConcepts: [
      'Healthy food flat lay',
      'Coffee cup illustration',
      'Street food vector set',
      'Fruit seamless pattern',
      'Bakery illustration set',
    ],
    buyerTerms: ['food illustration', 'food pattern', 'coffee art', 'restaurant menu', 'healthy eating', 'food packaging', 'culinary design'],
  },
  'Holidays and Celebrations': {
    topConcepts: [
      'Christmas seamless pattern',
      'Festive greeting card illustration',
      'Birthday party vector set',
      'New year celebration concept',
      'Halloween cute illustration set',
    ],
    buyerTerms: ['christmas pattern', 'greeting card', 'holiday illustration', 'party design', 'festive decoration', 'seasonal art'],
  },
  'Nature': {
    topConcepts: [
      'Tropical leaves seamless pattern',
      'Botanical line art',
      'Wildflower meadow illustration',
      'Eucalyptus branch pattern',
      'Mushroom forest illustration',
    ],
    buyerTerms: ['botanical pattern', 'nature illustration', 'leaf pattern', 'floral design', 'plant art', 'green background', 'organic pattern'],
  },
  'Technology': {
    topConcepts: [
      'AI artificial intelligence concept',
      'Cybersecurity shield illustration',
      'Cloud computing flat design',
      'Smart home technology icons',
      'Data analytics dashboard concept',
    ],
    buyerTerms: ['technology illustration', 'ai concept', 'cyber security', 'cloud computing', 'tech background', 'digital innovation', 'app design'],
  },
  'Transportation': {
    topConcepts: [
      'Electric car illustration',
      'Delivery van concept',
      'Airplane travel illustration',
      'City transport icons set',
      'Logistics truck illustration',
    ],
    buyerTerms: ['transportation illustration', 'vehicle design', 'delivery concept', 'travel art', 'logistics graphic', 'city transport'],
  },
  'Travel': {
    topConcepts: [
      'Travel destination flat illustration',
      'World map travel concept',
      'Beach vacation illustration',
      'Adventure hiking scene',
      'Passport travel icons',
    ],
    buyerTerms: ['travel illustration', 'vacation design', 'destination art', 'travel poster', 'world map', 'adventure graphic', 'tourist concept'],
  },
  'People': {
    topConcepts: [
      'Diverse team portrait illustration',
      'Family lifestyle flat scene',
      'Professional avatar set',
      'Community diversity concept',
      'Exercise fitness people illustration',
    ],
    buyerTerms: ['people illustration', 'diversity art', 'portrait design', 'lifestyle scene', 'avatar set', 'human figure', 'community concept'],
  },
};

// Helper — buyer vocabulary untuk kategori tertentu (Fase A.2).
const getBuyerTermsForCategory = (categoryKey) => {
  const entry = MARKET_DEMAND[categoryKey];
  return entry?.buyerTerms || [];
};


// 17 · MARKET PALETTES (Fase B) — palette komersial yang "menjual" per kategori
// -
// Warna terbukti laku di thumbnail microstock: kontras cukup, harmonis, tidak
// gelap semua / pastel pucat tanpa fokus. Dipakai prompt generation (dnaPrefix)
// supaya hasil visual punya palette yang menarik di ukuran kecil (200px).
// Data awal curated manual dari praktik komersial umum; dikalibrasi dari
// feedback penjualan nyata (Fase F).

// ── buildCGAContext (line 6275) — culture-lock prompt context ───────────────
export function buildCGAContext(promptText, iterationIndex, session) {
  const r = GLOBAL_CGA_DATABASE.resolveCGA(promptText);
  if (!r.confidence.should_lock_culture) return { positive: '', negative: '' };

  const country = r.matched_country ? GLOBAL_CGA_DATABASE.countries[r.matched_country] : null;
  const region = r.matched_region ? GLOBAL_CGA_DATABASE.regions[r.matched_region] : null;
  const matchedEvent = r.matched_event ? GLOBAL_CGA_DATABASE.events.find(function(e) { return e.id === r.matched_event; }) : null;
  const ss = session || createBatchSession();
  const idx = iterationIndex || 0;

  const pos = [];

  if (country) {
    pos.push(country.identity);

    // Pilih simbol UNIK via session tracking
    var syms = [];
    if (Array.isArray(country.symbols)) syms = country.symbols;
    else if (typeof country.symbols === 'string') syms = country.symbols.split(',').map(function(s) { return s.trim(); });
    if (syms.length) {
      var picked1 = pickUnique(syms, ss.usedSymbols);
      var picked2 = null;
      var remaining = syms.filter(function(s) { return !ss.usedSymbols.has(s); });
      if (remaining.length > 0) {
        picked2 = pickUnique(remaining, ss.usedSymbols);
      }
      pos.push('Symbol focus: ' + (picked2 ? picked1 + ' and ' + picked2 : picked1));
    }

    // Pilih arsitektur UNIK via session tracking
    var archs = [];
    if (typeof country.architecture === 'string') archs = country.architecture.split(',').map(function(s) { return s.trim(); });
    else if (Array.isArray(country.architecture)) archs = country.architecture;
    var selectedArch = null;
    if (archs.length) {
      selectedArch = pickUnique(archs, ss.usedLandmarks);
      pos.push('Primary setting: ' + selectedArch);
    }

    // Exclusion eksplisit terhadap landmark yang sudah dipakai batch ini
    if (ss.usedLandmarks.size > 1) {
      var alreadyUsed = [];
      ss.usedLandmarks.forEach(function(l) {
        if (l !== selectedArch) alreadyUsed.push(l);
      });
      if (alreadyUsed.length > 0) {
        pos.push('IMPORTANT: Do NOT depict these already-used elements: ' + alreadyUsed.join(', ') + '. This image must show a different scene.');
      }
    }

    // Downweight overused elements — jangan tolak elemen yang justru dipilih
    // sebagai Primary setting (avoid self-conflict).
    if (country.overused_elements && country.overused_elements.length) {
      var overusedToAvoid = [];
      for (var oi = 0; oi < country.overused_elements.length; oi++) {
        var oe = country.overused_elements[oi];
        if (selectedArch && oe.toLowerCase() === selectedArch.toLowerCase()) continue;
        overusedToAvoid.push(oe);
      }
      if (overusedToAvoid.length) {
        pos.push('Avoid overused cliché imagery: ' + overusedToAvoid.join(', ') + '.');
      }
    }

    // Strong exclusion instruction
    pos.push(buildStrongExclusionInstruction(country));

  } else if (region) {
    pos.push(region.positive_lockdown);
  }

  // Mutator & Color — pakai offset dari session, bukan index mentah
  pos.push('Composition type: ' + MUTATION_FOCUS_BANK[(idx + ss.mutatorOffset) % MUTATION_FOCUS_BANK.length]);
  pos.push('Color scheme: ' + COLOR_ACCENT_PALETTES[(idx + ss.colorOffset) % COLOR_ACCENT_PALETTES.length]);

  if (matchedEvent) pos.push(matchedEvent.pin);

  return {
    positive: pos.length ? '[CGA: ' + pos.join('. ') + ']' : '',
    negative: r.negative_string,
  };
}

// ── buildNegativePrompt (line 6375) — layered negative prompt assembly ─────
export function buildNegativePrompt(baseNeg, categoryKey, styleName, archetype, cgaNegatives, subcategoryNeg = '', assetType = '') {
  // Photo tidak boleh memakai universalNegativePrompt mentah: token itu melarang
  // "photographic bokeh", "camera depth of field", "noisy textures" — justru
  // elemen inti fotografi. Untuk photo, hanya elemen cacat teknis yang dilarang.
  const globalNeg = assetType === 'photo'
    ? 'watermark, text, logo, signature, brand name, readable signage, low quality, blurry, out of focus, distorted anatomy, extra limbs, oversaturated plastic look, flat lighting, jpeg artifacts, artificial CGI look, toy-like plastic appearance'
    : GLOBAL_DNA.universalNegativePrompt;
  const catHints = buildCategoryNegativeHints(categoryKey);
  const peopleNeg = archetype?.excludesPeople
    ? 'people, person, human figure, man, woman, hands, fingers, face, human silhouette'
    : '';
  // EU-1..4 paket B: subcategoryNeg berasal dari conceptDNA.negativePrompt per-subkategori.
  // Layer paling spesifik — ditempatkan terakhir setelah catHints agar lebih eksplisit di
  // pipeline parser model (token terakhir cenderung dapat bobot lebih tinggi di diffusion model).
  // Layer style-specific negative — prevent visual bleed antar style
  const stylePresetData = findStylePreset(styleName);
  const styleNeg = stylePresetData?.negativePrompt || '';

  return [baseNeg, globalNeg, catHints, cgaNegatives, peopleNeg, subcategoryNeg, styleNeg].filter(Boolean).join(', ');
}
