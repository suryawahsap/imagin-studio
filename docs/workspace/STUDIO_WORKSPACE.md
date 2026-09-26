# IMAGIN Studio — Studio Workspace Specification

**Status:** Product/UI/Flow Contract
**Purpose:** Menetapkan tanggung jawab, layout, alur, states, dan hubungan Studio dengan workspace lain.

## 1. Tujuan Workspace

Studio adalah workspace utama untuk membuat dan memodifikasi asset berbasis AI. Studio bertanggung jawab atas produksi asset, bukan pembuatan metadata stock final.

Studio menghasilkan:
- asset result;
- production context;
- production trace;
- technical QA;
- visual QA;
- compliance/preflight state;
- lineage/provenance.

Studio tidak melakukan AI metadata generation sebagai langkah wajib di dalam UI Studio. Metadata dibuat pada Metadata Workspace melalui Gallery.

## 2. Posisi dalam Product Flow

```text
User intent
  ↓
Studio
  ↓
ProductionRequest
  ↓
ProductionPlan
  ↓
Canonical Production Pipeline
  ↓
Asset Result
  ↓
Gallery
  ↓
Metadata / Upscale / Vectorize / Remotion / Export
```

## 3. Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Navigation                                                     │
├───────────────┬───────────────────────────────┬────────────────────┤
│ Generation    │ Preview / Result Area         │ Inspector          │
│ Controls      │                               │                    │
│               │ main preview                  │ Asset              │
│ Source        │ thumbnails / compare         │ Prompt              │
│ Mode          │ zoom / fullscreen             │ Model               │
│ Prompt        │                               │ Style / DNA         │
│ Style / DNA   │                               │ QA / Compliance     │
│ Content       │                               │ Quick Actions       │
│ Output        │                               │                    │
│ Generate      │                               │                    │
├───────────────┴───────────────────────────────┴────────────────────┤
│ Gallery / Result strip                                             │
├────────────────────────────────────────────────────────────────────┤
│ Task Center                                                        │
└────────────────────────────────────────────────────────────────────┘
```

## 4. Primary Controls

### Source
- Text to Image
- Image to Image
- Reference input when applicable

### Mode
- Generate
- Batch
- Icon
- JSON
- Reference
- Revision
- Object Modifier

Semua mode harus menghasilkan canonical `ProductionRequest` dan masuk ke pipeline yang sama.

### Style / DNA
- style preset;
- style strength;
- category/asset-type context;
- creative DNA controls;
- relevant composition/background options.

### Content
- subject;
- aspect ratio;
- composition constraints;
- semantic intent.

### Output
- resolution;
- output format;
- background policy;
- quality options.

## 5. Generation Flow

```text
User clicks Generate
  ↓
Intake validation
  ↓
Normalize request
  ↓
Resolve configuration
  ↓
Semantic intent
  ↓
Production plan
  ↓
DNA / composition / diversity
  ↓
Prompt compilation
  ↓
Differentiation / similarity gate
  ↓
AI generation
  ↓
Finalize asset
  ↓
Technical QA
  ↓
Visual QA
  ↓
Compliance / preflight
  ↓
Repair or bounded regeneration when required
  ↓
Persist asset + production trace
  ↓
Gallery
```

## 6. Reference Workflow

```text
Reference image
  ↓
Visual analysis
  ↓
Infer asset type / style / ratio / background / output
  ↓
Visual DNA
  ↓
Rendering directive
  ↓
Skip AI expansion when reference behavior requires it
  ↓
Compile final prompt
  ↓
Generate
```

## 7. Result State

Asset result must expose:
- generation status;
- prompt/model context;
- style/DNA;
- QA state;
- compliance state;
- lineage;
- quick actions.

Quick actions may include:
- Open in Gallery;
- Send to Metadata;
- Send to Upscale;
- Send to Vectorize;
- Send to Remotion;
- Download.

The preferred routing for Metadata is through Gallery as the central asset hub, even when a shortcut is exposed from the result inspector.

## 8. Gallery Relationship

Studio does not own Gallery state. On completion, Studio persists the asset and publishes the appropriate event/result so Gallery can display it.

## 9. Metadata Boundary

Do not place a mandatory `Generate Metadata` operation inside the Studio generation pipeline.

The correct product boundary is:

```text
Studio = Create asset
Gallery = Manage asset
Metadata = Generate/edit/validate stock metadata
```

## 10. Task Center

Studio jobs use the shared Job contract. The UI must expose:
- queued;
- preparing;
- processing;
- finalizing;
- completed;
- failed;
- cancelled;
- recovered.

Double action must not create duplicate logical jobs. Retry is not the same operation as regeneration.

## 11. Completion Criteria

Studio is complete only when:
1. all modes route into the canonical production core;
2. generated assets persist correctly;
3. QA/preflight state is observable;
4. lineage/trace is preserved;
5. Gallery receives completed assets;
6. no hidden metadata-generation pipeline exists inside Studio.
