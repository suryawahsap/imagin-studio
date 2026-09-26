// Focused semantic-intent test for engines/intent-engine.ts.
//   P1: DOMAIN_BY_CATEGORY / DOMAIN_FORBIDDEN / DOMAIN_FORBIDDEN_MATRIX   (tables)
//       buildForbiddenDomains / extractDomainKeywordsFromDNA             (forbidden gen)
//       containsConcept / detectDomainsFromVision                        (leaf matching)
//   P2: buildSemanticLocks / buildCanonicalIntent / validateCanonicalIntent
//       resolveConstraints / extractSemanticIntent                       (intent pipeline)
//   P3: validatePromptIntegrity / assessStyleCompatibility / assessSemanticMatch
//       (validator + vision dominance verifier)
// Run: npx tsx scripts/test-intent-engine.ts

import assert from "node:assert/strict";
import {
  DOMAIN_BY_CATEGORY,
  DOMAIN_FORBIDDEN,
  DOMAIN_FORBIDDEN_MATRIX,
  assessSemanticMatch,
  assessStyleCompatibility,
  buildCanonicalIntent,
  buildForbiddenDomains,
  buildSemanticLocks,
  containsConcept,
  detectDomainsFromVision,
  extractDomainKeywordsFromDNA,
  extractSemanticIntent,
  resolveConstraints,
  validateCanonicalIntent,
  validatePromptIntegrity,
} from "../src/modules/studio/engines/intent-engine";

let checks = 0;
function check(name: string, fn: () => void): void {
  checks++;
  try {
    fn();
  } catch (err) {
    console.error(`❌ ${name}`);
    throw err;
  }
}

// ── 1. Representative domain tables ─────────────────────────────────────
check("DOMAIN_BY_CATEGORY maps representative categories", () => {
  assert.equal(DOMAIN_BY_CATEGORY["Nature"], "botanical and nature");
  assert.equal(DOMAIN_BY_CATEGORY["Transportation"], "vehicles and transportation");
  assert.equal(DOMAIN_BY_CATEGORY["Technology"], "technology and digital");
  assert.equal(DOMAIN_BY_CATEGORY["People"], "people and portraits");
  assert.equal(DOMAIN_BY_CATEGORY["Food and Drink"], "food and beverages");
});

check("DOMAIN_FORBIDDEN has botanical base rules", () => {
  const b = DOMAIN_FORBIDDEN["botanical and nature"];
  assert.ok(b.includes("vehicle") && b.includes("car") && b.includes("animal"));
});

check("DOMAIN_FORBIDDEN_MATRIX covers every mapped domain + general content", () => {
  for (const domain of Object.values(DOMAIN_BY_CATEGORY)) {
    assert.ok(DOMAIN_FORBIDDEN_MATRIX[domain], `matrix missing ${domain}`);
  }
  assert.ok(Array.isArray(DOMAIN_FORBIDDEN_MATRIX["general content"]));
  assert.ok(DOMAIN_FORBIDDEN_MATRIX["vehicles and transportation"].includes("plant"));
});

// ── 2. Subcategory-aware forbidden filtering (Cars & Vehicles carve-out) ──
check("buildForbiddenDomains generates forbidden list for Nature", () => {
  const f = buildForbiddenDomains("Nature");
  assert.ok(f.includes("vehicle") && f.includes("car") && f.includes("building"));
  // de-dup + non-empty
  assert.equal(new Set(f).size, f.length);
});

check("Cars & Vehicles subcategory carves out vehicle/car from Transportation", () => {
  const without = buildForbiddenDomains("Transportation", "", "vehicles and transportation");
  assert.ok(without.includes("car"), "no-subcategory should still forbid car");

  const withSub = buildForbiddenDomains("Transportation", "Cars & Vehicles", "vehicles and transportation");
  assert.ok(!withSub.includes("car"), "car must be carved out");
  assert.ok(!withSub.includes("vehicle"), "vehicle must be carved out");
});

check("buildForbiddenDomains falls back to general content for unknown category", () => {
  const f = buildForbiddenDomains("TotallyUnknownCategory");
  assert.ok(f.length > 0);
  assert.ok(f.includes("vehicle"));
});

// ── 3. Domain keyword extraction (hit/miss) ─────────────────────────────
check("extractDomainKeywordsFromDNA hits cross-domain keywords", () => {
  const kw = extractDomainKeywordsFromDNA("Nature", "botanical and nature");
  // 'vehicle'/'car' are NOT in 'botanical and nature' → kept
  assert.ok(kw.includes("vehicle"));
  assert.ok(kw.includes("car"));
  // 'nature' IS part of user domain → excluded
  assert.ok(!kw.includes("nature"));
});

check("extractDomainKeywordsFromDNA excludes user-domain synonyms", () => {
  const kw = extractDomainKeywordsFromDNA("Transportation", "vehicles and transportation");
  assert.ok(!kw.includes("vehicle"), "vehicle is user domain, must not be forbidden");
  assert.ok(kw.includes("food"), "food is cross-domain, should be kept");
});

// ── 4. Word-boundary concept matching ───────────────────────────────────
check("containsConcept word-boundary: exact word matches, substrings don't", () => {
  assert.equal(containsConcept("a red car", "car"), true);
  assert.equal(containsConcept("scar tissue", "car"), false);
  assert.equal(containsConcept("CARPENTER", "car"), false);
  assert.equal(containsConcept("vehicle, car", "car"), true);
});

check("containsConcept multi-word phrase", () => {
  assert.equal(containsConcept("technology device in hand", "technology device"), true);
  assert.equal(containsConcept("tech gadget", "technology device"), false);
});

// ── 5. Vision domain detection ──────────────────────────────────────────
check("detectDomainsFromVision hits vehicle/botanical/architecture/food", () => {
  assert.deepEqual(detectDomainsFromVision("a red sports car on the highway"), ["vehicle"]);
  assert.deepEqual(detectDomainsFromVision("a bouquet of rose and tulip"), ["botanical"]);
  assert.deepEqual(detectDomainsFromVision("a tall skyscraper in the city"), ["architecture"]);
  assert.deepEqual(detectDomainsFromVision("a burger and pizza"), ["food"]);
});

check("detectDomainsFromVision word-boundary: scar is not car", () => {
  assert.deepEqual(detectDomainsFromVision("scar"), []);
});

check("detectDomainsFromVision empty input returns []", () => {
  assert.deepEqual(detectDomainsFromVision(""), []);
  assert.deepEqual(detectDomainsFromVision(undefined), []);
});

// ── 6. P2 · extractSemanticIntent extraction contract ─────────────────
check("extractSemanticIntent: primary/domain/lockedTerms/forbidden per category", () => {
  const si = extractSemanticIntent("a red sports car", "Transportation", "Cars & Vehicles", "vector");
  assert.equal(si.primarySubject, "a red sports car");
  assert.equal(si.subjectDomain, "vehicles and transportation");
  assert.equal(si.domain, "vehicles and transportation"); // backward-compat alias
  assert.ok(si.lockedTerms.includes("a red sports car"));
  assert.ok(Array.isArray(si.forbiddenDomains) && si.forbiddenDomains.length > 0);
  assert.ok(Array.isArray(si.forbiddenConcepts)); // backward-compat alias
});

check("extractSemanticIntent: lockedTerms capped at 6", () => {
  const si = extractSemanticIntent("mountain lake sunrise pine forest hiking trail camping tent", "Landscapes");
  assert.ok(si.lockedTerms.length <= 6, `lockedTerms = ${si.lockedTerms.length}`);
});

check("extractSemanticIntent: falls back to general content for unknown category", () => {
  const si = extractSemanticIntent("anything", "TotallyUnknownCategory");
  assert.equal(si.subjectDomain, "general content");
  assert.ok(si.forbiddenDomains.length > 0);
});

// ── 7. P2 · buildCanonicalIntent shape ────────────────────────────────
check("buildCanonicalIntent: builds canonical shape from semanticIntent + request", () => {
  const si = extractSemanticIntent("a red sports car", "Transportation", "Cars & Vehicles", "vector");
  const intent = buildCanonicalIntent({
    semanticIntent: si,
    request: { style: "Cyberpunk", platform: "adobe_stock", source: "sidebar", assetType: "vector" },
  });
  assert.equal(intent.userPrompt, "a red sports car");
  assert.equal(intent.subject.primary, "a red sports car");
  assert.equal(intent.subject.domain, "vehicles and transportation");
  assert.equal(intent.asset.assetType, "vector");
  assert.equal(intent.style.requested, "Cyberpunk");
  assert.equal(intent.platformId, "adobe_stock");
  assert.equal(intent.source, "sidebar");
  assert.equal(intent.constraints.required[0], "a red sports car");
  assert.ok(Array.isArray(intent.semanticLocks) && intent.semanticLocks.length > 0);
});

check("buildCanonicalIntent: defaults platform to DEFAULT_PLATFORM and bg to white", () => {
  const intent = buildCanonicalIntent({ semanticIntent: null });
  assert.equal(intent.platformId, "adobe_stock");
  assert.equal(intent.background.mode, "white");
  assert.equal(intent.asset.assetType, "vector");
});

// ── 8. P2 · validateCanonicalIntent missing fields ────────────────────
check("validateCanonicalIntent: valid intent passes", () => {
  const si = extractSemanticIntent("a red sports car", "Transportation", "Cars & Vehicles", "vector");
  const v = validateCanonicalIntent(buildCanonicalIntent({ semanticIntent: si }));
  assert.equal(v.valid, true);
  assert.deepEqual(v.missing, []);
});

check("validateCanonicalIntent: reports missing subject.primary/asset/userPrompt", () => {
  const v = validateCanonicalIntent({ subject: {}, asset: {}, userPrompt: "" });
  assert.equal(v.valid, false);
  assert.ok(v.missing.includes("subject.primary"));
  assert.ok(v.missing.includes("asset.assetType"));
  assert.ok(v.missing.includes("userPrompt"));
});

// ── 9. P2 · resolveConstraints triads ─────────────────────────────────
check("resolveConstraints: subject_style is a warning", () => {
  const r = resolveConstraints({
    subject: { primary: "flower", domain: "botanical and nature" },
    asset: { profile: "object", assetType: "vector" },
    style: { directive: "a red sports car racing through a neon cityscape with skyscrapers" },
    background: { mode: "white" },
    constraints: { required: ["flower"], forbidden: [] },
  });
  assert.ok(r.conflicts.some(c => c.type === "subject_style" && c.severity === "warning"));
  assert.equal(r.valid, true, "warning must not invalidate");
});

check("resolveConstraints: subject_asset (pattern + singular) is an error", () => {
  const r = resolveConstraints({
    subject: { primary: "a single butterfly" },
    asset: { profile: "pattern", assetType: "vector" },
    style: { directive: null },
    background: { mode: "white" },
    constraints: { required: ["butterfly"], forbidden: [] },
  });
  assert.ok(r.conflicts.some(c => c.type === "subject_asset" && c.severity === "error"));
  assert.equal(r.valid, false);
});

check("resolveConstraints: asset_background (icon + scene) is an error", () => {
  const r = resolveConstraints({
    subject: { primary: "star" },
    asset: { profile: "icon", assetType: "vector" },
    style: { directive: null },
    background: { mode: "scene" },
    constraints: { required: ["star"], forbidden: [] },
  });
  assert.ok(r.conflicts.some(c => c.type === "asset_background" && c.severity === "error"));
  assert.equal(r.valid, false);
});

// ── 10. P3 · validatePromptIntegrity drift-fail/warning ───────────────
check("validatePromptIntegrity: subject missing → drift error", () => {
  const r = validatePromptIntegrity("a colorful abstract pattern", {
    primarySubject: "sports car",
    forbiddenConcepts: ["flower"],
  });
  assert.equal(r.pass, false);
  assert.equal(r.severity, "error");
  assert.ok(/Primary subject "sports car" missing/.test(r.reason));
});

check("validatePromptIntegrity: forbidden concept present → warning", () => {
  const r = validatePromptIntegrity("a red sports car with a flower decal on the door", {
    primarySubject: "sports car",
    forbiddenConcepts: ["flower"],
  });
  assert.equal(r.pass, false);
  assert.equal(r.severity, "warning");
  assert.ok(/Forbidden concepts detected: flower/.test(r.reason));
});

check("validatePromptIntegrity: subject present, no forbidden → pass", () => {
  const r = validatePromptIntegrity("a red sports car on the highway", {
    primarySubject: "sports car",
    forbiddenConcepts: ["flower"],
  });
  assert.equal(r.pass, true);
});

check("validatePromptIntegrity: no semanticIntent → pass-through", () => {
  assert.deepEqual(validatePromptIntegrity("anything", null), { pass: true });
  assert.deepEqual(validatePromptIntegrity("anything", {}), { pass: true });
});

// ── 11. P3 · assessStyleCompatibility verdicts ──────────────────────
check("assessStyleCompatibility: preset style → compatible", () => {
  const r = assessStyleCompatibility({ status: "preset", preferredDomains: [] }, { subjectDomain: "botanical and nature" });
  assert.equal(r.verdict, "compatible");
  assert.equal(r.confidence, 1);
});

check("assessStyleCompatibility: domain overlap → compatible", () => {
  const r = assessStyleCompatibility(
    { status: "custom", preferredDomains: ["botanical"], confidence: 0.5 },
    { subjectDomain: "botanical and nature" }
  );
  assert.equal(r.verdict, "compatible");
  assert.ok(/style domain overlap/.test(r.reason));
});

check("assessStyleCompatibility: no overlap but high confidence → plausible", () => {
  const r = assessStyleCompatibility(
    { status: "custom", preferredDomains: ["technology and digital"], confidence: 0.8 },
    { subjectDomain: "botanical and nature" }
  );
  assert.equal(r.verdict, "plausible");
});

check("assessStyleCompatibility: no overlap, low confidence → unknown", () => {
  const r = assessStyleCompatibility(
    { status: "custom", preferredDomains: ["technology and digital"], confidence: 0.3 },
    { subjectDomain: "botanical and nature" }
  );
  assert.equal(r.verdict, "unknown");
});

check("assessStyleCompatibility: no interpretation → unknown", () => {
  const r = assessStyleCompatibility(null, { subjectDomain: "botanical and nature" });
  assert.equal(r.verdict, "unknown");
  assert.equal(r.confidence, 0);
});

// ── 12. P3 · assessSemanticMatch vision dominance verifier ──────────
check("assessSemanticMatch: hard primary-domain mismatch (mobil bermotif botanical)", () => {
  // Case: primarySubject = 'car' (vehicle) di category botanical. Botanical hanya
  // atribut di objects → primary object masuk forbidden → HARD FAIL wrong_subject.
  const r = assessSemanticMatch(
    {
      primarySubject: "car",
      subjectDomain: "botanical and nature",
      forbiddenDomains: ["vehicle", "car", "automobile", "building", "skyscraper"],
    },
    { primarySubject: "a red car", objects: ["botanical flower pattern on the hood", "rose decal"] }
  );
  assert.equal(r.verdict, "wrong_subject");
  assert.equal(r.primarySubjectMatch, false);
  assert.equal(r.promptFidelity, 0);
  assert.ok(/primary subject is in forbidden domain/.test(r.reason));
});

check("assessSemanticMatch: matching subject → match verdict", () => {
  const r = assessSemanticMatch(
    {
      primarySubject: "rose",
      subjectDomain: "botanical and nature",
      forbiddenDomains: ["vehicle", "car"],
    },
    { primarySubject: "a red rose", objects: ["leaf", "petal"] }
  );
  assert.equal(r.verdict, "match");
  assert.equal(r.primarySubjectMatch, true);
  assert.ok(r.promptFidelity >= 50);
});

check("assessSemanticMatch: forbidden object present alongside subject → integrity warning", () => {
  const r = assessSemanticMatch(
    {
      primarySubject: "rose",
      subjectDomain: "botanical and nature",
      forbiddenDomains: ["vehicle", "car", "flower"],
    },
    { primarySubject: "a rose", objects: ["a car parked behind"] }
  );
  assert.equal(r.verdict, "match");
  assert.equal(r.integrityWarning, true);
  assert.ok(r.promptFidelity <= 60, `fidelity capped at 60, got ${r.promptFidelity}`);
});

check("assessSemanticMatch: forbidden only, no overlap → wrong_subject", () => {
  const r = assessSemanticMatch(
    {
      primarySubject: "rose",
      subjectDomain: "botanical and nature",
      forbiddenDomains: ["vehicle", "car"],
    },
    { primarySubject: "a car", objects: [] }
  );
  assert.equal(r.verdict, "wrong_subject");
  assert.equal(r.promptFidelity, 0);
});

console.log(`intent-engine assertions passed (${checks} checks)`);
