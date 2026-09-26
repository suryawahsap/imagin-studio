# IMAGIN Studio — Metadata Workspace Specification

**Status:** Product/UI/Flow Contract
**Purpose:** Menetapkan Metadata sebagai AI Metadata Production Workspace untuk generate, review, edit, validate, dan export metadata.

## 1. Product Boundary

Metadata adalah full workspace dan first-class module.

```text
Studio      = Create / modify asset
Gallery     = Manage asset
Metadata    = Generate / edit / validate stock metadata
Upscale     = Resolution enhancement
Vectorize   = Raster → vector
Remotion    = Asset → video
```

AI metadata generation tidak terjadi sebagai mandatory step di Studio. Entry utama:

```text
Gallery
  ↓
Select asset(s)
  ↓
Create Metadata
  ↓
Metadata Workspace
```

## 2. Core Metadata Flow

```text
Select Asset(s)
  ↓
Queue
  ↓
Analyze
  ↓
AI Generate Metadata
  ↓
Review
  ↓
Manual Edit
  ↓
Validate
  ↓
Ready
  ↓
Export
```

## 3. Layout

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Top Navigation                                                           │
├────────────────┬───────────────────────────────────────┬─────────────────┤
│ ASSET QUEUE    │ METADATA WORKSPACE                    │ INSPECTOR       │
│                │                                       │                 │
│ Search         │ Asset header / status                 │ Asset            │
│ Status filters │                                       │ Production       │
│                │ Preview                               │ Technical        │
│ Asset 01  ✓    │                                       │ Lineage          │
│ Asset 02  ◐    │ AI Metadata                           │                 │
│ Asset 03  ⚠    │                                       │ Metadata status  │
│ Asset 04  ⏳   │ Title                                 │                 │
│ ...            │ Description                           │                 │
│                │ Keywords                              │                 │
│                │ Category / License                    │                 │
│                │                                       │                 │
│                │ AI actions / quality / validation     │                 │
├────────────────┴───────────────────────────────────────┴─────────────────┤
│ Task Center / batch progress                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4. Initial State — Metadata Not Generated

For an eligible asset with no metadata:

```text
Metadata not generated yet

AI will analyze:
✓ Visual content
✓ Visual profile
✓ Production context
✓ Platform rules

[ Generate Metadata ]
```

The primary CTA is `Generate Metadata`.

## 5. Generated State

After generation, the center area becomes an editable metadata editor.

Fields:
- title;
- description;
- keywords;
- category;
- license where applicable;
- platform-specific fields when supported.

## 6. AI Command Bar

Recommended actions:

```text
[ Generate All ]
[ Regenerate ▼ ]
[ Validate ]
[ Compare ]
```

Regenerate menu:
- Title;
- Description;
- Keywords;
- All.

## 7. Field-Level Regeneration

Field regeneration is independent.

```text
Title
[ ✨ Regenerate ]

Description
[ ✨ Regenerate ]

Keywords
[ ✨ Regenerate ]
```

A field-level regeneration must not rerun the entire asset production pipeline.

## 8. AI Truth Hierarchy

Metadata generation must prioritize:

```text
Visual Truth
   >
Visual Profile
   >
Asset Context
```

The final metadata must describe what the resulting asset actually contains. Prompt text or inherited metadata is context, not permission to invent visible content.

## 9. Inputs to Metadata Engine

Conceptually:

```text
Asset
+
Visual Analysis
+
Visual Profile
+
Production Context
+
Concept Context
+
Platform Rules
```

Production context may include model, style, DNA, prompt context, category context, and lineage, but visual truth remains the highest priority.

## 10. Metadata Quality Panel

The workspace should expose validation/review results such as:
- title status;
- description status;
- keyword count;
- keyword relevance;
- duplicate/similar keyword issues;
- category validity;
- platform compliance;
- hard blocks;
- items requiring review.

Example:

```text
Metadata Quality
✓ Title
✓ Description
✓ Keywords
✓ Category
✓ Platform Compliance
```

Issues should provide actionable reasons, not only a generic failed status.

## 11. Platform Selection

The workspace may expose:

```text
Target Platform
[ Adobe Stock ▼ ]
```

Platform rules should drive validation/export normalization.

Freepik remains unavailable/locked until its contract and verification requirements are satisfied.

## 12. Technical / Production Inspector

### Asset
- file;
- type;
- dimensions;
- size;
- format;
- timestamps.

### Production
- source workspace;
- model;
- style;
- DNA;
- relevant prompt context.

### Technical
- color profile;
- checksum;
- version;
- actual file characteristics.

### Lineage
- parent asset;
- transformation chain;
- derived outputs.

## 13. Status Lifecycle

Recommended metadata state machine:

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

Error/review states:

```text
GENERATED / EDITED
      ↓
NEEDS_REVIEW or INVALID
      ↓
EDIT / REGENERATE
      ↓
VALIDATE
```

## 14. Bulk Metadata Flow

```text
Gallery
  ↓
Select 30 assets
  ↓
Create Metadata
  ↓
Metadata Queue
  ↓
Analyze / Generate each asset
  ↓
28 Ready
2 Needs Review
  ↓
Review issues
  ↓
Validate All
  ↓
Export All
```

The queue must show per-asset status and shared job progress.

## 15. Manual Editing

User must be able to edit AI-generated values directly. Manual edits persist and must return through validation before the asset is considered Ready.

## 16. Export

Export is a real operation:

```text
Validated metadata
  ↓
Platform normalization
  ↓
Write actual export file(s)
  ↓
Verify output
  ↓
Mark export state
```

## 17. Relationship with Gallery

Gallery is the central entry point. Metadata must not assume private Gallery state.

```text
Gallery
  ↓
Application command
  ↓
Metadata Workspace
```

Selected asset IDs are the stable contract.

## 18. Relationship with Studio

Studio may provide production context to the Asset record, but Metadata owns metadata generation.

The separation is intentional:

```text
Studio completes asset
        ↓
Gallery stores/displays asset
        ↓
Metadata analyzes asset
        ↓
Metadata generates/validates metadata
```

## 19. Completion Criteria

Single asset:
```text
Gallery → Create Metadata → Generate → Edit → Validate → Export
```

Bulk:
```text
Gallery → Select Multiple → Create Metadata → Queue → Generate → Review → Validate → Export
```

The workspace is incomplete unless actions produce real state changes and persistent results.
