# IMAGIN Studio Local — Parity Matrix

**Status:** Master Verification Matrix  
**Date:** 2026-09-06  
**Behavior reference:** `imagin_studio_strong_v2.tsx`

---

## 1. Purpose

This matrix is the operational definition of parity between Canvas Upgraded and the new Local implementation.

A capability is **not complete** because a function exists or a screen renders.

### Completion levels

```text
L0 Missing
L1 Implemented
L2 Wired
L3 Behavioral Parity
L4 Integration Tested
L5 Hardened
```

Definitions:

- **L0:** absent.
- **L1:** code exists.
- **L2:** runtime uses the code.
- **L3:** same behavior contract as Canvas Upgraded.
- **L4:** real integration/E2E evidence exists.
- **L5:** persistence, recovery, security, error handling, and edge cases are verified.

**100% parity requires all critical rows to reach L5.**

---

## 2. Status Legend

Use exactly one status per row:

```text
TODO
IN_PROGRESS
BLOCKED
PASS
INTENTIONAL_DRIFT
N/A
```

Evidence must include a test name, command, screenshot, trace ID, or documented runtime observation.

---

## 3. Master Matrix

| ID | Domain | Canvas Behavior | Local Target | Level | Status | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| P-001 | Normal generation | Full production flow | Studio canonical pipeline | L2 | IN_PROGRESS | canonical pipeline production-service.ts (intake→normalize→resolve→semantic_intent→differentiation→dna→composition→plan→generation→finalize→qa→preflight→persist→complete (+ repair stage on repair-eligible failures, all attempts in trace) + tests (production-service.test.ts, M5+M13-inc2/inc3/inc4/inc6/concept/QA/vision/repair); HONEST: qa/preflight record Layer A vision + deterministic evidence (Layer B+C metadata-QA coupling deferred); dna stage records style-DNA + CGA resolution + category DNA engagement (DNA-registry categories, inc-6); differentiation stage records concept fingerprint + similarity warnings (P-012/P-013); composition stage live (slot inject feeds compiled prompt); compiled prompt = deterministic compilePrompt output (P-008) validated by the integrity gate (see P-007, P-010–P-019); M14 inc-6: trace carries additive normalizedRequest + resolvedConfig (explicit fields, decrypted key can never enter — T19.01/T19.02) on success+error traces; dna/prompt versions deferred (no local constants); metadata/export recording out of pipeline scope per D-024 | Critical |
| P-002 | Batch generation | Multi-asset generation | Studio batch adapter | L2 | IN_PROGRESS | Shared batch planner inside canonical produce(): count>1 expansion + items, per-item failure isolation, master trace, idempotent replay (batch tests, M6); no pause/resume (M12 deferral) | No second pipeline |
| P-003 | JSON batch | Parse/validate/normalize/import | JSON adapter | L2 | IN_PROGRESS | parseJsonBatch domain adapter wired into produce() json mode; malformed input fails explicitly with per-item messages (json suite + T11.04 payload test, M6); json-batch.ts parse/validate/normalize adapter + canonical execution tests (production-service.test.ts:309-360) | Must produce requests |
| P-004 | Icon generation | Icon DNA + variation + sheet rules | Icon adapter | L1 | IN_PROGRESS | icon mode via canonical pipeline: iconStyle required + ratio locked 1:1 + tests (M6); mode=icon discriminator + 1:1 ratio lock + tests (M6); icon DNA/negative/style injection still missing | PARTIAL: iconStyle validated but not yet injected into generation (no preset/DNA/constraints) |
| P-005 | Reference workflow | Visual analysis + inferred config + skip expansion | Reference adapter | L2 | IN_PROGRESS | reference mode loads asset file → imageBase64 into AI payload; lineage relation 'reference' + trace.lineage; missing-ref rejection test (M6); reference asset → imageBase64 multimodal payload + reference lineage + missing-ref rejection (M6); visual inference/skip-expansion not yet (BEHAVIOR_SPEC §98-149 gap) | Critical; visual analysis/inferred config not yet |
| P-006 | Semantic intent | Preserve user subject/domain | Intent domain | L2 | IN_PROGRESS | intent engine implemented + wired: extractSemanticIntent/buildForbiddenDomains/buildSemanticLocks/buildSemanticLockToken/resolveConstraints/containsConcept/detectDomainsFromVision ported from Canvas (src/modules/studio/domain/intent/engine.ts); canonical pipeline records semantic_intent stage with structured detail (production-service.ts, between resolve and plan); 37 contract tests (engine.test.ts); semantic lock token LIVE in compiled prompt since inc-5 (compilePrompt segment). L3 behavioral-parity evidence = M13 exit bar | Critical |
| P-007 | DNA | Category/style/commercial/CGA rules | DNA domain | L2 | IN_PROGRESS | registry ported verbatim (registry/dna/global.ts, styles.ts 26 presets, categories.ts 22 categories — Canvas 2703–5008); engine ported (domain/dna/: buildDNAContext, buildCommercialRules, findStylePreset, getBatchRules, createDNATracker, genDNASignature, pickWithBatchLimit, pickRandom) + 26 contract tests incl. registry-integrity (dna-engine.test.ts); canonical pipeline records dna stage (style DNA resolution live via findStylePreset; category DNA LIVE since inc-6 — ProductionRequest optional category/subcategory/platform/platformCategoryId, category-resolver.ts ports, buildDNAContext/buildCommercialRules engaged for DNA-registry categories, honest official-fallback detail when the label is not a registry key). Done inc-6: GENERIC_OBJECT_DNA (registry/dna/generic-object.ts verbatim + buildCommercialRules IP-SAFE OBJECT RULES branch — Canvas 5199–5245/5329–5334). Done inc-4: durable diversity tracker persistence (electron/services/storage/diversity-persistence.ts, AtomicJsonStore per D-023); CGA database/engine/context ported (registry/cga/*, domain/prompt/cga-*) and LIVE since inc-5 (cga positive in compiled prompt, cga.negative in layered negative; dna stage detail). L3 = M13 exit bar | Single owner |
| P-008 | Prompt compiler | Layered semantic compilation | Prompt domain | L2 | IN_PROGRESS | compilePrompt (Canvas 13555–13699 verbatim: executable segment order, reference sentinel, negative strip/dedup) + buildLayeredNegativePrompt (13418–13470) ported to src/modules/studio/domain/prompt/compiler.ts + 10 contract tests; CANONICAL compiled prompt in production-service since inc-5 (compile → integrity validate → provider, Canvas 14484–14511 order); preset style interpretation (promptTrigger visualDirective per Canvas 12958–12991 preset path). Deferred: expandPromptWithGemini (Canvas deterministic path skips it too), Gemini custom-style interpreter (literal style name, honest), composeIconPrompt (icon mode uses canonical compiler; icon-parity claim deferred), market palette / photo authority (conditional skip, no local inputs), [ASSET]/[CATEGORY] negative layers dormant. L3 = M13 exit bar | Critical |
| P-009 | Prompt integrity | Reject invalid prompt before provider call | Prompt validator | L2 | IN_PROGRESS | pre-provider gate wired in canonical pipeline: validatePromptIntegrity (Canvas word-boundary semantics) runs on the exact compiled provider text (compilePrompt output, inc-5); severity error → structured validation_error (prompt_integrity_failed) before AI call, warning recorded in plan-stage detail (production-service.ts); empty/length intake validation retained; service tests incl. warning-non-blocking + compiled-text cases (production-service.test.ts). L3 = M13 exit bar | Critical |
| P-010 | Composition | Deterministic/AI composition behavior | Composition domain | L2 | IN_PROGRESS | pools+session+slots ported verbatim (registry/composition-pools.ts, domain/composition/: createCompositionSession, generateDynamicSlot, getBatchSlots — Canvas 1049-1163) + AI planner getBatchSlotsAI (Canvas 1165-1241; provider call injected per D-010, transparent deterministic fallback; INTENTIONAL DRIFT: Canvas keyless-retry 1206-1218 retired — browser-session credential injection has no Local equivalent, structured provider errors hit the same fallback) + 12 tests; composition stage LIVE in canonical pipeline (slot inject feeds compilePrompt as archetypeInstruction since inc-5; useAIComposition flag not on ProductionRequest yet — deterministic engaged). L3 = M13 exit bar | Single owner |
| P-011 | Concept genericity | Evaluate concept specificity | Concept intelligence | L2 | IN_PROGRESS | isSpecific derives from the deterministic isSpecificUserInput predicate (ported, domain/concept/specificity.ts — Canvas 14295 semantics; feeds buildDNAContext); Gemini differentiation advisor analyzeConceptGenericity ported verbatim (domain/concept/genericity.ts — Canvas 19910–19992: payload + generationConfig, clamp/band normalization, null on empty/failure) and wired ONCE-per-batch into the differentiation stage via the optional generateText transport — recommendation RECORDED, never blocks (Canvas reconsider dialog is renderer-facing, deferred). L3 = M13 exit bar | No fake result |
| P-012 | Fingerprint | Concept fingerprinting | Concept intelligence | L2 | IN_PROGRESS | pure module ported verbatim (domain/concept/fingerprint.ts — hashString FNV-1a 13890–13899, normalizeConceptTerms + FINGERPRINT_STOPWORDS 13901–13917, buildConceptFingerprint 13919–13939, fingerprintsMatch Jaccard 13942–13951) + 41 concept tests; lineage persistence (AssetLineage.conceptFingerprint/promptGraph.intent on Asset, no schemaVersion bump per D-020 additive-optional) persisted in the generation library.create path; differentiation stage records the fingerprint (Canvas 14640–14643 trace parity) | Critical |
| P-013 | Pre-generation similarity | Detect likely duplication before call | Concept intelligence | L2 | IN_PROGRESS | checkLibraryConceptSimilarity (Jaccard >= 0.4, first 5, Canvas 13966–13993) + checkPreGenerationSimilarity (title >= 0.6, Canvas 18631–18639) ported pure (domain/concept/similarity.ts) and wired warn-only into the differentiation stage over LibraryService assets; integration test proves persist→reconstruct→match across requests. Canvas UI blocking >=5 / toast >=3 is renderer concern — deferred honestly | Critical |
| P-014 | Visual similarity | Compare output visuals | Concept intelligence | L2 | IN_PROGRESS | M14 inc-8 (decision A: Electron nativeImage, zero new deps): pure-domain `perceptual-hash.ts` (dHash 72-bit Canvas-BUG-6 nibble semantics + 7266 polarity, pHash-lite 32×32 DCT, 4×4×4 histogram, visualSimilarity 0.40/0.40/0.20; integer-exact box-average downsample); `electron/services/library/visual-fingerprint.ts` (injectable decoder, nativeImage BGRA→RGBA PNG/JPEG, honest decode_failed/invalid_pixels); fingerprints persisted at asset completion (single+batch persist path, best-effort); `LibraryService.findSimilarVisual` (Canvas checkLibraryVisualSimilarity 18564 mapping, threshold 0.55/limit 5); additive optional `visualFingerprint` on the Asset contract; 19 tests | Renderer similar-assets surface (UI row); optional visual evidence feed into repair loop |
| P-015 | Batch diversity | Visual/title/subject variation | Concept intelligence | L2 | IN_PROGRESS | pickUnique (Canvas 6190-6201), planConceptClusters (Canvas 6315-6333, domain/diversity/concept-clusters.ts) + exclusion instruction (Canvas 6335-6345) + 5 tests; durable diversity tracker persistence (electron/services/storage/diversity-persistence.ts — Canvas markDiversityUsedDB merged-set semantics on AtomicJsonStore/D-023, IndexedDB RETIRED, 6 tests incl. round-trip/dedup/durable tracker); batch diversity session/limits from P-007 engine. LIVE since inc-6: category-keyed engagement (per-batch durable tracker createDurableDNATracker + flush in batch finally — Canvas 14321–14324/14901–14903; per-item cluster plans into buildDNAContext — Canvas 14395–14403). L3 = M13 exit bar | Single owner |
| P-016 | Visual truth | AI vision analysis | Quality domain | L2 | IN_PROGRESS | Layer A image-first truth LIVE in the canonical pipeline: analyzeVisualTruth (domain/quality/vision.ts — Canvas 18867–19040, image-only schema, prompt excluded per VISION_SYSTEM_INSTRUCTION semantics) + semantic/profile assessment + decision rules (20257–20304) + vision evidence in the qa stage trace. DEFERRED: Layer B+C metadata-QA coupling (metadata module integration — generate-metadata.ts visualAnalysis:'not_available' still honest there); visual profile classifier as a named export | |
| P-017 | Technical QA | Resolution/format/file checks | Quality domain | L2 | IN_PROGRESS | canonical qa stage in the pipeline (post-finalize: file exists, dimensions probed, size > 0, extension↔mimeType consistency — no invented thresholds) + prior module-executor QA retained (upscale dims/format, vectorize SVG validation). Deferred: pixel-level technical QA (needs Electron image-decode strategy), category-quality AI checks | |
| P-018 | Compliance | Brand/content/news safety | Compliance domain | L2 | IN_PROGRESS | compliance engine ported verbatim (domain/compliance/compliance.ts — Canvas 1266–1420: BRAND_IP_BLOCKLIST, GOVERNMENT_AGENCY_BLOCKLIST, artist-style regex, matchesBlockedTerm word-boundary matcher, checkBrandSafety, NEWS/METADATA_NEWS/SENSITIVE markers, NEWS_SAFE_CATEGORIES, detectNewsEvent, detectSensitiveContent, CONTENT_SAFETY_RULES) + 13 tests; pre-provider gate hard-blocks brand/IP/government/artist hits per Canvas JSON-path policy (8642–8649 — renderer dialog 14224–14232 deferred); news/sensitive = warn-class evidence into plan detail + preflight decision | Critical |
| P-019 | Preflight | Final production decision | Preflight domain | L2 | IN_PROGRESS | preflight stage records the final production decision via buildQualityGateResult (Canvas 5742–5864): Layer A vision (analyzeVisualTruth ported — transport injected, Canvas 18867–19040 schema verbatim) + assessSemanticMatch/assessProfileMatch with the Canvas decision rules (20257–20304: wrong_subject ≥0.7 → fail, promptFidelity<50 → fail, profile mismatch → needs_review, unknown non-blocking); deterministic evidence (compliance/qa/news/sensitive) feeds the pipeline decision; regeneration is RECORDED in the gate result, never executed (P-026); asset persists regardless; preflight decision persisted as lineage evidence (AssetLineage.preflightDecision — M13-remainder increment). DEFERRED honestly: Layer B+C metadata-QA coupling (metadata module integration), full PREFLIGHT_ITEMS stock-metadata checklist (1247–1266), decision→asset-STATUS persistence, repair execution (P-026) | Critical |
| P-020 | QA issue contract | Structured issue with severity/confidence/evidence | Shared QA contract | L1 | IN_PROGRESS | src/shared/qa/contract.ts + qa.test.ts (M2) | Wiring at pipeline M5 |
| P-021 | Metadata generation | Visual-truth-first metadata | Metadata module | L2 | IN_PROGRESS | generate via ONE metadata service: eligibility gate → shared Job (module 'metadata', idempotent replay) → per-item isolation → validator status mapping → persist + trace (11 service tests, M7); keep the HONEST no-vision note | HONEST GAP: no vision engine — visualAnalysis:'not_available'; AI works from production/asset context only |
| P-022 | Metadata policy | Hard/production/quality hierarchy | Metadata policy | L1 | IN_PROGRESS | platform-rules.ts single source (Adobe Stock baseline: title/keyword limits, categories); validator severity → ready/needs_review/invalid mapping (domain tests, M7) | Freepik locked (D-012); platform set = adobe_stock only |
| P-023 | Title regeneration | Regenerate title only | Metadata application | L1 | IN_PROGRESS | regenerateField('title'): field-scoped AI prompt → parse → persist ONLY title; test asserts description+keywords byte-identical, source ai→ai_then_manual (M7) | |
| P-024 | Description regeneration | Regenerate description only | Metadata application | L1 | IN_PROGRESS | same field-scoped path for description (metadata-regeneration.ts builder + parseFieldValue, M7) | |
| P-025 | Keyword regeneration | Regenerate keywords only | Metadata application | L1 | IN_PROGRESS | same field-scoped path for keywords + normalizeKeywords dedupe/limit (M7) | |
| P-026 | Auto-regeneration | Bounded retry/revision behavior | Production/revision | L2 | IN_PROGRESS | bounded internal repair loop LIVE in the canonical pipeline (domain/quality/repair.ts verbatim Canvas 19998–20013/20031–20035/20927–20940 + production-service): trigger = gate decision 'regenerate' (fail non-IP) + repair-eligible evidence class (semantic fail ≥0.7/fidelity<50, sharpness, watermark, content-safety, profile mismatch ≥0.7, library-sim ≥5) + attempt < 2 per lineage counters (cross-path max); repair stage records attempt/reasonCode/strategy/reinforcedPrompt; ALL attempts preserved in trace.generation; final attempt persisted. DOCUMENTED DEVIATIONS: merged negatives ride the prompt as EXPLICITLY FORBIDDEN clauses (local generateImage has no separate negative arg); IP 'reject' unreachable post-compliance-gate (pre-blocked). CANCELLATION (M14 inc-2): the job AbortSignal is threaded executor → produceInternal/generateAsset → ai.generateImage/generateText (AbortSignal.any composition with the timeout); throwIfAborted before generation, before each repair attempt, and before persist; in-flight processing + repair-loop cancellation tests prove job 'cancelled', no asset commit, no further provider calls. Deferred: Canvas in-place same-ID replacement (local persists the final attempt), renderer confirmation/progress, metadata-only repair paths | No infinite loops |
| P-027 | Revision | Parent lineage + new result | Revision domain | L2 | IN_PROGRESS | revision mode: distinct child asset + revision_of lineage + trace.lineage + revisionIntent drives prompt (test, M6) | |
| P-028 | Object modifier | Modify source object into new result | Object modifier | L2 | IN_PROGRESS | object_modifier mode: repaint/modify_objects categories + modified_from lineage + distinct asset (test, M6) | |
| P-029 | Background removal | Approved local path | Asset processing | L0 | TODO | — | No removed providers |
| P-030 | Project CRUD | Create/update/delete/list | Shared project domain | L2 | IN_PROGRESS | ProjectRecord contract (Canvas 1747–1757) + ProjectService (create/save/get/list/duplicate/archive/unarchive/remove/attachJob — Canvas 1788–1826) over AtomicJsonStore (D-023) + IPC/preload; assetCount via explicit set-asset-count (honest minimal — no cross-store scan). Deferred: project UI (inc-10), project→asset counting automation | |
| P-031 | History | Activity/provenance records | Shared history | L2 | IN_PROGRESS | HistoryRecord contract (Canvas-inferred shape 15917–15921/1641–1666) + HistoryService (append/list newest-first/logError) over AtomicJsonStore + IPC/preload. Deferred: history UI panel (inc-10), export-history embedding on assets | |
| P-032 | Feedback | Record rejection/sales outcomes | Shared feedback | L2 | IN_PROGRESS | FeedbackRecord contract (Canvas 2580–2587/1701–1712) + FeedbackService (record/list/remove, newest-first, asset filter) over AtomicJsonStore + IPC/preload. Deferred: rejection/sold outcome call-site wiring (needs UI actions), policy aggregation (Parity first) | Parity first |
| P-033 | Gallery | Query/filter/search/select/preview | Gallery module | L2 | IN_PROGRESS | LibraryService query engine + 5 view modes, selection model, contextual inspector (M4); M11: cross-kind rendering — file-backed image/SVG via gallery:asset-url (pathToFileURL from library record, no traversal), video via <video>, URL cache, honest placeholders (AssetGrid.test.tsx 6 tests) | Bulk flows runtime E2E M14 |
| P-034 | Gallery lineage | Parent/derived asset relationships | Asset domain | L1 | IN_PROGRESS | linkParent + parentChain via shared lineage.ts, relations persisted; inspector renders chain (library-service.test lineage case, M4) | Visual lineage graph M6+ |
| P-035 | Metadata workspace | Queue/editor/validation/export UI | Metadata UI | L2 | IN_PROGRESS | metadata module + store queue/regeneration/export (M7, useMetadataStore.ts:545-621); runtime E2E M14 | New module |
| P-036 | Upscale | Process → new asset → Gallery | Upscale module | L1 | IN_PROGRESS | Native Real-ESRGAN NCNN executor (realesrgan.ts spawn, T13.03): LIVE RUN verified 64→128px "Upscayled Successfully"; distinct asset + upscaled_from lineage; idempotent replay; binary_missing honest state (7 service tests incl. stub-binary e2e + real ffmpeg/ffprobe, M8) | Binaries gitignored — provision via scripts/provision-binaries.mjs; waifu2x not ported (deferred) |
| P-037 | Vectorize | Trace → SVG new asset → Gallery | Vectorize module | L1 | IN_PROGRESS | Native VTracer executor (live-verified: spline+bw traces); distinct SVG asset + vectorized_from lineage; preset→flag mapping (standard/detailed/icon); SVG validation (T14.08: parse/dims/pathCount/colors); background modes incl. base-rect injection; idempotent replay + retryable requeue (8 service tests incl. real-binary happy path, M9) | Binaries gitignored — provision via scripts/provision-binaries.mjs |
| P-038 | Remotion | Compose → render → asset | Remotion module | L1 | IN_PROGRESS | Real @remotion/* renderer (D-031): runtime bundle → headless render → h264 mp4; LIVE SMOKE PASS 320x320/3.05s ffprobe-validated (scripts/smoke-remotion.mjs); domain timeline/keyframes (T15.02-04); distinct video asset (kind 'video', D-031) + rendered_from lineage per source; idempotent replay + retryable requeue; cancelSignal wired (7 service tests + live smoke, M10) | webm/gif deferred; packaging strategy for runtime bundling → M14 |
| P-039 | Import | Raster/reference/ZIP/JSON handling | Import application | L2 | IN_PROGRESS | validateImportedJSON ported verbatim (domain/production/import-validation.ts — Canvas 8545–8649: batch_name/prompts/200-cap/category + style-icon-photo compatibility + brand/IP via the local compliance engine; Canvas error strings test-verified) + json-batch Canvas fields (platform/category/subcategory normalization via category-resolver) + mergeImportedFiles (11642–11719). Deferred: raster/ZIP import, import UI (inc-10), ProductionBatchItem contract field promotion (NormalizedBatchItem carries them) | |
| P-040 | Export | Metadata/assets/backups | Export application | L2 | IN_PROGRESS | Adobe platform-grouped CSV export LIVE (domain/metadata/adobe-csv.ts — Canvas 10937–11066: eligibility incl. lineage preflight evidence, platform grouping, title/keyword sanitization, Generative-AI flag, unquoted header per Canvas 11049–11051, real file write + verify) + existing csv/json exports. Deferred: ZIP package + manifest (11380+), XMP embedding (11099–11228), full backup export (16268–16316), export-history embedding | Actual file verification |
| P-041 | Platform mapping | Platform-specific normalization | Shared/platform | L2 | IN_PROGRESS | full registry port (registry/platform/: ASSET_TYPE_PRESETS + ICON_STYLE_PRESETS 113–446, COMMERCIAL_ILLUSTRATION_STYLES + STYLES_BY_ASSET_TYPE 492–511, ADOBE_CATEGORY_TAXONOMY 517–540, MICROSTOCK_PLATFORMS + adapters 548–761 with Freepik locked per D-012, DNA_TO_OFFICIAL_MAP 642–655) + resolvePromptDefaults (domain/prompt-defaults.ts — 8652–8734) + existing category-resolver/dnaToOfficial. Deferred: compiler's private reduced ASSET_TYPE_PRESETS copy → canonical registry swap; Freepik activation (D-012) | Adobe baseline |
| P-042 | Freepik | Locked until verified | Platform registry | N/A | N/A | — | Must remain locked |
| P-043 | Job lifecycle | Queue/process/fail/complete | Shared job | L2 | IN_PROGRESS | electron/services/jobs/{job-service,executor}.ts + 18 tests (M3) wired to jobs:list/get/cancel/resume IPC | Runtime producers M5+ |
| P-044 | Cancellation | queued/process cancel semantics | Job service | L2 | IN_PROGRESS | job-service.cancelJob (queued→cancelled; processing→abort+flag) + executor abort handling, 28 job tests (M3); M12/T17.03 real-producer evidence: upscale + vectorize stub-sleep abort → SIGKILL (sentinel proves kill), job cancelled, zero assets committed; remotion abort → makeCancelSignal wiring → renderMedia rejects → cancelled, no video asset; M14 inc-2: studio production path cancellation LIVE — job signal threaded executor → generateAsset → ai provider calls (AbortSignal.any with timeout), pre-generation/repair/persist checks, in-flight processing + repair-loop cancellation tests (job 'cancelled', zero assets, no further provider calls) | In-app UI-triggered cancel E2E M14 |
| P-045 | Duplicate protection | One logical request on repeat action | Idempotency layer | L2 | IN_PROGRESS | JobService.createJob idempotencyIndex requestId:idempotencyKey returns existing job (job-service.test, M3); M12: Studio producer guard — submit ignored while submitting/running/finalizing (useStudioStore, T17.02 partial); M14 inc-3: CONCURRENCY BUG FOUND+FIXED — createJob check-then-act race (index set after the saveJob await) let concurrent same-requestId creates duplicate jobs; fixed with a synchronous reservation (index+in-memory set before any await) + executor in-flight dedup (concurrent run() on one job returns the running execution) + produce-level requestId dedup (duplicate action awaits the original execution); runtime evidence: concurrent double-produce → one job/one asset/same result, repeat-completed → no duplicate | Per-module UI guards as needed |
| P-046 | Crash recovery | Restart/reconcile/resume | Job + persistence | L2 | IN_PROGRESS | M12: boot scan (main.ts before window/IPC, never hard-fails) marks non-terminal jobs recovery_required via transition API (D-015 crash re-entry edges); corrupt files quarantined (.corrupt rename, T17.13); reconcileJob (committed output→completed, no re-run; else→queued) + discardJob via recovery:list/resume/discard IPC + RecoveryShell surface; REAL BOOT EVIDENCE: processing-state job seeded → restart → persisted recovery_required on disk (T17.01 PASS); 24 job/recovery tests; M14 inc-3: production-path runtime evidence — provider killed mid-processing (no graceful cancel), fresh instances over the same dirs → boot scan surfaces the orphan recovery_required, NO phantom asset, resume re-queues and completes | In-app crash→resume→complete E2E M14 |
| P-047 | Persistence | Atomic durable state | Storage services | L2 | IN_PROGRESS | AtomicJsonStore adopted by SettingsService + JobService + LibraryService (per-record files, atomic rename) (M3–M4, D-023); M12/T17.05 gate: read-only dir → save rejects, no false completion, disk keeps pre-transition status; T17.12: migrate persists on version bump, idempotent, non-destructive on failure (10 atomic-json tests) | ENOSPC variant matrix M14 |
| P-048 | AI transport | Provider calls behind IPC | Electron AI service | L1 | IN_PROGRESS | electron/services/ai/ai-service.ts (models/image/text via 9Router per 9router.md §4–6) + 26 tests (M3); settings:get/set IPC wired; studio:produce intentionally not wired until M5 (D-016) | studio:produce wiring M5 |
| P-049 | AI errors | Structured classification | Shared error contract | L3 | IN_PROGRESS | ai-service maps HTTP/network/timeout/json errors → StructuredError via errorFromHttpStatus (M3); M12/T17.06–09: all 10 minimum AI error classes mapped + tested (ai_timeout/TimeoutError, 429 bounded single retry, invalid_json ×2 endpoints, 502/503 provider_error, ai_safety_block 400+policy markers non-retryable) + no-misclassification guards (34 tests) | safety_block is marker heuristic (ponytail) until provider contract verified |
| P-050 | Security | No secret in renderer/log/DOM | Electron boundary | L2 | IN_PROGRESS | KeyVault safeStorage encrypt (settings/key-vault.ts); renderer receives hasNineRouterKey only; plaintext migration/no-fallback delete per D-019 §6.1; cutover test asserts no plaintext in persisted JSON; grep: no key material in src/ or preload (M3); M14 inc-7: full T19.03 static security audit (0 Crit/3 High/3 Med/3 Low — no-secret PASSes incl. key-at-rest + renderer exposure); M14 inc-7.5: F-01..F-06/F-08/F-09 remediated with 18 IPC-boundary tests, settings store 0o600 + fsync, CSP meta | Runtime cutover evidence (inc-4 real-key); F-07 Electron major → M15 |
| P-051 | Production request | Unified request contract | Studio production domain | L2 | IN_PROGRESS | ProductionRequest contract (src/modules/studio/domain/production/contract.ts) + intake validation in production-service (10 tests incl. intake rejects, M5) | Mode expansion M6 |
| P-052 | Production plan | Explicit plan before execution | Production domain | L2 | IN_PROGRESS | ProductionPlan built at plan stage (planId, resolvedConfig, prompts) with trace stage detail (production-service happy path, M5) | Plan-driven execution M6/M9 |
| P-053 | Production trace | Full lineage/decision record | Production trace | L2 | IN_PROGRESS | 8-stage trace persisted as traces/<traceId>.json via AtomicJsonStore incl. generation durations + errors (production-service.test, M5) | Full decision record M6+ |
| P-054 | Schema versioning | Versioned persistent contracts | Storage layer | L2 | IN_PROGRESS | AtomicJsonStore {schemaVersion,data} envelope + migrate hook tested (M2); M12/T17.11: TRACE_SCHEMA_VERSION + SETTINGS_SCHEMA_VERSION constants (no literals); T17.12: migration persist-on-migrate + idempotency + non-destructive failure tests (10 atomic-json tests) | HONEST EXCLUSIONS: projects/history/feedback/QA/compliance/batch-state have no persisted contracts yet — versions added when persistence lands |
| P-055 | Cross-module flow | Studio → Gallery → processing → metadata → export | App integrations | L3 | IN_PROGRESS | M11: shared LibraryService singleton (ipc/library.ts) kills cross-instance staleness; 4 mandatory workflow E2Es PASS service-level (cross-module.test.ts): A Studio→Gallery→Upscale→Metadata→Export, B Import→Gallery→Vectorize→Gallery→Metadata, C Studio→Remotion→Gallery, D Metadata→field-regen→Export; lineage verified every hop; production finalize now probes real dims (ffprobe) closing M5-carried gap | In-app Electron runtime E2E M14 |

---

## 4. UI Workflow Matrix

### App Shell

Status M1 (2026-09-07): shell delivered — sidebar nav (D-005/D-006), Task Center/Settings overlays, Recovery route, honest placeholders. Evidence: `src/app/shell/shell.test.tsx` (8/8 pass), `npm run smoke` (Electron alive 5008ms). L4 upgrade requires real module content (M3+).

| UI-ID | Workflow | Expected | Level | Status | Evidence | Notes |
|---|---|---|---|---|---|---|
| UI-001 | Open Studio | Workspace loads with correct controls | L4 | IN_PROGRESS | full M5B 3-column workspace: controls/preview/inspector/result strip/Task Center + all states (StudioWorkspace.test 9/9, M5B) | Runtime E2E M11 |
| UI-002 | Open Gallery | Asset workspace loads | L4 | IN_PROGRESS | GalleryWorkspace real module: 5 view modes, toolbar, inspector, routing (GalleryWorkspace.test.tsx 6/6, M4) | Bulk E2E M11 |
| UI-003 | Open Upscale | Processing workspace loads | L4 | IN_PROGRESS | full UpscaleWorkspace per UPSCALE_WORKSPACE.md: queue/preview(AB-split)/inspector + Task Center, 9 UI tests (UpscaleWorkspace.test.tsx, M8) | Live E2E with real binary in-app M14 |
| UI-004 | Open Vectorize | Trace workspace loads | L4 | IN_PROGRESS | full VectorizeWorkspace per VECTORIZE_WORKSPACE.md: controls/presets, Original|Vectorized comparison + split slider, inspector w/ SVG stats, Task Center, 9 UI tests (M9) | Live E2E in-app M14 |
| UI-005 | Open Remotion | Animation workspace loads | L4 | IN_PROGRESS | full RemotionWorkspace per REMOTION_WORKSPACE.md: ordered multi-source timeline, template/duration/resolution controls, arrangement preview, Task Center, 9 UI tests (M10) | Live in-app render E2E M14 |
| UI-006 | Open Settings | Settings shell opens | L4 | IN_PROGRESS | shell.test.tsx (settings-shell opens, Esc closes) | Real config UI M3 |
| UI-007 | Task Center | Active jobs visible | L4 | IN_PROGRESS | shell.test.tsx (drawer + honest empty state) | Job list M3 |
| UI-008 | Recovery surface | Recovery shell loads at /recovery | L4 | IN_PROGRESS | M12: full reconciliation surface — list/resume/discard recovery_required jobs via api.recovery, committed-output notice, honest empty/error/loading states, a11y labels (RecoveryShell.test.tsx 10/10); boot scan + /recovery route render (shell.test.tsx) | In-app crash E2E M14 |

### Studio

| UI-ID | Workflow | Expected | Level | Status |
|---|---|---|---|---|
| UI-101 | Prompt entry | Input remains stable during async operations | L2 | IN_PROGRESS | prompt control + request state preservation (StudioControls.tsx, useStudioStore.ts); async-stability behavior test not yet |
| UI-102 | Reference import | Visual inference + visible reference state | L5 | TODO | HONEST GAP: service loads reference asset → imageBase64 (M6); inference + reference-state UX absent — M13 build-out |
| UI-103 | Visual override | Manual override wins over inference | L5 | TODO | HONEST GAP: no inference/override state exists — M13 build-out |
| UI-104 | Normal generate | Progress, result, errors, Gallery update | L2 | IN_PROGRESS | studio:produce end-to-end mock-verified: request→plan→generate→persist→trace→Gallery (10 pipeline tests, M5); live gateway cutover pending real key | Live E2E with real key M6 |
| UI-105 | Batch | Queue/progress/pause/resume | L2 | IN_PROGRESS | count-driven queue (×2–×20) + per-item Task Center status + cancel via jobs bridge (M13 inc-10); batch pause/resume honestly deferred (rendered notice — pipeline pause semantics undefined; Canvas 20927 repair loop unrelated) | |
| UI-106 | Icon | Icon-specific controls and result | L2 | IN_PROGRESS | icon mode toggle (D-028 mode:'icon') + iconStyle preset selector (ICON_STYLE_PRESETS registry) + icon preview framing (transparency) + preset badge (M13 inc-10); icon DNA/negative parity honestly deferred (rendered notice — compiler engine scope) | |
| UI-107 | JSON | Validate → preview → execute | L2 | IN_PROGRESS | file/paste input → renderer-side validateImportedJSON (Canvas strings) → error/warning list → normalized item preview → json-mode execute + history activity (M13 inc-10) | |
| UI-108 | Revision | Parent → new result | L2 | IN_PROGRESS | parent asset selector + revision instruction editor + mode 'revision' submission (parentAssetId/revisionIntent) + revision_of lineage presentation (M13 inc-10) | |
| UI-109 | Object modifier | Source → modified result | L2 | IN_PROGRESS | source asset selector + repaint/modify_objects switcher + instruction editor + mode 'object_modifier' submission + modified_from lineage presentation (M13 inc-10) | |
| UI-110 | Preflight | Issues/edit/submit/reject semantics | L2 | IN_PROGRESS | Inspector preflight evidence panel rendering REAL trace records (visual/compliance/technical/differentiation + gate reasonCodes, M13 inc-10); DEFERRED honestly: full PREFLIGHT_ITEMS checklist + metadata editing (rendered notices; metadata routes to Metadata Workspace per STUDIO_WORKSPACE.md §9 — no metadata generation inside Studio) | |

### Studio Workspace Contract

| UI-ID | Workflow | Expected | Level | Status |
|---|---|---|---|---|
| UI-111 | Studio layout | Controls + preview + inspector + result strip + Task Center | L2 | IN_PROGRESS | 3-column workspace per STUDIO_WORKSPACE.md: StudioControls/Preview/Inspector/TaskCenter composed by StudioWorkspace.tsx (StudioWorkspace.test 9/9, M5B) | Runtime E2E M11 |
| UI-112 | Empty state | Ready-to-generate state follows workspace contract | L2 | IN_PROGRESS | honest ready-to-generate empty state + guide instructions (studio-empty assertions, M5B) | |
| UI-113 | Processing state | Progress/state transitions visible | L2 | IN_PROGRESS | 8-stage pipeline progress + submitting/running/finalizing/done/error/cancelled states covered (M5B) | Live E2E with real key M6 |
| UI-114 | Result inspector | Asset/prompt/model/style/DNA/QA/lineage context visible | L2 | IN_PROGRESS | inspector binds prompt/model/style/DNA/lifecycle-status from store+trace per D-020; QA rows honest NOT RUN until QA engine (M5B) | QA wiring M6+ |
| UI-115 | Result actions | Gallery/routing/download actions work | L2 | IN_PROGRESS | Open in Gallery wired; Send-to actions route to M7–M10 destinations (placeholder modules); download uses real asset id (M5B) | E2E M11 |
| UI-116 | Workspace spec compliance | Implementation follows `workspace/STUDIO_WORKSPACE.md` | L2 | IN_PROGRESS | layout/states/interactions implemented + unit-tested per spec; 3 honesty-review rounds passed (no fake data) (M5B) | Human UX acceptance = APPROVE M5B gate |

### Metadata

| UI-ID | Workflow | Expected | Level | Status |
|---|---|---|---|---|
| UI-201 | Create Metadata from Gallery | Selected assets enter metadata workspace | L2 | IN_PROGRESS | metadata module + routingContext intake (M7); runtime E2E M14 |
| UI-202 | Queue | Progress and per-asset state visible | L1 | IN_PROGRESS | useMetadataStore queue + per-item state (M7); runtime E2E M14 |
| UI-203 | Edit fields | Manual edits persist | L1 | IN_PROGRESS | manual edit persistence via metadata store (M7) |
| UI-204 | Regenerate title | Only title changes | L1 | IN_PROGRESS | regenerateField('title') isolation + byte-identical assertions (M7); UI wiring runtime E2E M14 |
| UI-205 | Regenerate description | Only description changes | L1 | IN_PROGRESS | field-scoped path (M7) |
| UI-206 | Regenerate keywords | Only keywords change | L1 | IN_PROGRESS | field-scoped path + normalizeKeywords (M7) |
| UI-207 | Validate | Hard blocks visible | L1 | IN_PROGRESS | validator severity mapping → ready/needs_review/invalid (M7); UI hard-block surface runtime E2E M14 |
| UI-208 | Export | File written and verified | L1 | IN_PROGRESS | export-metadata.ts (M7); cross-module Workflow D E2E PASS (M11) |

### Gallery

| UI-ID | Workflow | Expected | Level | Status |
|---|---|---|---|---|
| UI-301 | Search/filter | Asset results update correctly | L2 | IN_PROGRESS | LibraryService query engine + 5 view modes + filtering (M4); P-033 evidence |
| UI-302 | Select multiple | Bulk selection stable | L2 | IN_PROGRESS | selection model + bulk toolbar (M4) |
| UI-303 | Open detail | Correct asset and metadata displayed | L2 | IN_PROGRESS | contextual inspector: detail/metadata/QA/lineage (M4); cross-kind rendering (M11) |
| UI-304 | Route to Metadata | Selected asset context preserved | L2 | IN_PROGRESS | routingContext.selectedAssetIds → metadata workspace intake (M7) |
| UI-305 | Route to Upscale | Selected asset context preserved | L2 | IN_PROGRESS | Gallery routes routingContext.selectedAssetIds (AssetInspector/GalleryToolbar); workspace consumes it via router state intake (M8) | Bulk-flow runtime E2E M14 |
| UI-306 | Route to Vectorize | Selected asset context preserved | L2 | IN_PROGRESS | Gallery routes routingContext.selectedAssetIds (AssetInspector/GalleryToolbar); workspace consumes it via router state intake (M9) | Bulk-flow runtime E2E M14 |
| UI-307 | Route to Remotion | Selected asset context preserved | L2 | IN_PROGRESS | Gallery routes routingContext.selectedAssetIds (AssetInspector/GalleryToolbar); workspace consumes it via router state intake (M10) | Bulk-flow runtime E2E M14 |
| UI-308 | Inspect lineage | Parent/child relations visible | L2 | IN_PROGRESS | lineage persistence + parentChain + inspector chain rendering (M4, library-service lineage tests); graph UX partial |

---

## 4.1 Workspace Specification Matrix

| Workspace | Contract | Required milestone | Status |
|---|---|---|---|
| Studio | `workspace/STUDIO_WORKSPACE.md` | M5B | IN_PROGRESS |
| Gallery | `workspace/GALLERY_WORKSPACE.md` | M4 | IN_PROGRESS |
| Metadata | `workspace/METADATA_WORKSPACE.md` | M7 | IN_PROGRESS |
| Upscale | `workspace/UPSCALE_WORKSPACE.md` | M8 | IN_PROGRESS |
| Vectorize | `workspace/VECTORIZE_WORKSPACE.md` | M9 | IN_PROGRESS |
| Remotion | `workspace/REMOTION_WORKSPACE.md` | M10 | IN_PROGRESS |

Workspace UI is incomplete if the contract is not implemented and runtime-verified.

---

## 5. E2E Acceptance Matrix

Critical paths must be run with a real configured environment.

```text
E2E-01 Normal generation
E2E-02 Reference generation
E2E-03 Batch generation
E2E-04 Icon generation
E2E-05 JSON batch
E2E-06 Metadata generation
E2E-07 Metadata field regeneration
E2E-08 Preflight
E2E-09 Revision
E2E-10 Auto-regeneration
E2E-11 Object modifier
E2E-12 Upscale
E2E-13 Vectorize
E2E-14 Remotion
E2E-15 Export
E2E-16 Crash recovery
E2E-17 Cancellation
E2E-18 Duplicate action
E2E-19 Persistence failure
E2E-20 AI error classification
```

---

## 6. Intentional Drift Register

Only approved drifts belong here.

| Drift | Rationale | Production semantics preserved | Approved |
|---|---|---|---|
| HashRouter routing (Electron file:// production load) | Desktop architecture (M1) | Yes | Yes |
| Single `studio:produce` IPC channel (mode discriminator, D-016) | Transport architecture (M1) | Yes | Yes |

| Drift | Reason | Semantic output preserved? | Approved |
|---|---|---:|---|
| Electron persistent storage | Desktop architecture | Yes | Yes |
| IPC + secure key storage | Security | Yes | Yes |
| Durable job/recovery | Reliability | Yes | Yes |
| Centralized Gallery | Product architecture | Yes | Yes |
| Metadata full workspace | Product UX | Yes | Yes |
| Native binary execution in Electron | Desktop architecture | Yes | Yes |

Any new row requires explicit review before being treated as intentional.

---

## 7. Completion Rule

A capability is complete only when:

```text
L3 behavioral parity
AND
L4 integration evidence
AND
L5 hardening evidence
```

No static checklist or function comparison can override this rule.
