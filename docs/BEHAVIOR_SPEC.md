# IMAGIN Studio Local — Behavior Specification

**Status:** Master Behavioral Contract  
**Date:** 2026-09-06  
**Primary behavioral reference:** `imagin_studio_strong_v2.tsx`  
**UI reference:** `reference/ui/`

---

## 1. Purpose

This document defines what the new Local implementation must do. It is intentionally independent from folder structure and implementation technology.

The Canvas Upgraded source is the behavioral gold reference for Studio. The new UI images are the product/workflow reference for the desktop experience.

When implementation differs from Canvas because of desktop architecture, the behavior must still remain semantically equivalent unless the difference is explicitly approved as an intentional drift.

---

## 2. Behavioral Principles

### 2.1 Semantic integrity

User intent is authoritative.

```text
User subject
   ↓
Semantic anchor
   ↓
Enrichment may add detail
   ↓
Enrichment must not silently replace the subject/domain
```

### 2.2 Visual truth

For workflows that operate on an existing image, the image is the primary source of truth.

```text
IMAGE / VISUAL TRUTH
        >
VISUAL PROFILE
        >
ASSET CONTEXT
```

### 2.3 Deterministic policy before side effects

Validate and resolve before generation, and resolve hard blocks before claiming success.

### 2.4 No hidden state

Every critical production decision must have an explicit state or traceable result.

---

## 3. Studio Generation Contract

### 3.1 Normal generation

Input can include:

- prompt;
- asset type;
- style;
- category/platform;
- aspect ratio;
- background;
- output format;
- resolution target;
- quality options;
- diversity options;
- collection options.

Expected flow:

```text
intake
→ normalize
→ resolve config
→ semantic intent
→ DNA
→ diversity/composition
→ prompt compile
→ differentiation
→ generate
→ finalize
→ QA
→ compliance/preflight
→ persist
```

Failure before the generation call should prevent the call.

---

## 4. Reference Image Workflow

Reference image behavior is a critical parity domain.

Expected behavior:

```text
reference image
→ visual analysis
→ infer asset type
→ infer style
→ infer aspect ratio
→ infer background
→ infer output format
→ construct visual DNA
→ build rendering directive
→ skip AI expansion
→ compile prompt
```

The reference workflow must preserve the visual directives inferred from the reference rather than running a second generic expansion that can rewrite the intended rendering semantics.

### Required scenarios

1. Empty prompt + reference.
2. Existing prompt + reference.
3. Rapid reference replacement.
4. Cancelled reference analysis.
5. Unsupported image.
6. Vision failure.
7. Photo reference.
8. 3D reference.
9. Pattern reference.
10. Icon reference.

---

## 5. Visual Settings Inference and Overrides

When reference inference provides settings, the UI must visibly distinguish inferred values from explicit user overrides.

Conceptually:

```text
inferred
  ↓
reference value
  ↓
user override
```

An explicit override must win and must be traceable.

---

## 6. Icon Generation

Icon mode uses icon-specific DNA and constraints.

Requirements:

- 1:1 aspect ratio behavior where locked by icon mode;
- icon style follows selected Icon Style DNA;
- icon-specific negative rules are applied;
- sheet and per-canvas modes follow configured generation semantics;
- the resulting icon asset(s) remain compatible with the canonical production core;
- diversity must prevent repeated or near-identical icon outputs in a set.

The Canvas Upgraded source contains multiple named icon presets and explicit style/negative semantics. These are data/rules, not UI decoration.

---

## 7. Batch Generation

Batch is a planning/orchestration layer over the canonical production core.

```text
Batch Input
 ↓
ProductionPlan[]
 ↓
runProductionPipeline(item)
```

Behavior must include:

- quantity handling;
- batch progress;
- pause/resume when supported;
- cancellation;
- per-item failure reporting;
- no duplicate committed assets during resume;
- preservation of diversity constraints.

---

## 8. JSON Batch Import

JSON import is responsible for:

```text
parse
→ validate
→ normalize
→ ProductionRequest[]
```

It must not contain its own hidden image-generation algorithm.

Where the input contract supports defaults and per-prompt overrides, defaults apply first and prompt-level values override them.

Invalid JSON must surface actionable validation errors before production starts.

---

## 9. Prompt and DNA Behavior

Prompt compilation must use layered semantics:

```text
USER INTENT
SEMANTIC LOCK
ASSET PROFILE
CATEGORY DNA
STYLE DNA
COMMERCIAL DNA
COMPOSITION
DIVERSITY
NEGATIVE
QUALITY / OUTPUT
```

DNA sources include, where applicable:

- canonical intent;
- resolved config;
- CATEGORY_DNA;
- STYLE_PRESET_DNA;
- commercial rules;
- CGA;
- negative layers;
- diversity constraints.

Before the provider call:

```text
compile
→ validate prompt integrity
→ if invalid: block
→ if valid: generate
```

---

## 10. Differentiation and Similarity

Concept intelligence must evaluate more than literal string duplication.

Required capability areas:

```text
genericity
fingerprint
pre-generation similarity
post-generation similarity
library similarity
batch diversity
differentiation
```

Conceptual decision:

```text
High duplicate risk
→ differentiate or regenerate

Medium risk
→ differentiate

Low risk
→ proceed
```

Do not perform redundant AI analysis for the same unchanged semantic concept when deterministic identity/caching can prevent it.

---

## 11. Visual QA and Preflight

QA must be structured and actionable.

A QA issue is conceptually:

```text
id
type
severity
confidence
score
threshold
evidence
message
```

Preflight must distinguish at least:

- visual truth;
- semantic correctness;
- technical issues;
- IP/brand;
- content safety;
- category;
- metadata;
- watermark;
- similarity;
- diversity.

Hard-block conditions must be explicit.

---

## 12. Metadata Behavior

Metadata generation must prioritize what the asset visibly contains.

```text
visual truth
→ visual profile
→ asset context
```

Metadata fields:

- title;
- description;
- keywords.

Field-level regeneration is mandatory:

```text
title only
or
description only
or
keywords only
```

A field-level regeneration must not rerun the entire asset production pipeline.

---

## 13. Metadata Eligibility

The product must make eligibility explicit.

The behavioral reference allows metadata regeneration for appropriate non-final states, while avoiding reprocessing assets that are already final/submitted or otherwise ineligible.

The exact status taxonomy must be encoded once in the new contract and tested.

---

## 14. Auto-Regeneration

Auto-regeneration is bounded.

Rules:

- no infinite loops;
- only retry known retryable or correctable failures;
- each attempt is traceable;
- the cause of regeneration is recorded;
- the final state indicates whether regeneration passed, failed, or exhausted its bound.

---

## 15. Revision

Revision creates a new production request derived from an existing asset.

Required semantics:

```text
Parent Asset
 ↓
Revision Request
 ↓
New Attempt
 ↓
New Result Asset
```

The parent must remain traceable.

---

## 16. Object Modifier

Object modification also operates on an existing asset and therefore must preserve provenance.

Expected semantics:

```text
Source asset
 ↓
Modification intent
 ↓
Generation
 ↓
QA
 ↓
New asset
```

The original asset must remain recoverable and identifiable.

---

## 17. Background Removal

The new project does not reintroduce remove.bg or Photoroom.

The product behavior may use the approved local background-removal path. No removed provider state, settings, or IPC surface should reappear.

---

## 18. Gallery Behavior

Gallery is the central asset workspace.

Required behavior:

- grid/list presentation;
- search;
- filters;
- selection;
- bulk actions;
- preview;
- lineage inspection;
- routing to Metadata, Upscale, Vectorize, Remotion, and other allowed actions.

An operation that produces a new asset must appear as a distinct gallery item when the product behavior expects a new result.

Example: an SVG trace result is saved as a new asset rather than overwriting the source raster asset.

---

## 19. Metadata Workspace Behavior

The UI reference implies Metadata should be a real workspace rather than a small popup-only feature.

Minimum workflow:

```text
Select assets
 ↓
Queue
 ↓
Analyze
 ↓
Edit
 ↓
Validate
 ↓
Regenerate individual fields
 ↓
Export
```

The workspace must support both single-asset inspection and bulk processing.

---

## 20. Upscale Behavior

Expected behavior:

```text
input asset
→ validation
→ processing
→ progress
→ output asset
→ lineage
→ Gallery
```

The original asset remains intact unless an explicit product action requires in-place mutation.

---

## 21. Vectorize Behavior

Expected behavior:

```text
input raster
→ validation
→ trace configuration
→ trace
→ preview
→ optional retrace
→ quality/resolution validation
→ save as SVG asset
→ Gallery
```

The product reference includes multiple trace presets, complexity levels, background modes, advanced settings, preview zoom, download, and Gallery save.

---

## 22. Remotion Behavior

Expected behavior:

```text
source
→ composition
→ timeline/keyframes
→ preview
→ render
→ output validation
→ asset persistence
→ Gallery
```

Render failures must be explicit and recoverable where feasible.

---

## 23. Job Lifecycle Behavior

Critical jobs must behave predictably:

```text
queued
→ processing
→ complete
```

or:

```text
processing
→ failed
```

or:

```text
queued
→ cancelled
```

A completed job cannot silently revert to a non-terminal state.

---

## 24. Crash and Recovery Behavior

Required invariant:

```text
generate
→ process crashes
→ restart
→ discover incomplete job
→ recover/reconcile
```

Recovery must avoid duplicating already committed outputs.

---

## 25. Cancellation

Expected:

```text
queued → cancel
processing → abort
completed → cannot cancel
```

Cancellation must be user-visible and traceable.

---

## 26. Duplicate Actions

Rapid repeated actions must not create duplicate logical productions.

```text
double click
→ one logical request
```

This must be enforced by request identity/idempotency, not only by disabling a button in React.

---

## 27. AI Error Behavior

At minimum distinguish:

```text
401 / key
403 / permission
429 / rate limit
408 / timeout
aborted / cancellation
invalid_response
invalid_json
safety_block
provider_error
network_error
```

Errors must carry enough information for UI, retry policy, logs, and trace.

---

## 28. Export and Persistence

Exports must be actual file operations and verifiable.

Persistence failures must never produce a false “completed” state.

The asset is only considered durable when required persistence succeeds.

---

## 29. Behavior vs Architecture

The following may differ internally without violating behavior:

- Electron storage vs browser storage;
- IPC vs direct provider access;
- durable jobs vs transient UI state;
- Gallery as centralized asset workspace;
- native binary execution in Electron.

Any difference that changes user-visible production semantics is a parity issue and must be tested.
