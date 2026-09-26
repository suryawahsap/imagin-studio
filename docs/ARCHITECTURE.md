# IMAGIN Studio Local — Architecture

**Status:** Master Architecture Contract  
**Date:** 2026-09-06  
**Project type:** Clean reimplementation / new project  
**Behavior reference:** `imagin_studio_strong_v2.tsx`  
**UI reference:** `reference/ui/`  
**Implementation reference:** old `imagin-local` only for lessons, not structure

---

## 1. Purpose

IMAGIN Studio Local is a desktop creative production suite. The architecture must support multiple production workspaces that operate on one shared asset ecosystem while keeping business logic, UI, persistence, native execution, and AI access separated.

The project is not a file-by-file migration from Canvas. It is a clean reimplementation of the product behavior using a desktop-first architecture.

---

## 2. Product Model

Top-level workspaces:

```text
Studio
Upscale
Vectorize
Remotion
Gallery
```

Metadata is a full architectural module but does not need to be a top-level navigation item. Primary entry point:

```text
Gallery
  -> Select asset(s)
  -> Create Metadata
  -> Metadata Workspace
```

All workspaces operate on shared assets and shared jobs.

```text
                    SHARED ASSET SYSTEM
                           |
       +---------+---------+---------+---------+
       |         |         |         |         |
     Studio  Metadata  Upscale  Vectorize  Remotion
       |         |         |         |         |
       +---------+---------+---------+---------+
                           |
                        Gallery
```

---

## 3. Architectural Layers

```text
UI
 ↓
Application / Use Cases
 ↓
Domain
 ↓
Shared Domain
 ↓
Infrastructure
 ↓
Electron / OS / Provider / Native Binary
```

### 3.1 UI

Responsible for:

- collecting input;
- displaying state;
- triggering application actions;
- presenting validation, progress, results, and errors.

UI must not own production rules, provider access, persistence, or domain decisions.

### 3.2 Application

Responsible for orchestration of a user-facing use case.

Examples:

- generate asset;
- generate metadata;
- upscale selected assets;
- vectorize an asset;
- render animation;
- create a gallery task.

Application code may coordinate multiple domain services but does not become a second domain implementation.

### 3.3 Domain

Responsible for business semantics and deterministic decision logic.

Examples:

- production planning;
- intent normalization;
- DNA resolution;
- prompt compilation;
- similarity/differentiation;
- metadata policy;
- QA/preflight;
- revision semantics.

Domain code must remain independent from React, Electron APIs, and concrete providers.

### 3.4 Shared Domain

Cross-module contracts:

```text
Asset
Job
Project
Platform
Error
Events
QA
```

Shared Domain is where cross-module semantics live. It must not become a generic dump for unrelated utilities.

Field-level canonical owners (M2): Asset → `src/shared/asset/contract.ts` (D-020), Job → `src/shared/job/contract.ts` (D-021), Errors → `src/shared/errors/contract.ts` (D-022), QA issues → `src/shared/qa/contract.ts`. These code contracts are the single source of truth for shapes; this document remains the architectural boundary definition.

### 3.5 Infrastructure

Responsible for external effects:

- AI transport;
- storage;
- library persistence;
- job persistence;
- settings;
- native binary execution;
- Electron IPC.

---

## 4. Workspace Specification / UI Contract

Workspace UX is specified separately from implementation. The UI reference lives under `reference/ui/`; approved UX/layout/interaction contracts live under `docs/workspace/`; implementation lives under each module `ui/` boundary.

```text
reference/ui/
      ↓
docs/workspace/*.md
      ↓
src/modules/*/ui/
      ↓
PARITY_MATRIX.md
```

Every workspace specification is a mandatory acceptance input for its implementation milestone.

| Workspace | UX contract | Implementation owner | Milestone |
|---|---|---|---|
| Studio | `workspace/STUDIO_WORKSPACE.md` | `src/modules/studio/ui/` | M5B/M6 |
| Gallery | `workspace/GALLERY_WORKSPACE.md` | `src/modules/gallery/ui/` | M4 |
| Metadata | `workspace/METADATA_WORKSPACE.md` | `src/modules/metadata/ui/` | M7 |
| Upscale | `workspace/UPSCALE_WORKSPACE.md` | `src/modules/upscale/ui/` | M8 |
| Vectorize | `workspace/VECTORIZE_WORKSPACE.md` | `src/modules/vectorize/ui/` | M9 |
| Remotion | `workspace/REMOTION_WORKSPACE.md` | `src/modules/remotion/ui/` | M10 |

---

## 5. Project Structure

```text
imagin-studio-local/
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BEHAVIOR_SPEC.md
│   ├── PARITY_MATRIX.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── DEVELOPMENT_RULES.md
│
├── reference/
│   └── canvas-upgraded/
│       └── imagin_studio_strong_v2.tsx
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   │   ├── index.ts
│   │   ├── studio.ts
│   │   ├── metadata.ts
│   │   ├── gallery.ts
│   │   ├── upscale.ts
│   │   ├── vectorize.ts
│   │   ├── remotion.ts
│   │   ├── jobs.ts
│   │   ├── settings.ts
│   │   └── projects.ts
│   ├── services/
│   │   ├── ai/
│   │   ├── assets/
│   │   ├── jobs/
│   │   ├── storage/
│   │   ├── projects/
│   │   └── settings/
│   └── binaries/
│       ├── ffmpeg.ts
│       ├── inkscape.ts
│       ├── vtracer.ts
│       ├── realesrgan.ts
│       ├── waifu2x.ts
│       └── whisper.ts
│
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router/
│   │   └── shell/
│   ├── shared/
│   │   ├── asset/
│   │   ├── job/
│   │   ├── project/
│   │   ├── platform/
│   │   ├── errors/
│   │   ├── events/
│   │   └── ui/
│   └── modules/
│       ├── studio/
│       ├── metadata/
│       ├── upscale/
│       ├── vectorize/
│       ├── remotion/
│       └── gallery/
│
├── storage/
└── scripts/
```

The directory names are architectural boundaries, not decoration. If a file cannot be clearly assigned to one boundary, the design must be resolved before implementation continues.

---

## 5. Shared Asset Architecture

`shared/asset/` is the central data model for the product.

Target conceptual shape:

```text
Asset
├── identity
├── source
├── file
├── media
├── metadata
├── production
├── qa
├── platform
├── relations
└── provenance
```

### 5.1 Asset lineage

An asset may produce other assets:

```text
Original
  ↓
Studio generated
  ↓
Upscaled
  ↓
Metadata applied
  ↓
Revision
  ↓
Exported
```

Transformations must create explicit provenance/relations rather than silently overwriting the source asset when the product behavior expects a new result item.

### 5.2 Gallery role

Gallery is the centralized asset management workspace. It is not the owner of Studio, Metadata, Upscale, Vectorize, or Remotion domain logic.

Gallery owns:

- query;
- search;
- filtering;
- grouping;
- selection;
- preview;
- bulk actions;
- lineage inspection;
- routing to another workspace.

---

## 6. Shared Job Architecture

All asynchronous work uses one conceptual job contract.

```text
Job
├── id
├── module
├── type
├── status
├── stage
├── progress
├── input
├── output
├── error
├── retry
├── createdAt
├── updatedAt
└── recovery
```

Typical job types:

```text
StudioJob
MetadataJob
UpscaleJob
VectorizeJob
RemotionJob
ImportJob
ExportJob
```

The contract is shared; execution is module-specific.

### 6.1 Lifecycle

Canonical enum (D-015/D-021, owned by `src/shared/job/contract.ts`):

```text
queued
→ preparing
→ processing
→ finalizing
→ completed
```

Terminal/error states:

```text
cancelled
failed
recovery_required   (re-enter via retry/recovery transitions)
```

No `running` or `paused` status exists (Canvas states retired per D-015). Exact stage names may vary by module, but status semantics must remain explicit and observable. Idempotency: every job carries required `requestId` + `idempotencyKey` (BEHAVIOR_SPEC §26).

---

## 7. Studio Architecture

Studio is the main AI production engine.

```text
modules/studio/
├── domain/
│   ├── production/
│   ├── generation/
│   ├── prompt/
│   ├── dna/
│   ├── composition/
│   ├── intent/
│   ├── concept-intelligence/
│   ├── quality/
│   ├── metadata/
│   ├── revision/
│   └── asset/
├── application/
│   ├── generate.ts
│   ├── batch.ts
│   ├── reference.ts
│   ├── icon.ts
│   ├── json.ts
│   ├── revision.ts
│   └── object-modifier.ts
├── state/
├── registry/
└── ui/
```

### 7.1 Canonical production core

All Studio modes converge into:

```text
ProductionRequest
    ↓
ProductionPlan
    ↓
Canonical Production Pipeline
    ↓
ProductionResult
    ↓
ProductionTrace
```

Modes:

```text
Normal
Batch
Icon
JSON
Reference
Revision
Object Modifier
```

must not create independent production pipelines.

### 7.2 Production pipeline

```text
1. intake
2. normalize
3. resolve
4. semantic intent
5. plan
6. DNA
7. composition / diversity
8. prompt compilation
9. differentiation gate
10. generation
11. finalize
12. technical QA
13. visual QA
14. compliance
15. preflight
16. repair / bounded regeneration
17. persist asset + production trace
18. complete

Stock metadata generation is not a mandatory Studio step. Metadata is generated later by the Metadata workspace.
```

---

## 8. Metadata Architecture

Metadata is a first-class module even when entered through Gallery.

```text
modules/metadata/
├── domain/
│   ├── metadata-engine.ts
│   ├── metadata-policy.ts
│   ├── metadata-validator.ts
│   ├── metadata-regeneration.ts
│   ├── keyword-engine.ts
│   └── platform-rules.ts
├── application/
│   ├── generate-metadata.ts
│   ├── regenerate-field.ts
│   ├── validate-metadata.ts
│   └── export-metadata.ts
├── state/
└── ui/
    ├── MetadataWorkspace.tsx
    ├── MetadataQueue.tsx
    ├── MetadataEditor.tsx
    ├── KeywordEditor.tsx
    ├── MetadataQA.tsx
    └── MetadataExport.tsx
```

Workflow:

```text
Gallery
 ↓
Select asset(s)
 ↓
Create Metadata
 ↓
Analyze
 ↓
Title / Description / Keywords
 ↓
Platform validation
 ↓
Manual edit
 ↓
Field regeneration
 ↓
Export
```

Metadata must preserve visual-truth precedence from the behavioral reference.

---

## 9. Upscale Architecture

```text
Load
→ Validate
→ Pre-process
→ Tile
→ ESRGAN / Waifu2x
→ Fusion
→ Post-process
→ Format
→ Save Asset
→ Gallery
```

Native execution belongs to Electron infrastructure, not React domain code.

---

## 10. Vectorize Architecture

```text
Load
→ Validate
→ Trace settings
→ VTracer
→ SVG post-process
→ Quality validation
→ Save Asset
→ Gallery
```

The UI may provide presets, complexity, background options, previews, re-tracing, download, and gallery save; those controls are not allowed to become domain implementations inside JSX.

---

## 11. Remotion Architecture

```text
Source
→ Composition
→ Timeline
→ Preview
→ Render
→ Output validation
→ Save Asset
→ Gallery
```

Rendering belongs to Electron/native infrastructure where applicable.

---

## 12. Electron Infrastructure

Electron IPC is an adapter boundary, not the business-logic center.

```text
Renderer
 ↓
Preload
 ↓
IPC handler
 ↓
Service
 ↓
OS / provider / binary
```

IPC responsibilities:

- validate transport input;
- call the correct service;
- return structured results/errors;
- emit relevant events.

IPC must not contain large production algorithms.

---

## 13. AI Access

All AI calls use the configured secure gateway architecture.

```text
Renderer
 ↓
Preload
 ↓
IPC
 ↓
AI Service
 ↓
Configured provider / 9Router
```

No API secret may exist in renderer state, ordinary storage JSON, DOM, logs, or production trace.

### 13.1 Key-handling contract (promoted verbatim from `reference/infrastructure/9router.md` §8 per D-019)

- **Simpan:** `settings.studio.encryptedNineRouterKey` (base64 dari `safeStorage.encryptString`), file `storage/metadata/settings.json`. `persist()` selalu menghapus field plaintext. Load: migrasi otomatis plaintext → encrypted bila `safeStorage` tersedia; bila tidak tersedia, plaintext **dihapus tanpa fallback**.
- **Baca:** hanya `getDecryptedNineRouterKey()` di main. Renderer hanya terima `hasNineRouterKey: boolean`.
- **Tulis:** konfigurasi channel (Local: `settings:set`, menggantikan legacy `studio:save-config`) menerima `nineRouterApiKey` (≤8000 char); string kosong = hapus key.
- **Test cutover:** test harus assert tidak ada `nineRouterApiKey` plaintext di `settings.json`.

Generasi transport menggunakan satu channel `studio:produce` dengan discriminator `mode` (D-016); connection-test dan model-catalog tetap channel eksplisit terpisah.

---

## 14. State Architecture

Do not create one mega-store.

Use module-local state:

```text
AppState
StudioState
MetadataState
UpscaleState
VectorizeState
RemotionState
GalleryState
```

Persistent truth belongs to persistence/domain services, not React state.

---

## 15. Production Trace

Every critical production result must be traceable.

```text
productionTrace {
  request
  normalizedRequest
  resolvedConfig
  semanticIntent
  dnaVersion
  promptVersion
  generation
  finalization
  qa
  metadata
  preflight
  regeneration
  export
}
```

Minimum questions an asset must answer:

- what intent created it;
- what config was resolved;
- what DNA/prompt version was used;
- which model was used;
- what reference, if any, was used;
- how many retries/regenerations occurred;
- why QA/preflight passed or failed;
- where metadata came from;
- what platform/export target was used.

---

## 16. Intentional Architectural Drifts

Allowed deviations from Canvas behavior/architecture:

1. Electron persistent storage instead of browser storage.
2. IPC + secure storage instead of direct provider access.
3. Durable jobs and recovery.
4. Centralized Gallery asset management.
5. Metadata as a full workspace/module.
6. Native execution in Electron services.

These are architecture improvements and must not change intended production semantics.

All other drifts require explicit documentation and parity review.

---

## 17. Non-Goals

The new project must not bring back:

- remove.bg integration;
- Photoroom integration;
- giant single-file Canvas architecture;
- direct provider fetch from renderer;
- browser-storage tricks used only by Canvas;
- migration-specific hacks;
- fake implementations that hide missing capability.

Freepik remains locked until its taxonomy, metadata limits, exporter mapping, and verification are established.

---

## 18. Architectural Definition of Done

The architecture is accepted when:

```text
UI
 ↓
Application
 ↓
Domain
 ↓
Shared Domain
 ↓
Infrastructure
```

is respected, and:

- all critical production modes use one canonical execution core;
- Asset and Job are shared contracts;
- Gallery is centralized asset management;
- AI access is isolated behind Electron infrastructure;
- critical persistence is explicit;
- production trace exists;
- no production business logic is hidden in UI;
- no new `@ts-nocheck` exists;
- architecture drift is intentional and documented.


---

## 19. Workspace Completion Gate

For every user-facing workspace:

```text
Domain/Application complete
        +
Workspace spec implemented
        +
All required UI states covered
        +
Action → state → result → persistence verified
        +
Parity evidence
        =
Workspace complete
```
