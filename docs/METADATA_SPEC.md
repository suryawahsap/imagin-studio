# IMAGIN Studio Local — Metadata Product & Technical Specification

**Status:** Final Metadata Contract
**Date:** 2026-09-07
**Scope:** Metadata generation, AI behavior, UI workflow, validation, field regeneration, bulk processing, persistence, and export.

---

## 1. Purpose

Metadata adalah **first-class production workspace** yang bertugas mengubah asset menjadi asset yang siap digunakan untuk stock workflow.

Metadata bukan fungsi sampingan Studio.

Primary workflow:

```text
Gallery
  → Select Asset(s)
  → Create Metadata
  → Metadata Workspace
  → Analyze
  → Generate
  → Review/Edit
  → Validate
  → Save
  → Export
```

---

## 2. Core Metadata Principle

Metadata generation must prioritize:

```text
VISUAL TRUTH
    >
VISUAL PROFILE
    >
ASSET CONTEXT
```

Meaning:

- **Visual Truth:** what is actually visible in the asset;
- **Visual Profile:** detected subject, style, composition, medium, environment, etc.;
- **Asset Context:** information inherited from production, such as prompt, asset type, category context, and lineage.

Production context is helpful but never overrides what is visibly true.

---

## 3. What Metadata Generates

Minimum AI-generated fields:

```text
Title
Description
Keywords
Category
```

Additional platform-dependent fields may exist later:

```text
Releases
Editorial / Commercial classification
Platform category mapping
Platform-specific flags
```

Technical metadata is not AI-generated and should be read from the asset/system:

```text
Creator
Created
Modified
Dimensions
File Size
Format
Color Profile
Version
Checksum
Lineage
```

---

## 4. Metadata Is Separate From Production

Studio production can finish with:

```text
Asset created
QA passed
Metadata = NOT_GENERATED
```

This is a valid state.

Example:

```text
Studio
 ↓
mountain_lake_01.png
 ↓
Gallery
 ↓
metadata.status = NOT_GENERATED
```

Only when the user enters Metadata should AI metadata generation start, unless a future explicit automated metadata workflow is added as a separate product feature.

---

## 5. Metadata Generation Inputs

The Metadata Engine receives a normalized request containing conceptually:

```text
asset
visualAnalysis
visualProfile
productionContext
assetContext
platform
metadataPolicy
existingMetadata
```

### 5.1 Asset

Includes:

```text
asset id
file reference
media type
dimensions
format
lineage
```

### 5.2 Visual Analysis

The AI vision layer should identify observable facts, such as:

```text
subjects
objects
environment
action
composition
color characteristics
style/medium
orientation
background
visible text when relevant
```

### 5.3 Production Context

May include:

```text
prompt
semantic intent
asset type
style
DNA summary
concept
production trace
```

Production context is contextual evidence, not the final truth.

---

## 6. Metadata Generation Pipeline

Canonical flow:

```text
1. Intake
2. Load Asset
3. Analyze Visual Truth
4. Build Visual Profile
5. Load Asset Context
6. Resolve Platform Rules
7. Generate Candidate Metadata
8. Normalize Metadata
9. Validate Metadata
10. Optimize Keywords
11. Check Similarity / Diversity where required
12. Produce Final Metadata
13. Persist
14. Emit Job Result
```

For a batch:

```text
Select assets
 ↓
Create MetadataJob items
 ↓
Process independently
 ↓
Persist per-asset result
 ↓
Aggregate queue state
```

A failure in one asset must not corrupt successful results from other assets.

---

## 7. UI — Initial State

When an asset has no metadata:

```text
┌─────────────────────────────────────────┐
│ Asset Preview                           │
│                                         │
│ Metadata not generated                   │
│                                         │
│ AI can analyze this asset and create:  │
│ Title · Description · Keywords · Class  │
│                                         │
│        [ ✨ Generate Metadata ]         │
└─────────────────────────────────────────┘
```

The button is the primary CTA.

The existing screen that only shows editable fields without an explicit generation action is therefore incomplete for the AI workflow.

---

## 8. UI — Generated State

After generation, the workspace becomes an editor:

```text
Metadata Editor

Title
[........................................] [Regenerate]

Description
[........................................] [Regenerate]

Keywords
[tiger] [wildlife] [vector] [logo] ...   [Regenerate]

Category
[ Illustration ▼ ]                         [Suggest]

Platform
[ Adobe Stock ▼ ]

[ Validate ]                         [ Save Metadata ]
```

The user can edit any field without losing the other fields.

---

## 9. AI Command Model

Recommended actions:

```text
✨ Generate Metadata

↻ Regenerate Metadata

Title        ↻
Description  ↻
Keywords     ↻
Category     Suggest

Validate
```

These actions map directly to separate application use cases.

---

## 10. Field-Level Regeneration

Mandatory use cases:

```text
regenerateTitle(assetId)
regenerateDescription(assetId)
regenerateKeywords(assetId)
```

Field regeneration must:

```text
load current asset
load current metadata
load relevant field context
call metadata field engine
validate result
persist only target field
preserve all other fields
```

It must **not** execute:

```text
Studio production
image generation
upscale
vectorize
full asset regeneration
```

Example:

```text
Title
before: Tiger Vector Logo

User → Regenerate Title

Title
after: Minimal Tiger Head Vector Logo

Description = unchanged
Keywords = unchanged
```

---

## 11. Visual Truth Protection

The metadata AI must not blindly copy prompt language.

Example:

```text
Prompt:
"futuristic city with flying cars"

Image visibly shows:
- city
- buildings
- sunset
- no flying cars
```

Final keywords must not include `flying cars` merely because the prompt contains it.

The visual analysis has precedence.

---

## 12. Metadata Validation

Validation runs after:

```text
AI generation
manual edit
field regeneration
bulk edit
import
```

Validator should return structured issues.

Conceptual issue shape:

```text
id
type
field
severity
confidence
evidence
message
repairable
```

Examples:

```text
TITLE_TOO_LONG
KEYWORD_DUPLICATE
KEYWORD_NOT_VISUALLY_SUPPORTED
CATEGORY_MISMATCH
INVALID_PLATFORM_CATEGORY
MISSING_REQUIRED_FIELD
SPAM_KEYWORD
UNSUPPORTED_RELEASE_STATE
```

Hard blocks must be visually obvious in the UI.

---

## 13. Metadata Status Model

Recommended status enum:

```text
NOT_GENERATED
QUEUED
ANALYZING
GENERATING
GENERATED
EDITED
VALIDATING
READY
NEEDS_REVIEW
INVALID
FAILED
```

The UI should expose status badges consistently in:

```text
Metadata Workspace
Gallery
Task Center
Asset Inspector
```

---

## 14. Metadata Queue

Bulk generation uses the shared Job contract.

Queue item:

```text
assetId
status
stage
progress
attempt
error
metadataStatus
```

Example UI:

```text
Metadata Queue
────────────────────────────────────────
#01 mountain_01.png    ✓ Ready
#02 mountain_02.png    ✓ Ready
#03 city_01.png        ● Generating 68%
#04 tiger_01.png       ⚠ Needs Review
#05 panda_01.png       ✕ Failed
```

Controls:

```text
Generate All
Pause
Resume
Retry Failed
Validate All
Review Issues
Export Ready
```

---

## 15. Manual Editing

Manual edits are first-class operations.

The system must distinguish:

```text
AI generated
User edited
AI regenerated
System normalized
Validated
```

This provenance should be available in metadata history/trace.

Manual editing must persist immediately on save and must not trigger unrelated production work.

---

## 16. Keyword Editor

Keywords should be represented as structured tokens/chips rather than one plain text field.

Support:

```text
add
remove
reorder
merge/dedupe
validate
regenerate
```

Recommended sections:

```text
Primary Keywords
Secondary Keywords
Suggested Keywords
Warnings
```

The final export format may flatten them into the target platform representation.

---

## 17. Platform Policy

Metadata policy follows:

```text
platform hard limit
      >
production minimum
      >
quality target
```

The Metadata Engine must not treat one platform's rules as universal.

Platform-specific mapping belongs in the platform layer, while generic metadata semantics remain in the Metadata module.

Freepik remains locked until its metadata/taxonomy/export contract is verified.

---

## 18. Adobe Baseline

The Adobe baseline should support the already established workflow expectations from the behavioral reference, including:

```text
Title
Keywords
Category
Releases where applicable
```

The exact limits and platform-specific constraints must come from the centralized platform rules rather than being duplicated throughout UI code.

---

## 19. Similarity and Metadata Diversity

For batches, metadata quality is not only validity.

The system should also detect:

```text
title similarity
keyword overlap
visual similarity where required
batch diversity
```

This is especially important when the user generates many conceptually related assets.

The metadata system may propose differentiated wording while remaining faithful to visual truth.

---

## 20. Metadata Regeneration vs Asset Regeneration

These are different operations.

```text
Metadata regeneration
→ modifies metadata only

Asset regeneration
→ creates a new production attempt / result asset
```

They must never be conflated in code, job type, UI, or trace.

---

## 21. Metadata Persistence

Metadata must be durable.

Save operation:

```text
Validate
 ↓
Persist atomically
 ↓
Verify persistence
 ↓
Update Asset
 ↓
Emit state update
```

The UI must never report `Saved` when the persistence operation failed.

---

## 22. Metadata Trace

Metadata trace must answer:

```text
Who/what generated this?
Which asset was analyzed?
What visual facts were detected?
Which platform rules were applied?
Which model/version generated the metadata?
Was it edited by the user?
Which fields were regenerated?
Why was validation passed/failed?
What was exported?
```

No API key or secret may appear in the trace.

---

## 23. Application Use Cases

Target application API/use cases:

```text
createMetadataJob
analyzeAssetForMetadata
generateMetadata
regenerateMetadataField
validateMetadata
saveMetadata
exportMetadata
retryMetadataJob
cancelMetadataJob
```

Field-specific command shape:

```text
regenerateMetadataField({
  assetId,
  field: 'title' | 'description' | 'keywords'
})
```

---

## 24. Domain Components

Target module:

```text
src/modules/metadata/
├── domain/
│   ├── metadata-engine.ts
│   ├── metadata-policy.ts
│   ├── metadata-validator.ts
│   ├── metadata-regeneration.ts
│   ├── keyword-engine.ts
│   ├── platform-rules.ts
│   └── metadata-types.ts
├── application/
│   ├── generate-metadata.ts
│   ├── regenerate-field.ts
│   ├── validate-metadata.ts
│   ├── save-metadata.ts
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

No React dependency is allowed inside domain code.

---

## 25. Integration Contract

### Gallery → Metadata

Input:

```text
selected asset IDs
```

Output:

```text
Metadata workspace context
```

### Metadata → Gallery

After persistence:

```text
metadata status updated
metadata fields saved
validation status updated
```

Gallery should not know how metadata was generated.

---

## 26. Export

Export is a real persistence operation.

Minimum behavior:

```text
select platform
 ↓
validate metadata
 ↓
map fields
 ↓
write output
 ↓
verify output
 ↓
mark export result
```

Export should support future formats such as:

```text
CSV
JSON
platform-specific manifest
```

No in-memory-only export may be considered complete.

---

## 27. Error Handling

Metadata AI errors must use the shared structured error contract.

At minimum distinguish:

```text
401
403
408
429
aborted
invalid_response
invalid_json
safety_block
provider_error
network_error
```

The UI should show actionable remediation instead of one generic `Generation failed` message.

---

## 28. Security Boundary

AI calls follow:

```text
Metadata UI
 ↓
Application
 ↓
Domain
 ↓
AI service
 ↓
Electron IPC
 ↓
9Router / configured provider
```

No API secret is exposed to renderer code.

Metadata prompts and responses must not leak secrets into logs or trace records.

---

## 29. Acceptance Criteria

Metadata is complete only when all of these work in a real configured environment:

```text
Gallery → Create Metadata
Single asset generation
Bulk generation
Visible progress
AI-generated title
AI-generated description
AI-generated keywords
AI category suggestion
Manual editing
Title regeneration only
Description regeneration only
Keyword regeneration only
Validation
Persistence
Retry
Cancellation where supported
Recovery after restart
Export
Return to Gallery
```

Required rule:

```text
field regeneration ≠ full asset generation
```

---

## 30. Final Metadata Product Model

```text
                           ASSET
                             │
                             ▼
                    ┌─────────────────┐
                    │ Metadata Module │
                    └────────┬────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
          Visual Truth   Asset Context  Platform Rules
               │             │             │
               └─────────────┼─────────────┘
                             ▼
                    AI Metadata Engine
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
              Title     Description   Keywords
                │            │            │
                └────────────┼────────────┘
                             ▼
                         Validation
                             │
                         ┌───┴───┐
                         ▼       ▼
                       READY   REVIEW
                         │       │
                         └───┬───┘
                             ▼
                           Save
                             │
                             ▼
                           Export
                             │
                             ▼
                           Gallery
```

---

## 31. Non-Negotiable Metadata Rules

1. Metadata generation happens in the Metadata workspace, not Studio.
2. Gallery is the primary contextual entry point.
3. Metadata can also be opened directly as a workspace.
4. AI generation is explicit and visible.
5. User can edit every generated field.
6. Title/description/keywords support independent regeneration.
7. Visual truth always outranks prompt context.
8. Validation runs after AI generation and manual edits.
9. Batch metadata uses durable shared jobs.
10. Metadata operations are persisted and traceable.
11. Export verifies the actual output.
12. No module reads another module's private state.
