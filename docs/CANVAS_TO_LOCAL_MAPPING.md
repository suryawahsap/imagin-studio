# IMAGIN Studio Local — CANVAS_TO_LOCAL_MAPPING

**Status:** Master Refactor Mapping Contract  
**Date:** 2026-09-07  
**Source of truth for behavior:** `reference/canvas-upgraded/imagin_studio_strong_v2.tsx`  
**Target project:** `imagin-studio-local/`  
**Purpose:** Menjamin seluruh code/logika penting dari Canvas Upgraded memiliki destination yang jelas di arsitektur Local baru tanpa blind copy dan tanpa kehilangan behavior.

---

## 0. Disposition & Status Legend

Gunakan status berikut untuk setiap mapping item:

```text
NOT_STARTED
IN_PROGRESS
DONE
```

Disposition:
- MOVE: semantics dipertahankan, code dipindahkan langsung dengan penyesuaian import/export
- REBUILD: behavior dipertahankan, implementation dibuat ulang karena tidak cocok dengan target architecture
- ADAPT: behavior dipertahankan, boundary diubah agar bekerja dengan Electron/shared services
- CONSOLIDATE: beberapa implementation Canvas digabung menjadi satu source of truth baru
- SPLIT: satu blok Canvas dipecah menjadi beberapa module/file baru
- RETIRE: code tidak dibawa karena dead/obsolete/duplicated/legacy-only
- ARCHIVE_ONLY: tetap tersedia sebagai reference, tetapi bukan implementation target

Parity: mengacu ke ID P-xxx di PARITY_MATRIX.md atau — jika tidak ada.
Evidence: path atau catatan implementasi.

---

## 0.1 Capability Disposition Inventory (M13 gate artifact)

Zero-unmapped-critical-capability gate: setiap capability group Canvas wajib punya
baris di sini. Disposisi detail per-section tetap hidup di section body; tabel ini
adalah inventory level-capability yang menyudutkan gate.

| # | Capability group (Canvas) | Disposition | Status | Parity | Evidence |
|---|---|---|---|---|---|
| 1 | Asset type presets / icon DNA presets / illustration styles / Adobe taxonomy (registry data) | REBUILD | IN_PROGRESS | P-041 | registry/platform/{asset-type-presets,adobe-taxonomy}.ts verbatim (Canvas 113–540); compiler private copy swap follow-up |
| 2 | Platform registry + adapter interface (ADOBE/PLATFORM_ADAPTERS) | REBUILD | IN_PROGRESS | P-041 | registry/platform/microstock-platforms.ts verbatim (Canvas 548–761); Freepik 'planned' locked (D-012) |
| 3 | Submission policy + metadata policy (METADATA_POLICY/SEO_CONFIG) | REBUILD | IN_PROGRESS | P-022 | Local canonical = src/modules/metadata/domain/platform-rules.ts (narrower than Canvas full set; full set NOT_STARTED) |
| 4 | Composition dimension pool / dynamic slots / batch slot generation | REBUILD | IN_PROGRESS | P-010 | registry/composition-pools.ts + domain/composition/{composition-session,dynamic-slots}.ts verbatim port incl. getBatchSlotsAI (provider injected, deterministic fallback); composition stage wired trace-only — slot inject enters prompt at inc-5 |
| 5 | Preflight + brand/IP + news/sensitive/content-safety rules | REBUILD | NOT_STARTED | P-018, P-019 | §9.x |
| 6 | IndexedDB persistence (assets/history/QA/compliance/feedback/diversity) | SPLIT | IN_PROGRESS | P-047, P-054, P-030, P-031, P-032 | AtomicJsonStore + per-record stores replace IndexedDB; project/history/feedback stores LIVE (M13 inc-9); QA/compliance dedicated stores still trace-embedded |
| 7 | Project model + project engine | SPLIT + REBUILD | IN_PROGRESS | P-030 | shared/project/contract.ts + electron/services/projects/project-service.ts (Canvas 1747–1826 engine) + IPC/preload; project UI deferred (inc-10) |
| 8 | Job persistence/reducers/production job state | ADAPT | DONE | P-043 | D-015 job contract + durable per-job stores (M3, M12) |
| 9 | Contracts (asset/metadata/lineage/production/intent/QA/feedback/export) | SPLIT | IN_PROGRESS | P-020, P-051 | asset/job/error DONE; intent/QA engines NOT_STARTED |
| 10 | Global/style/category DNA registry + tracker + signatures + diversity context | REBUILD | IN_PROGRESS | P-007 | registry/dna/{global,styles,categories}.ts verbatim port + domain/dna/{random,diversity-tracker,dna-signature,dna-engine}.ts; durable tracker persistence DONE inc-4 (electron/services/storage/diversity-persistence.ts) |
| 11 | Commercial rules / style intelligence / generic-object DNA / negative hints | REBUILD | IN_PROGRESS | P-007 | buildCommercialRules + style-preset resolution done (M13 inc-3); GENERIC_OBJECT_DNA + IP-SAFE OBJECT RULES branch LIVE (M13 inc-6 — registry/dna/generic-object.ts, Canvas 5199–5245/5329–5334); category resolver ports LIVE (domain/dna/category-resolver.ts — resolveDNAFromOfficial 628–638 + resolveCategory 7120–7131); Gemini style interpreter NOT_STARTED (honest deferral) |
| 12 | Market demand / market palettes | ARCHIVE_ONLY | NOT_STARTED | — | post-parity intelligence per D-013 (plan.md §16) |
| 13 | Category quality rules / quality gate / issue reason codes / regeneration recommendations | REBUILD | IN_PROGRESS | P-017, P-019 | compliance engine + technical QA + preflight with Layer A vision QA LIVE (M13 — domain/compliance/ + domain/quality/{semantic-qa,quality-gate,vision}.ts, buildQualityGateResult consumed by the preflight stage; regeneration recorded-not-executed); Layer B+C metadata-QA coupling + PREFLIGHT_ITEMS checklist + status persistence + repair execution deferred (P-026) |
| 14 | CGA / geography/religion/event context / batch diversity / production policy | REBUILD | IN_PROGRESS | P-010, P-015 | registry/cga/{geography,religion,events,conflicts,mutation-bank,palettes}.ts + domain/prompt/{cga-engine,cga-context}.ts + domain/diversity/{exclusion-instruction,concept-clusters}.ts; CGA wired trace-only (dna stage detail); production policy portion NOT_STARTED |
| 15 | Concept clustering / differentiation / background resolution | REBUILD | IN_PROGRESS | P-011, P-012, P-013, P-015 | planConceptClusters ported (domain/diversity/concept-clusters.ts, Canvas 6315-6333) and category-keyed LIVE since inc-6; differentiation: concept fingerprint + pre-generation title/concept similarity + genericity advisor LIVE (domain/concept/{fingerprint,similarity,specificity,genericity}.ts — Canvas 19910–19992; recommendation recorded-not-blocking); visual similarity + background resolution NOT_STARTED |
| 16 | State defaults / draft metadata / network utilities / preflight helpers | ADAPT | IN_PROGRESS | P-051, P-052 | basic intake validation + plan stage (M5) |
| 17 | Resolution policy / asset profile / resolved production config | ADAPT | IN_PROGRESS | P-052 | ratio/background validation (M5); full resolution engine NOT_STARTED |
| 18 | Resolution checks / visual fingerprints / similarity / sharpness / watermark checks | SPLIT | NOT_STARTED | P-013, P-014, P-017 | §resolution |
| 19 | Technical QA + image processing/finalization | SPLIT | IN_PROGRESS | P-017 | module-executor output QA (upscale/vectorize) + production finalize ffprobe; canonical Studio QA NOT_STARTED |
| 20 | JSON import validation / prompt defaults / import normalization | CONSOLIDATE | IN_PROGRESS | P-003, P-039 | json-batch.ts (M6) + validateImportedJSON verbatim (import-validation.ts, Canvas 8545–8649) + Canvas fields + mergeImportedFiles + resolvePromptDefaults (domain/prompt-defaults.ts, Canvas 8652–8734); import UI deferred (inc-10) |
| 21 | Canonical intake / normalization / production plan / pipeline | REBUILD | IN_PROGRESS | P-001, P-051–P-053 | production-service.ts canonical pipeline (M5/M6) |
| 22 | Export: ZIP/CSV metadata/XMP/PNG metadata/download/export history | SPLIT | IN_PROGRESS | P-040 | metadata export (M7) + Adobe platform-grouped CSV LIVE (metadata/domain/adobe-csv.ts — Canvas 10937–11066, eligibility + sanitization + Generative-AI flag, real file write/verify); ZIP/manifest/XMP/backup/export-history deferred |
| 23 | SVG tracing | MOVE | DONE | P-037 | Vectorize module (M9) |
| 24 | JSON batch execution / batch resume / durable progress | REBUILD | IN_PROGRESS | P-002, P-003 | batch planner + per-item idempotency (M6); pause/resume deferred M12→M14 |
| 25 | Prompt engine / icon prompts / negative prompts / semantic locks / prompt integrity | REBUILD | IN_PROGRESS | P-008, P-009 | prompt-integrity gate + semantic locks/token wired (M13 inc-2); compiler/icon prompts/negative layers NOT_STARTED (inc-5) |
| 26 | Semantic intent / forbidden domains / constraint resolution | REBUILD | IN_PROGRESS | P-006 | intent engine: extraction + forbidden-domain matrix + locks + constraint resolution ported Canvas-faithful, semantic_intent stage wired (M13 inc-2) |
| 27 | Style interpretation / deterministic prompt graph | REBUILD | NOT_STARTED | P-008 | §prompt |
| 28 | Concept fingerprint / rejection taxonomy / learned policy | REBUILD | NOT_STARTED | P-011, P-012 | §prompt-graph |
| 29 | Generation engines (normal/icon/batch/json/cancel/retry/duplicate invariants) | REBUILD | IN_PROGRESS | P-001–P-005, P-044, P-045 | canonical production modes (M5/M6) + T17.03 cancellation evidence (M12) |
| 30 | History / metadata generation+preflight / asset lifecycle / bulk cleanup / cost estimation | SPLIT | IN_PROGRESS | P-021, P-031 | metadata module DONE for generate/regenerate/validate/export (M7); history service LIVE (M13 inc-9 — shared/history + electron/services/history + IPC); cost estimation NOT_STARTED |
| 31 | App/UI workspaces (Studio/Gallery/Upscale/Vectorize/Remotion/Metadata/TaskCenter/Settings) | MOVE + ADAPT | IN_PROGRESS | UI-001–UI-308 | workspace implementations M4–M10; runtime E2E M14 |
| 32 | Metadata sanitization / SEO / metadata QA | REBUILD | IN_PROGRESS | P-021, P-022 | metadata validator (M7); full SEO parity NOT_STARTED |
| 33 | AI visual truth / metadata QA / auto-regeneration (autoRegenerateAsset) | REBUILD | IN_PROGRESS | P-016, P-026 | Layer A visual truth + semantic/profile QA + bounded auto-regeneration loop LIVE (M13 — domain/quality/{vision,semantic-qa,quality-gate,repair}.ts; repair stage, cap 2, all attempts in trace); Canvas in-place same-ID replacement vs local final-attempt persistence documented; Layer B+C metadata QA coupling deferred (metadata module integration) |
| 34 | Reference workflow / revision / object modifier / background editing | REBUILD | IN_PROGRESS | P-005, P-027, P-028, P-029 | reference/revision/object-modifier modes (M6); visual inference + background removal NOT_STARTED |
| 35 | Gallery / trace UI / task center / settings / history-help UI | MOVE | IN_PROGRESS | P-033, P-034 | Gallery module (M4/M11); trace UI partial via inspector |
| 36 | tailwindStyles (inline style tokens) | ADAPT | IN_PROGRESS | — | shared UI styles/tokens owner (corrected from compliance §6.x, M13) |
| 37 | createGeminiTraceId / AI transport helpers | ADAPT | DONE | P-048 | ai-service.ts (M3); corrected ownership from Vectorize (M13) |
| 38 | FREEPIK_ADAPTER | ARCHIVE_ONLY | NOT_STARTED | P-042 | D-012 locked; Canvas source itself planned/inactive |

Gate verdict: **zero unmapped critical capabilities** (this table + section-level
dispositions). Remaining NOT_STARTED rows are tracked build-out work, not unmapped
capabilities.

---

## 0.2 Retired / Archived Register (explicit RETIRE decisions)

Resolves the historical "zero RETIRE entries" gap. These Canvas behaviors are
explicitly NOT carried into Local:

| Canvas behavior | Decision | Reason / authority |
|---|---|---|
| Canvas direct-fetch architecture (renderer → provider) | RETIRE | Renderer never calls providers; Electron/IPC AI boundary (plan.md ARCHITECTURE BOUNDARY, D-010) |
| Canvas browser-storage tricks (IndexedDB-as-source-of-truth, localStorage state) | RETIRE | Durable per-record stores behind AtomicJsonStore + Electron storage services (D-023) |
| remove.bg integration | RETIRE | D-011 — not reintroduced |
| Photoroom integration | RETIRE | D-011 — not reintroduced |
| Canvas `running`/`paused` job statuses | RETIRE | D-015 canonical enum: running→processing; paused has no durable equivalent |
| Canvas legacy giant-App architecture | RETIRE | Clean modular reimplementation (D-001); structure not preserved |
| Migration-specific hacks | RETIRE | plan.md §5.5 explicitly excluded |
| Fake implementations / mock fallbacks in production paths | RETIRE | NO FAKE IMPLEMENTATION rule (plan.md; HEAD_DEVELOPER_PROMPT) |
| Freepik adapter | ARCHIVE_ONLY | D-012 locked until verified contract; kept as reference only |
| Market demand / market palettes engines | ARCHIVE_ONLY | D-013 — post-parity intelligence only (plan.md §16) |

---

## 1. PURPOSE

Dokumen ini adalah **peta refactor**, bukan migration recipe.

Tujuannya adalah menjawab tiga pertanyaan untuk setiap bagian source Canvas:

```text
CANVAS SOURCE
    ↓
TARGET MODULE / FILE LOCAL
    ↓
OWNER + RESPONSIBILITY + TEST / PARITY
```

Aturan utama:

> Setiap bagian code Canvas harus mempunyai salah satu status: `MOVE`, `REBUILD`, `ADAPT`, `CONSOLIDATE`, `SPLIT`, `RETIRE`, atau `ARCHIVE-ONLY`.

Tidak ada critical code yang boleh hilang hanya karena source Canvas dibagi ulang.

Sebaliknya, tidak ada bagian Canvas yang boleh dipindahkan secara buta hanya karena sudah ada implementasinya.

---

# 1. SOURCE BASELINE

## 1.1 Source utama

```text
reference/canvas-upgraded/imagin_studio_strong_v2.tsx
```

Source ini berisi **28.416 baris** dan menggunakan virtual sections untuk memisahkan responsibility.

Table of contents source secara eksplisit mendefinisikan:

```text
[01] IMPORTS
[02] TYPES & INTERFACES
[03] GLOBAL CONSTANTS & CONFIGURATION
[04] UTILITIES
[05] DATA REGISTRY
[06] STATE STORE
[07] PRODUCTION PIPELINE
[08] RESOLUTION LAYER
[09] DOMAIN ENGINES
[10] UI SYSTEM
[11] APPLICATION
[12] STYLES
```

Source juga menetapkan aturan bahwa Registry berisi data, Domain Engines berisi logic, UI berisi React components, dan Application berisi state destructuring + JSX rendering. Mapping ini mempertahankan niat tersebut tetapi memperbaiki boundary supaya cocok dengan desktop architecture baru.

## 1.2 Source statistics

```text
Approx. source size        = 28,416 lines
Major logical blocks       = ~70
Top-level declarations     = ~450+
Primary behavior reference = Canvas Upgraded
Target                     = clean modular Local implementation
```

---

# 2. REFACTOR STATUS MODEL

Gunakan status berikut untuk setiap mapping item:

```text
NOT_STARTED
INVESTIGATING
MAPPED
IMPLEMENTING
VERIFIED
PARITY_PASS
RETIRED
ARCHIVE_ONLY
BLOCKED
```

## 2.1 Refactor disposition

### MOVE

Semantics dipertahankan dan code dipindahkan hampir langsung, tetapi import/export serta dependency disesuaikan.

Gunakan hanya untuk logic yang bersih dan benar-benar independen.

### REBUILD

Behavior dipertahankan, implementation dibuat ulang karena Canvas implementation tidak cocok dengan target architecture.

### ADAPT

Behavior dipertahankan, boundary diubah agar bekerja dengan Electron/shared services.

### CONSOLIDATE

Beberapa implementation Canvas digabung menjadi satu source of truth baru.

### SPLIT

Satu blok Canvas dipecah menjadi beberapa module/file baru.

### RETIRE

Code tidak dibawa karena dead/obsolete/duplicated/legacy-only, tetapi keputusan harus didukung bukti.

### ARCHIVE-ONLY

Tetap tersedia sebagai reference, tetapi bukan implementation target.

---

# 3. TARGET DESTINATION ROOT

Target struktur yang dipakai mapping:

```text
imagin-studio-local/
│
├── plan.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BEHAVIOR_SPEC.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── IMPLEMENTATION_SEQUENCE.md
│   ├── PARITY_MATRIX.md
│   ├── DEVELOPMENT_RULES.md
│   └── CANVAS_TO_LOCAL_MAPPING.md
│
├── reference/
│   ├── canvas-upgraded/
│   │   └── imagin_studio_strong_v2.tsx
│   ├── ui/
│   ├── infrastructure/
│   │   └── 9router.md
│   └── legacy-local/
│       └── imagin_studio.zip
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   ├── services/
│   │   ├── ai/
│   │   ├── assets/
│   │   ├── jobs/
│   │   ├── projects/
│   │   ├── storage/
│   │   ├── settings/
│   │   └── binaries/
│   └── infrastructure/
│
├── src/
│   ├── main.tsx
│   ├── app/
│   ├── shared/
│   │   ├── asset/
│   │   ├── job/
│   │   ├── project/
│   │   ├── platform/
│   │   ├── errors/
│   │   ├── events/
│   │   ├── persistence/
│   │   ├── utils/
│   │   └── ui/
│   │
│   └── modules/
│       ├── studio/
│       │   ├── domain/
│       │   │   ├── intent/
│       │   │   ├── dna/
│       │   │   ├── prompt/
│       │   │   ├── composition/
│       │   │   ├── diversity/
│       │   │   ├── similarity/
│       │   │   ├── concept/
│       │   │   ├── resolution/
│       │   │   ├── qa/
│       │   │   ├── compliance/
│       │   │   ├── metadata/
│       │   │   ├── production/
│       │   │   └── policy/
│       │   ├── application/
│       │   ├── registry/
│       │   ├── state/
│       │   └── ui/
│       │
│       ├── metadata/
│       │   ├── domain/
│       │   ├── application/
│       │   ├── state/
│       │   └── ui/
│       │
│       ├── gallery/
│       ├── upscale/
│       ├── vectorize/
│       └── remotion/
│
├── storage/
└── scripts/
```

---

# 4. GLOBAL REFACTOR RULES

## Rule 1 — Canvas section ≠ Local file

Satu Canvas section boleh menjadi banyak Local files.

Contoh:

```text
Canvas [09] Prompt Engine
        ↓
DNA
Prompt Compiler
Negative Prompt
Prompt Integrity
Style Intelligence
Concept Fingerprint
```

## Rule 2 — Local module owns semantics

Contoh:

```text
Canvas contains SVG trace
        ↓
Local owner = modules/vectorize
```

bukan:

```text
modules/studio/vectorize.ts
```

## Rule 3 — Infrastructure moves out of React

Canvas IndexedDB / network / browser download / localStorage code tidak boleh masuk langsung ke domain Local.

## Rule 4 — One source of truth

Jika Canvas memiliki dua helper/dua policy yang sebenarnya satu konsep, Local harus memilih canonical owner setelah behavioral comparison.

## Rule 5 — Legacy compatibility is explicit

Backward-compatible helper hanya boleh dipertahankan bila masih diperlukan oleh documented input/output. Tidak boleh ada “compatibility” tanpa consumer nyata.

## Rule 6 — No hidden loss

Kalau code tidak dibawa, mapping harus menyebut:

```text
RETIRE / ARCHIVE_ONLY
+
reason
+
replacement or evidence
```

## Rule 7 — Refactor must be behavior-preserving

Semua critical Studio behavior harus dibandingkan melalui `PARITY_MATRIX.md`.

---

# 5. SECTION-LEVEL CANVAS → LOCAL MAPPING

Berikut adalah peta **seluruh logical blocks yang teridentifikasi dari source saat ini**.

---

## 5.1 Imports

**Canvas:** lines 59–115

```text
Canvas imports
    ↓
Local files import hanya dependency yang benar-benar dipakai
```

### Destination

```text
src/shared/ui/icons.ts (optional facade)
specific Local files
```

### Disposition

`SPLIT`

Lucide React tidak menjadi dependency global satu file. Setiap component mengimpor icon yang diperlukannya.

---

# 6. DATA REGISTRY

## 6.1 Asset Type Presets

**Canvas:** lines 111–160

Source symbol:

```text
ASSET_TYPE_PRESETS
```

### Destination

```text
src/modules/studio/registry/asset-type-presets.ts
```

### Owner

Studio Registry

### Status

`MOVE / NORMALIZE`

---

## 6.2 Icon DNA Registry

**Canvas:** lines 161–489

Symbols utama:

```text
ICON_MASTER_NEGATIVE_PROMPT
ICON_STYLE_PRESETS
ICON_SHEET_EXTRA_NEGATIVE
```

### Destination

```text
src/modules/studio/registry/icon-dna.ts
```

### Helper yang TIDAK boleh tinggal di registry

```text
sanitizeIconThemeInput
sanitizeVisualPromptInput
extractLeadingIconCount
```

Destination:

```text
src/modules/studio/domain/prompt/icon-input-sanitizer.ts
```

### Disposition

`SPLIT`

Data → registry. Logic → domain/prompt.

---

## 6.3 Illustration Styles

**Canvas:** lines 490–514

Symbols:

```text
COMMERCIAL_ILLUSTRATION_STYLES
STYLES_BY_ASSET_TYPE
```

### Destination

```text
src/modules/studio/registry/style-registry.ts
```

---

## 6.4 Adobe Taxonomy

**Canvas:** lines 515–545

Symbol:

```text
ADOBE_CATEGORY_TAXONOMY
```

### Destination

```text
src/shared/platform/adobe/taxonomy.ts
```

Karena taxonomy adalah platform concern, bukan Studio-private concern.

---

## 6.5 Platform Registry

**Canvas:** lines 546–599

Symbols:

```text
MICROSTOCK_PLATFORMS
DEFAULT_PLATFORM
```

### Destination

```text
src/shared/platform/platform-registry.ts
```

---

## 6.6 Official ↔ DNA Mapping

**Canvas:** lines 600–657

Symbols:

```text
OFFICIAL_TO_DNA_MAP
DNA_TO_OFFICIAL_MAP
resolveDNAFromOfficial
```

### Destination

```text
src/shared/platform/category-mapping.ts
src/modules/studio/domain/resolution/category-resolver.ts
```

### Rule

Mapping data berada di shared/platform.

Resolving logic berada di Studio resolution.

---

## 6.7 Platform Adapter Interface

**Canvas:** lines 658–940

Symbols:

```text
PlatformAdapter
ADOBE_ADAPTER
FREEPIK_ADAPTER
PLATFORM_ADAPTERS
```

### Destination

```text
src/shared/platform/types.ts
src/shared/platform/adapters/adobe.ts
src/shared/platform/adapters/freepik.ts
src/shared/platform/adapters/index.ts
```

### Important

Freepik tetap:

```text
status = planned
```

sampai taxonomy/export contract diverifikasi resmi.

**Disposition: ARCHIVE_ONLY** — Canvas source itself declares Freepik planned/inactive
(`imagin_studio_strong_v2.tsx:721-730`); Local locks it per **D-012** until a verified
contract exists. NOT an implementation target; re-evaluate only post-parity with
official taxonomy/export verification.

---

## 6.8 Submission Policy + Metadata Policy

**Canvas:** lines 777–940

Symbols:

```text
PLATFORM_POLICY
getPlatformSubmissionPolicy
evaluatePlatformSubmissionReadiness
METADATA_POLICY
METADATA_RULES
SEO_CONFIG
SEO_COMMON_PHRASES
```

### Destination

```text
src/shared/platform/submission-policy.ts
src/modules/studio/domain/metadata/metadata-policy.ts
src/modules/studio/registry/seo-rules.ts
```

### Important

`METADATA_POLICY` harus menjadi canonical source.

`SEO_CONFIG` boleh menjadi compatibility facade, tetapi tidak boleh menciptakan second source of truth.

---

# 7. GLOBAL CONSTANTS & REGISTRY

## 7.1 Global content/commercial rules

**Canvas:** lines 941–1045

Symbols:

```text
SPAM_TERMS
GENERATION_MODES
BATCH_TIERS
MAX_BATCH_COUNT
GENERATE_METADATA_STEPS
ICON_GENERATION_MODES
ICON_GRID_OPTIONS
TEXT_MODELS
IMAGE_MODELS
STATUS_CONFIG
FILTER_STATUS_ORDER
SUBMITTABLE_STATUSES
CSV_EXPORT_STATUSES
SUBMITTABLE_FROM_EXPORT
```

### Destination

```text
src/modules/studio/registry/commercial-rules.ts
src/modules/studio/registry/generation-modes.ts
src/modules/studio/registry/icon-options.ts
src/modules/studio/registry/model-defaults.ts
src/modules/studio/registry/status-config.ts
```

---

# 8. COMPOSITION SYSTEM

## 8.1 Composition dimension pool

**Canvas:** lines 1046–1244

Symbols:

```text
SUBJECT_TYPES
CAMERA_ANGLES
ACTIVITY_CONTEXTS
FRAMING_STYLES
```

Logic:

```text
createCompositionSession
generateDynamicSlot
getBatchSlots
getBatchSlotsAI
```

### Destination

```text
src/modules/studio/registry/composition-pools.ts
src/modules/studio/domain/composition/composition-session.ts
src/modules/studio/domain/composition/dynamic-slots.ts
src/modules/studio/application/composition/get-batch-slots.ts
```

### Rule

AI-backed batch slot generation belongs to application/infrastructure adapter boundary, not pure registry.

---

# 9. COMPLIANCE DOMAIN

## 9.1 Preflight + brand/IP

**Canvas:** lines 1245–1325

Symbols:

```text
PREFLIGHT_ITEMS
BRAND_IP_BLOCKLIST
GOVERNMENT_AGENCY_BLOCKLIST
ARTIST_STYLE_REFERENCE_PATTERN
matchesBlockedTerm
checkBrandSafety
```

### Destination

```text
src/modules/studio/registry/compliance-rules.ts
src/modules/studio/domain/compliance/brand-safety.ts
src/modules/studio/domain/compliance/preflight-rules.ts
```

---

## 9.2 News and sensitive content detection

**Canvas:** lines 1326–1409

Symbols:

```text
NEWS_EVENT_MARKERS
SENSITIVE_CONTENT_MARKERS
METADATA_NEWS_MARKERS
NEWS_SAFE_CATEGORIES
detectNewsEvent
detectSensitiveContent
```

### Destination

```text
src/modules/studio/registry/compliance-rules.ts
src/modules/studio/domain/compliance/news-detector.ts
src/modules/studio/domain/compliance/sensitive-content.ts
```

---

## 9.3 Content safety rules

**Canvas:** lines 1410–1562

Symbol:

```text
CONTENT_SAFETY_RULES
```

### Destination

```text
src/modules/studio/registry/content-safety-rules.ts
src/modules/studio/domain/compliance/content-safety.ts
```

Data/decision logic dipisah.

---

# 10. CANVAS STORAGE / PERSISTENCE

## 10.1 IndexedDB storage

**Canvas:** lines 1563–1740

Symbols utama:

```text
DB_NAME
initDB
getDB
dbOp
saveAssetDB
getAssetsDB
deleteAssetDB
saveHistoryLog
getHistoryDB
saveQAResultDB
saveComplianceResultDB
saveFeedbackDB
getFeedbackDB
getFeedbackForAssetDB
deleteFeedbackDB
getDiversityTrackerDB
markDiversityUsedDB
```

### Destination

Canvas IndexedDB **tidak dipindahkan**.

Target:

```text
src/shared/persistence/contracts.ts

electron/services/storage/
    asset-store.ts
    history-store.ts
    qa-store.ts
    compliance-store.ts
    feedback-store.ts
    diversity-store.ts
```

Renderer access:

```text
src/application/use-cases
      ↓
window.api
      ↓
Electron storage service
```

### Disposition

`REBUILD / ADAPT`

### Critical rule

Tidak boleh ada `indexedDB` call langsung di new domain modules.

---

# 11. PROJECT ENGINE

## 11.1 Project model

**Canvas:** lines 1741–1829

Symbols:

```text
ImaginProject
createProject
saveProjectDB
getProjectsDB
getProjectDB
deleteProjectDB
projectEngine
```

### Destination

```text
src/shared/project/types.ts
src/shared/project/project-model.ts
src/shared/project/project-service.ts
electron/services/projects/
```

### Disposition

`SPLIT + REBUILD`

---

# 12. JOB ENGINE

## 12.1 Job persistence

**Canvas:** lines 1830–2097

Symbols:

```text
saveJobDB
normalizeJobRecord
getJobsDB
getJobDB
deleteJobDB
jobEngine
updateJobItemInTransaction
createStableId
createProductionJob
logItemStage
updateJobItemStatus
updateJobItemWithStage
```

### Destination

```text
src/shared/job/
    types.ts
    lifecycle.ts
    idempotency.ts
    recovery.ts

electron/services/jobs/
    job-store.ts
    job-service.ts
    recovery-service.ts
```

Studio-specific production job logic:

```text
src/modules/studio/application/jobs/
```

---

# 13. PURE REDUCERS

**Canvas:** lines 2019–2077

Symbols:

```text
selectionReducer
assetsReducer
batchQueueReducer
```

### Destination

```text
src/shared/ui/selection-reducer.ts
src/modules/gallery/state/assets-reducer.ts
src/modules/studio/state/batch-reducer.ts
```

### Rule

Reducer yang bersifat shared boleh dipindahkan ke shared hanya setelah memastikan tidak memiliki Studio-specific semantics.

---

# 14. CORE TYPES

## 14.1 Main types

**Canvas:** lines 2098–2691

Symbols/data model:

```text
AssetStatus
AssetType
PeopleAnalysis
StockMetadata
Asset
VectorState
SystemSettings
ComplianceResult
SimilarityResult
ResolvedProductionConfig
SVGStats
AssetLineage
ProductionItemStatus
ProductionJobStatus
GenerationRequest
IntentLockLevel
IntentResolutionStatus
SemanticRequirement
SubjectIntent
AssetIntent
StyleIntent
BackgroundIntent
ColorIntent
ProductionConstraints
ConstraintConflict
ConstraintResult
CanonicalProductionIntent
ProductionItem
ProductionJob
QAIssue
RegenerationRecommendation
QAResult
QAItemVerdict
Feedback
Metadata
ExportPackage
GenerationResult
PAGE_SIZE
INITIAL_VECTOR_STATE
SYSTEM_DEFAULT_SETTINGS
```

### Destination mapping

#### Shared

```text
src/shared/asset/types.ts
src/shared/asset/lineage.ts
src/shared/job/types.ts
src/shared/project/types.ts
src/shared/platform/types.ts
src/shared/errors/types.ts
```

#### Studio

```text
src/modules/studio/domain/intent/types.ts
src/modules/studio/domain/production/types.ts
src/modules/studio/domain/qa/types.ts
src/modules/studio/domain/metadata/types.ts
src/modules/studio/domain/similarity/types.ts
src/modules/studio/domain/resolution/types.ts
```

#### Vectorize

```text
src/modules/vectorize/domain/types.ts
```

### Rule

Tidak ada single `types.ts` besar yang menjadi dump baru.

---

# 15. CREATIVE DNA REGISTRY

## 15.1 Global / style / category DNA

**Canvas:** lines 2692–5011

Symbols:

```text
GLOBAL_DNA
STYLE_PRESET_DNA
CATEGORY_DNA
```

### Destination

```text
src/modules/studio/registry/dna/global.ts
src/modules/studio/registry/dna/styles.ts
src/modules/studio/registry/dna/categories.ts
```

### Important

`CATEGORY_DNA` adalah data besar. Jangan dipindahkan ke business logic file.

---

# 16. DNA ENGINE

**Canvas:** lines 5012–5192

Symbols:

```text
pickRandom
createDNATracker
loadDiversityTracker
genDNASignature
buildDNAContext
```

### Destination

```text
src/modules/studio/domain/dna/random.ts
src/modules/studio/domain/dna/diversity-tracker.ts
src/modules/studio/domain/dna/dna-signature.ts
src/modules/studio/domain/dna/dna-engine.ts
```

### Cross-module dependency

Diversity tracker persistence → shared job/storage service, bukan browser storage.

---

# 17. COMMERCIAL RULE ENGINE

**Canvas:** lines 5193–5248

Symbol:

```text
buildCommercialRules
```

### Destination

```text
src/modules/studio/domain/policy/commercial-rules.ts
```

Input dari registry.

Output berupa deterministic resolved rule set.

---

# 18. STYLE INTELLIGENCE

**Canvas:** lines 5249–5318

Symbols:

```text
STYLE_PRESET_MAP
findStylePreset
buildStyleGuidance
```

### Destination

```text
src/modules/studio/registry/style-presets.ts
src/modules/studio/domain/prompt/style-guidance.ts
```

---

# 19. GENERIC OBJECT DNA

**Canvas:** lines 5319–5336

Symbol:

```text
GENERIC_OBJECT_DNA
```

### Destination

```text
src/modules/studio/registry/generic-object-dna.ts
```

---

# 20. CATEGORY NEGATIVE HINTS

**Canvas:** lines 5337–5373

Symbols:

```text
CATEGORY_NEGATIVE_HINTS
buildCategoryNegativeHints
```

### Destination

```text
src/modules/studio/registry/category-negative-hints.ts
src/modules/studio/domain/prompt/category-negative-hints.ts
```

---

# 21. MARKET DEMAND / MARKET PALETTES

## 21.1 Market demand

**Canvas:** lines 5374–5495

Symbols:

```text
MARKET_DEMAND
getBuyerTermsForCategory
```

Destination:

```text
src/modules/studio/registry/market-demand.ts
```

## 21.2 Market palettes

**Canvas:** lines 5496–5537

Symbols:

```text
MARKET_PALETTES
getPaletteForCategory
```

Destination:

```text
src/modules/studio/registry/market-palettes.ts
```

### Important

These are **not the market intelligence engine**.

For now they are static knowledge tables. Full market intelligence belongs to post-parity M16.

---

# 22. CATEGORY QUALITY RULES

**Canvas:** lines 5538–5642

Symbols:

```text
CATEGORY_QUALITY_RULES
buildCategoryQualityInstruction
```

Destination:

```text
src/modules/studio/registry/category-quality-rules.ts
src/modules/studio/domain/qa/category-quality.ts
```

---

# 23. QUALITY GATE

**Canvas:** lines 5643–5867

Symbols:

```text
QUALITY_GATE
reasonCodeForIssue
buildRegenerationRecommendation
buildQualityGateResult
```

### Destination

```text
src/modules/studio/domain/qa/quality-gate.ts
src/modules/studio/domain/qa/reason-codes.ts
src/modules/studio/domain/qa/regeneration-recommendation.ts
```

### Rule

Quality decision logic tidak boleh berada di UI.

---

# 24. PROMPT / CGA DATABASE

**Canvas:** lines 5868–6146

Symbols/data:

```text
GLOBAL_CGA_DATABASE
REGIONS
COUNTRIES
RELIGIONS
EVENTS
CONFLICT_RULES
MUTATION_FOCUS_BANK
COLOR_ACCENT_PALETTES
```

Functions:

```text
kwMatch
findMatch
findEvent
resolveCGA
createBatchSession
```

### Destination

```text
src/modules/studio/registry/cga/
    global.ts
    geography.ts
    religion.ts
    events.ts
    conflicts.ts
    mutation-bank.ts
    palettes.ts

src/modules/studio/domain/prompt/cga-engine.ts
```

---

# 25. BATCH DIVERSITY

**Canvas:** lines 6147–6203

Symbols:

```text
DEFAULT_BATCH_RULES
getBatchRules
createBatchDiversitySession
pickWithBatchLimit
pickUnique
```

### Destination

```text
src/modules/studio/domain/diversity/batch-rules.ts
src/modules/studio/domain/diversity/batch-session.ts
src/modules/studio/domain/diversity/batch-picker.ts
```

---

# 26. PRODUCTION POLICY

**Canvas:** lines 6204–6293

Symbols:

```text
PRODUCTION_POLICY
classifyAssetReadiness
computeSubmissionReadiness
readyRatioCouldExport
```

### Destination

```text
src/modules/studio/domain/policy/production-policy.ts
src/modules/studio/domain/policy/submission-readiness.ts
```

### Note

Platform submission policy remains under shared/platform. Production Policy consumes that policy rather than duplicating it.

---

# 27. CONCEPT CLUSTERING / BATCH PLANNER

**Canvas:** lines 6294–6469

Symbols:

```text
planConceptClusters
buildStrongExclusionInstruction
buildCGAContext
```

### Destination

```text
src/modules/studio/domain/concept/cluster-planner.ts
src/modules/studio/domain/diversity/exclusion-instruction.ts
src/modules/studio/domain/prompt/cga-context.ts
```

---

# 28. BACKGROUND ENGINE

**Canvas:** lines 6470–6645

Symbols in this block must be placed into:

```text
src/modules/studio/domain/resolution/background-resolver.ts
src/modules/studio/domain/composition/background-policy.ts
```

### Important

Background removal itself is separated from background resolution.

```text
resolve background intent
        ≠
perform pixel transformation
```

Pixel transformation belongs under processing/background infrastructure.

---

# 29. STATE DEFAULTS

**Canvas:** lines 6646–6659

Destination:

```text
src/modules/studio/state/default-state.ts
```

---

# 30. STOCK METADATA BUILDERS

**Canvas:** lines 6660–6704

Symbols:

```text
buildDraftStockMetadata
createDraftStockMetadata
```

### Destination

```text
src/modules/studio/domain/metadata/draft-metadata.ts
```

Metadata Workspace may consume the shared engine, but the builder remains deterministic/domain-level.

---

# 31. NETWORK UTILITIES

**Canvas:** lines 6705–6800

Symbols:

```text
fetchRetryNotifier
setFetchRetryNotifier
fetchWithRetry
createGeminiTraceId
geminiTransportRequest
```

### Destination

The Canvas browser transport is NOT copied into renderer.

Target:

```text
src/shared/errors/
src/shared/events/

electron/services/ai/network.ts
electron/services/ai/9router-adapter.ts
electron/services/ai/trace.ts
```

### 9Router rule

Use:

```text
reference/infrastructure/9router.md
```

as integration reference.

---

# 32. PREFLIGHT / ASPECT RATIO HELPERS

**Canvas:** lines 6801–6896

Symbols:

```text
countPreflightPassed
aspectRatioToCss
RESOLUTION_POLICY
RESOLUTION_TARGETS
DEFAULT_RESOLUTION_TARGET
getResolutionTarget
getFormatResolutionPolicy
minShortSideForMegapixels
megapixelsOf
dimensionsForMegapixels
```

### Destination

```text
src/modules/studio/domain/qa/preflight.ts
src/modules/studio/domain/resolution/resolution-policy.ts
src/modules/studio/domain/resolution/aspect-ratio.ts
```

Shared resolution contracts may move to:

```text
src/shared/asset/resolution.ts
```

only if proven cross-module.

---

# 33. CONTENT RESEARCH / SUBJECT SATURATION

**Canvas:** lines 6897–7034

Symbols:

```text
SUBJECT_TIER_MAP
STYLE_DIFFERENTIATORS
COMPOSITION_DIFFERENTIATORS
CONTEXT_DIFFERENTIATORS
analyzePromptDifferentiation
```

### Destination

```text
src/modules/studio/registry/subject-tier-map.ts
src/modules/studio/registry/differentiation-pools.ts
src/modules/studio/domain/concept/differentiation.ts
```

Content research UI/service:

```text
src/modules/studio/application/research/
src/modules/studio/ui/ContentResearchPanel.tsx
```

---

# 34. EXPORT FORMAT RESOLUTION

**Canvas:** lines 7035–7054

Symbol:

```text
resolveExportFormat
```

### Destination

```text
src/modules/studio/domain/resolution/export-format.ts
src/shared/platform/export-contract.ts
```

---

# 35. ASSET PROFILE

**Canvas:** lines 7055–7095

Symbols:

```text
ASSET_PROFILE_SUBKEYWORD_MAP
resolveAssetProfile
```

### Destination

```text
src/modules/studio/registry/asset-profile-map.ts
src/modules/studio/domain/resolution/asset-profile.ts
```

---

# 36. RESOLVED CONFIG

**Canvas:** lines 7096–7206

Symbols:

```text
buildResolvedConfig
resolvePlatform
resolveCategory
resolveStyle
resolveCompatibility
resolveAll
```

### Destination

```text
src/modules/studio/domain/resolution/resolved-config.ts
src/modules/studio/domain/resolution/platform-resolver.ts
src/modules/studio/domain/resolution/category-resolver.ts
src/modules/studio/domain/resolution/style-resolver.ts
src/modules/studio/domain/resolution/compatibility-resolver.ts
src/modules/studio/domain/resolution/resolve-production.ts
```

### Rule

`resolveAll()` remains the canonical entry point for final production resolution.

---

# 37. IMAGE / VISUAL FINGERPRINT / SIMILARITY

**Canvas:** lines 7207–7484

Symbols:

```text
getImageDimensions
computeDHash
hammingDistance
computeContentHash
computePHash
hammingDistanceNormalized
computeColorHistogram
histogramSimilarity
computeVisualSimilarity
SHARPNESS
assessSharpness
```

### Destination

```text
src/modules/studio/domain/similarity/image-dimensions.ts
src/modules/studio/domain/similarity/perceptual-hash.ts
src/modules/studio/domain/similarity/content-hash.ts
src/modules/studio/domain/similarity/color-histogram.ts
src/modules/studio/domain/similarity/visual-similarity.ts
src/modules/studio/domain/qa/sharpness.ts
```

---

# 38. TECHNICAL QA

**Canvas:** lines 7485–8517

Symbols/behavior:

```text
TECHNICAL_QA
assessTechnicalQuality
scoreSharpness
detectWatermark
autoUpscaleImage
verifyBackgroundUniformity
processGeneratedImage
finalizeAsset
removeBackground3Layer
```

### Destination split

```text
src/modules/studio/domain/qa/technical-quality.ts
src/modules/studio/domain/qa/watermark-detection.ts
src/modules/studio/domain/qa/background-verification.ts
src/modules/studio/domain/qa/finalization-policy.ts
```

Pixel/image transformation:

```text
src/shared/media/image-processing/
```

Native/local binary processing where relevant:

```text
electron/services/binaries/
```

### Critical separation

```text
QA decision
    ≠
image transformation
```

---

# 39. FILE / DATA UTILITIES

**Canvas:** lines 8518–8541

Symbols include:

```text
toDataURL
```

### Destination

```text
src/shared/media/data-url.ts
```

Browser-specific fetch code must use Electron/service boundary when accessing external files.

---

# 40. JSON IMPORT / PROMPT DEFAULTS

**Canvas:** lines 8542–8737

Symbols:

```text
validateImportedJSON
resolvePromptDefaults
```

### Destination

```text
src/modules/studio/domain/import/json-schema.ts
src/modules/studio/domain/import/prompt-defaults.ts
src/modules/studio/application/import/process-json.ts
```

Import parser must not directly mutate Studio React state.

---

# 41. PRODUCTION PIPELINE

**Canvas:** lines 8738–9053

Core symbols:

```text
validateRequestIntake
NormalizedRequest
normalizeRequest
buildCanonicalProductionPlan
runProductionPipeline
resolveStyleKeyFromVision
resolveReferenceGenerationSettings
```

### Destination

```text
src/modules/studio/domain/production/intake.ts
src/modules/studio/domain/production/normalize-request.ts
src/modules/studio/domain/production/production-plan.ts
src/modules/studio/domain/production/production-pipeline.ts
src/modules/studio/domain/production/reference-settings.ts
```

### Critical rule

This becomes the **one canonical Studio execution core**.

---

# 42. CONTENT RESEARCH PANEL

**Canvas:** lines 9054–9170

Symbol:

```text
ContentResearchPanel
```

### Destination

```text
src/modules/studio/ui/ContentResearchPanel.tsx
```

Business logic used by the panel must come from application/domain services.

---

# 43. ERROR BOUNDARY

**Canvas:** lines 9171–9203

Symbol:

```text
ErrorBoundary
```

### Destination

```text
src/app/errors/AppErrorBoundary.tsx
src/shared/errors/
```

---

# 44. STATE STORE

**Canvas:** lines 9204–9383

Symbol:

```text
useImaginStateStore
```

### Destination

Do NOT create a mega-store equivalent.

Split into:

```text
src/modules/studio/state/studio-state.ts
src/modules/studio/state/production-state.ts
src/modules/studio/state/batch-state.ts
src/modules/gallery/state/gallery-state.ts
src/modules/metadata/state/metadata-state.ts
src/modules/upscale/state/upscale-state.ts
src/modules/vectorize/state/vectorize-state.ts
src/modules/remotion/state/remotion-state.ts
```

### Disposition

`SPLIT / REBUILD`

Persistent truth remains outside React.

---

# 45. EXPORT ENGINE

**Canvas:** lines 9384–11567

Important symbols/behavior:

```text
loadJSZip
IMAGETRACER_CDN
SVGComplexity
TracePreset
TRACE_COMPLEXITY_PRESETS
TRACE_EXPORT_PRESETS
LINE_QUALITY_PARAMS
ICON_STYLE_TRACE_PRESETS
loadImageTracer
isSvgTraceable
computeSVGStats
normalizeSvgArtboardForAdobe
svgDataUrlFromString
triggerDownload
assetFileExt
resolveReleasesValue
getCsvMetadataEligibility
exportMetadataCSV
CRC_TABLE
pngCrc32
xmpEscapeText
buildXmpPacket
embedXmpIntoPngBytes
embedXmpMetadata
handleDownloadSingle
recordExportHistory
downloadCustomTemplate
handleBulkExport
```

### Destination split

#### Export domain

```text
src/modules/studio/domain/export/
    export-metadata.ts
    export-eligibility.ts
    export-history.ts
    filename.ts
    package-manifest.ts
```

#### Platform adapters

```text
src/shared/platform/exporters/adobe-csv.ts
```

#### Media metadata

```text
src/shared/media/metadata/xmp.ts
src/shared/media/metadata/png.ts
src/shared/media/metadata/jpeg.ts
```

#### Zip/package infrastructure

```text
electron/services/assets/package-export.ts
```

#### Download

Renderer should invoke an application/native export action rather than own the entire filesystem flow.

---

# 46. SVG TRACE — MUST MOVE TO VECTORIZE

**Canvas:** lines 9415–10916 inside the export/trace block

Symbols:

```text
IMAGETRACER_CDN
SVGComplexity
TracePreset
TRACE_COMPLEXITY_PRESETS
TRACE_EXPORT_PRESETS
LINE_QUALITY_PARAMS
ICON_STYLE_TRACE_PRESETS
imagetracerPromise
loadImageTracer
isSvgTraceable
computeSVGStats
normalizeSvgArtboardForAdobe
svgDataUrlFromString
triggerDownload
assetFileExt
legacyBlockTrace
makeRng
rgbDist2
quantizeKMeans
stripWhiteBackground
cleanAlpha
matteOuterEdgeFromBackground
smoothTraceMask
defringeEdgeColors
medianFilter
otsuThreshold
quantizeGrayscaleIcon
isNearGrayscale
blurLight
preprocessForTrace
upgradeLSegmentsToBezier
traceBitmapBWtoSVG
BW_BITMAP_STYLES
circlifyTracedPaths
traceAssetToSVG
stripArtboardBackgrounds
injectGapFiller
svgDataUrlToStr
svgStrToBase64
applyBackgroundToSvgDataUrl
```

### Target

```text
src/modules/vectorize/registry/
src/modules/vectorize/domain/preprocess/
src/modules/vectorize/domain/tracing/
src/modules/vectorize/domain/svg/
src/modules/vectorize/application/trace-asset.ts
src/modules/vectorize/ui/
```

### Critical decision

Although these functions live inside Canvas, their ownership in Local is **Vectorize**, not Studio.

### Original asset rule

Source asset remains intact; generated SVG is a distinct asset with lineage.

---

# 47. IMPORT / BATCH RESUME

**Canvas:** lines 11568–11732

Symbols:

```text
saveBatchProgress
clearBatchProgress
loadBatchProgress
processImportedJSON
processImportedJSONFiles
handleJSONFileUpload
```

### Destination

```text
src/modules/studio/application/import/
src/modules/studio/application/batch/

electron/services/jobs/batch-resume-store.ts
```

### Important

Canvas `localStorage` resume is replaced by durable job persistence.

---

# 48. PROMPT ENGINE

**Canvas:** lines 11733–12156

**Local (M13 inc-5):** PARTIAL — generateImageWithGemini = local AI adapter counterpart (production deps); expandPromptWithGemini / buildIconNegativePrompt / composeIconPrompt / ICON_VARIATION_VISUALS / buildIconVariationVisuals / composeFinalPrompt / buildPromptV2 NOT ported (deferred — see P-008 row); Sprint-3 compiler portion below is LIVE.

Symbols:

```text
expandPromptWithGemini
generateImageWithGemini
buildIconNegativePrompt
composeIconPrompt
ICON_VARIATION_VISUALS
buildIconVariationVisuals
composeFinalPrompt
buildPromptV2
```

### Destination

Pure prompt logic:

```text
src/modules/studio/domain/prompt/
    prompt-engine.ts
    icon-prompt.ts
    negative-prompt.ts
    variation-visuals.ts
    prompt-composer.ts
```

AI calls:

```text
src/modules/studio/application/ai/
```

Transport:

```text
electron/services/ai/
```

### Critical rule

`generateImageWithGemini` is not allowed to become a renderer-side Gemini fetch.

Target transport:

```text
Studio application
→ IPC
→ AI service
→ 9Router adapter
```

---

# 49. PROMPT INTEGRITY / SEMANTIC INTENT

**Canvas:** lines 12157–12782

Symbols:

```text
DOMAIN_BY_CATEGORY
DOMAIN_FORBIDDEN
DOMAIN_FORBIDDEN_MATRIX
extractDomainKeywordsFromDNA
buildForbiddenDomains
buildSemanticLocks
buildCanonicalIntent
validateCanonicalIntent
resolveConstraints
buildRegenerationPlan
buildRejectionAwarePlan
buildProductionTrace
extractSemanticIntent
containsConcept
validatePromptIntegrity
buildSemanticLockToken
```

### Destination

```text
src/modules/studio/domain/intent/domain-map.ts
src/modules/studio/domain/intent/forbidden-domains.ts
src/modules/studio/domain/intent/semantic-locks.ts
src/modules/studio/domain/intent/canonical-intent.ts
src/modules/studio/domain/intent/constraint-resolution.ts
src/modules/studio/domain/intent/intent-validation.ts
src/modules/studio/domain/production/regeneration-plan.ts
src/modules/studio/domain/production/rejection-aware-plan.ts
src/modules/studio/domain/production/production-trace.ts
src/modules/studio/domain/prompt/prompt-integrity.ts
```

### Critical principle

Semantic intent is a first-class domain object, not a UI helper.

---

# 50. STYLE INTELLIGENCE / GEMINI STYLE INTERPRETER

**Canvas:** lines 12783–13015

Symbols:

```text
STYLE_CACHE
STYLE_INTERPRETATION_EMPTY
interpretStyleWithGemini
buildStyleInterpretation
getStyleInterpretation
assessStyleCompatibility
```

### Destination

```text
src/modules/studio/domain/prompt/style-intelligence.ts
src/modules/studio/application/style/interpret-style.ts
```

Cache should move away from module-global browser memory if persistence/reproducibility requires it.

---

# 51. UPSCALE ENGINE

**Canvas:** lines 13016–13234

Symbols/behavior:

```text
getAssetFileSizeKB
formatFileSize
isUpscaleEligible
handleUpscaleSingle
handleBulkUpscale
```

### Destination

Renderer handlers become application use cases:

```text
src/modules/upscale/application/upscale-asset.ts
src/modules/upscale/application/bulk-upscale.ts
```

Domain:

```text
src/modules/upscale/domain/eligibility.ts
src/modules/upscale/domain/output-policy.ts
```

Infrastructure:

```text
electron/services/binaries/realesrgan.ts
electron/services/binaries/waifu2x.ts
```

### Result

```text
source Asset
   ↓
new Asset
   ↓
lineage
   ↓
Gallery
```

---

# 52. VECTORIZE APPLICATION HANDLERS

**Canvas:** lines 13235–13384

Symbols:

```text
handleTraceSVG
handleBulkTraceSVG
handleBulkTraceByIconStyle
```

### Destination

```text
src/modules/vectorize/application/trace-asset.ts
src/modules/vectorize/application/bulk-trace.ts
src/modules/vectorize/application/trace-by-icon-style.ts
```

All communicate via shared Asset/Job contracts.

---

# 53. PROMPT GRAPH / COMPILER

**Canvas:** lines 13385–13701

Symbols:

```text
buildPromptGraph
buildLayeredNegativePrompt
buildPreviewPrompt
compilePrompt
```

### Destination

```text
src/modules/studio/domain/prompt/compiler.ts (M13 inc-5 — compilePrompt +
  buildLayeredNegativePrompt in one module; buildPromptGraph / buildPreviewPrompt
  NOT ported yet — deferred)
```

### Critical rule

`compilePrompt()` menjadi canonical deterministic prompt compiler.

No UI component may reconstruct the final prompt independently.

---

# 54. POST-GENERATION SEMANTIC QA

**Canvas:** lines 13702–13881

Symbols:

```text
detectDomainsFromVision
assessSemanticMatch
assessProfileMatch
```

### Destination

```text
src/modules/studio/domain/qa/semantic-match.ts
src/modules/studio/domain/qa/profile-match.ts
```

Vision transport remains through AI service.

---

# 55. CONCEPT FINGERPRINT

**Canvas:** lines 13882–13995

Symbols:

```text
hashString
FINGERPRINT_STOPWORDS
normalizeConceptTerms
buildConceptFingerprint
fingerprintsMatch
getAssetConceptFingerprint
checkLibraryConceptSimilarity
```

### Destination

```text
src/modules/studio/domain/concept/fingerprint.ts
src/modules/studio/domain/similarity/concept-similarity.ts
```

---

# 56. REJECTION TAXONOMY / POLICY

**Canvas:** lines 13996–14138

Symbols:

```text
REJECTION_TAXONOMY
classifyRejection
recordRejectionFeedback
deriveProductionPolicy
```

### Destination

```text
src/modules/studio/registry/rejection-taxonomy.ts
src/modules/studio/domain/qa/rejection-classifier.ts
src/modules/studio/application/feedback/record-rejection.ts
src/modules/studio/domain/policy/learned-policy.ts
```

### Important

`deriveProductionPolicy()` must remain bounded and evidence-driven. It must not silently become unrestricted market intelligence.

---

# 57. GENERATION ENGINE

**Canvas:** lines 14139–15208

Symbols:

```text
validateRequestIntake
NormalizedRequest
normalizeRequest
executeGenerateNormalAssets
executeGenerateIconAssets
executeGenerateAssets
```

### Destination

```text
src/modules/studio/application/generation/validate-request.ts
src/modules/studio/application/generation/normalize-request.ts
src/modules/studio/application/generation/execute-normal.ts
src/modules/studio/application/generation/execute-icon.ts
src/modules/studio/application/generation/execute-production.ts
```

### Critical architecture

These functions become orchestration around domain services, not a giant replacement file.

---

# 58. BATCH ENGINE

**Canvas:** lines 15209–15908

Symbols:

```text
batchEngine
executeJSONBatchGeneration
cancelGeneration
retryFailedAsset
```

### Destination

```text
src/modules/studio/application/batch/batch-engine.ts
src/modules/studio/application/batch/json-batch.ts
src/modules/studio/application/production/cancel-production.ts
src/modules/studio/application/production/retry-production.ts
```

### Critical invariants

```text
retry != duplicate
resume != regenerate
repeat click != second job
```

---

# 59. HISTORY

**Canvas:** lines 15909–15928

Symbol:

```text
history log helper
```

### Destination

```text
src/shared/project/history.ts
electron/services/projects/history-store.ts
```

---

# 60. METADATA AI PREFLIGHT ORCHESTRATION

**Canvas:** lines 15929–16183

Important behavior:

```text
single metadata generation
bulk metadata generation
metadata provider
aborted(signal)
```

### Destination

```text
src/modules/metadata/application/generate-metadata.ts
src/modules/metadata/application/bulk-generate-metadata.ts
src/modules/metadata/domain/metadata-engine.ts
```

AI call → main-process AI service.

---

# 61. ASSET LIFECYCLE

**Canvas:** lines 16184–16318

Behavior:

```text
submit
favorite
delete
```

### Destination

```text
src/shared/asset/lifecycle.ts
src/modules/gallery/application/asset-actions.ts
```

Persistence through Electron service.

---

# 62. BULK DRAFT CLEANUP

**Canvas:** lines 16319–16356

### Destination

```text
src/modules/gallery/application/bulk-cleanup.ts
```

Must preserve confirmation and data-integrity behavior.

---

# 63. COST ESTIMATION

**Canvas:** lines 16357–16400

Symbols:

```text
estimateApiCalls
ESTIMATED_COST_PER_CALL_USD
estimateCostUsd
estimateAssetApiCalls
```

### Destination

```text
src/modules/studio/domain/cost/cost-estimator.ts
```

Actual provider cost must not be hardcoded as billing truth. This is an estimate only.

---

# 64. SVG TRACE MODAL

**Canvas:** lines 16401–16782

Symbol:

```text
SvgTraceModal
```

### Destination

```text
src/modules/vectorize/ui/SvgTraceModal.tsx
```

The component consumes Vectorize application state and domain results; it does not perform trace logic itself.

---

# 65. APPLICATION APP()

**Canvas:** lines 16783–17374 and later UI blocks

`App()` must NOT be migrated as one large component.

### Destination

```text
src/app/App.tsx
src/app/shell/
src/app/router/
```

Studio-specific composition:

```text
src/modules/studio/ui/StudioWorkspace.tsx
```

Gallery:

```text
src/modules/gallery/ui/GalleryWorkspace.tsx
```

Upscale:

```text
src/modules/upscale/ui/UpscaleWorkspace.tsx
```

Vectorize:

```text
src/modules/vectorize/ui/VectorizeWorkspace.tsx
```

Remotion:

```text
src/modules/remotion/ui/RemotionWorkspace.tsx
```

---

# 66. METADATA SANITIZATION / VALIDATION

**Canvas:** lines 17375–17620

Symbols:

```text
NEWSWORDS_EVENT_DETECT
sanitizeStockTitle
validateStockTitle
METADATA_HIGHLIGHT_TERMS
highlightMetadataIssues
validateMetadataCompliance
```

### Destination

```text
src/modules/metadata/domain/title-sanitizer.ts
src/modules/metadata/domain/title-validator.ts
src/modules/metadata/domain/metadata-highlighting.ts
src/modules/metadata/domain/metadata-validator.ts
src/modules/metadata/domain/news-marker.ts
```

### Priority

```text
visual truth
>
visual profile
>
asset context
```

---

# 67. METADATA KEYWORD NORMALIZATION / SEO

**Canvas:** lines 17621–18641

Symbols:

```text
METADATA_GENERIC_STOPWORDS
normalizeMetadataKeyword
keywordTokens
isUsefulMetadataKeyword
singularizeKeyword
dedupePluralSingular
isCommonPhrase
splitNonCommonPhrases
scoreKeywordSEO
rankKeywordsForSEO
injectSEOCriticalKeywords
PRIMARY_ESCAPE
optimizeTitleForSEO
ensureTitleKeywordsInTop10
calculateSEOScore
validateAndCleanKeywords
buildMetadataExpansionCandidates
buildFinalStockMetadata
buildMetadataFallback
evaluateMetadataStatus
computeTitleSimilarity
checkBatchTitleSimilarity
checkBatchVisualSimilarity
computeBatchDiversityScore
_geminiEmbeddingCache
cosineSimilarity
computeGeminiImageEmbeddings
checkLibraryVisualSimilarity
enforceMetadataDiversity
checkPreGenerationSimilarity
```

### Destination split

#### Metadata domain

```text
src/modules/metadata/domain/keywords/normalization.ts
src/modules/metadata/domain/keywords/scoring.ts
src/modules/metadata/domain/keywords/ranking.ts
src/modules/metadata/domain/keywords/deduplication.ts
src/modules/metadata/domain/keywords/expansion.ts
src/modules/metadata/domain/title/seo.ts
src/modules/metadata/domain/metadata-engine.ts
src/modules/metadata/domain/metadata-fallback.ts
src/modules/metadata/domain/status.ts
```

#### Similarity / diversity

```text
src/modules/studio/domain/similarity/title-similarity.ts
src/modules/studio/domain/similarity/batch-visual-similarity.ts
src/modules/studio/domain/diversity/batch-diversity-score.ts
src/modules/studio/domain/similarity/embedding-similarity.ts
src/modules/studio/domain/similarity/library-similarity.ts
src/modules/studio/domain/diversity/metadata-diversity.ts
src/modules/studio/domain/similarity/pre-generation-similarity.ts
```

AI embeddings transport → Electron AI service.

---

# 68. AI PREFLIGHT / VISUAL TRUTH

**Canvas:** lines 18642–20018

Symbols:

```text
extractJSONFromText
callGeminiText
callGeminiForJSON
analyzeVisualTruth
detectVisualProfile
generateMetadataAndQA
runKeywordValidationLoop
REGEN_FIELD_PROMPTS
regenerateMetadataField
applyMetadataFieldUpdate
analyzeAssetForPreflight
analyzeConceptGenericity
AUTO_REGENERATION_MAX_RETRIES
buildRegeneratedPrompt
autoRegenerateAsset
```

### Destination

#### AI transport

```text
electron/services/ai/
```

#### Visual truth

```text
src/modules/metadata/domain/visual-truth.ts
src/modules/studio/domain/qa/visual-truth.ts
```

#### Visual profile

```text
src/modules/metadata/domain/visual-profile.ts
```

#### Metadata generation orchestration

```text
src/modules/metadata/application/generate-metadata.ts
```

#### Metadata field regeneration

```text
src/modules/metadata/domain/field-regeneration.ts
src/modules/metadata/application/regenerate-field.ts
```

#### Preflight

```text
src/modules/studio/domain/qa/preflight.ts
src/modules/metadata/domain/metadata-qa.ts
```

#### Genericity

```text
src/modules/studio/domain/concept/genericity.ts
```

#### Auto regeneration

```text
src/modules/studio/domain/production/auto-regeneration.ts
src/modules/studio/application/production/auto-regenerate.ts
```

### Critical rule

Field regeneration must not restart the whole asset-production pipeline.

---

# 69. REMAINING APPLICATION UI / MODALS

Setelah line 20018, sebagian besar declaration berada di dalam `App()` sebagai event handlers, render helpers, state-dependent local functions, dan modal renderers.

Semua nested App functions harus dipetakan berdasarkan **ownership**, bukan dipindahkan sebagai nested functions.

Kategori destination:

```text
Generation controls
→ modules/studio/ui/generation/

Reference image workflow
→ modules/studio/ui/reference/

Revision
→ modules/studio/ui/revision/

Object Modifier
→ modules/studio/ui/object-modifier/

Metadata editor / preflight
→ modules/metadata/ui/

Gallery
→ modules/gallery/ui/

Upscale
→ modules/upscale/ui/

Vectorize
→ modules/vectorize/ui/

Remotion
→ modules/remotion/ui/

History
→ shared/project/ + studio UI

Settings
→ app/settings/ + electron settings service

Prompt preview
→ modules/studio/ui/prompt/

Trace viewer
→ modules/studio/ui/trace/

Task button / task center
→ app/task-center/
```

---

# 70. REFERENCE IMAGE WORKFLOW

Behavior must map as one explicit application flow.

Canvas symbols/behavior include:

```text
handleReferenceImageSelected
reference image decoding
vision analysis
resolveReferenceGenerationSettings
buildReferenceRenderingDirective
skip AI expansion when reference workflow requires it
compile prompt from rendering directive
```

### Destination

```text
src/modules/studio/application/reference/analyze-reference.ts
src/modules/studio/application/reference/build-reference-directive.ts
src/modules/studio/domain/reference/reference-settings.ts
src/modules/studio/domain/reference/reference-dna.ts
src/modules/studio/ui/reference/ReferenceWorkflow.tsx
```

### Critical semantic rule

```text
reference image
→ visual analysis
→ inferred asset type/style/ratio/background/output
→ visual DNA
→ rendering directive
→ skip normal AI expansion when specified
→ prompt compiler
```

---

# 71. REVISION

Canvas revision handlers must map to:

```text
src/modules/studio/application/revision/
    revise-asset.ts
    repaint-asset.ts
    modify-asset.ts

src/modules/studio/domain/revision/
    revision-policy.ts
    revision-lineage.ts
```

Revision output must preserve lineage and use the canonical production/result contracts where behavior requires it.

---

# 72. OBJECT MODIFIER

Object Modifier logic must map to:

```text
src/modules/studio/application/object-modifier/
src/modules/studio/domain/object-modifier/
src/modules/studio/ui/object-modifier/
```

Do not let the UI directly implement provider request construction.

---

# 73. BACKGROUND REMOVAL / EDIT BACKGROUND

Canvas handlers such as:

```text
handleOpenRemoveBgSingle
handleOpenEditBg
applyBgColorToDataUrl
handleApplyEditBg
applyRemoveBgToDataUrl
handleApplyRemoveBgSingle
handleSaveRemoveBgResult
```

### Destination

```text
src/modules/studio/application/background/
src/shared/media/image-processing/background.ts
src/modules/studio/ui/background/
```

### Explicit exclusion

Do not reintroduce remove.bg or Photoroom.

Use approved local processing only.

---

# 74. BATCH IMPORT / JSON DOC UI

Canvas blocks:

```text
JSON_REFERENCE_MD
JSON_FORMAT_TEMPLATE
renderBatchImportPreviewModal
renderJSONFormatModal
renderPasteJSONModal
FIELD_DOCS
```

### Destination

```text
src/modules/studio/ui/import/BatchImportPreviewModal.tsx
src/modules/studio/ui/import/JSONFormatModal.tsx
src/modules/studio/ui/import/PasteJSONModal.tsx
src/modules/studio/domain/import/documentation.ts
```

Static documentation should not be buried inside business logic.

---

# 75. GALLERY UI

Canvas render blocks around:

```text
renderStatusBadge
renderCanvasView
renderGridAssetModal
renderDetailModal
```

### Destination

```text
src/modules/gallery/ui/
    GalleryWorkspace.tsx
    GalleryToolbar.tsx
    AssetGrid.tsx
    AssetCard.tsx
    AssetDetailModal.tsx
    AssetStatusBadge.tsx
    AssetPreview.tsx
    LineageViewer.tsx
```

Gallery owns selection/search/filter/preview/lineage routing only.

---

# 76. PRODUCTION TRACE UI

Canvas includes:

```text
openTraceModal
renderSvgTraceModal
renderPromptPreviewModal
```

### Destination

```text
src/modules/studio/ui/trace/ProductionTraceModal.tsx
src/modules/vectorize/ui/SvgTraceModal.tsx
src/modules/studio/ui/prompt/PromptPreviewModal.tsx
```

Trace data comes from domain/application results, not UI-generated pseudo-trace.

---

# 77. TASK CENTER / PIPELINE UI

Canvas includes task button / progress timeline / generation stages.

### Destination

```text
src/app/task-center/
    TaskCenter.tsx
    TaskList.tsx
    TaskRow.tsx
    TaskProgress.tsx

src/shared/job/
    job-view-model.ts
```

UI must subscribe to Job events/state rather than reconstructing job lifecycle.

---

# 78. SETTINGS UI

Canvas setting-related handlers/config:

```text
renderSettingsModal
systemSettings
aiConfig
```

### Destination

```text
src/app/settings/ui/SettingsWorkspace.tsx
src/app/settings/state/settings-state.ts

electron/services/settings/
```

9Router secrets stay in main process.

---

# 79. HISTORY UI

Canvas:

```text
renderHistoryModal
```

### Destination

```text
src/shared/project/history.ts
src/modules/studio/ui/history/HistoryModal.tsx
```

---

# 80. HELP UI

Canvas:

```text
renderHelpModal
```

### Destination

```text
src/app/help/HelpModal.tsx
```

---

# 81. CSS / STYLES

Canvas inline styles and `tailwindStyles` must not remain in a monolithic source file.

### Destination

```text
src/shared/ui/styles/
src/shared/ui/tokens/
```

UI components consume shared tokens/components.

---

# 82. SPECIAL CANVAS CODE THAT MUST CHANGE MODULE OWNER

The following source responsibilities deliberately move away from their Canvas location:

| Canvas responsibility | New owner |
|---|---|
| IndexedDB persistence | Electron storage services |
| Batch resume localStorage | durable Job recovery |
| SVG tracing | Vectorize |
| Upscale handlers | Upscale |
| Metadata workspace logic | Metadata |
| Gallery management | Gallery |
| Native media operations | Electron services |
| Direct browser network | infrastructure/AI service |
| AI provider access | Electron AI service |
| platform taxonomy | shared/platform |
| asset lineage | shared/asset |
| Job lifecycle | shared/job |
| application shell | app/ |

---

# 83. CANVAS CODE THAT MUST NOT BE COPIED

Do not copy these structures as-is:

```text
App() mega-component
useImaginStateStore() mega-store
IndexedDB helpers
localStorage resume
browser direct fetch to provider
UI handlers containing domain business logic
nested business rules inside JSX
one-file data + engine + UI coupling
```

Instead rebuild them according to the target architecture.

---

# 84. TOP-LEVEL SYMBOL ACCOUNTING RULE

Setiap top-level symbol pada Canvas harus diproses dengan rule:

```text
source symbol
→ mapped destination file
→ disposition
→ owner
→ test/parity reference
→ status
```

Contoh:

```text
buildDNAContext
→ modules/studio/domain/dna/dna-engine.ts
→ MOVE/REBUILD
→ Studio DNA Engine
→ P-007/P-015
→ NOT_STARTED
```

Tidak boleh ada top-level symbol kritis yang tidak memiliki destination.

---

# 85. COMPLETE TOP-LEVEL INVENTORY — ACCOUNTING REFERENCE

Inventory berikut harus digunakan bersama section mapping untuk mencegah symbol-level loss.

## Registry / Configuration

```text
ASSET_TYPE_PRESETS
ICON_MASTER_NEGATIVE_PROMPT
ICON_STYLE_PRESETS
ICON_SHEET_EXTRA_NEGATIVE
COMMERCIAL_ILLUSTRATION_STYLES
STYLES_BY_ASSET_TYPE
ADOBE_CATEGORY_TAXONOMY
MICROSTOCK_PLATFORMS
DEFAULT_PLATFORM
OFFICIAL_TO_DNA_MAP
DNA_TO_OFFICIAL_MAP
PlatformAdapter
ADOBE_ADAPTER
FREEPIK_ADAPTER
PLATFORM_ADAPTERS
ASSET_TYPE_META
PLATFORM_POLICY
METADATA_POLICY
METADATA_RULES
SEO_CONFIG
SEO_COMMON_PHRASES
SPAM_TERMS
GENERATION_MODES
BATCH_TIERS
MAX_BATCH_COUNT
GENERATE_METADATA_STEPS
ICON_GENERATION_MODES
ICON_GRID_OPTIONS
TEXT_MODELS
IMAGE_MODELS
STATUS_CONFIG
FILTER_STATUS_ORDER
SUBMITTABLE_STATUSES
CSV_EXPORT_STATUSES
SUBMITTABLE_FROM_EXPORT
PREFLIGHT_ITEMS
BRAND_IP_BLOCKLIST
GOVERNMENT_AGENCY_BLOCKLIST
ARTIST_STYLE_REFERENCE_PATTERN
NEWS_EVENT_MARKERS
SENSITIVE_CONTENT_MARKERS
METADATA_NEWS_MARKERS
NEWS_SAFE_CATEGORIES
CONTENT_SAFETY_RULES
SUBJECT_TYPES
CAMERA_ANGLES
ACTIVITY_CONTEXTS
FRAMING_STYLES
GLOBAL_DNA
STYLE_PRESET_DNA
CATEGORY_DNA
GLOBAL_CGA_DATABASE
REGIONS
COUNTRIES
RELIGIONS
EVENTS
CONFLICT_RULES
MUTATION_FOCUS_BANK
COLOR_ACCENT_PALETTES
DEFAULT_BATCH_RULES
PRODUCTION_POLICY
RESOLUTION_POLICY
RESOLUTION_TARGETS
DEFAULT_RESOLUTION_TARGET
SUBJECT_TIER_MAP
STYLE_DIFFERENTIATORS
COMPOSITION_DIFFERENTIATORS
CONTEXT_DIFFERENTIATORS
ASSET_PROFILE_SUBKEYWORD_MAP
SUBJECT_TIER_MAP
CATEGORY_QUALITY_RULES
GENERIC_OBJECT_DNA
CATEGORY_NEGATIVE_HINTS
MARKET_DEMAND
MARKET_PALETTES
QUALITY_GATE
SHARPNESS
TECHNICAL_QA
REJECTION_TAXONOMY
FINGERPRINT_STOPWORDS
METADATA_GENERIC_STOPWORDS
METADATA_HIGHLIGHT_TERMS
METADATA_NEWS_MARKERS
SEO_COMMON_PHRASES
```

## Domain / Engine

```text
createCompositionSession
generateDynamicSlot
getBatchSlots
getBatchSlotsAI
resolveDNAFromOfficial
getPlatformSubmissionPolicy
evaluatePlatformSubmissionReadiness
matchesBlockedTerm
checkBrandSafety
detectNewsEvent
detectSensitiveContent
buildCommercialRules
pickRandom
createDNATracker
loadDiversityTracker
genDNASignature
buildDNAContext
findStylePreset
buildStyleGuidance
buildCategoryNegativeHints
buildCategoryQualityInstruction
reasonCodeForIssue
buildRegenerationRecommendation
buildQualityGateResult
resolveCGA
getBatchRules
createBatchDiversitySession
pickWithBatchLimit
pickUnique
classifyAssetReadiness
computeSubmissionReadiness
readyRatioCouldExport
planConceptClusters
buildStrongExclusionInstruction
buildCGAContext
getBuyerTermsForCategory
getPaletteForCategory
resolveExportFormat
resolveAssetProfile
buildResolvedConfig
resolvePlatform
resolveCategory
resolveStyle
resolveCompatibility
resolveAll
getImageDimensions
computeDHash
hammingDistance
computeContentHash
computePHash
hammingDistanceNormalized
computeColorHistogram
histogramSimilarity
computeVisualSimilarity
assessSharpness
scoreSharpness
detectWatermark
autoUpscaleImage
verifyBackgroundUniformity
processGeneratedImage
finalizeAsset
removeBackground3Layer
validateImportedJSON
resolvePromptDefaults
validateRequestIntake
normalizeRequest
buildCanonicalProductionPlan
runProductionPipeline
resolveStyleKeyFromVision
resolveReferenceGenerationSettings
expandPromptWithGemini
generateImageWithGemini
buildIconNegativePrompt
composeIconPrompt
buildIconVariationVisuals
composeFinalPrompt
buildPromptV2
extractDomainKeywordsFromDNA
buildForbiddenDomains
buildSemanticLocks
buildCanonicalIntent
validateCanonicalIntent
resolveConstraints
buildRegenerationPlan
buildRejectionAwarePlan
buildProductionTrace
extractSemanticIntent
containsConcept
validatePromptIntegrity
buildSemanticLockToken
interpretStyleWithGemini
buildStyleInterpretation
getStyleInterpretation
assessStyleCompatibility
analyzePromptDifferentiation
buildPromptGraph
buildLayeredNegativePrompt
buildPreviewPrompt
compilePrompt
detectDomainsFromVision
assessSemanticMatch
assessProfileMatch
normalizeConceptTerms
buildConceptFingerprint
fingerprintsMatch
getAssetConceptFingerprint
checkLibraryConceptSimilarity
classifyRejection
recordRejectionFeedback
deriveProductionPolicy
executeGenerateNormalAssets
executeGenerateIconAssets
executeGenerateAssets
executeJSONBatchGeneration
cancelGeneration
retryFailedAsset
resolveReleasesValue
getCsvMetadataEligibility
exportMetadataCSV
```

## Persistence / Infrastructure

```text
DB_NAME
initDB
getDB
dbOp
saveAssetDB
getAssetsDB
deleteAssetDB
saveHistoryLog
getHistoryDB
saveQAResultDB
saveComplianceResultDB
saveFeedbackDB
getFeedbackDB
getFeedbackForAssetDB
deleteFeedbackDB
getDiversityTrackerDB
markDiversityUsedDB
createProject
saveProjectDB
getProjectsDB
getProjectDB
deleteProjectDB
projectEngine
saveJobDB
normalizeJobRecord
getJobsDB
getJobDB
deleteJobDB
jobEngine
updateJobItemInTransaction
createStableId
createProductionJob
logItemStage
updateJobItemStatus
updateJobItemWithStage
fetchWithRetry
geminiTransportRequest
```

## Metadata

```text
buildDraftStockMetadata
createDraftStockMetadata
sanitizeStockTitle
validateStockTitle
highlightMetadataIssues
validateMetadataCompliance
normalizeMetadataKeyword
keywordTokens
isUsefulMetadataKeyword
singularizeKeyword
dedupePluralSingular
isCommonPhrase
splitNonCommonPhrases
scoreKeywordSEO
rankKeywordsForSEO
injectSEOCriticalKeywords
optimizeTitleForSEO
ensureTitleKeywordsInTop10
calculateSEOScore
validateAndCleanKeywords
buildMetadataExpansionCandidates
buildFinalStockMetadata
buildMetadataFallback
evaluateMetadataStatus
computeTitleSimilarity
checkBatchTitleSimilarity
checkBatchVisualSimilarity
computeBatchDiversityScore
computeGeminiImageEmbeddings
checkLibraryVisualSimilarity
enforceMetadataDiversity
checkPreGenerationSimilarity
analyzeVisualTruth
detectVisualProfile
generateMetadataAndQA
runKeywordValidationLoop
regenerateMetadataField
applyMetadataFieldUpdate
analyzeAssetForPreflight
analyzeConceptGenericity
autoRegenerateAsset
```

## Vectorize

```text
loadImageTracer
isSvgTraceable
computeSVGStats
normalizeSvgArtboardForAdobe
legacyBlockTrace
makeRng
rgbDist2
quantizeKMeans
stripWhiteBackground
cleanAlpha
matteOuterEdgeFromBackground
smoothTraceMask
defringeEdgeColors
medianFilter
otsuThreshold
quantizeGrayscaleIcon
isNearGrayscale
blurLight
preprocessForTrace
upgradeLSegmentsToBezier
traceBitmapBWtoSVG
circlifyTracedPaths
traceAssetToSVG
stripArtboardBackgrounds
injectGapFiller
svgDataUrlToStr
svgStrToBase64
applyBackgroundToSvgDataUrl
handleTraceSVG
handleBulkTraceSVG
handleBulkTraceByIconStyle
SvgTraceModal
```

## UI / Application

UI symbols must be split into component files according to ownership. The exact nested closure inventory inside `App()` is not treated as domain source of truth; it is an application/UI implementation inventory that must be decomposed and re-wired.

---

# 86. SPECIAL REFACTOR HOTSPOTS

The following areas require mandatory Oracle review before implementation:

```text
1. Asset model
2. Job model
3. Production pipeline
4. AI transport
5. IndexedDB → Electron storage conversion
6. batch resume → durable recovery
7. Canvas mega-store → module-local state
8. SVG trace → Vectorize module
9. Metadata split between Studio and Metadata module
10. Platform adapter ownership
11. Visual similarity / embedding transport
12. Auto-regeneration
13. Production trace
14. Revision / Object Modifier lineage
15. Background removal processing
```

---

# 87. MAPPING → IMPLEMENTATION ORDER

Refactor order must follow architecture dependencies, not Canvas line order.

```text
1. Shared types/contracts
2. Shared Asset
3. Shared Job
4. Shared Platform
5. Shared Error/Event
6. Persistence services
7. AI transport
8. App shell
9. Gallery
10. Studio resolution contracts
11. Studio intent
12. Studio DNA
13. Studio prompt
14. Studio production core
15. Normal generation
16. Studio QA
17. Metadata core
18. Specialized Studio modes
19. Upscale
20. Vectorize
21. Remotion
22. Cross-module integration
23. Reliability
24. Canvas parity
25. Production hardening
```

---

# 88. REFATORING PROTOCOL FOR EVERY SYMBOL / BLOCK

For every mapped Canvas unit:

```text
STEP 1
Identify source block

STEP 2
Read referenced behavior

STEP 3
Identify direct dependencies

STEP 4
Identify hidden side effects

STEP 5
Assign Local owner

STEP 6
Choose MOVE / REBUILD / ADAPT / CONSOLIDATE / SPLIT / RETIRE

STEP 7
Implement

STEP 8
Remove duplicated implementation if applicable

STEP 9
Add regression test

STEP 10
Run typecheck

STEP 11
Run build

STEP 12
Run integration test

STEP 13
Update PARITY_MATRIX.md

STEP 14
Mark mapping status
```

---

# 89. ZERO-UNMAPPED GATE

Sebelum M13 Canvas Behavioral Parity boleh dimulai, mapping harus memenuhi:

```text
[ ] every major Canvas section mapped
[ ] every critical top-level declaration mapped
[ ] every critical nested App workflow mapped
[ ] no critical orphan logic
[ ] no critical duplicate Local implementation
[ ] no unexplained RETIRE
[ ] no unexplained ARCHIVE_ONLY
[ ] all cross-module moves documented
[ ] all persistence moves documented
[ ] all AI transport moves documented
```

Jika gagal:

```text
CANVAS REFACTOR MAPPING = NOT COMPLETE
```

---

# 90. PROOF OF COMPLETENESS

Pemetaan dianggap lengkap hanya bila tiga lapisan berikut sama-sama lengkap:

### Layer A — Section coverage

```text
28,416 source lines
→ major logical block coverage
```

### Layer B — Symbol coverage

```text
critical top-level symbol
→ destination file
```

### Layer C — Behavior coverage

```text
symbol/block
→ behavior requirement
→ parity ID
→ test evidence
```

Jangan menggunakan:

```text
"semua function sudah dipindah"
```

sebagai bukti completeness.

Yang harus dibuktikan:

```text
semantics preserved
+ integration preserved
+ persistence preserved
+ failure behavior preserved
```

---

# 91. PARITY LINKING RULE

Mapping item wajib ditautkan ke `PARITY_MATRIX.md` bila menyentuh critical behavior.

Contoh:

```text
buildDNAContext
→ P-007 DNA
→ P-015 Diversity

compilePrompt
→ P-008 Prompt
→ P-009 Prompt Integrity

buildCanonicalProductionPlan
→ P-051 Production Request
→ P-052 Production Plan

runProductionPipeline
→ P-001 Normal Generation
→ P-016 Visual Truth
→ P-017 Technical QA
→ P-018 Compliance
→ P-019 Preflight
→ P-053 Production Trace

traceAssetToSVG
→ P-037 Vectorize
→ P-034 Gallery Lineage

buildFinalStockMetadata
→ P-021 Metadata
→ P-022 Metadata Policy
→ P-023/P-024/P-025 Field Regeneration
```

---

# 92. ARCHITECTURAL DRIFT RULE

Perbedaan dengan Canvas diperbolehkan bila:

```text
architecture/security/reliability improves
AND
production semantics remain equivalent
```

Contoh approved drift:

```text
Canvas IndexedDB
→ Local Electron persistent storage

Canvas direct provider access
→ Local secure AI service boundary

Canvas mega-store
→ module-local state

Canvas SVG trace in single file
→ Local Vectorize module

Canvas export download handler
→ Local export service/application use case
```

---

# 93. ANTI-DUPLICATION RULE

Jika agent menemukan dua implementation Canvas untuk satu konsep:

```text
identify which behavior is canonical
compare consumers
compare tests
select one Local owner
```

Contoh:

```text
METADATA_POLICY
SEO_CONFIG
```

Local harus memiliki satu canonical rule set, dengan compatibility facade bila diperlukan.

---

# 94. LEGACY CODE RULE

Legacy ZIP:

```text
reference/legacy-local/imagin_studio.zip
```

hanya boleh digunakan untuk:

```text
implementation clues
Electron knowledge
recovery patterns
native binary patterns
failure modes
```

Ia tidak boleh mengubah ownership yang sudah ditetapkan mapping ini tanpa architectural review.

---

# 95. 9ROUTER RULE

9Router reference:

```text
reference/infrastructure/9router.md
```

Current legacy code can show how requests historically worked, tetapi Local baru harus tetap menggunakan:

```text
Renderer
→ Preload
→ IPC
→ AI Service
→ 9Router Adapter
→ 9Router
```

Tidak boleh:

```text
Renderer
→ fetch(9Router)
```

---

# 96. CANVAS SOURCE IS NOT TARGET STRUCTURE

Jangan pernah melakukan:

```text
Canvas section [09]
→ satu file Local 10.000 baris
```

Target adalah:

```text
small cohesive modules
single ownership
stable contracts
unit-testable domain
service boundaries
```

---

# 97. COMPLETION CHECKLIST

`CANVAS_TO_LOCAL_MAPPING.md` dinyatakan complete setelah:

```text
[ ] all source sections accounted for
[ ] all critical top-level symbols accounted for
[ ] UI ownership split defined
[ ] Studio ownership defined
[ ] Metadata ownership defined
[ ] Gallery ownership defined
[ ] Upscale ownership defined
[ ] Vectorize ownership defined
[ ] Remotion ownership defined
[ ] shared contracts defined
[ ] persistence mapping defined
[ ] AI transport mapping defined
[ ] legacy relationship defined
[ ] 9Router relationship defined
[ ] parity links defined
[ ] zero-unmapped audit passed
```

---

# 98. FINAL RULE

Target refactor bukan:

```text
Canvas file
    ↓
50 smaller files
```

Target sebenarnya:

```text
Canvas behavior
      ↓
Behavioral decomposition
      ↓
Stable contracts
      ↓
Correct ownership
      ↓
Clean Local architecture
      ↓
Tests
      ↓
Parity evidence
```

The final question for every block is not:

> "Ke file mana code ini dipindahkan?"

The correct question is:

> "Siapa owner semantic block ini di architecture baru, apa kontraknya, dan bagaimana kita membuktikan behavior-nya tetap sama?"

---

# END OF CANVAS_TO_LOCAL_MAPPING.md


---

# APPENDIX A — EXACT SOURCE RANGE COVERAGE

The following ranges are derived from the actual source file. The purpose is audit coverage: every source range is assigned a destination/refactor owner category. A range may contain multiple Local target files; see the detailed sections above for the split.

| Source lines | Canvas section | Refactor disposition / target |
|---:|---|---|
| 1–110 | Imports / file preamble / architecture comments | SPLIT into per-file imports; comments become documentation/rules where relevant |
| 41–110 | [11] APPLICATION    = state destructure + JSX render ONLY. | SEE SECTION-LEVEL MAPPING ABOVE |
| 111–160 | 05 · DATA REGISTRY — Asset Type Presets (per assetType: vector / illustration / 3d / photo) | SEE SECTION-LEVEL MAPPING ABOVE |
| 161–489 | [05.02] DATA REGISTRY — Icon DNA | SEE SECTION-LEVEL MAPPING ABOVE |
| 490–514 | 05 · DATA REGISTRY — Illustration Styles & Style-by-AssetType map | SEE SECTION-LEVEL MAPPING ABOVE |
| 515–545 | 05 · DATA REGISTRY — Adobe Category Taxonomy | SEE SECTION-LEVEL MAPPING ABOVE |
| 546–599 | 14 · PLATFORM ADAPTER — Platform Registry (Adobe Stock, Freepik, dst) & default platform | SEE SECTION-LEVEL MAPPING ABOVE |
| 600–657 | 08 · RESOLUTION LAYER — Official Category <-> Internal DNA mapping | SEE SECTION-LEVEL MAPPING ABOVE |
| 658–940 | 14 · PLATFORM ADAPTER — Platform Adapters (FASE 12) | SEE SECTION-LEVEL MAPPING ABOVE |
| 941–1045 | 03 · GLOBAL CONSTANTS — Spam terms, generation modes, status config | SEE SECTION-LEVEL MAPPING ABOVE |
| 1046–1244 | 05 · DATA REGISTRY — Composition Dimension Pool (input untuk DNA Engine) | SEE SECTION-LEVEL MAPPING ABOVE |
| 1245–1325 | 12 · COMPLIANCE ENGINE — Preflight items, Brand/IP blocklist, brand-safety check | SEE SECTION-LEVEL MAPPING ABOVE |
| 1326–1409 | 12 · COMPLIANCE ENGINE — News-event & sensitive-content detector (PHASE P0) | SEE SECTION-LEVEL MAPPING ABOVE |
| 1410–1562 | 12 · COMPLIANCE ENGINE — CONTENT_SAFETY_RULES (PHASE P0) | SEE SECTION-LEVEL MAPPING ABOVE |
| 1563–1740 | 16 · STORAGE ENGINE — IndexedDB helpers (assets, history, batches, diversity tracker) | SEE SECTION-LEVEL MAPPING ABOVE |
| 1741–1829 | 16 · STORAGE / PROJECT ENGINE — Project Engine (FASE 6) | SEE SECTION-LEVEL MAPPING ABOVE |
| 1830–2097 | 16 · STORAGE / JOB ENGINE (FASE 14) — Production Job storage helpers. | SEE SECTION-LEVEL MAPPING ABOVE |
| 2098–2691 | 02 · CORE TYPES — Status/Asset/VectorState/SystemSettings contracts | SEE SECTION-LEVEL MAPPING ABOVE |
| 2692–5011 | 05 · DATA REGISTRY — Creative DNA v5 (Global / Style Preset / Category DNA) | SEE SECTION-LEVEL MAPPING ABOVE |
| 5012–5192 | 09 · ENGINES — DNA Engine (tracker, signature, context builder) | SEE SECTION-LEVEL MAPPING ABOVE |
| 5193–5248 | 10 · RULE ENGINE — Commercial Rules | SEE SECTION-LEVEL MAPPING ABOVE |
| 5249–5318 | 09 · ENGINES — DNA Engine (style guidance resolver) | SEE SECTION-LEVEL MAPPING ABOVE |
| 5319–5336 | 12 · COMPLIANCE ENGINE — Generic Object DNA (EU-8) | SEE SECTION-LEVEL MAPPING ABOVE |
| 5337–5373 | 10 · RULE ENGINE — Category Negative Hints | SEE SECTION-LEVEL MAPPING ABOVE |
| 5374–5495 | 17 · MARKET DEMAND REGISTRY (Fase A) — konsep laris & buyer vocabulary | SEE SECTION-LEVEL MAPPING ABOVE |
| 5496–5537 | 17 · MARKET PALETTES (Fase B) — palette komersial yang "menjual" per kategori | SEE SECTION-LEVEL MAPPING ABOVE |
| 5538–5642 | 12 · COMPLIANCE ENGINE — Category Quality Rules (EU-6) | SEE SECTION-LEVEL MAPPING ABOVE |
| 5643–5867 | 10 · QUALITY ENGINE — Quality Gate (FASE 10) | SEE SECTION-LEVEL MAPPING ABOVE |
| 5868–6146 | 09 · ENGINES — Prompt Engine (CGA / composition-guided variation, negative prompt builder) | SEE SECTION-LEVEL MAPPING ABOVE |
| 6147–6203 | 09 · ENGINES — Batch Diversity Rules (EU-7) | SEE SECTION-LEVEL MAPPING ABOVE |
| 6204–6293 | 07 · PRODUCTION POLICY — Submission policy & readiness (PHASE 9 / Definition of Done) | SEE SECTION-LEVEL MAPPING ABOVE |
| 6294–6469 | 09 · ENGINES — Concept Clustering Batch Planner (EU-12) | SEE SECTION-LEVEL MAPPING ABOVE |
| 6470–6645 | 09 · ENGINES — Background Engine (EU-5) | SEE SECTION-LEVEL MAPPING ABOVE |
| 6646–6659 | 06 · STATE STORE — default state factories | SEE SECTION-LEVEL MAPPING ABOVE |
| 6660–6704 | 13 · METADATA ENGINE — Stock metadata builders | SEE SECTION-LEVEL MAPPING ABOVE |
| 6705–6800 | 04 · UTILITIES — Network (fetch with retry) | SEE SECTION-LEVEL MAPPING ABOVE |
| 6801–6896 | 04 · UTILITIES — Preflight/aspect ratio helpers | SEE SECTION-LEVEL MAPPING ABOVE |
| 6897–7034 | 05.09 · CONTENT RESEARCH — Subject Saturation Tier Map | SEE SECTION-LEVEL MAPPING ABOVE |
| 7035–7054 | 08 · RESOLUTION LAYER — Export Format Contract (PHASE P0 / Fase 0) | SEE SECTION-LEVEL MAPPING ABOVE |
| 7055–7095 | 08 · RESOLUTION LAYER — Asset Profile classifier (PHASE 2 modified) | SEE SECTION-LEVEL MAPPING ABOVE |
| 7096–7206 | 08 · RESOLUTION LAYER — resolveAll() (FASE 4) | SEE SECTION-LEVEL MAPPING ABOVE |
| 7207–7216 | 11 · QUALITY ENGINE — Resolution check, upscale, background verification, finalize asset | SEE SECTION-LEVEL MAPPING ABOVE |
| 7217–7484 | 11 · QUALITY ENGINE — Visual fingerprint, visual similarity, sharpness (PHASE P0) | SEE SECTION-LEVEL MAPPING ABOVE |
| 7485–8517 | 08.2 · TECHNICAL QA ENGINE (QA-aset poin 4–8) — Multi-metrik kualitas teknis | SEE SECTION-LEVEL MAPPING ABOVE |
| 8518–8541 | 04 · UTILITIES — File/Data helpers | SEE SECTION-LEVEL MAPPING ABOVE |
| 8542–8737 | 20 · IMPORT / MIGRATION ENGINE — JSON batch import validation & prompt defaults | SEE SECTION-LEVEL MAPPING ABOVE |
| 8738–8761 | [07] PRODUCTION PIPELINE | SEE SECTION-LEVEL MAPPING ABOVE |
| 8762–9053 | [09.06] BATCH ENGINE). Fungsi ini dipertahankan sebagai target refactor FASE 3 | SEE SECTION-LEVEL MAPPING ABOVE |
| 9054–9170 | [10] UI SYSTEM — ContentResearchPanel | SEE SECTION-LEVEL MAPPING ABOVE |
| 9171–9203 | 23 · UI SYSTEM — Error Boundary | SEE SECTION-LEVEL MAPPING ABOVE |
| 9204–9383 | [06] STATE STORE — useImaginStateStore() | SEE SECTION-LEVEL MAPPING ABOVE |
| 9384–11567 | 15 · EXPORT ENGINE — ZIP/CSV/package builders & download triggers | SEE SECTION-LEVEL MAPPING ABOVE |
| 11568–11732 | 20 · IMPORT / MIGRATION ENGINE — batch-resume storage & JSON batch import | SEE SECTION-LEVEL MAPPING ABOVE |
| 11733–12156 | [09.04] PROMPT ENGINE | SEE SECTION-LEVEL MAPPING ABOVE |
| 12157–12782 | 09.5 · PROMPT INTEGRITY — Semantic Intent extraction + validation (audit DNA) | SEE SECTION-LEVEL MAPPING ABOVE |
| 12783–13374 | 09.5b · STYLE INTELLIGENCE — Gemini Style Interpreter + Cache (Sprint 2) | SEE SECTION-LEVEL MAPPING ABOVE |
| 13375–13701 | 09.5c · PROMPT COMPILER — deterministic final prompt builder (Sprint 3) | SEE SECTION-LEVEL MAPPING ABOVE |
| 13702–13881 | 09.5d · POST-GENERATION SEMANTIC QA (Sprint 4) | SEE SECTION-LEVEL MAPPING ABOVE |
| 13882–13995 | 09.5e · CONCEPT FINGERPRINT — deterministic similarity layer (Sprint 5) | SEE SECTION-LEVEL MAPPING ABOVE |
| 13996–14138 | 09.5f · REJECTION TAXONOMY & PRODUCTION POLICY (Sprint 6) | SEE SECTION-LEVEL MAPPING ABOVE |
| 14139–15208 | [09.05] GENERATION ENGINE | SEE SECTION-LEVEL MAPPING ABOVE |
| 15209–15908 | [09.06] BATCH ENGINE — batchEngine object | SEE SECTION-LEVEL MAPPING ABOVE |
| 15909–15928 | 16 · STORAGE / PROJECT ENGINE — history log helper | SEE SECTION-LEVEL MAPPING ABOVE |
| 15929–16183 | 13 · METADATA ENGINE — AI preflight orchestration (single & bulk) | SEE SECTION-LEVEL MAPPING ABOVE |
| 16184–16318 | 16 · STORAGE / PROJECT ENGINE — asset lifecycle (submit/favorite/delete) | SEE SECTION-LEVEL MAPPING ABOVE |
| 16319–16782 | 16 · STORAGE / PROJECT ENGINE — bulk draft cleanup | SEE SECTION-LEVEL MAPPING ABOVE |
| 16783–16789 | [11] APPLICATION — App() | SEE SECTION-LEVEL MAPPING ABOVE |
| 16790–17374 | [06] STATE STORE — destructure dari custom hook | SEE SECTION-LEVEL MAPPING ABOVE |
| 17375–17532 | 12 · COMPLIANCE ENGINE — title/keyword sanitation & policy checks (pure) | SEE SECTION-LEVEL MAPPING ABOVE |
| 17533–17620 | 12 · METADATA VALIDATION — post-build metadata compliance stage | SEE SECTION-LEVEL MAPPING ABOVE |
| 17621–18641 | 12 · METADATA ENGINE V2 — Keyword Normalization + Expansion | SEE SECTION-LEVEL MAPPING ABOVE |
| 18642–28416 | 11 · QUALITY ENGINE — AI preflight analysis & title similarity scoring | SEE SECTION-LEVEL MAPPING ABOVE |

**Audit rule:** the union of the ranges above covers the source from line 1 through line 28,416. Any future source addition must create a new mapping range before being considered refactorable.

---

# APPENDIX B — COMPLETE TOP-LEVEL DECLARATION INVENTORY

This inventory is generated from the actual Canvas source using top-level declaration detection. It is an accounting aid, not a claim that each declaration must remain a one-function/one-file copy. Nested locals inside `App()` are covered by the UI/application ownership map.

| Line | Symbol | Source declaration | Default mapped destination |
|---:|---|---|---|
| 113 | `ASSET_TYPE_PRESETS` | `export const ASSET_TYPE_PRESETS = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 166 | `ICON_MASTER_NEGATIVE_PROMPT` | `export const ICON_MASTER_NEGATIVE_PROMPT =` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 175 | `ICON_STYLE_PRESETS` | `export const ICON_STYLE_PRESETS = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 452 | `ICON_SHEET_EXTRA_NEGATIVE` | `export const ICON_SHEET_EXTRA_NEGATIVE =` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 462 | `sanitizeIconThemeInput` | `const sanitizeIconThemeInput = (text = '') =>` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 471 | `sanitizeVisualPromptInput` | `const sanitizeVisualPromptInput = (text = '') =>` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 480 | `extractLeadingIconCount` | `const extractLeadingIconCount = (text = '') => {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 492 | `COMMERCIAL_ILLUSTRATION_STYLES` | `export const COMMERCIAL_ILLUSTRATION_STYLES = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 499 | `STYLES_BY_ASSET_TYPE` | `export const STYLES_BY_ASSET_TYPE = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 517 | `ADOBE_CATEGORY_TAXONOMY` | `export const ADOBE_CATEGORY_TAXONOMY = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 548 | `MICROSTOCK_PLATFORMS` | `export const MICROSTOCK_PLATFORMS = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 589 | `DEFAULT_PLATFORM` | `export const DEFAULT_PLATFORM = 'adobe_stock';` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 602 | `OFFICIAL_TO_DNA_MAP` | `export const OFFICIAL_TO_DNA_MAP: Record<string, Record<number, { default: string; alternatives?: string[] }>> = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 632 | `resolveDNAFromOfficial` | `function resolveDNAFromOfficial(platform: string, categoryId: number \| null, subcategoryHint: string = ''): string {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 642 | `DNA_TO_OFFICIAL_MAP` | `export const DNA_TO_OFFICIAL_MAP: Record<string, Record<string, number>> = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 665 | `PlatformAdapter` | `interface PlatformAdapter {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 685 | `ADOBE_ADAPTER` | `const ADOBE_ADAPTER: PlatformAdapter = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 732 | `FREEPIK_ADAPTER` | `const FREEPIK_ADAPTER: PlatformAdapter = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 758 | `PLATFORM_ADAPTERS` | `export const PLATFORM_ADAPTERS: Record<string, PlatformAdapter> = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 763 | `ASSET_TYPE_META` | `const ASSET_TYPE_META = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 777 | `PLATFORM_POLICY` | `const PLATFORM_POLICY = Object.freeze({` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 801 | `getPlatformSubmissionPolicy` | `function getPlatformSubmissionPolicy(platform) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 807 | `evaluatePlatformSubmissionReadiness` | `function evaluatePlatformSubmissionReadiness({ asset = {}, platform, metadata = {}, similarity = null }: any) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 841 | `METADATA_POLICY` | `const METADATA_POLICY = Object.freeze({` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 870 | `METADATA_RULES` | `const METADATA_RULES = {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 898 | `SEO_CONFIG` | `export const SEO_CONFIG = {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 927 | `SEO_COMMON_PHRASES` | `export const SEO_COMMON_PHRASES = new Set([` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 943 | `SPAM_TERMS` | `export const SPAM_TERMS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 952 | `GENERATION_MODES` | `export const GENERATION_MODES = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 958 | `BATCH_TIERS` | `export const BATCH_TIERS = [5, 10, 15, 20];` | src/modules/studio/domain/production/ + application orchestration |
| 959 | `MAX_BATCH_COUNT` | `export const MAX_BATCH_COUNT = 20;` | src/modules/studio/domain/production/ + application orchestration |
| 960 | `GENERATE_METADATA_STEPS` | `export const GENERATE_METADATA_STEPS = [` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 971 | `ICON_GENERATION_MODES` | `export const ICON_GENERATION_MODES = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 979 | `ICON_GRID_OPTIONS` | `const ICON_GRID_OPTIONS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 993 | `TEXT_MODELS` | `const TEXT_MODELS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 1006 | `IMAGE_MODELS` | `const IMAGE_MODELS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 1018 | `STATUS_CONFIG` | `export const STATUS_CONFIG = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 1029 | `FILTER_STATUS_ORDER` | `export const FILTER_STATUS_ORDER = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 1040 | `SUBMITTABLE_STATUSES` | `const SUBMITTABLE_STATUSES = ['metadata_ready', 'ready', 'needs_review', 'rejected'];` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 1041 | `CSV_EXPORT_STATUSES` | `const CSV_EXPORT_STATUSES = ['metadata_ready', 'ready', 'exported'];` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 1043 | `SUBMITTABLE_FROM_EXPORT` | `const SUBMITTABLE_FROM_EXPORT = ['exported', 'metadata_ready', 'ready'];` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 1060 | `SUBJECT_TYPES` | `export const SUBJECT_TYPES = [` | src/modules/studio/registry/composition-pools.ts (M13 inc-4) |
| 1103 | `CAMERA_ANGLES` | `export const CAMERA_ANGLES = [` | src/modules/studio/registry/composition-pools.ts (M13 inc-4) |
| 1112 | `ACTIVITY_CONTEXTS` | `export const ACTIVITY_CONTEXTS = [` | src/modules/studio/registry/composition-pools.ts (M13 inc-4) |
| 1122 | `FRAMING_STYLES` | `export const FRAMING_STYLES = [` | src/modules/studio/registry/composition-pools.ts (M13 inc-4) |
| 1131 | `createCompositionSession` | `function createCompositionSession() {` | src/modules/studio/domain/composition/composition-session.ts (M13 inc-4) |
| 1139 | `generateDynamicSlot` | `function generateDynamicSlot(compSession) {` | src/modules/studio/domain/composition/dynamic-slots.ts (M13 inc-4) |
| 1160 | `getBatchSlots` | `function getBatchSlots(count) {` | src/modules/studio/domain/composition/dynamic-slots.ts (M13 inc-4) |
| 1170 | `getBatchSlotsAI` | `async function getBatchSlotsAI(count, baseInput, systemSettings) {` | src/modules/studio/domain/composition/dynamic-slots.ts (M13 inc-4; provider call injected — keyless-retry drift retired) |
| 1247 | `PREFLIGHT_ITEMS` | `export const PREFLIGHT_ITEMS = [` | src/modules/studio/domain/compliance/ + registry rules |
| 1268 | `BRAND_IP_BLOCKLIST` | `export const BRAND_IP_BLOCKLIST = [` | src/modules/studio/domain/compliance/ + registry rules |
| 1282 | `GOVERNMENT_AGENCY_BLOCKLIST` | `export const GOVERNMENT_AGENCY_BLOCKLIST = [` | src/modules/studio/domain/compliance/ + registry rules |
| 1295 | `ARTIST_STYLE_REFERENCE_PATTERN` | `const ARTIST_STYLE_REFERENCE_PATTERN =` | src/modules/studio/domain/compliance/ + registry rules |
| 1302 | `matchesBlockedTerm` | `function matchesBlockedTerm(text: string, term: string): boolean {` | src/modules/studio/domain/compliance/ + registry rules |
| 1311 | `checkBrandSafety` | `const checkBrandSafety = (text) => {` | src/modules/studio/domain/compliance/ + registry rules |
| 1338 | `NEWS_EVENT_MARKERS` | `const NEWS_EVENT_MARKERS = [` | src/modules/studio/domain/compliance/ + registry rules |
| 1352 | `SENSITIVE_CONTENT_MARKERS` | `const SENSITIVE_CONTENT_MARKERS = [` | src/modules/studio/domain/compliance/ + registry rules |
| 1363 | `METADATA_NEWS_MARKERS` | `const METADATA_NEWS_MARKERS = [` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 1373 | `NEWS_SAFE_CATEGORIES` | `const NEWS_SAFE_CATEGORIES = new Set([` | src/modules/studio/domain/compliance/ + registry rules |
| 1379 | `detectNewsEvent` | `const detectNewsEvent = (text, category = '') => {` | src/modules/studio/domain/compliance/ + registry rules |
| 1398 | `detectSensitiveContent` | `const detectSensitiveContent = (text) => {` | src/modules/studio/domain/compliance/ + registry rules |
| 1415 | `CONTENT_SAFETY_RULES` | `const CONTENT_SAFETY_RULES = [` | src/modules/studio/domain/compliance/ + registry rules |
| 1421 | `tailwindStyles` | `export const tailwindStyles = `` | **CORRECTED (M13): shared UI styles/tokens (ADAPT)** — this is a styling constant, not a compliance rule; it must not live under domain/compliance. See §UI/Application style-token mapping |
| 1560 | `DB_NAME` | `const DB_NAME = 'ImaginDB_VectorMicrostock_v34';` | src/modules/studio/domain/compliance/ + registry rules |
| 1565 | `initDB` | `const initDB = () => new Promise((resolve, reject) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1584 | `_dbInstance` | `let _dbInstance = null;` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1585 | `getDB` | `const getDB = async () => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1596 | `dbOp` | `const dbOp = async (store, mode, fn) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1616 | `saveAssetDB` | `const saveAssetDB = (a) => dbOp('assets', 'readwrite', s => s.put(a));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1617 | `getAssetsDB` | `const getAssetsDB = async () => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1626 | `deleteAssetDB` | `const deleteAssetDB = (id) => dbOp('assets', 'readwrite', s => s.delete(id));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1628 | `saveHistoryLog` | `const saveHistoryLog = (h) => dbOp('history', 'readwrite', s => s.put(h));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1629 | `getHistoryDB` | `const getHistoryDB = async () => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1672 | `saveQAResultDB` | `const saveQAResultDB = (qa) => dbOp('qa_results', 'readwrite', s => s.put(qa));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1677 | `saveComplianceResultDB` | `const saveComplianceResultDB = (c) => dbOp('compliance_results', 'readwrite', s => s.put(c));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1682 | `saveFeedbackDB` | `const saveFeedbackDB = (f) => dbOp('feedback', 'readwrite', s => s.put(f));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1683 | `getFeedbackDB` | `const getFeedbackDB = async () => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1692 | `getFeedbackForAssetDB` | `const getFeedbackForAssetDB = async (assetId) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1696 | `deleteFeedbackDB` | `const deleteFeedbackDB = (feedbackId) => dbOp('feedback', 'readwrite', s => s.delete(feedbackId));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1700 | `feedbackEngine` | `const feedbackEngine = {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1729 | `getDiversityTrackerDB` | `const getDiversityTrackerDB = async (categoryKey) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1733 | `markDiversityUsedDB` | `const markDiversityUsedDB = async (categoryKey, signatures) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1747 | `ImaginProject` | `interface ImaginProject {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1759 | `createProject` | `const createProject = (name = 'Untitled Project', settings = {}) => ({` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1771 | `saveProjectDB` | `const saveProjectDB = (p) => dbOp('projects', 'readwrite', s => s.put(p));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1772 | `getProjectsDB` | `const getProjectsDB = async (includeArchived = false) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1785 | `getProjectDB` | `const getProjectDB = async (projectId) => dbOp('projects', 'readonly', s => s.get(projectId));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1786 | `deleteProjectDB` | `const deleteProjectDB = (projectId) => dbOp('projects', 'readwrite', s => s.delete(projectId));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1789 | `projectEngine` | `const projectEngine = {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1832 | `saveJobDB` | `const saveJobDB = (j) => dbOp('jobs', 'readwrite', s => s.put(j));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1833 | `normalizeJobRecord` | `const normalizeJobRecord = (job) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1844 | `getJobsDB` | `const getJobsDB = async (includeFinished = false) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1860 | `getJobDB` | `const getJobDB = async (jobId) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1864 | `deleteJobDB` | `const deleteJobDB = (jobId) => dbOp('jobs', 'readwrite', s => s.delete(jobId));` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1868 | `jobEngine` | `const jobEngine = {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1894 | `updateJobItemInTransaction` | `const updateJobItemInTransaction = (jobId, itemId, patch, stage = '') => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1940 | `createStableId` | `const createStableId = (prefix = 'id') => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1956 | `createProductionJob` | `const createProductionJob = ({ jobId, request, total, batchId, batchSessionId, concurrency = 1, items = [] }) => ({` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1975 | `logItemStage` | `const logItemStage = (jobId, itemId, stage, ctx) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 1995 | `updateJobItemStatus` | `const updateJobItemStatus = async (jobId, itemId, patch) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2007 | `updateJobItemWithStage` | `const updateJobItemWithStage = async (jobId, itemId, stage, patch = {}) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2019 | `selectionReducer` | `const selectionReducer = (prev: Set<string>, action: { type: 'toggle' \| 'add' \| 'remove' \| 'clear' \| 'set'; id?: string; ids?: string[] }) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2043 | `assetsReducer` | `const assetsReducer = (prev: any[], action: { type: 'upsert' \| 'remove' \| 'patchMany' \| 'patch'; asset?: any; id?: string; patch?: any; ids?: string[] }) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2063 | `batchQueueReducer` | `const batchQueueReducer = (prev: any, action: { type: 'completed' \| 'failed' \| 'reset' \| 'patch'; count?: number; patch?: any }) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2078 | `SYSTEM_DEFAULT_SETTINGS` | `const SYSTEM_DEFAULT_SETTINGS = {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2100 | `AssetStatus` | `type AssetStatus = 'draft' \| 'processing' \| 'metadata_ready' \| 'ready' \| 'needs_review' \| 'rejected' \| 'exported' \| 'submitted' \| 'FAILED';` | src/modules/*/state/ (split by owner) |
| 2101 | `AssetType` | `type AssetType = 'vector' \| 'illustration' \| '3d' \| 'photo';` | src/modules/*/state/ (split by owner) |
| 2103 | `PeopleAnalysis` | `interface PeopleAnalysis {` | src/modules/*/state/ (split by owner) |
| 2112 | `StockMetadata` | `interface StockMetadata {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 2157 | `Asset` | `interface Asset {` | src/modules/*/state/ (split by owner) |
| 2190 | `VectorState` | `interface VectorState {` | src/modules/*/state/ (split by owner) |
| 2226 | `SystemSettings` | `interface SystemSettings {` | src/modules/*/state/ (split by owner) |
| 2243 | `ComplianceResult` | `interface ComplianceResult {` | src/modules/*/state/ (split by owner) |
| 2259 | `SimilarityResult` | `interface SimilarityResult {` | src/modules/*/state/ (split by owner) |
| 2273 | `ResolvedProductionConfig` | `interface ResolvedProductionConfig {` | src/modules/*/state/ (split by owner) |
| 2295 | `SVGStats` | `interface SVGStats {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 2304 | `AssetLineage` | `interface AssetLineage {` | src/modules/*/state/ (split by owner) |
| 2354 | `ProductionItemStatus` | `type ProductionItemStatus = 'queued' \| 'running' \| 'completed' \| 'failed' \| 'skipped' \| 'rejected';` | src/modules/*/state/ (split by owner) |
| 2357 | `ProductionJobStatus` | `type ProductionJobStatus = 'queued' \| 'running' \| 'paused' \| 'completed' \| 'failed' \| 'cancelled';` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2361 | `GenerationRequest` | `interface GenerationRequest {` | src/modules/*/state/ (split by owner) |
| 2395 | `IntentLockLevel` | `type IntentLockLevel = 'required' \| 'preferred' \| 'suggested';` | src/modules/*/state/ (split by owner) |
| 2396 | `IntentResolutionStatus` | `type IntentResolutionStatus = 'resolved' \| 'custom' \| 'unresolved';` | src/modules/*/state/ (split by owner) |
| 2398 | `SemanticRequirement` | `interface SemanticRequirement {` | src/modules/*/state/ (split by owner) |
| 2404 | `SubjectIntent` | `interface SubjectIntent {` | src/modules/*/state/ (split by owner) |
| 2411 | `AssetIntent` | `interface AssetIntent {` | src/modules/*/state/ (split by owner) |
| 2418 | `StyleIntent` | `interface StyleIntent {` | src/modules/*/state/ (split by owner) |
| 2426 | `BackgroundIntent` | `interface BackgroundIntent {` | src/modules/*/state/ (split by owner) |
| 2431 | `ColorIntent` | `interface ColorIntent {` | src/modules/*/state/ (split by owner) |
| 2437 | `ProductionConstraints` | `interface ProductionConstraints {` | src/modules/*/state/ (split by owner) |
| 2442 | `ConstraintConflict` | `interface ConstraintConflict {` | src/modules/*/state/ (split by owner) |
| 2448 | `ConstraintResult` | `interface ConstraintResult {` | src/modules/*/state/ (split by owner) |
| 2455 | `CanonicalProductionIntent` | `interface CanonicalProductionIntent {` | src/modules/*/state/ (split by owner) |
| 2472 | `ProductionItem` | `interface ProductionItem {` | src/modules/*/state/ (split by owner) |
| 2496 | `ProductionJob` | `interface ProductionJob {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 2516 | `QAIssue` | `interface QAIssue {` | src/modules/*/state/ (split by owner) |
| 2530 | `RegenerationRecommendation` | `interface RegenerationRecommendation {` | src/modules/*/state/ (split by owner) |
| 2542 | `QAResult` | `interface QAResult {` | src/modules/*/state/ (split by owner) |
| 2566 | `QAItemVerdict` | `interface QAItemVerdict {` | src/modules/*/state/ (split by owner) |
| 2576 | `Feedback` | `interface Feedback {` | src/modules/*/state/ (split by owner) |
| 2592 | `Metadata` | `interface Metadata {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 2611 | `ExportPackage` | `interface ExportPackage {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 2627 | `GenerationResult` | `interface GenerationResult {` | src/modules/*/state/ (split by owner) |
| 2646 | `PAGE_SIZE` | `const PAGE_SIZE = 50;` | src/modules/*/state/ (split by owner) |
| 2648 | `INITIAL_VECTOR_STATE` | `const INITIAL_VECTOR_STATE: VectorState = {` | src/modules/*/state/ (split by owner) |
| 2703 | `GLOBAL_DNA` | `export const GLOBAL_DNA = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 2756 | `STYLE_PRESET_DNA` | `export const STYLE_PRESET_DNA = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 3232 | `CATEGORY_DNA` | `export const CATEGORY_DNA = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5018 | `pickRandom` | `const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5020 | `createDNATracker` | `function createDNATracker(preloadKeys = []) {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5040 | `loadDiversityTracker` | `async function loadDiversityTracker(categoryKey) {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5045 | `genDNASignature` | `function genDNASignature(subject, macro, scene, microKey, micro, motif = null) {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5051 | `buildDNAContext` | `function buildDNAContext(categoryKey, subcategoryKey, tracker, skipSubject = false, styleName = '', selectedSubject = null, selectedScene = null, batchDiversity = null, clusterPlan` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5199 | `buildCommercialRules` | `function buildCommercialRules(categoryKey, subcategoryKey = '', assetType = '') {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 5255 | `STYLE_PRESET_MAP` | `const STYLE_PRESET_MAP = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5307 | `findStylePreset` | `function findStylePreset(styleName) {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5312 | `buildStyleGuidance` | `function buildStyleGuidance(styleName) {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5329 | `GENERIC_OBJECT_DNA` | `const GENERIC_OBJECT_DNA = {` | src/modules/studio/domain/dna/ or src/modules/studio/registry/dna/ |
| 5343 | `CATEGORY_NEGATIVE_HINTS` | `export const CATEGORY_NEGATIVE_HINTS = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 5368 | `buildCategoryNegativeHints` | `function buildCategoryNegativeHints(categoryKey) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 5385 | `MARKET_DEMAND` | `const MARKET_DEMAND = {` | src/modules/studio/registry/market-*/ (post-parity intelligence input) |
| 5489 | `getBuyerTermsForCategory` | `const getBuyerTermsForCategory = (categoryKey) => {` | src/modules/studio/registry/market-*/ (post-parity intelligence input) |
| 5504 | `MARKET_PALETTES` | `const MARKET_PALETTES = {` | src/modules/studio/registry/market-*/ (post-parity intelligence input) |
| 5530 | `getPaletteForCategory` | `const getPaletteForCategory = (categoryKey) => {` | src/modules/studio/registry/market-*/ (post-parity intelligence input) |
| 5555 | `CATEGORY_QUALITY_RULES` | `const CATEGORY_QUALITY_RULES = {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 5627 | `buildCategoryQualityInstruction` | `function buildCategoryQualityInstruction(categoryKey) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 5657 | `QUALITY_GATE` | `const QUALITY_GATE = {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 5682 | `reasonCodeForIssue` | `function reasonCodeForIssue(issueText) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 5708 | `buildRegenerationRecommendation` | `function buildRegenerationRecommendation(reasonCode, analysis) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 5742 | `buildQualityGateResult` | `function buildQualityGateResult({ assetId, decision, score, issues = [], analysis = null, qaIssues = [], qaVersion = TECHNICAL_QA.QA_VERSION }) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 5878 | `GLOBAL_CGA_DATABASE` | `export const GLOBAL_CGA_DATABASE = (() => {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 6121 | `MUTATION_FOCUS_BANK` | `export const MUTATION_FOCUS_BANK = [` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 6129 | `COLOR_ACCENT_PALETTES` | `export const COLOR_ACCENT_PALETTES = [` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 6137 | `createBatchSession` | `function createBatchSession() {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 6162 | `DEFAULT_BATCH_RULES` | `const DEFAULT_BATCH_RULES = { sameSubcategoryMax: 2, identicalPaletteMax: 2 };` | src/modules/studio/domain/production/ + application orchestration |
| 6164 | `getBatchRules` | `function getBatchRules(categoryKey) {` | src/modules/studio/domain/production/ + application orchestration |
| 6169 | `createBatchDiversitySession` | `function createBatchDiversitySession() {` | src/modules/studio/domain/production/ + application orchestration |
| 6177 | `pickWithBatchLimit` | `function pickWithBatchLimit(pool, counts, max, label) {` | src/modules/studio/domain/production/ + application orchestration |
| 6190 | `pickUnique` | `function pickUnique(pool, usedSet) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 6216 | `PRODUCTION_POLICY` | `const PRODUCTION_POLICY = {` | src/modules/studio/domain/production/ + application orchestration |
| 6228 | `classifyAssetReadiness` | `function classifyAssetReadiness(asset) {` | src/modules/studio/domain/production/ + application orchestration |
| 6268 | `computeSubmissionReadiness` | `function computeSubmissionReadiness(allAssets, batchId = null) {` | src/modules/studio/domain/production/ + application orchestration |
| 6288 | `readyRatioCouldExport` | `function readyRatioCouldExport(total, ready) {` | src/modules/studio/domain/production/ + application orchestration |
| 6315 | `planConceptClusters` | `function planConceptClusters(batchSize, categoryKey, subcategoryKey, selectedSubject = null) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 6335 | `buildStrongExclusionInstruction` | `function buildStrongExclusionInstruction(countryObj) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 6347 | `buildCGAContext` | `function buildCGAContext(promptText, iterationIndex, session) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 6430 | `isSpecificUserInput` | `function isSpecificUserInput(text) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 6447 | `buildNegativePrompt` | `function buildNegativePrompt(baseNeg, categoryKey, styleName, archetype, cgaNegatives, subcategoryNeg = '', assetType = '') {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 6484 | `BACKGROUND_STRATEGY` | `const BACKGROUND_STRATEGY = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6507 | `BackgroundStrategyKey` | `type BackgroundStrategyKey = keyof typeof BACKGROUND_STRATEGY;` | SEE SECTION-LEVEL MAPPING ABOVE |
| 6509 | `CATEGORY_BACKGROUND_STRATEGY` | `const CATEGORY_BACKGROUND_STRATEGY: Record<string, BackgroundStrategyKey> = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6534 | `SUBCATEGORY_BACKGROUND_OVERRIDE` | `const SUBCATEGORY_BACKGROUND_OVERRIDE: Record<string, Record<string, BackgroundStrategyKey>> = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6561 | `ASSET_TYPE_DEFAULT_BACKGROUND` | `const ASSET_TYPE_DEFAULT_BACKGROUND: Record<string, string> = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6568 | `ResolvedBackground` | `interface ResolvedBackground {` | src/modules/studio/domain/resolution/ |
| 6574 | `resolveBackground` | `function resolveBackground(` | src/modules/studio/domain/resolution/ |
| 6648 | `createInitialVectorState` | `const createInitialVectorState = () => ({` | src/modules/*/state/ (split by owner) |
| 6654 | `createIdleBatchQueue` | `const createIdleBatchQueue = () => ({ isRunning: false, isPaused: false, currentIndex: 0, total: 0, completed: 0, failed: 0, phase: 'idle', sessionId: null, batchId: null });` | src/modules/*/state/ (split by owner) |
| 6656 | `BATCH_RESUME_KEY` | `const BATCH_RESUME_KEY = 'imagin_batch_resume_v1';` | src/modules/*/state/ (split by owner) |
| 6665 | `buildDraftStockMetadata` | `const buildDraftStockMetadata = ({ assetType, background, outputFormat = 'PNG', stockCategory = '', subcategory = '' }) => ({` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 6701 | `createDraftStockMetadata` | `const createDraftStockMetadata = (args) => buildDraftStockMetadata(args);` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 6712 | `fetchRetryNotifier` | `let fetchRetryNotifier = null;` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6713 | `setFetchRetryNotifier` | `const setFetchRetryNotifier = (fn) => { fetchRetryNotifier = fn; };` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6715 | `fetchWithRetry` | `const fetchWithRetry = async (url, options, maxRetries = 3, timeoutMs = 60000) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6752 | `createGeminiTraceId` | `const createGeminiTraceId = () => createStableId('gemini');` | **CORRECTED (M13): AI trace/infrastructure (ADAPT)** — generic AI trace helper co-located with transport code (`geminiTransportRequest`), not Vectorize-owned; Local owner = electron/services/ai/ + src/shared/events trace ids |
| 6754 | `geminiTransportRequest` | `const geminiTransportRequest = async ({` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6803 | `countPreflightPassed` | `const countPreflightPassed = (checks, sm = {}) =>` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6809 | `aspectRatioToCss` | `const aspectRatioToCss = (ratio) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6816 | `RESOLUTION_POLICY` | `const RESOLUTION_POLICY = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6842 | `RESOLUTION_TARGETS` | `const RESOLUTION_TARGETS = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6846 | `DEFAULT_RESOLUTION_TARGET` | `const DEFAULT_RESOLUTION_TARGET = '4k';` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6848 | `getResolutionTarget` | `const getResolutionTarget = (target) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6852 | `getFormatResolutionPolicy` | `const getFormatResolutionPolicy = (format = 'PNG', resolutionTarget = DEFAULT_RESOLUTION_TARGET) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6880 | `minShortSideForMegapixels` | `const minShortSideForMegapixels = (aspectRatio, megapixels) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6887 | `megapixelsOf` | `const megapixelsOf = (width, height) => (width * height) / 1e6;` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6889 | `dimensionsForMegapixels` | `const dimensionsForMegapixels = (width, height, megapixels) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 6899 | `SUBJECT_TIER_MAP` | `const SUBJECT_TIER_MAP: Record<string, 'red' \| 'yellow' \| 'green'> = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6933 | `STYLE_DIFFERENTIATORS` | `const STYLE_DIFFERENTIATORS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6942 | `COMPOSITION_DIFFERENTIATORS` | `const COMPOSITION_DIFFERENTIATORS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6950 | `CONTEXT_DIFFERENTIATORS` | `const CONTEXT_DIFFERENTIATORS = [` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 6958 | `analyzePromptDifferentiation` | `const analyzePromptDifferentiation = (prompt: string): {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 7028 | `fileSizeKBFromDataUrl` | `const fileSizeKBFromDataUrl = (dataUrl) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 7045 | `resolveExportFormat` | `const resolveExportFormat = ({ assetType, background, iconMode, outputFormat, explicit }) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 7065 | `ASSET_PROFILE_SUBKEYWORD_MAP` | `const ASSET_PROFILE_SUBKEYWORD_MAP = [` | src/modules/studio/domain/resolution/ |
| 7075 | `resolveAssetProfile` | `const resolveAssetProfile = ({ assetType, category, subcategory, iconMode }) => {` | src/modules/studio/domain/resolution/ |
| 7091 | `buildResolvedConfig` | `const buildResolvedConfig = ({ vectorState, resolvedBg }) => {` | src/modules/studio/domain/resolution/ |
| 7110 | `resolvePlatform` | `const resolvePlatform = (platformKey) => {` | src/modules/studio/domain/resolution/ |
| 7121 | `resolveCategory` | `const resolveCategory = ({ platform, platformCategoryId, adobeCategory, internalCategory, subcategory }) => {` | src/modules/studio/domain/resolution/ |
| 7137 | `resolveStyle` | `const resolveStyle = (styleName) => {` | src/modules/studio/domain/resolution/ |
| 7144 | `resolveCompatibility` | `const resolveCompatibility = ({ assetType, iconMode }) => {` | src/modules/studio/domain/resolution/ |
| 7155 | `resolveAll` | `const resolveAll = ({ vectorState, resolvedBg }) => {` | src/modules/studio/domain/resolution/ |
| 7209 | `getImageDimensions` | `const getImageDimensions = (dataUrl) => new Promise((resolve) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7232 | `_dHashCache` | `const _dHashCache = new Map();` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7233 | `computeDHash` | `const computeDHash = (dataUrl) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7285 | `HASH_BITS` | `const HASH_BITS = 72;` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7286 | `hammingDistance` | `const hammingDistance = (hexA, hexB) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7306 | `_contentHashCache` | `const _contentHashCache = new Map();` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7307 | `computeContentHash` | `const computeContentHash = async (dataUrl) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7326 | `_pHashCache` | `const _pHashCache = new Map();` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7327 | `computePHash` | `const computePHash = (dataUrl) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7373 | `hammingDistanceNormalized` | `const hammingDistanceNormalized = (hexA, hexB) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7386 | `_colorHistCache` | `const _colorHistCache = new Map();` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7387 | `computeColorHistogram` | `const computeColorHistogram = (dataUrl) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7412 | `histogramSimilarity` | `const histogramSimilarity = (a, b) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7423 | `computeVisualSimilarity` | `const computeVisualSimilarity = async (dataUrlA, dataUrlB) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7440 | `SHARPNESS` | `const SHARPNESS = {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7446 | `assessSharpness` | `const assessSharpness = (dataUrl) => new Promise((resolve) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7490 | `TECHNICAL_QA` | `const TECHNICAL_QA = {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7526 | `assessTechnicalQuality` | `const assessTechnicalQuality = (dataUrl, styleKey = '') => new Promise((resolve) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7727 | `scoreSharpness` | `function scoreSharpness(variance) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 7740 | `detectWatermark` | `const detectWatermark = (dataUrl, aiSignal) => new Promise((resolve) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 7910 | `UPSCALE_JPEG_QUALITY` | `const UPSCALE_JPEG_QUALITY = 0.94;` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 7912 | `autoUpscaleImage` | `const autoUpscaleImage = async (dataUrl, targetShortSide = RESOLUTION_POLICY.RECOMMENDED_SHORT_SIDE, assetType = 'vector', forceScale = false, maxMegapixels = RESOLUTION_POLICY.MAX` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8025 | `verifyBackgroundUniformity` | `const verifyBackgroundUniformity = (ctx, width, height, tolerance = 12) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8053 | `processGeneratedImage` | `const processGeneratedImage = (base64Data, bgMode, outputFormat = 'PNG', assetType = 'vector', styleKey = '') => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8128 | `finalizeAsset` | `const finalizeAsset = async (rawImageUrl, bgMode, assetType = 'vector', upscaleMode = 'auto', aspectRatio = '4:3', outputFormat = 'PNG', styleKey = '', resolutionTarget = DEFAULT_R` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8200 | `removeBackground3Layer` | `const removeBackground3Layer = (ctx, width, height, assetType = 'vector', styleKey = '') => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8520 | `toDataURL` | `const toDataURL = async (url) => {` | src/shared/utils/ or electron/services/ai/ (see section map) |
| 8545 | `validateImportedJSON` | `const validateImportedJSON = (raw) => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8652 | `resolvePromptDefaults` | `const resolvePromptDefaults = (prompt, defaults = {}) => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8665 | `platform` | `const platform = prompt.platform ?? defaults.platform ?? DEFAULT_PLATFORM;` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8666 | `rawPlatformCategoryId` | `const rawPlatformCategoryId = prompt.platformCategoryId ?? defaults.platformCategoryId ?? null;` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8671 | `rawSubcategoryHint` | `const rawSubcategoryHint = prompt.subcategory ?? defaults.subcategory ?? '';` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8672 | `rawCategory` | `const rawCategory = (` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8677 | `adobeCategory` | `const adobeCategory = ADOBE_CATEGORY_TAXONOMY[rawCategory] ? rawCategory : 'Business';` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8678 | `internalCategory` | `const internalCategory = adobeCategory; // alias — di batch JSON keduanya sama` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8681 | `platformCategoryId` | `const platformCategoryId = rawPlatformCategoryId` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 8743 | `deriveSidebarStage` | `const deriveSidebarStage = ({ importedBatch, isRenderingAssets, batchQueue }) => {` | src/modules/studio/domain/production/ + application orchestration |
| 8786 | `buildCanonicalProductionPlan` | `function buildCanonicalProductionPlan(config) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8843 | `runProductionPipeline` | `async function runProductionPipeline(config, callbacks) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 8899 | `resolveStyleKeyFromVision` | `const resolveStyleKeyFromVision = (vision, assetType, isPattern) => {` | src/modules/studio/domain/resolution/ |
| 8988 | `resolveReferenceGenerationSettings` | `const resolveReferenceGenerationSettings = (vision = {}, platform = DEFAULT_PLATFORM) => {` | src/modules/studio/domain/resolution/ |
| 9056 | `ContentResearchPanel` | `const ContentResearchPanel = ({ results, isResearching, onClose }: {` | src/modules/*/ui/ or src/app/ (see section map) |
| 9173 | `ErrorBoundary` | `class ErrorBoundary extends React.Component {` | src/modules/*/ui/ or src/app/ (see section map) |
| 9209 | `useImaginStateStore` | `function useImaginStateStore() {` | src/modules/*/state/ (split by owner) |
| 9393 | `loadJSZip` | `const loadJSZip = async () => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9415 | `IMAGETRACER_CDN` | `const IMAGETRACER_CDN = 'https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/imagetracer_v1.2.6.js';` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9417 | `SVGComplexity` | `type SVGComplexity = 'low' \| 'medium' \| 'high' \| 'very_high';` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9419 | `TracePreset` | `interface TracePreset {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9427 | `TRACE_COMPLEXITY_PRESETS` | `const TRACE_COMPLEXITY_PRESETS: Record<SVGComplexity, TracePreset> = {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9434 | `TRACE_EXPORT_PRESETS` | `const TRACE_EXPORT_PRESETS = {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9441 | `LINE_QUALITY_PARAMS` | `const LINE_QUALITY_PARAMS = {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9454 | `ICON_STYLE_TRACE_PRESETS` | `const ICON_STYLE_TRACE_PRESETS: Record<string, { complexity: SVGComplexity; options: { preset: string; drawStyle: string; lineQuality: string; groupBy: string; gapFiller: boolean; ` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9468 | `imagetracerPromise` | `let imagetracerPromise = null;` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9470 | `loadImageTracer` | `const loadImageTracer = () => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9487 | `isSvgTraceable` | `const isSvgTraceable = (asset) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9494 | `computeSVGStats` | `const computeSVGStats = (svg, engine, width, height, elapsedMs) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9499 | `normalizeSvgArtboardForAdobe` | `const normalizeSvgArtboardForAdobe = (svg, sourceWidth, sourceHeight) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9529 | `svgDataUrlFromString` | `const svgDataUrlFromString = (svg) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9535 | `triggerDownload` | `const triggerDownload = (dataUrl, filename) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9547 | `assetFileExt` | `const assetFileExt = (a) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9559 | `loadImageElement` | `const loadImageElement = (src) => new Promise((resolve, reject) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9568 | `legacyBlockTrace` | `const legacyBlockTrace = async (dataUrl, complexity) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 9662 | `makeRng` | `const makeRng = (seed) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9672 | `rgbDist2` | `const rgbDist2 = (a, b) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9680 | `quantizeKMeans` | `const quantizeKMeans = (img, nColors) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9818 | `stripWhiteBackground` | `const stripWhiteBackground = (img) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9872 | `cleanAlpha` | `const cleanAlpha = (img, threshold = 128) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9918 | `matteOuterEdgeFromBackground` | `const matteOuterEdgeFromBackground = (img) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 9954 | `smoothTraceMask` | `const smoothTraceMask = (img, sigma = 1.2) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10005 | `defringeEdgeColors` | `const defringeEdgeColors = (img) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10034 | `medianFilter` | `const medianFilter = (img) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10056 | `otsuThreshold` | `const otsuThreshold = (img) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10087 | `quantizeGrayscaleIcon` | `const quantizeGrayscaleIcon = (img, transparentBackground) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10107 | `isNearGrayscale` | `const isNearGrayscale = (img) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10120 | `blurLight` | `const blurLight = (img, sigma) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10156 | `preprocessForTrace` | `const preprocessForTrace = (img, opts, complexityColors) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10243 | `upgradeLSegmentsToBezier` | `const upgradeLSegmentsToBezier = (svgString: string, alpha = 0.5): string => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10415 | `traceBitmapBWtoSVG` | `const traceBitmapBWtoSVG = (imageData: ImageData, width: number, height: number): string \| null => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10559 | `BW_BITMAP_STYLES` | `const BW_BITMAP_STYLES = new Set(['black_outline', 'glyph', 'outline']);` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10564 | `circlifyTracedPaths` | `const circlifyTracedPaths = (svgString) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10625 | `traceAssetToSVG` | `const traceAssetToSVG = async (dataUrl, complexity, traceOptions = null, onProgress = null, styleKey = '') => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10737 | `stripArtboardBackgrounds` | `const stripArtboardBackgrounds = (svgString) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10810 | `injectGapFiller` | `const injectGapFiller = (svgString, strokeWidth) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10857 | `svgDataUrlToStr` | `const svgDataUrlToStr = (payload, isB64) => isB64` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10860 | `svgStrToBase64` | `const svgStrToBase64 = (s) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10868 | `applyBackgroundToSvgDataUrl` | `const applyBackgroundToSvgDataUrl = (svgDataUrl, bgMode, bgColor = '#ffffff') => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 10917 | `resolveReleasesValue` | `const resolveReleasesValue = (asset) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 10939 | `getCsvMetadataEligibility` | `const getCsvMetadataEligibility = (asset) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 10996 | `exportMetadataCSV` | `const exportMetadataCSV = (items, showToast, setAssets) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 11079 | `CRC_TABLE` | `const CRC_TABLE = (() => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11089 | `pngCrc32` | `const pngCrc32 = (bytes, start, length) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11095 | `xmpEscapeText` | `const xmpEscapeText = (text) => String(text ?? '')` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11099 | `buildXmpPacket` | `const buildXmpPacket = ({ title = '', description = '', keywords = [] }) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11122 | `embedXmpIntoPngBytes` | `const embedXmpIntoPngBytes = (bytes, meta = {}) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11163 | `embedXmpMetadata` | `const embedXmpMetadata = (dataUrl, { title = '', description = '', keywords = [] }) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 11230 | `handleDownloadSingle` | `const handleDownloadSingle = async (asset, e, showToast) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11297 | `recordExportHistory` | `const recordExportHistory = (asset, format) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11313 | `downloadCustomTemplate` | `const downloadCustomTemplate = (showToast) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11367 | `handleBulkExport` | `const handleBulkExport = async (filteredAssetsList, selectedAssetIds, showToast, setSelectedAssetIds, allAssets?) => {` | src/modules/studio/domain/export/ or shared/platform/exporters/ (see section map) |
| 11579 | `saveBatchProgress` | `const saveBatchProgress = (sessionId, promptIndex, batchId, batchData) => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 11585 | `clearBatchProgress` | `const clearBatchProgress = () => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 11589 | `loadBatchProgress` | `const loadBatchProgress = () => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 11600 | `processImportedJSON` | `const processImportedJSON = (text, actions) => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 11647 | `processImportedJSONFiles` | `const processImportedJSONFiles = (items, actions) => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 11721 | `handleJSONFileUpload` | `const handleJSONFileUpload = (e, actions) => {` | src/modules/studio/application/import/ + domain/import/ (see section map) |
| 11741 | `expandPromptWithGemini` | `const expandPromptWithGemini = async (baseTheme, archetypeContext = '', config, aiConfig, onApiCall, negativePromptText = '', semanticIntent = null, resolvedBg = null) => {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 11861 | `generateImageWithGemini` | `const generateImageWithGemini = async (prompt, ratio, negativePromptText, aiConfig, onApiCall) => {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12072 | `ICON_VARIATION_VISUALS` | `const ICON_VARIATION_VISUALS = [` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12083 | `buildIconVariationVisuals` | `const buildIconVariationVisuals = (theme, count) => {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12099 | `composeFinalPrompt` | `const composeFinalPrompt = (conceptText, isRevision = false, revisionInstruction = '', archetypeInstruction = '', config, resolvedBg?: ResolvedBackground, semanticIntent = null, st` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12140 | `buildPromptV2` | `const buildPromptV2 = (userPrompt, dnaContext, commercialRules, styleGuidance, cga, negativePrompt, archetypeInstruction = '', config, resolvedBg?: ResolvedBackground, semanticInte` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12166 | `DOMAIN_BY_CATEGORY` | `const DOMAIN_BY_CATEGORY = {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12196 | `DOMAIN_FORBIDDEN` | `const DOMAIN_FORBIDDEN = {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12224 | `DOMAIN_FORBIDDEN_MATRIX` | `const DOMAIN_FORBIDDEN_MATRIX = {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12252 | `extractDomainKeywordsFromDNA` | `function extractDomainKeywordsFromDNA(categoryKey, subjectDomain) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12267 | `buildForbiddenDomains` | `function buildForbiddenDomains(categoryKey, subcategoryKey = '', subjectDomain = '') {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12294 | `buildSemanticLocks` | `function buildSemanticLocks(si) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12303 | `buildCanonicalIntent` | `function buildCanonicalIntent({ semanticIntent, request = {}, styleInterpretation = null, resolvedBg = null }) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12349 | `validateCanonicalIntent` | `function validateCanonicalIntent(intent) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12364 | `resolveConstraints` | `function resolveConstraints(intent, dnaContext = '') {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12419 | `buildRegenerationPlan` | `function buildRegenerationPlan(intent, semanticQA, extra = {}) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12492 | `buildRejectionAwarePlan` | `function buildRejectionAwarePlan(asset: any): {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12641 | `buildProductionTrace` | `function buildProductionTrace({` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 12675 | `extractSemanticIntent` | `function extractSemanticIntent(promptOrSubject, category, subcategory = '', assetType = '') {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12718 | `containsConcept` | `function containsConcept(text, concept) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12730 | `validatePromptIntegrity` | `function validatePromptIntegrity(finalPrompt, semanticIntent) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12761 | `buildSemanticLockToken` | `function buildSemanticLockToken(semanticIntent) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 12794 | `STYLE_CACHE` | `const STYLE_CACHE = new Map();` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 12796 | `STYLE_INTERPRETATION_EMPTY` | `const STYLE_INTERPRETATION_EMPTY = {` | src/modules/studio/registry/ or src/shared/platform/ (see section map) |
| 12815 | `interpretStyleWithGemini` | `async function interpretStyleWithGemini(styleName, aiConfig, onApiCall, semanticIntent = null) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 12958 | `buildStyleInterpretation` | `function buildStyleInterpretation(styleName) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 12975 | `getStyleInterpretation` | `async function getStyleInterpretation(styleName, aiConfig, onApiCall, semanticIntent = null) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 12997 | `assessStyleCompatibility` | `function assessStyleCompatibility(interpretation, semanticIntent) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13016 | `getAssetFileSizeKB` | `const getAssetFileSizeKB = (asset) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13034 | `formatFileSize` | `const formatFileSize = (kb) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13040 | `isUpscaleEligible` | `const isUpscaleEligible = (asset) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13070 | `handleUpscaleSingle` | `const handleUpscaleSingle = async (asset, e, setAssets, showToast, silent = false, onAfterUpscale = null) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13197 | `handleBulkUpscale` | `const handleBulkUpscale = async (filteredAssetsList, selectedAssetIds, setSelectedAssetIds, setAssets, showToast, onAfterUpscale = null, getLatestAssets = null) => {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13235 | `handleTraceSVG` | `const handleTraceSVG = async (asset, e, setAssets, showToast, complexity, onAfterTrace = null, traceOptions = null, setSvgTraceModal = null) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 13268 | `handleBulkTraceSVG` | `const handleBulkTraceSVG = async (filteredAssetsList, selectedAssetIds, setAssets, showToast, complexity, setSelectedAssetIds) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 13307 | `handleBulkTraceByIconStyle` | `const handleBulkTraceByIconStyle = async (filteredAssetsList, selectedAssetIds, setAssets, showToast, setSelectedAssetIds, bgMode = 'transparent') => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 13385 | `buildPromptGraph` | `function buildPromptGraph({` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 13421 | `buildLayeredNegativePrompt` | `function buildLayeredNegativePrompt({` | src/modules/studio/domain/prompt/compiler.ts (M13 inc-5) |
| 13479 | `buildPreviewPrompt` | `function buildPreviewPrompt(vectorState, systemSettings) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 13558 | `compilePrompt` | `function compilePrompt({` | src/modules/studio/domain/prompt/compiler.ts (M13 inc-5 — canonical compiled prompt) |
| 13713 | `detectDomainsFromVision` | `function detectDomainsFromVision(text) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13739 | `assessSemanticMatch` | `function assessSemanticMatch(semanticIntent, visionAnalysis) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13842 | `assessProfileMatch` | `function assessProfileMatch(assetProfile, visionAnalysis) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13891 | `hashString` | `function hashString(input) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13901 | `FINGERPRINT_STOPWORDS` | `const FINGERPRINT_STOPWORDS = new Set([` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 13908 | `normalizeConceptTerms` | `function normalizeConceptTerms(...texts) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 13925 | `buildConceptFingerprint` | `function buildConceptFingerprint(semanticIntent, styleInterpretation = null) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 13943 | `fingerprintsMatch` | `function fingerprintsMatch(fpA, fpB) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 13956 | `getAssetConceptFingerprint` | `function getAssetConceptFingerprint(asset) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 13972 | `checkLibraryConceptSimilarity` | `function checkLibraryConceptSimilarity(semanticIntent, existingAssets, category = '', threshold = 0.4) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 14005 | `REJECTION_TAXONOMY` | `const REJECTION_TAXONOMY = {` | src/modules/studio/domain/production/ + application orchestration |
| 14025 | `classifyRejection` | `function classifyRejection(reasonCode = '', issueText = '') {` | src/modules/studio/domain/production/ + application orchestration |
| 14060 | `recordRejectionFeedback` | `async function recordRejectionFeedback(asset, reasonCode, ctx, options = {}) {` | src/modules/studio/domain/production/ + application orchestration |
| 14094 | `deriveProductionPolicy` | `function deriveProductionPolicy(feedbackList) {` | src/modules/studio/domain/production/ + application orchestration |
| 14155 | `validateRequestIntake` | `function validateRequestIntake({ prompt, assetType, category, platform }) {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 14167 | `NormalizedRequest` | `interface NormalizedRequest {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 14172 | `normalizeRequest` | `function normalizeRequest(input): NormalizedRequest {` | SEE SECTION-LEVEL MAPPING ABOVE |
| 14186 | `executeGenerateNormalAssets` | `const executeGenerateNormalAssets = async (ctx) => {` | src/modules/studio/domain/production/ + application orchestration |
| 14922 | `executeGenerateIconAssets` | `const executeGenerateIconAssets = async (ctx) => {` | src/modules/studio/domain/production/ + application orchestration |
| 15175 | `executeGenerateAssets` | `const executeGenerateAssets = async (ctx) => {` | src/modules/studio/domain/production/ + application orchestration |
| 15214 | `batchEngine` | `const batchEngine = {` | src/modules/studio/domain/production/ + application orchestration |
| 15233 | `executeJSONBatchGeneration` | `const executeJSONBatchGeneration = async (resumeFromIndex = 0, ctx) => {` | src/modules/studio/domain/production/ + application orchestration |
| 15845 | `cancelGeneration` | `const cancelGeneration = (ctx) => {` | src/modules/studio/domain/production/ + application orchestration |
| 15853 | `retryFailedAsset` | `const retryFailedAsset = async (asset, ctx) => {` | src/modules/studio/domain/production/ + application orchestration |
| 16357 | `estimateApiCalls` | `const estimateApiCalls = (vectorState, systemSettings) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 16373 | `ESTIMATED_COST_PER_CALL_USD` | `const ESTIMATED_COST_PER_CALL_USD = 0.01;` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 16374 | `estimateCostUsd` | `const estimateCostUsd = (apiCalls) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 16382 | `estimateAssetApiCalls` | `const estimateAssetApiCalls = (asset) => {` | electron/services/{storage|projects|jobs}/ + shared contracts |
| 16401 | `SvgTraceModal` | `const SvgTraceModal = ({ modal, onClose, setAssets, showToast }) => {` | src/modules/vectorize/ (verify ownership; UI/application/domain split) |
| 17381 | `NEWSWORDS_EVENT_DETECT` | `const NEWSWORDS_EVENT_DETECT = (text) => {` | src/modules/studio/domain/compliance/ + registry rules |
| 17395 | `sanitizeStockTitle` | `const sanitizeStockTitle = (title = '') => {` | src/modules/studio/domain/compliance/ + registry rules |
| 17438 | `validateStockTitle` | `const validateStockTitle = (title = '') => {` | src/modules/studio/domain/compliance/ + registry rules |
| 17439 | `issues` | `const issues = [];` | src/modules/studio/domain/compliance/ + registry rules |
| 17440 | `t` | `const t = String(title \|\| '').trim();` | src/modules/studio/domain/compliance/ + registry rules |
| 17441 | `MIN` | `const MIN = METADATA_RULES.title.MIN_LEN;` | src/modules/studio/domain/compliance/ + registry rules |
| 17442 | `MAX` | `const MAX = METADATA_RULES.title.MAX_LEN;` | src/modules/studio/domain/compliance/ + registry rules |
| 17443 | `HARD_LIMIT` | `const HARD_LIMIT = METADATA_RULES.title.HARD_MAX_LEN; // 200 — Adobe platform limit` | src/modules/studio/domain/compliance/ + registry rules |
| 17470 | `METADATA_HIGHLIGHT_TERMS` | `const METADATA_HIGHLIGHT_TERMS = [` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17477 | `highlightMetadataIssues` | `function highlightMetadataIssues(text = '', keywords = []) {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17547 | `validateMetadataCompliance` | `const validateMetadataCompliance = ({ title = '', description = '', keywords = [] }) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17633 | `METADATA_GENERIC_STOPWORDS` | `const METADATA_GENERIC_STOPWORDS = new Set([` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17650 | `normalizeMetadataKeyword` | `const normalizeMetadataKeyword = (value = '') =>` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17659 | `keywordTokens` | `const keywordTokens = (value = '') =>` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17664 | `isUsefulMetadataKeyword` | `const isUsefulMetadataKeyword = (keyword = '') => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17696 | `singularizeKeyword` | `const singularizeKeyword = (kw = '') => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17704 | `dedupePluralSingular` | `const dedupePluralSingular = (keywords = []) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17721 | `isCommonPhrase` | `const isCommonPhrase = (kw = '') => SEO_COMMON_PHRASES.has(normalizeMetadataKeyword(kw).toLowerCase());` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17725 | `splitNonCommonPhrases` | `const splitNonCommonPhrases = (keywords = []) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17748 | `scoreKeywordSEO` | `const scoreKeywordSEO = (kw = '', ctx: { primarySubject?: string; titleWords?: string[]; vision?: any } = {}) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17775 | `rankKeywordsForSEO` | `const rankKeywordsForSEO = (keywords = [], ctx = {}) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17783 | `injectSEOCriticalKeywords` | `const injectSEOCriticalKeywords = (keywords = [], vision = null, profile = '') => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17832 | `PRIMARY_ESCAPE` | `const PRIMARY_ESCAPE = (s) => s.replace(/[.*+?^${}()\|[\]\\]/g, '\\$&');` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17835 | `optimizeTitleForSEO` | `const optimizeTitleForSEO = (title = '', vision = null) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17861 | `ensureTitleKeywordsInTop10` | `const ensureTitleKeywordsInTop10 = (keywords = [], title = '') => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17884 | `calculateSEOScore` | `const calculateSEOScore = ({ title = '', keywords = [], description = '' }) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17907 | `validateAndCleanKeywords` | `const validateAndCleanKeywords = (keywords = [], options = {}) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 17979 | `buildMetadataExpansionCandidates` | `const buildMetadataExpansionCandidates = ({` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18067 | `buildFinalStockMetadata` | `const buildFinalStockMetadata = ({` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18396 | `buildMetadataFallback` | `const buildMetadataFallback = (asset) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18432 | `evaluateMetadataStatus` | `const evaluateMetadataStatus = ({ analysisAvailable = true, analysisFailed = false, title = '', description = '', keywords = [], categoryValid = true, hardBlocks = [] }) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18439 | `computeTitleSimilarity` | `const computeTitleSimilarity = (a = '', b = '') => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18449 | `checkBatchTitleSimilarity` | `const checkBatchTitleSimilarity = (batchId, allAssets, threshold = 0.65) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18468 | `checkBatchVisualSimilarity` | `const checkBatchVisualSimilarity = async (batchId, allAssets, threshold = 0.8) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18489 | `computeBatchDiversityScore` | `const computeBatchDiversityScore = async (batchId, allAssets, thresholds = { duplicate: 0.8, titleSim: 0.65 }) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18537 | `_geminiEmbeddingCache` | `const _geminiEmbeddingCache = new Map();` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18538 | `cosineSimilarity` | `const cosineSimilarity = (a, b) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18545 | `computeGeminiImageEmbeddings` | `const computeGeminiImageEmbeddings = async (dataUrls, aiConfig, onApiCall = null) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18567 | `checkLibraryVisualSimilarity` | `const checkLibraryVisualSimilarity = async (targetUrl, targetId, targetCategory, allAssets, threshold = 0.85, aiConfig = null, onApiCall = null) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18618 | `enforceMetadataDiversity` | `const enforceMetadataDiversity = (title, batchId, allAssets, threshold = 0.65) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18631 | `checkPreGenerationSimilarity` | `const checkPreGenerationSimilarity = (input, category, existingAssets) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 18681 | `extractJSONFromText` | `const extractJSONFromText = (text = '') => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 18765 | `callGeminiText` | `const callGeminiText = async ({ system, user }: { system: string; user: string }, aiConfig: SystemSettings['aiConfig'], onApiCall: ()=>void): Promise<string> => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 18778 | `callGeminiForJSON` | `const callGeminiForJSON = async ({ payload, aiConfig, onApiCall, label = 'unnamed' }) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 18867 | `analyzeVisualTruth` | `const analyzeVisualTruth = async (asset, aiConfig, onApiCall) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 19048 | `detectVisualProfile` | `const detectVisualProfile = (vision, asset) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 19084 | `generateMetadataAndQA` | `const generateMetadataAndQA = async ({ asset, vision, profile }, aiConfig, onApiCall) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 19481 | `runKeywordValidationLoop` | `const runKeywordValidationLoop = async ({ keywords, title, vision }, aiConfig, onApiCall) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 19556 | `REGEN_FIELD_PROMPTS` | `const REGEN_FIELD_PROMPTS = {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 19648 | `regenerateMetadataField` | `const regenerateMetadataField = async ({ asset, field, vision, issues = [], aiConfig, onApiCall }) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 19726 | `applyMetadataFieldUpdate` | `const applyMetadataFieldUpdate = async (asset, field, raw) => {` | src/modules/metadata/ or src/modules/studio/domain/metadata/ (see section map) |
| 19824 | `analyzeAssetForPreflight` | `const analyzeAssetForPreflight = async (asset, aiConfig, onApiCall, onFailureReason) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 19910 | `analyzeConceptGenericity` | `const analyzeConceptGenericity = async (input, category, subcategory, aiConfig, onApiCall) => {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 20001 | `AUTO_REGENERATION_MAX_RETRIES` | `const AUTO_REGENERATION_MAX_RETRIES = 2;` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |
| 20004 | `buildRegeneratedPrompt` | `function buildRegeneratedPrompt(originalPrompt, regenerationPlan, semanticIntent) {` | src/modules/studio/domain/prompt/ (+ application/ai for provider calls) |
| 20018 | `autoRegenerateAsset` | `async function autoRegenerateAsset(asset, plan, ctx) {` | src/modules/studio/domain/qa/ or src/modules/studio/domain/similarity/ |

**Top-level declaration count detected:** 459.

---

# APPENDIX C — NO-LOSS REFACTOR ACCOUNTING

Before declaring Canvas refactor complete, the Head Developer must be able to produce: **section coverage = complete, top-level declaration inventory = reviewed, nested App workflows = categorized, and critical behavior = linked to parity evidence**. A source item may be consolidated or retired only with an explicit reason and evidence.

---

# APPENDIX D — M0 MAPPING AUDIT (2026-09-07)

Audit performed during M0 Reference Baseline Freeze. Full evidence: `docs/reports/M0_CANVAS_TO_LOCAL_COVERAGE_REPORT.md`.

## Audit result

- Sections §5–§82 audited: all 78 have a target owner and disposition at section level. **0 UNMAPPED / 0 UNKNOWN / 0 UNDECIDED.**
- Appendix B: all 459 top-level declarations present in inventory. **~45 entries are PENDING-RESOLUTION**: they carry deferred/dual targets ("split by owner", "or src/shared/platform/ (see section map)"). This is permitted for non-critical helpers per the M0 contract; **file-level resolution is due at the owner milestone** (contract types → M2; studio domain → M5). Unknown-critical-mapping count remains 0 because every critical capability has an unambiguous owner section.
- **0 RETIRE entries exist.** The RETIRE disposition is defined (§2.1) but never applied. A dead-code/obsolete-block pass over Canvas is scheduled before the M13 gate and must produce documented RETIRE entries or explicit "nothing to retire" evidence. (Gap G1.)
- Capability completeness notes: Feedback recording is mapped (§56) as an application-level action without a dedicated workspace section (revisit M6). General Import is covered across §47/§39/§61 without a consolidated Import-module entry (consider explicit CONSOLIDATE at M5).
- Canvas `ProductionJobStatus` includes `running` and `paused` states that conflict with all target Job taxonomies — blocked on M0 decision D-015; proposed disposition RETIRE (replaced by the durable Job contract). (Gap G3.)

## Status markers used from M0 onward

- `PENDING-RESOLUTION (owner: M<n>)` — mapping target deferred to a milestone; non-critical only.
- `RESOLVED` — file-level target committed.

No entry is left without one of: a concrete target, RETIRE + reason, or PENDING-RESOLUTION + owner milestone.

### M2 resolutions (2026-09-07)

The contract-type block of Appendix B (Canvas lines ~2098–2691, previously PENDING-RESOLUTION "split by owner", owner M2) is now RESOLVED:

- Asset/QA/production types → `src/shared/asset/contract.ts` + `src/shared/qa/contract.ts` (D-020)
- ProductionJobStatus / job types → `src/shared/job/contract.ts` (D-021; Canvas `running`→`processing`, `paused` RETIRED)
- SystemSettings AI fields → M3 (`electron/services/settings/` + `src/shared/platform/contract.ts`), still PENDING-RESOLUTION (owner: M3)
- Error contracts → `src/shared/errors/contract.ts` (D-022)
- Remaining per-module state types → stay PENDING-RESOLUTION (owner: M5) until module milestones resolve their final file targets.
