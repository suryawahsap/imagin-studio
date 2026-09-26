# IMAGIN Studio Local — Product & Workspace Flow

**Status:** Final Product Flow Contract
**Date:** 2026-09-07
**Scope:** End-to-end application workflow, workspace responsibilities, routing, asset lifecycle, and cross-module UX.

---

## 1. Purpose

Dokumen ini menetapkan **alur aplikasi IMAGIN Studio Local secara end-to-end**.

Tujuan utamanya adalah menghilangkan ambiguity mengenai:

- workspace mana yang membuat asset;
- workspace mana yang memproses asset;
- workspace mana yang mengelola asset;
- workspace mana yang membuat metadata;
- kapan metadata dibuat;
- bagaimana asset berpindah antar-workspace;
- bagaimana single-asset dan bulk workflow bekerja;
- bagaimana user kembali ke Gallery setelah sebuah proses selesai.

Dokumen ini adalah kontrak product/workflow. Detail implementasi tetap berada di `ARCHITECTURE.md`, detail behavior di `BEHAVIOR_SPEC.md`, dan detail acceptance di `PARITY_MATRIX.md`.

---

## 2. Core Product Principle

IMAGIN Studio adalah production workstation, bukan sekadar image generator.

Model produk final:

```text
CREATE
  ↓
MANAGE
  ↓
ENRICH
  ↓
VALIDATE
  ↓
EXPORT
```

Interpretasi:

```text
Studio       = CREATE / MODIFY
Upscale      = ENHANCE
Vectorize    = CONVERT
Remotion     = COMPOSE / RENDER
Gallery      = MANAGE
Metadata     = ENRICH / VALIDATE
Export       = DELIVER
```

Metadata **bukan** bagian dari UI Studio dan **bukan** pekerjaan otomatis yang wajib selesai saat asset dibuat.

---

## 3. Final Workspace Model

Top-level navigation:

```text
Studio
Upscale
Vectorize
Remotion
Gallery
Metadata
```

Metadata boleh berada di top-level navigation karena sekarang merupakan workspace penuh, tetapi **entry point operasional utama** tetap melalui Gallery:

```text
Gallery
  → Select asset(s)
  → Create Metadata
  → Metadata Workspace
```

Top-level Metadata navigation tetap valid untuk user yang ingin membuka workspace metadata secara langsung dan memilih asset dari dalamnya.

---

## 4. Workspace Ownership

| Workspace | Primary Responsibility | Must Not Own |
|---|---|---|
| Studio | Generate, reference, batch, icon, JSON, revision, object modifier | Final stock metadata generation workflow |
| Upscale | Resolution/enhancement processing | Gallery business rules |
| Vectorize | Raster-to-vector processing | Metadata generation |
| Remotion | Video composition/rendering | Asset library ownership |
| Gallery | Search, filter, select, preview, grouping, routing, bulk asset actions | Domain logic of other modules |
| Metadata | AI metadata generation, editing, field regeneration, validation, export | Asset generation/editing |

---

## 5. Canonical Application Flow

### 5.1 Normal creation flow

```text
User
 ↓
Studio
 ↓
Configure generation
 ↓
Generate
 ↓
Production Pipeline
 ↓
QA / compliance / preflight
 ↓
Create Asset
 ↓
Persist Asset
 ↓
Gallery
```

At this point the asset may have production/provenance data, but stock metadata does **not** have to be generated.

Metadata state may be:

```text
metadata.status = NOT_GENERATED
```

---

### 5.2 Asset processing flow

From Gallery:

```text
Gallery
 ↓
Select asset
 ↓
Choose action
 ├── Send to Upscale
 ├── Send to Vectorize
 ├── Send to Remotion
 └── Create Metadata
```

When a processing action creates a new output:

```text
Source Asset
 ↓
Module Processing
 ↓
New Asset
 ↓
Lineage recorded
 ↓
Gallery
```

The source asset remains intact unless the explicit product contract requires in-place mutation.

---

## 6. Metadata Entry Flow

### 6.1 Single asset

```text
Gallery
 ↓
Select one asset
 ↓
Create Metadata
 ↓
Metadata Workspace
 ↓
Analyze asset
 ↓
Generate Metadata with AI
 ↓
Review
 ↓
Edit if necessary
 ↓
Validate
 ↓
Save
 ↓
Gallery
```

### 6.2 Bulk assets

```text
Gallery
 ↓
Select multiple assets
 ↓
Create Metadata
 ↓
Metadata Workspace
 ↓
Queue
 ↓
Analyze / Generate per asset
 ↓
Review failed / warning items
 ↓
Bulk validation
 ↓
Save
 ↓
Gallery
```

---

## 7. Metadata Is Not Generated in Studio

This is a **non-negotiable product rule**.

Studio does not expose a primary `Generate Metadata` action as part of the generation pipeline UI.

Studio may produce information that is useful to Metadata, such as:

```text
production context
prompt
concept
style
asset type
category context
visual DNA
lineage
```

That data is **input context**, not final stock metadata.

The Metadata module consumes that context together with visual analysis to produce metadata.

---

## 8. Gallery as the Cross-Workspace Hub

Gallery is the central operational hub.

Gallery owns:

```text
search
filter
sort
group
select
preview
bulk selection
lineage inspection
routing
```

Gallery can route:

```text
Gallery → Metadata
Gallery → Upscale
Gallery → Vectorize
Gallery → Remotion
```

The destination module owns the actual business operation.

---

## 9. Gallery View Modes

Gallery must support these view modes:

```text
Grid 5×5   ← default
Grid 4×4
Grid 3×3
List
Masonry
```

Recommended intent:

```text
Grid 5×5 = Browse / bulk production
Grid 4×4 = Balanced browsing
Grid 3×3 = Inspect
List      = Manage
Masonry   = Visual inspect / editorial browse
```

The selected view mode is a user preference and should persist.

---

## 10. Contextual Inspector Behavior

The right-side Inspector is contextual.

### No selection

Show:

```text
Gallery statistics
current filters
view context
recent activity
```

### One selected asset

Show:

```text
Preview
Asset info
Metadata summary
QA summary
Lineage
Quick actions
```

### Multiple selected assets

Show:

```text
Selection count
Bulk metadata action
Bulk export
Bulk routing
Bulk status
```

---

## 11. Metadata Workspace States

The Metadata workspace has at least these high-level states:

```text
EMPTY / SELECT ASSETS
      ↓
READY TO GENERATE
      ↓
ANALYZING
      ↓
GENERATING
      ↓
GENERATED
      ↓
EDITING
      ↓
VALIDATING
      ↓
READY
```

Error states:

```text
FAILED
PARTIAL
INVALID
```

Each state must be observable and recoverable.

---

## 12. Metadata Workspace Single-Asset UX

When metadata does not exist:

```text
Asset Preview

Metadata not generated

[ ✨ Generate Metadata ]
```

After generation:

```text
Title
[ field ] [Regenerate]

Description
[ field ] [Regenerate]

Keywords
[ tags ] [Regenerate]

Category
[ suggested value ] [Suggest]

[ Validate ]    [ Save Metadata ]
```

The primary action changes from:

```text
Generate Metadata
```

to:

```text
Regenerate Metadata
```

once metadata already exists.

---

## 13. Metadata Workspace Bulk UX

For multiple assets:

```text
Metadata Queue

#01 mountain_01.png    Generating
#02 mountain_02.png    Complete
#03 mountain_03.png    Needs Review
#04 mountain_04.png    Failed
...
```

Bulk controls:

```text
Generate All
Validate All
Retry Failed
Review Issues
Export Ready
```

A failed item must not silently disappear from the queue.

---

## 14. Metadata Result Lifecycle

```text
NOT_GENERATED
      ↓
GENERATING
      ↓
GENERATED
      ↓
EDITED
      ↓
VALIDATING
      ↓
READY
```

Possible exception states:

```text
FAILED
INVALID
NEEDS_REVIEW
```

Metadata readiness belongs to the Metadata module and is reflected back into Gallery.

---

## 15. Cross-Module Return Rule

Every module should return a completed output into Gallery when it creates or modifies a persistent asset.

Examples:

```text
Studio → Gallery
Upscale → Gallery
Vectorize → Gallery
Remotion → Gallery
Metadata → Gallery
```

The Gallery therefore represents the current asset inventory after every successful production stage.

---

## 16. Canonical Asset Lifecycle

```text
Input / Source
      ↓
Studio Generated Asset
      ↓
Gallery
      ├────────→ Upscale → New Asset → Gallery
      ├────────→ Vectorize → New Asset → Gallery
      ├────────→ Remotion → New Asset → Gallery
      └────────→ Metadata → Metadata Applied → Gallery
                                      ↓
                                   Export
```

Lineage must preserve parent/child relationships.

---

## 17. Metadata and Production Context Boundary

Studio may store:

```text
prompt
model
DNA
style
concept
composition
production trace
```

Metadata may consume:

```text
visual truth
visual profile
production context
asset type
category context
platform rules
```

Metadata may **not** assume the Studio prompt is visually true.

Visual analysis has priority.

---

## 18. Task Center Integration

All long-running work uses the shared Job system.

Examples:

```text
Text to Image
Metadata Generation
Metadata Validation
Upscale
Vectorize
Remotion
Export
```

Task Center must show:

```text
module
job type
asset
stage
progress
status
created time
actions
```

A Metadata generation job is therefore first-class and behaves like other asynchronous jobs.

---

## 19. Cancellation and Recovery

The user can cancel queued/processing jobs where supported.

Rules:

```text
cancel queued       → cancelled
cancel processing   → abort + reconcile
completed           → cannot cancel
```

After application restart:

```text
open app
 ↓
reconcile durable jobs
 ↓
restore metadata queue state
 ↓
show recovered state
```

Resume must not silently become regenerate.

---

## 20. Recommended Top-Level Navigation

```text
IMAGIN STUDIO
────────────────────────────────────────────
Studio | Upscale | Vectorize | Remotion | Gallery | Metadata
```

Metadata can also be reached contextually from Gallery.

This provides two entry paths:

```text
Direct:
Metadata → select asset(s)

Contextual:
Gallery → select asset(s) → Create Metadata
```

Both paths must converge on the same Metadata application use cases.

---

## 21. Final Product Flow

```text
                       IMAGIN STUDIO
                              │
                     ┌────────┴────────┐
                     │    APP SHELL    │
                     └────────┬────────┘
                              │
        ┌──────────┬──────────┼───────────┬───────────┬──────────┐
        ▼          ▼          ▼           ▼           ▼          ▼
      Studio    Upscale   Vectorize    Remotion    Gallery   Metadata
        │          │          │           │           │          │
        │          │          │           │           │          │
        └──────────┴──────────┴───────────┴───────────┤          │
                                                     │          │
                                                     ▼          │
                                                  Asset Hub     │
                                                     │          │
                                                     └────┬─────┘
                                                          ▼
                                                 Metadata Workspace
                                                          │
                                             ┌────────────┼────────────┐
                                             ▼            ▼            ▼
                                          Generate      Edit       Validate
                                             │            │            │
                                             └────────────┼────────────┘
                                                          ▼
                                                       Export
```

---

## 22. Non-Negotiable UX Rules

1. Studio does not own stock metadata generation UI.
2. Gallery is the main asset routing hub.
3. Metadata is a real workspace, not a popup-only capability.
4. Metadata supports single and bulk processing.
5. AI generation and manual editing coexist in the same workspace.
6. Field-level regeneration must be available.
7. Every asynchronous metadata operation appears in Task Center.
8. Metadata state must persist.
9. Outputs that are distinct assets preserve lineage.
10. No module accesses another module's private state directly.


---

## 23. Workspace Specification Governance

Each of the six workspaces has a dedicated UX contract:

```text
workspace/STUDIO_WORKSPACE.md
workspace/GALLERY_WORKSPACE.md
workspace/METADATA_WORKSPACE.md
workspace/UPSCALE_WORKSPACE.md
workspace/VECTORIZE_WORKSPACE.md
workspace/REMOTION_WORKSPACE.md
```

These files define layout, hierarchy, interactions, states, and user flow. They are implementation acceptance inputs, not optional design notes.

The implementation sequence is:

```text
UI Reference
→ Workspace Specification
→ Module UI Implementation
→ Runtime Verification
→ Parity Evidence
```

---

## 24. Studio Milestone UI Rule

Studio implementation is split into two internal delivery gates:

```text
M5A — Core / Thin Slice
M5B — Final Studio Workspace UI/UX
```

M5A may use a functional skeleton to prove the vertical slice. That skeleton must not be mistaken for the finished Studio workspace. M5B is the required gate for the final layout and interaction contract before M6 specialized modes.
