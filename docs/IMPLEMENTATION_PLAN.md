# IMAGIN Studio Local — Implementation Plan

**Status:** Master execution roadmap  
**Date:** 2026-09-06  
**Project:** Clean reimplementation  
**Behavior reference:** `imagin_studio_strong_v2.tsx`  
**UI reference:** `reference/ui/`

---

## 1. Execution Objective

Build the new Local project from zero using:

```text
Canvas Upgraded
      +
UI/Product reference
      +
Desktop reliability architecture
      ↓
Clean Local implementation
```

The goal is not to reproduce Canvas code structure. The goal is to reproduce its intended behavior while improving:

- modularity;
- security;
- persistence;
- jobs;
- recovery;
- testability;
- cross-module asset lifecycle.

---

## 2. Delivery Strategy

Work in vertical, testable milestones.

Each milestone must produce something runnable and verifiable.

Do not spend a long phase moving files without runtime evidence.

---

## 3. PHASE 0 — SPECIFICATION FREEZE

### Objectives

Lock the inputs to the project.

### Deliverables

```text
reference/canvas-upgraded/imagin_studio_strong_v2.tsx
ui reference package
BEHAVIOR_SPEC.md
ARCHITECTURE.md
PARITY_MATRIX.md
DEVELOPMENT_RULES.md
```

### Tasks

- inventory Canvas capabilities;
- inventory UI workspaces and interaction patterns;
- define shared Asset contract;
- define shared Job contract;
- define error contract;
- identify intentional drifts;
- establish initial parity matrix.

### Gate

No unresolved ambiguity may be hidden inside initial implementation code. Unknown behavior is marked explicitly in the matrix.

---

## 4. PHASE 1 — APP SHELL

### Build

```text
App
Navigation
Workspace router
Global task center
Settings shell
Recovery shell
```

### Workspaces

```text
Studio
Upscale
Vectorize
Remotion
Gallery
```

Metadata is registered as a module but can be reached from Gallery.

### Acceptance

- workspace switching works;
- navigation state is stable;
- task center is visible;
- no fake “complete” screens are used to hide missing modules.

---

## 5. PHASE 2 — SHARED FOUNDATION

### Build

```text
Asset
Job
Project
Platform
Error
Events
Storage contracts
```

### Acceptance

- no duplicate Asset type;
- no duplicate Job type;
- lineage can represent derived assets;
- job lifecycle is defined;
- structured errors exist.

---

## 6. PHASE 3 — ELECTRON INFRASTRUCTURE

### Build

```text
IPC registry
AI service
Storage service
Library service
Job service
Settings service
Binary services
```

### Security requirements

```text
secret
→ main process only
```

Renderer gets capability/configuration state, not raw secrets.

### Acceptance

- preload bridge works;
- IPC handlers are domain-specific adapters;
- no business-heavy logic lives in IPC;
- native binary calls are testable;
- structured errors cross IPC intact.

---

## 7. PHASE 4 — GALLERY CORE

Gallery is established before full Studio production so every module has a shared destination for output assets.

### Build

- asset store;
- query/search;
- filtering;
- selection;
- preview;
- detail view;
- basic lineage;
- routing to module actions.

### Acceptance

A synthetic test asset can be created, persisted, queried, selected, opened, and routed into another module contract.

---

## 8. PHASE 5A — STUDIO CORE / THIN SLICE

Implement in this exact order:

```text
ProductionRequest
→ Normalize
→ Resolve
→ Semantic Intent
→ DNA
→ Composition / Diversity
→ Prompt
→ AI
→ Finalize
→ QA
→ Preflight
→ Persist
→ Trace
```

### Acceptance

A real normal generation must:

```text
start
→ generate
→ finalize
→ persist asset
→ appear in Gallery
→ expose production/QA result
→ expose production trace
```

Stock metadata generation is not part of this Studio acceptance path; Metadata owns that workflow.

---

## 8B. PHASE 5B — STUDIO WORKSPACE UI/UX

### Required reference

```text
docs/workspace/STUDIO_WORKSPACE.md
reference/ui/
```

### Build

Implement the final Studio workspace layout and interaction contract:

```text
Top Navigation
├── Generation Controls
├── Preview / Result Area
├── Inspector
├── Gallery / Result Strip
└── Task Center
```

Required UI states:

```text
empty
ready
preparing
processing
finalizing
completed
failed
cancelled
recovered
```

Required result actions include Gallery routing and allowed processing actions.

### Acceptance

- layout matches the approved workspace contract;
- primary controls are present and correctly grouped;
- preview/result area supports the specified interactions;
- inspector exposes asset/prompt/model/style/DNA/QA/lineage as applicable;
- result strip is functional;
- Task Center is integrated;
- empty/loading/error/success states are implemented;
- no mandatory stock metadata generation UI exists inside Studio;
- runtime action → state → result → persistence is verified.

### Gate

`M5B READY_FOR_APPROVAL` is required before starting M6.

---

## 9. PHASE 6 — STUDIO SPECIALIZED MODES

Implement in this order:

```text
Reference
Icon
Batch
JSON
Revision
Object Modifier
```

### Rule

Each is an application adapter into `ProductionRequest`.

### Acceptance

No specialized mode introduces a second hidden production pipeline.

---

## 10. PHASE 7 — METADATA WORKSPACE

### Build

```text
MetadataWorkspace
MetadataQueue
MetadataEditor
KeywordEditor
MetadataQA
MetadataExport
```

### Core behavior

```text
Gallery selection
→ analysis
→ metadata
→ validation
→ manual edit
→ field regeneration
→ export
```

### Acceptance

- single asset works;
- bulk queue works;
- visual truth has precedence;
- field regeneration is independent;
- export writes actual files.

---

## 11. PHASE 8 — UPSCALE

### Build

- input and configuration UI;
- progress;
- native process executor;
- output validation;
- new Asset creation;
- lineage;
- Gallery integration.

### Acceptance

```text
asset
→ upscale
→ new asset
→ Gallery
```

with cancellation and recovery behavior verified.

---

## 12. PHASE 9 — VECTORIZE

### Build

- input validation;
- trace settings;
- presets;
- complexity control;
- preview;
- retrace;
- SVG validation;
- background handling;
- download;
- Gallery save.

### Acceptance

The source asset remains intact and the SVG result is a distinct persisted asset when the behavior requires it.

---

## 13. PHASE 10 — REMOTION

### Build

- source loading;
- composition;
- timeline;
- keyframes;
- preview;
- render;
- output validation;
- Gallery integration.

### Acceptance

A render can be started, observed, completed or failed explicitly, and persisted as the expected output asset.

---

## 14. PHASE 11 — CROSS-MODULE INTEGRATION

Mandatory workflows:

### Workflow A

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

### Workflow B

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

### Workflow C

```text
Studio
 ↓
Remotion
 ↓
Gallery
```

### Workflow D

```text
Gallery
 ↓
Metadata
 ↓
Fix metadata field
 ↓
Export
```

### Acceptance

The selected asset context and lineage remain correct throughout every workflow.

---

## 15. PHASE 12 — RELIABILITY HARDENING

Test:

```text
crash recovery
cancel
retry
resume
duplicate click
partial batch
storage failure
AI timeout
AI 429
invalid JSON
provider failure
binary missing
```

### Acceptance

No critical action can reach a false “completed” state.

---

## 16. PHASE 13 — CANVAS BEHAVIORAL PARITY

For every critical capability, compare:

```text
input
→ decision
→ output
→ failure behavior
→ persistence impact
```

Do not compare only:

- function names;
- file names;
- code similarity;
- UI screenshots.

### Acceptance

Critical parity rows reach L5 in `PARITY_MATRIX.md`.

---

## 17. PHASE 14 — PRODUCTION HARDENING

Finalize:

```text
schema migrations
observability
production trace
error diagnostics
security audit
performance audit
build/package verification
```

### Acceptance

All critical production gates pass and no open P0 drift remains.

---

## 18. Work Ordering Rules

### Rule A — Build contracts before complex UI

The contract is the stable part. UI is allowed to evolve around it.

### Rule B — Build one thin vertical slice early

Before implementing every Studio feature, get one end-to-end path working:

```text
Request
→ AI
→ Asset
→ Gallery
```

Then expand safely.

### Rule C — Keep modules independent

A module must communicate via shared contracts, not by importing another module's private state.

### Rule D — Test after every structural change

At minimum:

```text
lint/typecheck
build
relevant integration test
```

---

## 19. Milestone Exit Criteria

A milestone cannot be marked complete merely because code compiles.

Every milestone must have:

```text
Implementation
+ Runtime evidence
+ Test evidence
+ Updated parity row(s)
```

---

## 20. Production Gate

Production-ready only when all are true:

```text
[ ] zero production stubs
[ ] zero fake resolvers
[ ] one canonical Studio pipeline
[ ] shared Asset contract
[ ] shared Job contract
[ ] structured errors
[ ] secure AI bridge
[ ] persistent jobs
[ ] crash recovery tested
[ ] cancellation tested
[ ] idempotency tested
[ ] Metadata workspace functional
[ ] Gallery functional
[ ] Studio E2E pass
[ ] Upscale E2E pass
[ ] Vectorize E2E pass
[ ] Remotion E2E pass
[ ] cross-module flows pass
[ ] Canvas behavioral parity pass
[ ] production trace pass
[ ] schema migration pass
[ ] build clean
[ ] no new @ts-nocheck
```

If one critical gate fails:

```text
PRODUCTION READY = NO
```

---

## 21. Post-Parity Roadmap

Only after the production gate:

```text
Market Signals
 ↓
Market Opportunity Engine
 ↓
Production Planner
 ↓
ProductionRequest
 ↓
Canonical Production Core
 ↓
Generation / QA / Metadata / Export
 ↓
Outcome / Feedback
 ↓
Feedback Learning Engine
 ↓
Production Policy
 ↓
Production Planner
```

Intelligence must integrate by producing plans/requests, not by bypassing module boundaries.
