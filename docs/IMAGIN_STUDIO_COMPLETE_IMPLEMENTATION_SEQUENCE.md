# IMAGIN Studio Local — Complete Implementation Sequence

**Status:** Master End-to-End Execution Sequence  
**Date:** 2026-09-06  
**Project type:** Clean reimplementation / new desktop project  
**Primary behavior reference:** `imagin_studio_strong_v2.tsx`  
**Product/UI reference:** `reference/ui/`  
**Legacy Local:** Reference only for lessons, failure modes, and proven desktop infrastructure ideas

---

## 0. PURPOSE

Dokumen ini adalah **urutan pengerjaan lengkap dari project kosong sampai production-ready**.

Dokumen ini menjawab satu pertanyaan:

> **"Setelah ini harus mengerjakan apa, lalu apa, sampai benar-benar selesai?"**

Dokumen ini bukan pengganti dokumen spesialis. Ia menjadi **execution sequence** yang mengikat:

- `plan.md`
- `ARCHITECTURE.md`
- `BEHAVIOR_SPEC.md`
- `PARITY_MATRIX.md`
- `IMPLEMENTATION_PLAN.md`
- `DEVELOPMENT_RULES.md`

Detail behavior tetap berada di `BEHAVIOR_SPEC.md`.  
Detail architecture tetap berada di `ARCHITECTURE.md`.  
Detail parity tetap berada di `PARITY_MATRIX.md`.  
Detail task dan acceptance tetap berada di `IMPLEMENTATION_PLAN.md`.

Dokumen ini menentukan **urutan eksekusi aktual**.

---

# 1. NON-NEGOTIABLE PROJECT PRINCIPLES

Sebelum mengerjakan task apa pun, aturan berikut dianggap aktif.

1. Project baru adalah clean implementation, bukan patch migration.
2. Canvas Upgraded adalah behavioral gold untuk Studio.
3. UI reference adalah product/workflow reference.
4. Legacy Local adalah lessons-only reference.
5. Tidak boleh menyalin arsitektur giant single-file Canvas ke Local.
6. Tidak boleh membuat second hidden production pipeline.
7. Semua Studio mode masuk ke `ProductionRequest` → `ProductionPlan` → canonical production pipeline.
8. Semua module menggunakan shared `Asset` contract.
9. Semua asynchronous work menggunakan shared `Job` contract.
10. Renderer tidak boleh melakukan direct AI provider access.
11. Secret/API key hanya berada pada protected main-process/infrastructure boundary.
12. Business logic tidak boleh dipindahkan ke IPC handler.
13. Persistence adalah bagian dari correctness, bukan fitur tambahan.
14. Retry bukan duplicate.
15. Resume bukan regenerate.
16. Double click tidak boleh membuat dua logical jobs.
17. Tidak boleh ada fake capability.
18. Tidak boleh menambahkan `@ts-nocheck` pada code baru.
19. Build pass bukan bukti behavioral parity.
20. Feature dianggap selesai hanya setelah implementation, wiring, runtime evidence, test evidence, dan parity evidence tersedia sesuai levelnya.
21. Intelligence/market automation tidak masuk sebelum production parity gate.
22. Freepik tetap locked sampai contract, mapping, metadata limits, dan verification tersedia.

---

# 2. SOURCE-OF-TRUTH MODEL

Gunakan empat jenis kebenaran.

## 2.1 Semantic truth

Pertanyaan:

> Apa yang seharusnya dilakukan produk?

Sumber:

```text
Canvas Upgraded
    ↓
BEHAVIOR_SPEC.md
```

## 2.2 Product experience truth

Pertanyaan:

> Bagaimana workflow dan pengalaman desktop seharusnya terasa?

Sumber:

```text
UI Reference
    ↓
ARCHITECTURE.md
BEHAVIOR_SPEC.md
```

## 2.3 Implementation truth

Pertanyaan:

> Apa yang benar-benar terjadi pada implementation saat ini?

Sumber:

```text
Current source
+ runtime evidence
+ tests
```

## 2.4 Governance truth

Pertanyaan:

> Apa yang harus dikerjakan berikutnya dan apa yang boleh dianggap selesai?

Sumber:

```text
plan.md
IMPLEMENTATION_PLAN.md
PARITY_MATRIX.md
```

---

# 3. FINAL EXECUTION MAP

Urutan keseluruhan:

```text
PHASE 00  Workspace Preparation
    ↓
PHASE 01  Specification Freeze
    ↓
PHASE 02  Project Bootstrap
    ↓
PHASE 03  App Shell
    ↓
PHASE 04  Shared Foundation
    ↓
PHASE 05  Electron / Infrastructure Foundation
    ↓
PHASE 06  Job Runtime Foundation
    ↓
PHASE 07  Gallery Core
    ↓
PHASE 08  Studio Core — Thin Vertical Slice
    ↓
PHASE 09  Studio Semantic / Intelligence Core
    ↓
PHASE 10  Studio Quality / Safety / Preflight
    ↓
PHASE 11  Studio Specialized Modes
    ↓
PHASE 12  Metadata Workspace
    ↓
PHASE 13  Upscale
    ↓
PHASE 14  Vectorize
    ↓
PHASE 15  Remotion
    ↓
PHASE 16  Cross-Module Integration
    ↓
PHASE 17  Persistence / Migration / Recovery Hardening
    ↓
PHASE 18  Canvas Behavioral Parity
    ↓
PHASE 19  Production Hardening
    ↓
PHASE 20  Production Gate
    ↓
PHASE 21  Release Preparation
    ↓
PHASE 22  Post-Parity Intelligence
```

Tahapan di dokumen ini memperinci roadmap milestone yang sudah ditetapkan di `plan.md` dan `IMPLEMENTATION_PLAN.md` tanpa mengubah tujuan proyek.

---

# 4. PHASE 00 — WORKSPACE PREPARATION

## Goal

Membuat workspace proyek baru yang benar-benar terpisah dari legacy Local.

## Tasks

### T00.01 — Create repository

Buat repository/folder baru:

```text
imagin-studio-local/
```

Jangan membuat:

```text
imagin-studio/
  ├── imagin-local/
  └── imagin-local-v2/
```

## T00.02 — Establish clean baseline

Pastikan project baru tidak mengandung:

- legacy application state;
- legacy renderer implementation;
- migration hacks;
- legacy browser-storage workaround;
- direct provider fetch dari renderer.

## T00.03 — Prepare references

Buat:

```text
reference/
├── canvas-upgraded/
│   └── imagin_studio_strong_v2.tsx
└── ui/
```

## T00.04 — Prepare docs

Masukkan:

```text
docs/
├── ARCHITECTURE.md
├── BEHAVIOR_SPEC.md
├── PARITY_MATRIX.md
├── IMPLEMENTATION_PLAN.md
└── DEVELOPMENT_RULES.md
```

`plan.md` berada di project root.

## Exit criteria

```text
[ ] repository baru
[ ] folder baru
[ ] references tersedia
[ ] docs tersedia
[ ] no legacy code imported as baseline
```

---

# 5. PHASE 01 — SPECIFICATION FREEZE

## Goal

Tidak ada ambiguity yang sengaja dibiarkan tersembunyi di dalam code.

## T01.01 — Read project documents

Agent/developer membaca berurutan:

```text
plan.md
ARCHITECTURE.md
BEHAVIOR_SPEC.md
DEVELOPMENT_RULES.md
PARITY_MATRIX.md
IMPLEMENTATION_PLAN.md
```

## T01.02 — Inventory Canvas capability

Kelompokkan capability:

```text
Generation
Reference
Batch
Icon
JSON
Semantic Intent
DNA
Prompt
Composition
Differentiation
Similarity
Diversity
Visual Truth
Technical QA
Compliance
Metadata
Preflight
Regeneration
Revision
Object Modifier
Projects
History
Feedback
Import
Export
```

## T01.03 — Inventory UI capability

Catat workflow utama:

```text
Studio
Gallery
Upscale
Vectorize
Remotion
Metadata Workspace
```

## T01.04 — Establish shared contracts

Pastikan kontrak konseptual sudah disepakati untuk:

```text
Asset
Job
Project
Platform
Error
Events
Storage
```

## T01.05 — Establish intentional drifts

Drift yang diperbolehkan:

```text
Electron persistent storage
IPC security boundary
Durable jobs
Recovery
Central Gallery
Metadata workspace
Native binary execution boundary
```

Syarat drift:

```text
architecture/security/reliability improves
AND
production semantics remain equivalent
```

## T01.06 — Establish initial parity state

Semua implementation capability baru:

```text
NOT_STARTED
```

Jangan menganggap capability Canvas sebagai capability Local.

## Gate

```text
M01 SPECIFICATION FREEZE = READY
```

---

# 6. PHASE 02 — PROJECT BOOTSTRAP

## Goal

Membuat foundation teknis paling minimal yang bisa dijalankan.

## T02.01 — Package manager and scripts

Siapkan script minimal:

```text
dev
build
typecheck
lint
test
```

## T02.02 — TypeScript configuration

Pisahkan konfigurasi renderer dan Electron bila dibutuhkan:

```text
tsconfig.json
tsconfig.electron.json
```

## T02.03 — Vite / renderer configuration

Renderer harus bisa build independently dari Electron main process.

## T02.04 — Electron main process

Buat:

```text
electron/main.ts
```

## T02.05 — Preload

Buat:

```text
electron/preload.ts
```

Preload menjadi capability bridge, bukan tempat business logic.

## T02.06 — Minimal app launch test

Buktikan:

```text
Electron launches
→ renderer loads
→ preload loads
→ app renders
```

## Exit criteria

```text
[ ] app starts
[ ] TypeScript passes
[ ] build passes
[ ] no provider integration yet
[ ] no fake production UI claims
```

---

# 7. PHASE 03 — APP SHELL

## Goal

Aplikasi desktop memiliki shell yang stabil sebelum feature-heavy implementation.

## T03.01 — App shell

Buat struktur:

```text
App
├── shell
├── navigation
├── workspace router
├── global task center
├── settings shell
└── recovery shell
```

## T03.02 — Workspace registry

Register:

```text
Studio
Upscale
Vectorize
Remotion
Gallery
```

Register Metadata sebagai module internal.

## T03.03 — Workspace routing

Pastikan switching workspace stabil.

## T03.04 — Global task center

Task center harus dapat menampilkan job status meskipun executor belum lengkap.

## T03.05 — Recovery shell

UI recovery shell boleh tersedia lebih awal, tetapi tidak boleh berpura-pura bahwa recovery backend sudah selesai.

## Gate

```text
M1 APP SHELL = VERIFIED
```

Evidence:

```text
runtime screenshot/evidence
workspace navigation test
build/typecheck
```

---

# 8. PHASE 04 — SHARED FOUNDATION

## Goal

Membuat shared domain contracts yang menjadi fondasi seluruh module.

## T04.01 — Asset contract

Minimal area:

```text
identity
source
file/media
metadata
production
qa
platform
relations
provenance
```

## T04.02 — Asset lineage

Harus dapat merepresentasikan:

```text
Original
 ↓
Generated
 ↓
Upscaled
 ↓
Metadata Applied
 ↓
Revision
 ↓
Exported
```

## T04.03 — Job contract

Minimal:

```text
id
module
type
status
stage
progress
input
output
error
retry
createdAt
updatedAt
recovery
```

## T04.04 — Project contract

Project/collection ownership harus dapat dihubungkan dengan assets/jobs sesuai behavior target.

## T04.05 — Platform contract

Platform-specific behavior harus menggunakan adapter/rule model, bukan if/else scattered.

## T04.06 — Structured error contract

Minimal classification:

```text
unauthorized
forbidden
rate_limit
timeout
aborted
invalid_response
invalid_json
safety_block
provider_error
network_error
binary_missing
storage_error
validation_error
```

## T04.07 — Events

Define event contract untuk:

```text
job updates
asset updates
library updates
recovery updates
module updates
```

## T04.08 — Storage contracts

Storage interface harus memungkinkan:

```text
read
write
update
delete
list
atomic write
recovery
```

## Gate

Tidak boleh ada duplicate Asset/Job types.

```text
M2 SHARED FOUNDATION = VERIFIED
```

---

# 9. PHASE 05 — ELECTRON / INFRASTRUCTURE FOUNDATION

## Goal

Membangun boundary antara UI dan dunia luar.

## T05.01 — IPC registry

Buat registry channel berdasarkan domain.

Contoh:

```text
studio
metadata
gallery
upscale
vectorize
remotion
jobs
settings
projects
```

## T05.02 — IPC adapter rule

Setiap handler hanya:

```text
validate input
→ call service
→ return structured result
→ emit event if needed
```

## T05.03 — AI service boundary

Target:

```text
Renderer
 ↓
Preload
 ↓
IPC
 ↓
AI Service
 ↓
9Router / configured provider
```

No raw secrets in renderer.

## T05.04 — Storage service

Centralize persistent reads/writes.

## T05.05 — Library service

Library/Gallery persistence must pass through service boundary.

## T05.06 — Settings service

Settings API must distinguish safe configuration from secrets.

## T05.07 — Native binary service boundary

Prepare adapters for:

```text
ffmpeg
inkscape
vtracer
realesrgan
waifu2x
whisper
```

Binary service should expose typed command/result behavior, not arbitrary shell calls from UI.

## T05.08 — AI error mapping

Map transport/provider failures into structured error contract.

## Gate

```text
[ ] preload bridge works
[ ] IPC works
[ ] services are testable
[ ] secrets are protected
[ ] provider access is not in renderer
[ ] binary access is not in renderer
```

---

# 10. PHASE 06 — JOB RUNTIME FOUNDATION

## Goal

Sebelum banyak fitur async, job runtime harus stabil.

## T06.01 — Job state machine

Define:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
CANCELLED
RECOVERY_REQUIRED
```

## T06.02 — Job executor abstraction

Executor menerima shared Job contract.

## T06.03 — Cancellation

Rules:

```text
queued → cancel
processing → abort
completed → cannot cancel
failed → retry allowed if policy allows
```

## T06.04 — Retry policy

Retry classification-based dan bounded.

## T06.05 — Idempotency

Gunakan:

```text
requestId
productionId
jobId
assetId
attemptId
```

## T06.06 — Persistence

Job state harus durable.

## T06.07 — Recovery/reconciliation foundation

Setelah restart:

```text
read durable jobs
→ identify incomplete work
→ reconcile
→ expose recovery state
```

## Gate

Test minimal:

```text
create job
pause/interrupt
restart process
recover job state
```

---

# 11. PHASE 07 — GALLERY CORE

## Goal

Membuat centralized asset destination sebelum seluruh Studio production dibangun.

## T07.01 — Asset repository

CRUD shared `Asset`.

## T07.02 — Asset persistence

Persist actual metadata, file references, provenance, relations.

## T07.03 — Gallery query engine

Implement:

```text
query
search
filter
sort
pagination if required
```

## T07.04 — Selection model

Implement single and multi-select.

## T07.05 — Preview

Implement preview and detail view.

## T07.06 — Lineage view

Asset relationship must be inspectable.

## T07.07 — Routing actions

Gallery dapat route selected assets ke:

```text
Metadata
Upscale
Vectorize
Remotion
Revision/Object Modifier when applicable
```

## T07.08 — Synthetic asset test

Buat test asset tanpa AI:

```text
create
→ persist
→ query
→ select
→ open
→ route
```

## Gate

```text
M4 GALLERY = VERIFIED
```

---

# 12. PHASE 08 — STUDIO CORE: THIN VERTICAL SLICE

## Goal

Mendapatkan satu alur nyata sedini mungkin:

```text
ProductionRequest
→ AI
→ Asset
→ Gallery
```

Ini adalah jalur paling penting sebelum feature expansion.

## T08.01 — ProductionRequest

Buat contract untuk input Studio.

## T08.02 — ProductionPlan

Normalisasi request menjadi deterministic plan.

## T08.03 — Intake

Validate initial request.

## T08.04 — Normalize

Normalize:

```text
asset type
category
subcategory
style
ratio
background
output target
user overrides
```

## T08.05 — Resolve

Resolve defaults, explicit overrides, inferred settings.

## T08.06 — AI adapter

Connect only through infrastructure boundary.

## T08.07 — Generation result

Convert provider result into internal result.

## T08.08 — Finalize

Create canonical final asset.

## T08.09 — Persist

Persist actual output.

## T08.10 — Gallery integration

Asset appears in Gallery.

## T08.11 — Trace minimal

Create trace showing at least:

```text
request
resolvedConfig
generation
persist
```

## Gate

One normal generation must successfully complete:

```text
input
→ request
→ plan
→ AI
→ final asset
→ persistence
→ Gallery
→ trace
```

Only after this gate proceed to semantic expansion.

---

# 13. PHASE 09 — STUDIO SEMANTIC / INTELLIGENCE CORE

## Goal

Build the behavior that makes Studio an intentional production system rather than a thin AI wrapper.

## T09.01 — Semantic Intent

Implement normalization/inference rules.

## T09.02 — Visual intent

Represent:

```text
subject
purpose
commercial context
style
composition
background
ratio
output
```

## T09.03 — DNA engine

Implement canonical DNA resolution.

Conceptually:

```text
category
→ subcategory
→ subject
→ style
→ commercial scene
→ macro concept
→ micro variation
```

## T09.04 — DNA diversity tracker

Persistent cross-batch/cross-production tracking where required.

## T09.05 — Composition engine

Centralize composition constraints.

## T09.06 — Concept genericity

Implement generic-commercial safety logic.

## T09.07 — Fingerprint

Generate concept/visual signatures.

## T09.08 — Similarity risk

Implement pre-generation and post-generation similarity checks according to behavior spec.

## T09.09 — Batch diversity model

Implement duplicate avoidance across logical generation sets.

## T09.10 — Prompt compiler

Prompt compilation becomes deterministic and inspectable.

## T09.11 — Prompt integrity

Verify required directive components survived compilation.

## T09.12 — Reference workflow

Implement:

```text
Reference image
→ visual analysis
→ infer asset type/style/ratio/background/output
→ visual DNA
→ rendering directive
→ skip AI expansion
→ compile prompt
```

`skipAIExpansion=true` must be preserved where reference behavior requires it.

## Gate

Normal and reference requests must produce inspectable:

```text
semantic intent
DNA
prompt
trace
```

---

# 14. PHASE 10 — STUDIO QUALITY / SAFETY / PREFLIGHT

## Goal

Studio output harus melewati production quality controls sebelum dianggap ready.

## T10.01 — Technical QA

Validate:

```text
resolution
format
file integrity
image decode
background rules
```

## T10.02 — Visual QA

Validate visual truth and rule-specific quality conditions.

## T10.03 — Compliance

Check:

```text
brand/IP
news event
sensitive content
misleading content
stock/commercial safety rules
```

## T10.04 — Metadata generation

Generate metadata from:

```text
visual truth
>
visual profile
>
asset context
```

## T10.05 — Metadata validation

Validate title, description, keywords, and compliance constraints.

## T10.06 — Preflight

Preflight is an explicit decision stage.

Possible outcomes should be structured, not boolean-only.

## T10.07 — Repair / regeneration policy

Implement bounded regeneration.

Every regeneration records:

```text
reason
attempt
previous result
new result
decision
```

## T10.08 — Completion rule

Do not claim `COMPLETED` until required persistence and QA/preflight conditions are satisfied.

## Gate

Asset can answer:

```text
Why accepted?
Why rejected?
What was repaired?
What was regenerated?
What metadata was produced?
```

through structured state/trace.

---

# 15. PHASE 11 — STUDIO SPECIALIZED MODES

Implement all modes as application adapters into one production core.

Urutan:

```text
Reference
→ Icon
→ Batch
→ JSON
→ Revision
→ Object Modifier
```

## T11.01 — Reference

Ensure reference path uses shared pipeline and does not create a hidden second pipeline.

## T11.02 — Icon

Implement icon-specific:

```text
preset
DNA
negative rules
composition
output constraints
```

## T11.03 — Batch

Batch controller creates multiple `ProductionRequest` instances or batch plan objects without duplicating domain logic.

## T11.04 — JSON batch

Parse/validate JSON into canonical requests.

Invalid item must fail explicitly, not silently disappear.

## T11.05 — Revision

Revision creates a new logical output where behavior requires a new asset.

Preserve lineage.

## T11.06 — Object Modifier

Support at least behavior categories:

```text
repaint
modify_objects
```

respecting edit constraints.

## T11.07 — Bounded auto-regeneration integration

Specialized modes must use the same regeneration policy.

## Gate

No specialized mode introduces a private production path.

---

# 16. PHASE 12 — METADATA WORKSPACE

## Goal

Metadata menjadi full workspace/module, bukan popup tambahan.

## T12.01 — Metadata domain

Create:

```text
metadata-engine
metadata-policy
metadata-validator
metadata-regeneration
keyword-engine
platform-rules
```

## T12.02 — Metadata application layer

Create use cases:

```text
generate metadata
regenerate field
validate metadata
export metadata
```

## T12.03 — Metadata Workspace UI

Create:

```text
MetadataWorkspace
MetadataQueue
MetadataEditor
KeywordEditor
MetadataQA
MetadataExport
```

## T12.04 — Gallery entry flow

Must work:

```text
Gallery
→ select asset(s)
→ Create Metadata
→ Metadata Workspace
```

## T12.05 — Single asset

Generate and edit metadata.

## T12.06 — Bulk queue

Queue multiple selected assets.

## T12.07 — Field-level regeneration

Implement independently:

```text
Title only
Description only
Keywords only
```

Jangan rerun seluruh asset production pipeline.

## T12.08 — Manual editing

Manual edits must persist.

## T12.09 — Metadata validation

Ensure regenerated/manual fields return to validator.

## T12.10 — Metadata export

Export actual files, not only an in-memory preview.

## Gate

```text
Gallery
→ metadata
→ edit
→ field regen
→ validate
→ export
```

must be real and persistent.

---

# 17. PHASE 13 — UPSCALE

## Goal

Upscale menjadi independent processing module yang menghasilkan distinct output asset.

## T13.01 — Input contract

Accept shared Asset reference.

## T13.02 — Configuration

Implement available model/preset/options contract.

## T13.03 — Native executor

Call native enhancement tool only through Electron infrastructure.

## T13.04 — Progress

Use shared Job events.

## T13.05 — Cancellation

Abort native process safely.

## T13.06 — Recovery

Interrupted jobs must reconcile.

## T13.07 — Output validation

Validate actual generated file.

## T13.08 — New Asset

Create new asset where behavior requires distinct output.

## T13.09 — Lineage

Preserve source → upscale relation.

## T13.10 — Gallery integration

Persist new asset into Gallery.

## Gate

```text
asset
→ upscale
→ new asset
→ Gallery
```

with cancellation/recovery evidence.

---

# 18. PHASE 14 — VECTORIZE

## Goal

Raster-to-vector workstation yang mempertahankan source asset dan menyimpan SVG result sebagai distinct asset.

## T14.01 — Input validation

Accept supported raster formats.

## T14.02 — Presets

Implement quick trace presets.

## T14.03 — Complexity control

Implement color/trace complexity controls.

## T14.04 — Advanced settings

Implement settings seperti:

```text
drawStyle
lineQuality
groupBy
smoothEdges
gapFiller
```

## T14.05 — Background modes

Support required:

```text
transparent
white
custom
```

## T14.06 — Preview

Show result preview.

## T14.07 — Retrace

Allow re-run with updated trace settings.

## T14.08 — SVG validation

Validate actual SVG output.

## T14.09 — Save as new asset

Preserve original raster asset.

## T14.10 — Gallery integration

Persist SVG asset and lineage.

## Gate

```text
Original asset remains intact
AND
SVG is a distinct persisted asset
```

---

# 19. PHASE 15 — REMOTION

## Goal

Animation/composition/render workstation yang terhubung ke shared asset/job ecosystem.

## T15.01 — Source loading

Load compatible source assets.

## T15.02 — Composition model

Represent composition independently of UI.

## T15.03 — Timeline

Implement timeline domain model.

## T15.04 — Keyframes

Implement keyframe semantics.

## T15.05 — Preview

Preview composition.

## T15.06 — Render job

Use shared Job contract.

## T15.07 — Render executor

Use native render infrastructure.

## T15.08 — Output validation

Validate final render file.

## T15.09 — Gallery

Persist output asset and lineage.

## Gate

```text
start
→ observe progress
→ complete/fail explicitly
→ persist output
→ Gallery
```

---

# 20. PHASE 16 — CROSS-MODULE INTEGRATION

## Goal

Membuktikan bahwa module tidak hanya bekerja sendiri-sendiri.

## Workflow A

```text
Studio
 ↓
Gallery
 ↓
Upscale
 ↓
Metadata
 ↓
Revision
 ↓
Export
```

## Workflow B

```text
Import
 ↓
Gallery
 ↓
Vectorize
 ↓
Gallery
 ↓
Metadata
```

## Workflow C

```text
Studio
 ↓
Remotion
 ↓
Gallery
```

## Workflow D

```text
Gallery
 ↓
Metadata
 ↓
Fix metadata field
 ↓
Export
```

## T16.01 — Import contract

Imported assets enter shared Asset system.

## T16.02 — Cross-module routing

Do not pass private module state.

Pass:

```text
assetId
jobId
request context
```

## T16.03 — Lineage verification

At every transformation verify lineage remains correct.

## T16.04 — Context preservation

Selected asset must remain correct after navigation/module transitions.

## Gate

Every mandatory cross-module workflow passes E2E.

---

# 21. PHASE 17 — PERSISTENCE / MIGRATION / RECOVERY HARDENING

## Goal

Production reliability harus dibuktikan, bukan diasumsikan.

## T17.01 — Crash recovery

Test:

```text
generate
→ process crash
→ restart
→ reconcile
→ recover
```

## T17.02 — Duplicate action

Test:

```text
double click
→ one logical request
```

## T17.03 — Cancellation

Test both queued and processing cancellation.

## T17.04 — Resume

Resume incomplete work without starting an unintended duplicate generation.

## T17.05 — Storage failure

Simulate write failure.

System must not report completion if critical persistence failed.

## T17.06 — AI timeout

Expected behavior must be explicit and bounded.

## T17.07 — AI 429

Backoff/retry policy must be bounded.

## T17.08 — Invalid JSON response

Provider returns malformed structured response.

System must classify and handle explicitly.

## T17.09 — Provider failure

Map failure to structured error state.

## T17.10 — Binary missing

Missing executable must produce actionable failure.

## T17.11 — Schema versioning

Version schemas for:

```text
assets
jobs
projects
history
feedback
QA
compliance
batch state
settings
```

## T17.12 — Migration engine

Migration must be:

```text
versioned
idempotent
non-destructive
recoverable
testable
```

## T17.13 — Atomic writes

Critical persistence operations should be crash-safe.

## Gate

No critical workflow reaches false `COMPLETED`.

---

# 22. PHASE 18 — CANVAS BEHAVIORAL PARITY

## Goal

Sekarang, setelah architecture dan workflows stabil, lakukan comparison sistematis terhadap Canvas behavior.

## Important rule

Jangan membandingkan:

```text
function name
file name
line count
code similarity
screenshot only
```

Bandingkan:

```text
input
→ decision
→ output
→ failure behavior
→ persistence impact
```

## T18.01 — Normal generation parity

Verify matrix item P-001.

## T18.02 — Batch parity

Verify P-002.

## T18.03 — JSON parity

Verify P-003.

## T18.04 — Icon parity

Verify P-004.

## T18.05 — Reference parity

Verify P-005.

## T18.06 — Semantic intent parity

Verify P-006.

## T18.07 — DNA parity

Verify P-007.

## T18.08 — Prompt parity

Verify P-008/P-009.

## T18.09 — Composition parity

Verify P-010.

## T18.10 — Genericity/fingerprint/similarity parity

Verify P-011 through P-015.

## T18.11 — Visual truth

Verify P-016.

## T18.12 — QA/compliance/preflight

Verify P-017 through P-020.

## T18.13 — Metadata parity

Verify P-021 through P-026.

## T18.14 — Revision/object modifier/background behavior

Verify P-027 through P-029.

## T18.15 — Project/history/feedback

Verify P-030 through P-032.

## T18.16 — Gallery and lineage

Verify P-033/P-034.

## T18.17 — Metadata workspace

Verify P-035.

## T18.18 — Processing modules

Verify P-036 through P-038.

## T18.19 — Import/export/platform mapping

Verify P-039 through P-041.

## T18.20 — Job/reliability/security

Verify P-043 through P-050.

## T18.21 — Canonical production architecture parity

Verify P-051 through P-055.

## Parity levels

Use:

```text
L0 Missing
L1 Implemented
L2 Wired
L3 Behavioral Parity
L4 Integration Tested
L5 Hardened
```

Critical production parity requires:

```text
L3
+
L4 evidence
+
L5 evidence
```

## Gate

All critical parity rows reach L5 or are explicitly documented as approved intentional drift.

---

# 23. PHASE 19 — PRODUCTION HARDENING

## Goal

Mengubah sistem yang sudah functionally complete menjadi production system.

## T19.01 — Observability

Ensure trace/logging can answer:

```text
what request happened?
what config was resolved?
what model/provider ran?
what attempt ran?
what QA result happened?
what metadata result happened?
what regeneration happened?
what export happened?
```

## T19.02 — Production trace completeness

Minimal trace model:

```text
request
normalizedRequest
resolvedConfig
semanticIntent
dnaVersion
promptVersion
generation
finalization
qa
preflight
regeneration
export
```

## T19.03 — Security audit

Check:

```text
API secrets
IPC boundaries
logs
storage
renderer exposure
provider access
native command execution
```

## T19.04 — Performance audit

Evaluate:

```text
startup
Gallery query
asset preview
job updates
AI request handling
large library behavior
batch behavior
```

## T19.05 — Build/package verification

Production package must start and function in clean environment.

## T19.06 — Remove temporary scaffolding

Delete:

```text
fake adapters
unused mocks used as production path
temporary bypasses
debug-only completion states
```

## T19.07 — Stub audit

Search explicitly for:

```text
TODO
FIXME
throw new Error("not implemented")
placeholder return
fake resolver
mock production service
```

Any remaining item must be classified and blocked from production if critical.

---

# 24. PHASE 20 — PRODUCTION GATE

Project hanya boleh dinyatakan production-ready jika semua checklist berikut pass.

## Architecture

```text
[ ] clean project
[ ] modular boundaries respected
[ ] no hidden critical pipeline
[ ] no hidden critical state
[ ] one canonical Studio production core
[ ] one shared Asset contract
[ ] one shared Job contract
```

## Security

```text
[ ] no provider secret in renderer
[ ] AI access goes through protected boundary
[ ] IPC has validation
[ ] native execution is isolated
[ ] sensitive values are not leaked into logs/trace
```

## Persistence

```text
[ ] asset persistence works
[ ] job persistence works
[ ] project persistence works
[ ] schema versioning works
[ ] migrations are tested
[ ] atomic writes are protected
```

## Reliability

```text
[ ] crash recovery pass
[ ] cancellation pass
[ ] retry policy pass
[ ] resume pass
[ ] duplicate action pass
[ ] persistence failure pass
[ ] AI timeout pass
[ ] AI 429 pass
[ ] invalid JSON pass
[ ] provider failure pass
[ ] binary missing pass
```

## Studio

```text
[ ] normal generation pass
[ ] reference pass
[ ] icon pass
[ ] batch pass
[ ] JSON pass
[ ] semantic intent pass
[ ] DNA pass
[ ] prompt pass
[ ] differentiation pass
[ ] similarity pass
[ ] diversity pass
[ ] visual truth pass
[ ] technical QA pass
[ ] compliance pass
[ ] metadata pass
[ ] preflight pass
[ ] bounded regeneration pass
[ ] revision pass
[ ] object modifier pass
```

## Metadata

```text
[ ] metadata workspace functional
[ ] single asset generation
[ ] bulk queue
[ ] manual editing
[ ] field regeneration
[ ] validation
[ ] export
```

## Processing

```text
[ ] Upscale E2E
[ ] Vectorize E2E
[ ] Remotion E2E
```

## Gallery

```text
[ ] search
[ ] filtering
[ ] selection
[ ] preview
[ ] detail
[ ] lineage
[ ] routing
[ ] bulk operations
```

## Integration

```text
[ ] Workflow A pass
[ ] Workflow B pass
[ ] Workflow C pass
[ ] Workflow D pass
```

## Verification

```text
[ ] parity matrix critical rows = L5
[ ] integration evidence recorded
[ ] runtime evidence recorded
[ ] production trace verified
[ ] no critical P0 drift
[ ] no production stub
[ ] no fake capability
[ ] no new @ts-nocheck
[ ] clean production build
```

If one critical item fails:

```text
PRODUCTION READY = NO
```

---

# 25. PHASE 21 — RELEASE PREPARATION

## T21.01 — Version application

Set release version consistently.

## T21.02 — Build clean package

Build from clean checkout/environment.

## T21.03 — Fresh installation test

Install as a user would.

## T21.04 — Existing library compatibility test

Open existing library data and verify migration behavior.

## T21.05 — Data backup/restore verification

Test backup and restore where the product contract requires it.

## T21.06 — Release smoke test

Minimum smoke flow:

```text
launch
→ Studio
→ generate
→ Gallery
→ Metadata
→ export
→ reopen
```

## T21.07 — Release sign-off

Record:

```text
build id
version
test evidence
parity status
known issues
approved drift
```

---

# 26. PHASE 22 — POST-PARITY INTELLIGENCE

**Tidak boleh dimulai sebelum PHASE 20 production gate pass.**

## Goal

Menambahkan intelligence yang meningkatkan production strategy tanpa merusak module boundaries.

## T22.01 — Market Signals

Collect/organize market inputs.

## T22.02 — Market Opportunity Engine

Convert signals into opportunity candidates.

## T22.03 — Production Planner

Convert opportunity into production plans.

## T22.04 — ProductionRequest integration

Planner menghasilkan:

```text
ProductionRequest
```

bukan menjalankan generation sendiri.

## T22.05 — Feedback/outcome

Capture:

```text
production outcome
QA result
metadata result
export state
submission outcome where available
```

## T22.06 — Feedback Learning Engine

Use outcomes to improve planning/policy.

## T22.07 — Production Policy

Centralize learning-derived production rules.

## T22.08 — Planner feedback loop

Target:

```text
Market Signals
→ Opportunity
→ Production Planner
→ ProductionRequest
→ Canonical Production Core
→ QA
→ Metadata
→ Export
→ Outcome / Feedback
→ Learning
→ Policy
→ Planner
```

Intelligence tidak boleh bypass canonical production pipeline.

---

# 27. DETAILED DAILY EXECUTION LOOP

Setiap task implementasi wajib mengikuti loop berikut.

```text
1. Identify requirement
2. Identify source of truth
3. Read relevant docs
4. Inspect current implementation
5. Identify canonical owner
6. Implement smallest correct boundary
7. Wire integration
8. Add/update tests
9. Run typecheck/lint
10. Run build
11. Run relevant integration/E2E test
12. Capture runtime evidence
13. Update parity/status
14. Update documentation if contract changed
15. Remove obsolete duplicate/stub
16. Commit coherent change
```

Jangan melompat dari langkah 1 ke langkah 6 tanpa memahami contract.

---

# 28. RULE FOR CHOOSING WHAT TO DO NEXT

Jika ada beberapa task tersedia, pilih task dengan urutan prioritas berikut:

```text
1. blocker architecture/security/data integrity
2. shared contract needed by many modules
3. critical vertical slice
4. critical behavior parity
5. integration boundary
6. reliability/recovery
7. test coverage
8. UI refinement
9. performance refinement
10. new intelligence/features
```

Jangan memilih task hanya karena UI terlihat belum lengkap.

---

# 29. WHEN TO STOP CODING AND UPDATE DOCUMENTATION

Dokumentasi harus diperbarui bila terjadi:

```text
behavior change
architecture change
new capability
removed capability
development rule change
milestone change
intentional drift
production gate change
```

Minimal:

```text
code change
+
documentation update
+
regression evidence
```

---

# 30. PARITY VERIFICATION LOOP

Untuk setiap critical capability:

```text
Canvas behavior
     ↓
Extract expected behavior
     ↓
Create Local test scenario
     ↓
Run Local
     ↓
Compare input
     ↓
Compare decision
     ↓
Compare output
     ↓
Compare failure behavior
     ↓
Compare persistence
     ↓
Record evidence
     ↓
Set parity level
```

Parity tidak boleh dinaikkan hanya berdasarkan code inspection.

---

# 31. DEFINITION OF "FEATURE DONE"

Sebuah feature hanya `DONE` jika:

```text
[ ] Domain contract exists
[ ] Application use case exists
[ ] UI is wired
[ ] Infrastructure boundary exists if required
[ ] Persistence works if required
[ ] Error behavior is explicit
[ ] Cancellation works if asynchronous
[ ] Retry is bounded if retryable
[ ] Idempotency exists if user action can duplicate
[ ] Test exists
[ ] Integration test exists where required
[ ] Runtime evidence exists
[ ] Parity updated
[ ] No fake implementation
```

---

# 32. DEFINITION OF "MILESTONE DONE"

Milestone hanya boleh `DONE` jika memiliki:

```text
Implementation
+
Runtime Evidence
+
Test Evidence
+
Parity Update
```

Compile/build saja tidak cukup.

---

# 33. DEFINITIONS OF PROJECT COMPLETION

## Functional completion

Semua scoped capabilities implemented and wired.

## Behavioral completion

Critical Canvas behaviors reach required parity.

## Reliability completion

Critical failure/recovery paths proven.

## Production completion

Production gate seluruhnya pass.

## Strategic completion

Post-parity intelligence loop tersedia dan terintegrasi.

Project secara keseluruhan baru dapat disebut selesai ketika:

```text
Canvas behavior preserved
+
Product workflow preserved
+
Local architecture secure/modular/persistent/recoverable
+
Critical tests pass
+
Production gate pass
+
No critical hidden implementation
```

---

# 34. FINAL ORDER — ONE-LINE VERSION

Untuk developer/agent yang hanya membutuhkan urutan paling singkat:

```text
01. Create clean repository
02. Copy/freeze project references
03. Freeze specifications
04. Bootstrap Electron + Vite + React + TypeScript
05. Build App Shell
06. Build Shared Asset/Job/Project/Error/Event/Storage contracts
07. Build Electron IPC + AI + Storage + Library + Settings infrastructure
08. Build durable Job runtime, cancellation, retry, idempotency, recovery
09. Build Gallery core
10. Build Studio thin vertical slice: Request → AI → Asset → Gallery
11. Build Semantic Intent + DNA + Composition + Prompt + Differentiation
12. Build QA + Compliance + Metadata + Preflight + Repair/Regeneration
13. Add Reference + Icon + Batch + JSON + Revision + Object Modifier
14. Build full Metadata Workspace + field-level regeneration + export
15. Build Upscale
16. Build Vectorize
17. Build Remotion
18. Run cross-module E2E workflows
19. Harden persistence, recovery, migration, failure handling
20. Run full Canvas behavioral parity matrix
21. Production hardening + security + observability + performance + packaging
22. Run production gate
23. Prepare release
24. Only after gate: build Market Intelligence + Planner + Learning Loop
```

---

# 35. CURRENT FIRST TASK

Pada kondisi project saat ini, task yang paling tepat adalah:

```text
TASK NOW

Create clean project
→ establish docs/reference
→ freeze specification
→ bootstrap app
→ App Shell
→ Shared Core
→ Electron Infrastructure
```

**Jangan mulai dengan:**

```text
Studio UI detail
DNA mass migration
Batch engine
Metadata UI detail
Market intelligence
Freepik integration
```

Sebelum backbone selesai, feature-heavy work akan menciptakan rework dan kemungkinan duplicate architecture.

---

# 36. DOCUMENT CROSS-REFERENCE

| Pekerjaan | Dokumen utama |
|---|---|
| Apa urutan project? | `IMAGIN_STUDIO_COMPLETE_IMPLEMENTATION_SEQUENCE.md` |
| Scope/governance | `plan.md` |
| Architecture/boundaries | `ARCHITECTURE.md` |
| Behavior semantics | `BEHAVIOR_SPEC.md` |
| Parity/status | `PARITY_MATRIX.md` |
| Detailed task/acceptance | `IMPLEMENTATION_PLAN.md` |
| Developer/agent rules | `DEVELOPMENT_RULES.md` |

---

# 37. FINAL PRINCIPLE

```text
BUILD THE FOUNDATION
        ↓
PROVE ONE REAL PATH
        ↓
EXPAND THE DOMAIN
        ↓
EXPAND THE MODES
        ↓
CONNECT THE MODULES
        ↓
BREAK THE SYSTEM ON PURPOSE
        ↓
RECOVER IT
        ↓
COMPARE IT TO CANVAS
        ↓
HARDEN IT
        ↓
PASS PRODUCTION GATE
        ↓
ONLY THEN ADD INTELLIGENCE
```

> **Do not optimize for how fast the application looks complete. Optimize for how reliably the entire production system becomes correct.**
